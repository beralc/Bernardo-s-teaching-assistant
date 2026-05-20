"""
routes/user.py

Self-service GDPR endpoints for authenticated (non-admin) users.

Endpoints
---------
POST /user/delete-account
    Permanently deletes the authenticated user's account and all their
    data from Supabase (cascade deletes apply via FK constraints).

GET  /user/export-data
    Returns a JSON bundle of all data held for the authenticated user:
    profile, conversation_sessions, conversation_messages, transcriptions.
    The frontend triggers this as a file download named "my-data.json".

Authentication
--------------
Both endpoints require a valid Supabase JWT Bearer token.
The token is verified against Supabase's /auth/v1/user endpoint.
Account deletion uses the Supabase service-role key to call the
admin delete API (required to remove the auth.users record itself).
"""

import requests
from flask import Blueprint, request, jsonify
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

user_bp = Blueprint("user", __name__)


# ---------------------------------------------------------------------------
# Helper: resolve and validate the caller's identity from a Bearer token.
# Returns (user_id: str, None) on success or (None, error_message: str).
# ---------------------------------------------------------------------------
def _get_authenticated_user(auth_header):
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Unauthorized: missing or malformed Authorization header"

    user_token = auth_header.split(' ', 1)[1]

    resp = requests.get(
        f'{SUPABASE_URL}/auth/v1/user',
        headers={
            'Authorization': f'Bearer {user_token}',
            'apikey': SUPABASE_SERVICE_KEY,
        }
    )

    if resp.status_code != 200:
        return None, "Unauthorized: invalid or expired token"

    user_data = resp.json()
    user_id = user_data.get('id')
    if not user_id:
        return None, "Unauthorized: could not resolve user identity"

    return user_id, None


# ---------------------------------------------------------------------------
# Supabase service-role headers (used for privileged operations)
# ---------------------------------------------------------------------------
def _service_headers(content_type=True):
    h = {
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'apikey': SUPABASE_SERVICE_KEY,
    }
    if content_type:
        h['Content-Type'] = 'application/json'
    return h


# ---------------------------------------------------------------------------
# POST /user/delete-account
# ---------------------------------------------------------------------------
@user_bp.route("/user/delete-account", methods=["POST"])
def delete_account():
    """
    Permanently deletes the authenticated user's account and all their data.

    The Supabase auth.users table has ON DELETE CASCADE on all dependent
    tables (profiles, conversation_sessions, conversation_messages,
    transcriptions), so deleting from auth.users removes everything.

    Requires: Authorization: Bearer <supabase_jwt>
    Returns:  {"success": true} | {"error": "..."}
    """
    try:
        auth_header = request.headers.get('Authorization')
        user_id, error = _get_authenticated_user(auth_header)
        if error:
            return jsonify({"error": error}), 401

        # Use the Supabase Admin API to delete the user from auth.users.
        # This cascades to all related tables via FK constraints.
        delete_resp = requests.delete(
            f'{SUPABASE_URL}/auth/v1/admin/users/{user_id}',
            headers=_service_headers(content_type=False),
        )

        if delete_resp.status_code not in (200, 204):
            print(f"[delete_account] Supabase returned {delete_resp.status_code}: {delete_resp.text}")
            return jsonify({"error": "Failed to delete account. Please try again or contact support."}), 500

        return jsonify({"success": True})

    except Exception as exc:
        print(f"[delete_account] Unexpected error: {exc}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500


# ---------------------------------------------------------------------------
# GET /user/export-data
# ---------------------------------------------------------------------------
@user_bp.route("/user/export-data", methods=["GET"])
def export_data():
    """
    Returns all data held for the authenticated user as a JSON object.

    Tables queried:
      - profiles
      - conversation_sessions
      - conversation_messages
      - transcriptions

    Requires: Authorization: Bearer <supabase_jwt>
    Returns:  application/json  {"exported_at": "...", "user_id": "...", ...}
    """
    try:
        auth_header = request.headers.get('Authorization')
        user_id, error = _get_authenticated_user(auth_header)
        if error:
            return jsonify({"error": error}), 401

        headers = _service_headers()

        def fetch_table(table, filter_col='user_id'):
            """Fetch all rows from a table filtered by the authenticated user."""
            url = f'{SUPABASE_URL}/rest/v1/{table}?{filter_col}=eq.{user_id}&select=*'
            resp = requests.get(url, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            print(f"[export_data] Failed to fetch {table}: {resp.status_code} {resp.text}")
            return []

        # Profile is keyed by id, not user_id
        profile_url = f'{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=*'
        profile_resp = requests.get(profile_url, headers=headers)
        profile = profile_resp.json()[0] if profile_resp.status_code == 200 and profile_resp.json() else {}

        sessions = fetch_table('conversation_sessions')
        messages = fetch_table('conversation_messages')
        transcriptions = fetch_table('transcriptions')

        from datetime import datetime, timezone
        exported_at = datetime.now(timezone.utc).isoformat()

        payload = {
            "exported_at": exported_at,
            "user_id": user_id,
            "notice": (
                "This file contains all personal data held about you in the "
                "English Learning Research App (UCM study 663_CE_20260312_35_HUM). "
                "You may request deletion of this data via the app settings or by "
                "contacting bernardm@ucm.es."
            ),
            "profile": profile,
            "conversation_sessions": sessions,
            "conversation_messages": messages,
            "transcriptions": transcriptions,
        }

        return jsonify(payload)

    except Exception as exc:
        print(f"[export_data] Unexpected error: {exc}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500
