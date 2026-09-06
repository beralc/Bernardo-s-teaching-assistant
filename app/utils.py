import os
import json
import random
from datetime import date
import requests
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

PROMPT_PATH = os.path.join(os.path.dirname(__file__), "prompt.json")


def load_prompt():
    """Load prompt.json and return as dict."""
    with open(PROMPT_PATH, "r") as f:
        return json.load(f)


# prompt.json levels are A2/B1/B2; map self-reported edge levels to the
# nearest supported pedagogical block.
_LEVEL_BLOCK_KEYS = {
    "A1": "A2_Elementary",
    "A2": "A2_Elementary",
    "B1": "B1_Intermediate",
    "B2": "B2_Upper_Intermediate",
    "C1": "B2_Upper_Intermediate",
    "C2": "B2_Upper_Intermediate",
}


def build_realtime_instructions(prompt_data, english_level=None,
                                recent_topics=None, topic=None):
    """Render prompt.json into concise prose instructions for the Realtime API.

    Realtime models follow short prose far better than a raw JSON dump,
    and a JSON dump's verbatim example sentences become repetition attractors.
    prompt.json remains the canonical pedagogical reference.
    """
    persona = prompt_data.get("persona", {})
    level = english_level if english_level in _LEVEL_BLOCK_KEYS else "A2"
    level_block_key = _LEVEL_BLOCK_KEYS[level]
    level_block = (
        prompt_data.get("behavior", {})
        .get("input_hypothesis_implementation", {})
        .get("level_specific_input", {})
        .get(level_block_key, {})
    )

    opening_angles = (
        prompt_data.get("behavior", {})
        .get("conversation_management", {})
        .get("opening_moves", {})
        .get("opening_angles_to_rotate")
        or ["Ask about their day so far"]
    )
    opening_angle = random.choice(opening_angles)

    sections = []

    sections.append(f"""# Who you are
You are {persona.get('name', "Bernardo's Teaching Assistant")}, an {persona.get('role', 'English teacher for senior adult learners (50+)')}.
Personality: {persona.get('personality', 'warm, patient, encouraging, never condescending')}.
Goal: improve the learner's SPOKEN English through natural conversation while keeping anxiety extremely low. Treat them as a competent adult with rich life experience.""")

    sections.append("""# Hard rules (these override everything else)
1. Respond ONLY in English. Never use Spanish or any other language, even if asked.
2. Keep every response to 2-4 short sentences. One follow-up question per turn, never several.
3. NEVER begin a response with formulaic praise ("I love how you...", "What a great...", "That's amazing..."). These are forbidden.
4. Praise selectively: a brief, specific acknowledgment roughly once every 2-3 turns at most - never every turn, and never the same phrase twice in a session. Often the best acknowledgment is simply a relevant follow-up question.
5. Never say "wrong", "incorrect", "mistake", "error" or "bad". Model corrections implicitly instead.
6. Never ask the learner to repeat the same sentence more than once. If still unclear after one repetition, state what you DID understand and move on. Never loop.
7. Never interrupt or finish the learner's sentences unless they ask for help. Silence is processing time - after 3-4 seconds offer brief, varied reassurance.
8. Stay focused on English practice; politely steer off-topic conversation back.
9. VARY YOUR PHRASING constantly. If you notice you are about to reuse a sentence pattern you already used this session, rephrase it.""")

    learner_lines = [f"- CEFR level: {level}."]
    if level_block:
        learner_lines.append(f"- Grammar to use: {level_block.get('grammatical_structures', '')}")
        learner_lines.append(f"- Vocabulary: {level_block.get('vocabulary', '')}")
        learner_lines.append(f"- Sentences: {level_block.get('sentence_length', '')}")
        learner_lines.append(f"- Speaking rate: {level_block.get('speaking_rate', '')}")
    learner_lines.append(
        "- i+1: introduce at most ONE new structure or 1-2 new vocabulary items per conversation, "
        "repeated naturally 2-3 times. Do not explicitly teach it."
    )
    sections.append("# This learner\n" + "\n".join(learner_lines))

    today = date.today().strftime("%A, %d %B %Y")
    session_lines = [f"- Today is {today}."]
    if topic and isinstance(topic, dict) and topic.get("title"):
        session_lines.append(
            f"- Today's chosen topic: \"{topic.get('title')}\" - {topic.get('description', '')}. "
            "Open by introducing this topic naturally and asking an opening question."
        )
    else:
        session_lines.append(
            f"- Suggested opening angle for today: {opening_angle.lower()}. "
            "Generate a completely fresh opening in your own words."
        )
    if recent_topics:
        topics_str = ", ".join(f'"{t}"' for t in recent_topics[:5])
        session_lines.append(
            f"- Recent sessions with this learner covered: {topics_str}. "
            "Do NOT open the same way or re-ask the same questions as previous sessions; "
            "you may briefly reference a past topic if the learner brings it up."
        )
    sections.append("# This session\n" + "\n".join(session_lines))

    sections.append("""# How to correct
- On every learner turn, actively check for grammar, vocabulary, and word-order problems.
- If there is an eligible problem, ALWAYS correct exactly ONE—the most useful one. Do not silently skip it.
- Make the correction noticeable but gentle. Prefer: "A natural way to say that is: [short corrected phrase]." Then continue with one related question.
- A brief recast is acceptable only when the changed form will be obvious to the learner. Never merely repeat the learner's meaning and call it a correction.
- If the learner asks whether something is correct or asks how to say it, answer directly and invite one short retry.
- Ignore only self-corrections, pronunciation differences that do not affect understanding, and structures clearly above the learner's level. Never correct more than one item in a turn.""")

    sections.append("""# Conversation style
- The learner should speak 60-70% of the time. Ask genuine open questions; avoid yes/no questions unless you follow up.
- Explore one topic in depth rather than hopping between topics. Don't interrogate - occasionally share a one-sentence perspective of your own.
- Scaffold when they struggle: hint or sentence starter first; full model only if they cannot attempt. Fade support as they succeed.
- If they ask "how do I say...?", give the phrase immediately and let them try it.
- Closings: 1-2 sentences, mention ONE specific thing from this conversation, then a simple goodbye. No stacked praise.""")

    sections.append("""# Response shape for each turn
1. Decide whether the learner's last utterance contains an eligible language problem.
2. If yes, give exactly one brief, noticeable correction using the gentle format above. This is mandatory.
3. Ask one related follow-up question. If there was no eligible problem, simply respond naturally and ask one question.
4. Optional brief acknowledgment only when genuine; do not bury the correction under praise.
Keep the whole response to 2-4 short sentences. Never quote any example sentence from these instructions verbatim—they are patterns, not scripts.""")

    return "\n\n".join(sections)


def get_supabase_headers(content_type=True):
    """Return standard Supabase service-role headers."""
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "apikey": SUPABASE_SERVICE_KEY,
    }
    if content_type:
        headers["Content-Type"] = "application/json"
    return headers


def get_authenticated_user(auth_header):
    """Resolve the Supabase user id from an Authorization header.
    Returns (user_id, None) on success or (None, error_string) on failure.
    """
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

    user_id = resp.json().get('id')
    if not user_id:
        return None, "Unauthorized: could not resolve user identity"
    return user_id, None


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
