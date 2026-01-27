import requests
from flask import Blueprint, request, jsonify
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from utils import verify_admin

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/admin/users", methods=["GET"])
def admin_list_users():
    """
    Lists all users (requires admin authentication).
    Returns merged auth and profile data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        user_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        users_resp = requests.get(f'{SUPABASE_URL}/auth/v1/admin/users', headers=headers)
        if users_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch users"}), 500

        auth_users = users_resp.json().get('users', [])

        headers['Content-Type'] = 'application/json'
        profiles_resp = requests.get(f'{SUPABASE_URL}/rest/v1/profiles?select=*', headers=headers)
        profiles = profiles_resp.json() if profiles_resp.status_code == 200 else []
        profiles_dict = {p['id']: p for p in profiles}

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


@admin_bp.route("/admin/users", methods=["POST"])
def admin_create_user():
    """
    Creates a new user (requires admin authentication).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        user_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        data = request.json
        email = data.get('email')
        password = data.get('password')
        name = data.get('name', '')
        surname = data.get('surname', '')
        tier = data.get('tier', 'free')
        is_admin = data.get('is_admin', False)

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

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


@admin_bp.route("/admin/users/<user_id>", methods=["DELETE"])
def admin_delete_user(user_id):
    """
    Deletes a user (requires admin authentication).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

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


@admin_bp.route("/admin/users/<user_id>/reset-password", methods=["POST"])
def admin_reset_password(user_id):
    """
    Resets a user's password (requires admin authentication).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        data = request.json
        new_password = data.get('password')

        if not new_password or len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400

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


@admin_bp.route("/admin/users/<user_id>/tier", methods=["PATCH"])
def admin_update_tier(user_id):
    """
    Updates a user's tier (requires admin authentication).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        data = request.json
        new_tier = data.get('tier')

        if not new_tier or new_tier not in ['free', 'premium', 'admin']:
            return jsonify({"error": "Invalid tier. Must be 'free', 'premium', or 'admin'"}), 400

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
