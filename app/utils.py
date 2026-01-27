import os
import json
import requests
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompt.json")


def load_prompt():
    """Load prompt.json and return as dict."""
    with open(PROMPT_PATH, "r") as f:
        return json.load(f)


def get_supabase_headers(content_type=True):
    """Return standard Supabase service-role headers."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }
    if content_type:
        headers["Content-Type"] = "application/json"
    return headers


def verify_admin(user_token):
    """Verify user is admin using Supabase REST API.
    Returns (user_id, None) on success or (None, error_string) on failure.
    """
    headers = {
        'Authorization': f'Bearer {user_token}',
        'apikey': SUPABASE_SERVICE_KEY
    }
    user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
    if user_resp.status_code != 200:
        return None, "Invalid token"

    user_data = user_resp.json()
    user_id = user_data.get('id')

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
