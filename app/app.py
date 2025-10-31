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
# Initialize CORS with explicit settings - allow Vercel domain
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://bernardo-s-teaching-assistant.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

# Supabase configuration for admin operations
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

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
                "silence_duration_ms": 1000,
                "create_response": True,
                "interrupt_response": True
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

# Helper function to verify admin access
def verify_admin(user_token):
    """Verify user is admin using Supabase REST API"""
    # Get user from token
    headers = {
        'Authorization': f'Bearer {user_token}',
        'apikey': SUPABASE_SERVICE_KEY
    }
    user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
    if user_resp.status_code != 200:
        return None, "Invalid token"

    user_data = user_resp.json()
    user_id = user_data.get('id')

    # Check if user is admin
    headers = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
    }
    profile_resp = requests.get(
        f'{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=is_admin',
        headers=headers
    )

    if profile_resp.status_code != 200:
        return None, "Failed to check admin status"

    profiles = profile_resp.json()
    if not profiles or not profiles[0].get('is_admin'):
        return None, "Forbidden: Admin access required"

    return user_id, None

# Admin API endpoints
@app.route("/admin/users", methods=["GET"])
def admin_list_users():
    """
    Lists all users (requires admin authentication).
    Returns merged auth and profile data.
    """
    try:
        # Verify admin access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        user_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        # List all users using Supabase Admin API
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        users_resp = requests.get(f'{SUPABASE_URL}/auth/v1/admin/users', headers=headers)
        if users_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch users"}), 500

        auth_users = users_resp.json().get('users', [])

        # Get all profiles
        headers['Content-Type'] = 'application/json'
        profiles_resp = requests.get(f'{SUPABASE_URL}/rest/v1/profiles?select=*', headers=headers)
        profiles = profiles_resp.json() if profiles_resp.status_code == 200 else []
        profiles_dict = {p['id']: p for p in profiles}

        # Merge auth and profile data
        merged_users = []
        for auth_user in auth_users:
            profile = profiles_dict.get(auth_user['id'], {})
            merged_users.append({
                'id': auth_user['id'],
                'email': auth_user['email'],
                'created_at': auth_user['created_at'],
                'email_confirmed_at': auth_user.get('email_confirmed_at'),
                **profile
            })

        return jsonify({"users": merged_users})

    except Exception as e:
        print(f"Error in admin_list_users: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users", methods=["POST"])
def admin_create_user():
    """
    Creates a new user (requires admin authentication).
    """
    try:
        # Verify admin access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        user_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        # Get user data from request
        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', '')
        surname = data.get('surname', '')
        tier = data.get('tier', 'free')
        is_admin = data.get('is_admin', False)

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Create auth user using Supabase Admin API
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }
        create_resp = requests.post(
            f'{SUPABASE_URL}/auth/v1/admin/users',
            headers=headers,
            json={
                'email': email,
                'password': password,
                'email_confirm': True
            }
        )

        if create_resp.status_code not in [200, 201]:
            return jsonify({"error": f"Failed to create user: {create_resp.text}"}), 500

        new_user = create_resp.json()

        # Create profile
        profile_resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/profiles',
            headers=headers,
            json={
                'id': new_user['id'],
                'name': name,
                'surname': surname,
                'tier': tier,
                'is_admin': is_admin
            }
        )

        return jsonify({
            "success": True,
            "user": {
                'id': new_user['id'],
                'email': new_user['email']
            }
        })

    except Exception as e:
        print(f"Error in admin_create_user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    """
    Deletes a user (requires admin authentication).
    """
    try:
        # Verify admin access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        # Delete user using Supabase Admin API
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        delete_resp = requests.delete(f'{SUPABASE_URL}/auth/v1/admin/users/{user_id}', headers=headers)

        if delete_resp.status_code not in [200, 204]:
            return jsonify({"error": "Failed to delete user"}), 500

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error in admin_delete_user: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users/<user_id>/reset-password", methods=["POST"])
def admin_reset_password(user_id):
    """
    Resets a user's password (requires admin authentication).
    """
    try:
        # Verify admin access
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        # Get new password from request
        data = request.json
        new_password = data.get('password')

        if not new_password or len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

        # Update password using Supabase Admin API
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }
        update_resp = requests.put(
            f'{SUPABASE_URL}/auth/v1/admin/users/{user_id}',
            headers=headers,
            json={'password': new_password}
        )

        if update_resp.status_code not in [200, 204]:
            return jsonify({"error": "Failed to reset password"}), 500

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error in admin_reset_password: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Get port from environment variable (Render provides this) or default to 5000
    import os
    port = int(os.environ.get("PORT", 5000))
    # Bind to 0.0.0.0 so Render can access it
    app.run(host="0.0.0.0", port=port, debug=False)