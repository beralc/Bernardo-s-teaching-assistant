import requests
from flask import Blueprint, request, jsonify
from config import OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
from utils import load_prompt, build_realtime_instructions

voice_bp = Blueprint("voice", __name__)


@voice_bp.route("/webrtc_session", methods=["POST"])
def webrtc_session():
    """
    Handles the creation of the Realtime (WebRTC) session for voice.
    Includes VAD configuration and prompt.json as instructions.
    """
    try:
        prompt_data = load_prompt()

        data = request.json or {}
        topic = data.get('topic')
        user_id = data.get('user_id')

        # Valid voices for the gpt-realtime-mini GA API.
        # Any value not in this set will be rejected by OpenAI with a 400 error.
        VALID_REALTIME_VOICES = {
            "alloy", "ash", "ballad", "coral", "echo",
            "fable", "onyx", "nova", "sage", "shimmer", "verse"
        }
        DEFAULT_VOICE = "sage"

        # Fetch user's voice preference, CEFR level and recent session topics
        voice = DEFAULT_VOICE
        english_level = None
        recent_topics = []
        supabase_headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json"
        }
        if user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                profile_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=voice_preference,english_level",
                    headers=supabase_headers
                )
                if profile_response.status_code == 200:
                    profiles = profile_response.json()
                    if profiles and len(profiles) > 0:
                        raw_voice = profiles[0].get('voice_preference', DEFAULT_VOICE)
                        if raw_voice in VALID_REALTIME_VOICES:
                            voice = raw_voice
                        else:
                            print(f"Warning: invalid voice preference '{raw_voice}' for user {user_id}. Falling back to '{DEFAULT_VOICE}'.")
                        english_level = profiles[0].get('english_level')
            except Exception as e:
                print(f"Error fetching voice preference: {e}")

            try:
                sessions_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/conversation_sessions"
                    f"?user_id=eq.{user_id}&topic=not.is.null"
                    f"&select=topic&order=started_at.desc&limit=5",
                    headers=supabase_headers
                )
                if sessions_response.status_code == 200:
                    recent_topics = [
                        row['topic'] for row in sessions_response.json()
                        if row.get('topic')
                    ]
            except Exception as e:
                print(f"Error fetching recent session topics: {e}")

        instructions_str = build_realtime_instructions(
            prompt_data,
            english_level=english_level,
            recent_topics=recent_topics,
            topic=topic
        )

        # GA Realtime API - gpt-realtime-mini for cost efficiency
        realtime_model_name = "gpt-realtime-mini"

        url = "https://api.openai.com/v1/realtime/client_secrets"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        # IMPORTANT — schema rules for /v1/realtime/client_secrets (confirmed 2026-05-20):
        # - Transcription MUST be nested under audio.input.transcription, NOT as a
        #   top-level session.input_audio_transcription key (that returns 400).
        # - Do NOT put turn_detection here; configure it client-side via session.update.
        # - Do NOT configure transcription in session.update on the frontend;
        #   setting it here is sufficient and client-side overrides have caused
        #   silent failures across every format tried.
        body = {
            "session": {
                "type": "realtime",
                "model": realtime_model_name,
                "instructions": instructions_str,
                "audio": {
                    "input": {
                        "transcription": {
                            "model": "whisper-1"
                        }
                    },
                    "output": {
                        "voice": voice
                    }
                },
            }
        }

        resp = requests.post(url, headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        session_json = resp.json()

        print(f"OpenAI Realtime API client_secret response received (token redacted)")

        ephemeral_token = session_json.get('value')

        if not ephemeral_token:
            print(f"Error: Ephemeral token not found in OpenAI response. Full response: {session_json}")
            return jsonify({"error": "Ephemeral token not found in OpenAI response"}), 500

        websocket_url = f"wss://api.openai.com/v1/realtime?model={realtime_model_name}"
        print(f"Constructed WebSocket URL: {websocket_url}")

        # Fetch global voice config from app_config
        vad_threshold = 0.85
        silence_duration_ms = 800
        if SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                config_resp = requests.get(
                    f"{SUPABASE_URL}/rest/v1/app_config?key=in.(vad_threshold,silence_duration_ms)&select=key,value",
                    headers=supabase_headers
                )
                if config_resp.status_code == 200:
                    for row in config_resp.json():
                        if row['key'] == 'vad_threshold':
                            vad_threshold = float(row['value'])
                        elif row['key'] == 'silence_duration_ms':
                            silence_duration_ms = int(row['value'])
            except Exception as e:
                print(f"Error fetching voice config: {e}")

        return jsonify({
            "websocket_url": websocket_url,
            "ephemeral_token": ephemeral_token,
            "model": realtime_model_name,
            "vad_threshold": vad_threshold,
            "silence_duration_ms": silence_duration_ms
        })

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response status code: {http_err.response.status_code}")
        print(f"Response text: {http_err.response.text}")
        return jsonify({"error": f"HTTP error from OpenAI: {http_err.response.status_code} - {http_err.response.text}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": str(e)}), 500
