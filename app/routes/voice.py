import json
import requests
from flask import Blueprint, request, jsonify
from config import OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
from utils import load_prompt

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

        if topic and isinstance(topic, dict):
            prompt_data['behavior']['current_topic'] = {
                "title": topic.get('title', ''),
                "description": topic.get('description', ''),
                "instructions": "Please start the conversation by introducing this topic and engaging the user in a natural, friendly way remember always in english."
            }

        # Valid voices for the gpt-realtime-mini GA API.
        # Any value not in this set will be rejected by OpenAI with a 400 error.
        VALID_REALTIME_VOICES = {
            "alloy", "ash", "ballad", "coral", "echo",
            "fable", "onyx", "nova", "sage", "shimmer", "verse"
        }
        DEFAULT_VOICE = "sage"

        # Fetch user's voice preference from Supabase
        voice = DEFAULT_VOICE
        if user_id and SUPABASE_URL and SUPABASE_SERVICE_KEY:
            try:
                supabase_headers = {
                    "apikey": SUPABASE_SERVICE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                    "Content-Type": "application/json"
                }
                profile_response = requests.get(
                    f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=voice_preference",
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
            except Exception as e:
                print(f"Error fetching voice preference: {e}")

        instructions_str = json.dumps(prompt_data)

        # GA Realtime API - gpt-realtime-mini for cost efficiency
        realtime_model_name = "gpt-realtime-mini"

        url = "https://api.openai.com/v1/realtime/client_secrets"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        # GA Realtime API session shape.
        # Transcription is configured at session creation as defense-in-depth:
        # the frontend also sends a session.update with the same nested shape,
        # but configuring it here means the event
        # `conversation.item.input_audio_transcription.completed` will fire
        # even if the client-side update is delayed or races with first audio.
        #
        # Schema notes:
        #   - GA requires NESTED keys under session.audio.input.* — the
        #     legacy top-level `input_audio_transcription` is silently ignored.
        #   - `gpt-4o-mini-transcribe` is the correct model for VOICE sessions.
        #     `gpt-realtime-whisper` is for `type: "transcription"` (STT-only)
        #     sessions and does NOT emit transcripts in a voice session.
        body = {
            "session": {
                "type": "realtime",
                "model": realtime_model_name,
                "instructions": instructions_str,
                "audio": {
                    "input": {
                        "transcription": {
                            "model": "gpt-4o-mini-transcribe"
                        },
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.5,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 800
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

        return jsonify({
            "websocket_url": websocket_url,
            "ephemeral_token": ephemeral_token
        })

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response status code: {http_err.response.status_code}")
        print(f"Response text: {http_err.response.text}")
        return jsonify({"error": f"HTTP error from OpenAI: {http_err.response.status_code} - {http_err.response.text}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": str(e)}), 500
