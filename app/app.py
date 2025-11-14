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
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

# Supabase configuration for admin operations
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# DISABLED: Old template route removed for security
# The React app on Vercel is the main frontend
# @app.route("/")
# def index():
#     # Renders index.html from the templates folder
#     return render_template("index.html")

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

@app.route("/admin/users/<user_id>/tier", methods=["PATCH"])
def admin_update_tier(user_id):
    """
    Updates a user's tier (requires admin authentication).
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

        # Get new tier from request
        data = request.json
        new_tier = data.get('tier')

        if not new_tier or new_tier not in ['free', 'premium', 'admin']:
            return jsonify({"error": "Invalid tier. Must be 'free', 'premium', or 'admin'"}), 400

        # Update tier in profiles table
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        }
        update_resp = requests.patch(
            f'{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}',
            headers=headers,
            json={'tier': new_tier}
        )

        if update_resp.status_code not in [200, 204]:
            return jsonify({"error": "Failed to update tier"}), 500

        return jsonify({"success": True, "tier": new_tier})

    except Exception as e:
        print(f"Error in admin_update_tier: {e}")
        return jsonify({"error": str(e)}), 500

# ============================================================================
# Can-Do Checklist API Endpoints
# ============================================================================

@app.route("/users/<user_id>/cando", methods=["GET"])
def get_user_cando_achievements(user_id):
    """
    Get user's Can-Do achievements and progress.
    Returns achievements grouped by level with progress percentages.
    """
    try:
        # Verify user authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]

        # Get authenticated user ID from token
        headers = {
            'Authorization': f'Bearer {user_token}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        if user_resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401

        auth_user_id = user_resp.json().get('id')

        # Check if user is requesting their own data or is admin
        if auth_user_id != user_id:
            # Check if user is admin
            admin_id, error = verify_admin(user_token)
            if error:
                return jsonify({"error": "Forbidden: Can only access your own data"}), 403

        # Get all Can-Do statements
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }

        statements_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/cando_statements?select=*&order=display_order.asc',
            headers=headers
        )

        if statements_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch Can-Do statements"}), 500

        statements = statements_resp.json()

        # Get user's achievements WITH statement details
        achievements_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&select=*,cando_statements(level,descriptor,skill_type)&order=achieved_at.desc',
            headers=headers
        )

        if achievements_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch achievements"}), 500

        achievements = achievements_resp.json()
        achieved_ids = {a['cando_id'] for a in achievements if a.get('admin_approved') != False}

        # Map achievements to statement details for frontend
        achievements_by_statement = {}
        for ach in achievements:
            if ach.get('admin_approved') != False and 'cando_statements' in ach:
                stmt_data = ach['cando_statements']
                achievements_by_statement[ach['cando_id']] = {
                    'descriptor': stmt_data.get('descriptor'),
                    'level': stmt_data.get('level'),
                    'skill_type': stmt_data.get('skill_type'),
                    'achieved_at': ach.get('achieved_at'),
                    'detected_by': ach.get('detected_by'),
                    'confidence_score': ach.get('confidence_score')
                }

        # Group statements by level and calculate progress
        levels_data = {}
        for stmt in statements:
            level = stmt['level']
            if level not in levels_data:
                levels_data[level] = {
                    'level': level,
                    'total': 0,
                    'achieved': 0,
                    'statements': [],
                    'recent_achievements': []
                }

            is_achieved = stmt['id'] in achieved_ids
            levels_data[level]['total'] += 1
            if is_achieved:
                levels_data[level]['achieved'] += 1
                # Add to recent achievements
                if stmt['id'] in achievements_by_statement:
                    levels_data[level]['recent_achievements'].append(
                        achievements_by_statement[stmt['id']]
                    )

            levels_data[level]['statements'].append({
                'id': stmt['id'],
                'descriptor': stmt['descriptor'],
                'skill_type': stmt['skill_type'],
                'is_achieved': is_achieved
            })

        # Calculate percentages and sort recent achievements
        for level_data in levels_data.values():
            total = level_data['total']
            achieved = level_data['achieved']
            level_data['percentage'] = round((achieved / total * 100), 1) if total > 0 else 0
            # Sort recent achievements by date (most recent first)
            level_data['recent_achievements'].sort(
                key=lambda x: x.get('achieved_at', ''),
                reverse=True
            )

        # Order levels
        level_order = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2']
        ordered_levels = [levels_data[lvl] for lvl in level_order if lvl in levels_data]

        # Calculate total achievements
        total_achievements = len(achieved_ids)

        return jsonify({
            "user_id": user_id,
            "total_achievements": total_achievements,
            "progress_by_level": ordered_levels
        })

    except Exception as e:
        print(f"Error in get_user_cando_achievements: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/analyze_session", methods=["POST"])
def analyze_session_cando():
    """
    Analyze a voice session transcript for Can-Do achievements.
    Uses GPT-4 to detect which Can-Do statements were demonstrated.

    Request body:
    {
        "session_id": "string",
        "user_id": "uuid",
        "transcript": "full conversation transcript",
        "user_level": "A2|B1|B2" (optional, defaults to user's profile level)
    }
    """
    try:
        # Verify authentication
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]

        # Get authenticated user
        headers = {
            'Authorization': f'Bearer {user_token}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        if user_resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401

        # Get request data
        data = request.json
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        transcript = data.get('transcript')
        user_level = data.get('user_level')

        if not all([session_id, user_id, transcript]):
            return jsonify({"error": "Missing required fields: session_id, user_id, transcript"}), 400

        # If no level provided, get from user profile
        if not user_level:
            headers = {
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY
            }
            profile_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=cefr_level',
                headers=headers
            )
            if profile_resp.status_code == 200 and profile_resp.json():
                user_level = profile_resp.json()[0].get('cefr_level', 'A2')
            else:
                user_level = 'A2'  # Default

        # Get Can-Do statements for user's level and adjacent levels (ZPD)
        # Include current level + 2 below + ALL above to detect when learners exceed expectations
        level_map = {'A1': 0, 'A2': 1, 'A2+': 2, 'B1': 3, 'B1+': 4, 'B2': 5, 'B2+': 6, 'C1': 7, 'C2': 8}
        current_level_idx = level_map.get(user_level, 1)
        # Include 2 levels below (for context) and all levels at or above current
        relevant_levels = [k for k, v in level_map.items() if v >= current_level_idx - 2]

        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }

        # Build query for relevant levels
        level_query = ','.join(relevant_levels)
        statements_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/cando_statements?level=in.({level_query})&select=id,level,skill_type,descriptor',
            headers=headers
        )

        if statements_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch Can-Do statements"}), 500

        statements = statements_resp.json()

        # Call GPT-4 for analysis
        import time
        start_time = time.time()

        analysis_result = analyze_transcript_with_gpt(transcript, statements, user_level)

        processing_time = int((time.time() - start_time) * 1000)

        # Save analysis log to database
        headers['Content-Type'] = 'application/json'
        log_data = {
            'session_id': session_id,
            'user_id': user_id,
            'transcript_length': len(transcript),
            'detected_achievements': analysis_result.get('detected_achievements', []),
            'model_used': 'gpt-4o',
            'prompt_version': 'v1.0',
            'processing_time_ms': processing_time,
            'error_occurred': analysis_result.get('error', False),
            'error_message': analysis_result.get('error_message')
        }

        requests.post(
            f'{SUPABASE_URL}/rest/v1/session_cando_analysis',
            headers=headers,
            json=log_data
        )

        # If AI detected achievements, save them to user_cando_achievements
        detected = analysis_result.get('detected_achievements', [])
        new_achievements = []

        for achievement in detected:
            # Check if already achieved
            check_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&cando_id=eq.{achievement["cando_id"]}',
                headers=headers
            )

            if check_resp.status_code == 200 and len(check_resp.json()) == 0:
                # Not yet achieved - add it
                achievement_data = {
                    'user_id': user_id,
                    'cando_id': achievement['cando_id'],
                    'session_id': session_id,
                    'detected_by': 'ai_automatic',
                    'confidence_score': achievement['confidence'],
                    'evidence_text': achievement['evidence']
                }

                insert_resp = requests.post(
                    f'{SUPABASE_URL}/rest/v1/user_cando_achievements',
                    headers=headers,
                    json=achievement_data
                )

                if insert_resp.status_code in [200, 201]:
                    new_achievements.append(achievement)

        return jsonify({
            "success": True,
            "session_id": session_id,
            "user_id": user_id,
            "analyzed_level": user_level,
            "total_statements_analyzed": len(statements),
            "detected_achievements": detected,
            "new_achievements": new_achievements,
            "processing_time_ms": processing_time
        })

    except Exception as e:
        print(f"Error in analyze_session_cando: {e}")
        return jsonify({"error": str(e)}), 500

def analyze_transcript_with_gpt(transcript, statements, user_level):
    """
    Use GPT-4 to analyze transcript and detect Can-Do achievements.

    Returns:
    {
        "detected_achievements": [
            {
                "cando_id": "uuid",
                "descriptor": "Can do X",
                "confidence": 0.85,
                "evidence": "excerpt from transcript"
            }
        ]
    }
    """
    try:
        # Build prompt for GPT-4
        statements_text = "\n".join([
            f"{i+1}. [{stmt['id']}] ({stmt['level']} - {stmt['skill_type']}): {stmt['descriptor']}"
            for i, stmt in enumerate(statements)
        ])

        prompt = f"""You are an expert CEFR language assessor analyzing a learner's English conversation transcript for a PhD research project on senior language learners.

The learner's assigned level is: {user_level}
IMPORTANT: The learner may demonstrate capabilities ABOVE this assigned level. Recognize ALL achievements.

Analyze the conversation transcript and identify which Can-Do statements the learner has DEMONSTRATED through their language production.

ASSESSMENT CRITERIA:
- The learner must have PRODUCED the language (speaking/interaction), not just comprehended it
- Look for evidence of the capability described in the Can-Do statement
- The learner may perform ABOVE their assigned level - recognize this
- Use confidence scores to indicate strength of evidence (0.6+ = demonstrated, 0.8+ = clearly demonstrated, 0.95+ = exceptionally demonstrated)
- Focus on what the learner ACTUALLY DID in the conversation

TRANSCRIPT:
{transcript}

CAN-DO STATEMENTS TO EVALUATE:
{statements_text}

For each Can-Do statement demonstrated in the transcript, respond with:
1. The statement ID (in brackets from above)
2. Confidence score (0.6-1.0, where 0.6 = minimal evidence, 1.0 = perfect demonstration)
3. A brief excerpt from the transcript showing the evidence (max 100 words)

Respond in JSON format:
{{
  "detected_achievements": [
    {{
      "cando_id": "uuid-here",
      "confidence": 0.85,
      "evidence": "Brief excerpt from transcript that demonstrates this capability..."
    }}
  ]
}}

Include any statement with confidence >= 0.6. If no statements were demonstrated, return an empty array."""

        # Call GPT-4
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert CEFR language assessor. Respond only in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )

        result_text = response.choices[0].message.content.strip()

        # Log the raw response for debugging
        print(f"GPT-4 raw response (first 500 chars): {result_text[:500]}")

        # Parse JSON response - handle markdown code blocks
        import json
        import re

        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(1)
            print("Extracted JSON from markdown code block")

        # Try to find JSON object even if there's text before/after
        if not result_text.startswith('{'):
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(0)
                print("Extracted JSON from text")

        result = json.loads(result_text)

        # Add descriptor to each achievement for frontend display
        stmt_dict = {s['id']: s for s in statements}
        for achievement in result.get('detected_achievements', []):
            cando_id = achievement['cando_id']
            if cando_id in stmt_dict:
                achievement['descriptor'] = stmt_dict[cando_id]['descriptor']
                achievement['level'] = stmt_dict[cando_id]['level']

        return result

    except Exception as e:
        print(f"Error in GPT analysis: {e}")
        # Try to get the raw response if available
        try:
            if 'result_text' in locals():
                print(f"Raw GPT response that caused error: {result_text}")
        except:
            pass
        return {
            "detected_achievements": [],
            "error": True,
            "error_message": str(e)
        }

@app.route("/admin/users/<user_id>/cando/<cando_id>", methods=["POST"])
def admin_add_cando_achievement(user_id, cando_id):
    """
    Manually add a Can-Do achievement for a user (admin only).
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

        # Get optional notes from request
        data = request.json or {}
        admin_notes = data.get('notes', '')

        # Check if already achieved
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }

        check_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&cando_id=eq.{cando_id}',
            headers=headers
        )

        if check_resp.status_code == 200 and len(check_resp.json()) > 0:
            return jsonify({"error": "Achievement already exists"}), 400

        # Insert achievement
        achievement_data = {
            'user_id': user_id,
            'cando_id': cando_id,
            'detected_by': 'admin_manual',
            'reviewed_by_admin': True,
            'admin_approved': True,
            'admin_notes': admin_notes,
            'reviewed_at': 'now()'
        }

        insert_resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/user_cando_achievements',
            headers=headers,
            json=achievement_data
        )

        if insert_resp.status_code not in [200, 201]:
            return jsonify({"error": "Failed to add achievement"}), 500

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error in admin_add_cando_achievement: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users/<user_id>/cando/<cando_id>", methods=["DELETE"])
def admin_remove_cando_achievement(user_id, cando_id):
    """
    Remove a Can-Do achievement for a user (admin only).
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

        # Delete achievement
        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }

        delete_resp = requests.delete(
            f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&cando_id=eq.{cando_id}',
            headers=headers
        )

        if delete_resp.status_code not in [200, 204]:
            return jsonify({"error": "Failed to delete achievement"}), 500

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error in admin_remove_cando_achievement: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Get port from environment variable (Render provides this) or default to 5000
    import os
    port = int(os.environ.get("PORT", 5000))
    # Bind to 0.0.0.0 so Render can access it
    app.run(host="0.0.0.0", port=port, debug=False)