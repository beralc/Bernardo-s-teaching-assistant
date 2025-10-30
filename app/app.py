import os
import json
import requests
from flask import Flask, request, jsonify, render_template, session
from dotenv import load_dotenv
import openai
from flask_cors import CORS # Import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = "your_secure_secret_key"
CORS(app) # Initialize CORS for the app

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

@app.route("/")
def index():
    # Renders index.html from the templates folder
    return render_template("index.html")

@app.route("/clear_context", methods=["POST"])
def clear_context():
    # Clears the conversation stored in the session
    session.pop('context', None)
    return jsonify({"message": "Context cleared."})

@app.route("/chat_text", methods=["POST"])
def chat_text():
    """
    Handles text chat with the ChatCompletion API. 
    Combines prompt.json as a system_prompt to maintain consistency
    between text and Realtime.
    """
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"error": "You have not entered text"}), 400

    user_input = data['text']
    context = session.get('context', [])

    # Load the content of prompt.json as a dictionary
    with open('prompt.json', 'r') as f:
        prompt_data = json.load(f)

    # Convert the entire prompt data to a JSON string
    system_prompt = json.dumps(prompt_data)

    # Add the user's input to the context
    context.append({"role": "user", "content": user_input})

    try:
        chat_response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt}
            ] + context
        )
        response_message = chat_response.choices[0].message.content.strip()

        # Save the assistant's response in the context
        context.append({"role": "assistant", "content": response_message})
        session['context'] = context

        return jsonify({"response_text": response_message})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/webrtc_session", methods=["POST"])
def webrtc_session():
    """
    Handles the creation of the Realtime (WebRTC) session for voice.
    Includes VAD configuration and prompt.json as instructions.
    """
    try:
        # Load the prompt from prompt.json as a dictionary
        with open('prompt.json', 'r') as f:
            prompt_data = json.load(f)

        # Check if there's a topic in the request
        data = request.json or {}
        topic = data.get('topic')

        if topic:
            # Add topic context to the prompt data
            prompt_data['behavior']['current_topic'] = {
                "title": topic.get('title', ''),
                "description": topic.get('description', ''),
                "instructions": "Please start the conversation by introducing this topic and engaging the user in a natural, friendly way remember always in english."
            }

        # Convert the entire prompt data to a JSON string
        instructions_str = json.dumps(prompt_data)

        # Define the model name for the WebSocket URL
        realtime_model_name = "gpt-4o-realtime-preview"

        url = "https://api.openai.com/v1/realtime/sessions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        body = {
            "model": realtime_model_name, # Use the defined model name
            "voice": "sage",
            "modalities": ["audio", "text"],
            "instructions": instructions_str,
            # Audio format configuration
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            # Enable input audio transcription
            "input_audio_transcription": {
                "model": "whisper-1"
            },
            # VAD configuration (server-side voice activity detection)
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 1000
            }
        }

        resp = requests.post(url, headers=headers, json=body, timeout=30)
        resp.raise_for_status() # This will raise an HTTPError for bad responses (4xx or 5xx)
        session_json = resp.json()  # Ephemeral token returned

        print(f"OpenAI Realtime API session_json response: {session_json}") # Log the full response

        session_id = session_json.get('id')
        ephemeral_token = session_json.get('client_secret', {}).get('value')

        if not session_id:
            print(f"Error: Session ID not found in OpenAI response. Full response: {session_json}")
            return jsonify({"error": "Session ID not found in OpenAI response"}), 500

        if not ephemeral_token:
            print(f"Error: Ephemeral token not found in OpenAI response. Full response: {session_json}")
            return jsonify({"error": "Ephemeral token not found in OpenAI response"}), 500

        # Construct the WebSocket URL as wss://api.openai.com/v1/realtime?model={model_name}
        websocket_url = f"wss://api.openai.com/v1/realtime?model={realtime_model_name}"
        print(f"Constructed WebSocket URL: {websocket_url}") # Log the constructed URL

        return jsonify({
            "session_id": session_id,
            "websocket_url": websocket_url,
            "ephemeral_token": ephemeral_token # Return the ephemeral token to the frontend
        })

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
        print(f"Response status code: {http_err.response.status_code}")
        print(f"Response text: {http_err.response.text}")
        return jsonify({"error": f"HTTP error from OpenAI: {http_err.response.status_code} - {http_err.response.text}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Start the Flask app in debug mode
    app.run(debug=True)