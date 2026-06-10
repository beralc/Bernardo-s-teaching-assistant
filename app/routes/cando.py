import json
import re
import time
import requests
from flask import Blueprint, request, jsonify
from config import openai_client, SUPABASE_URL, SUPABASE_SERVICE_KEY
from utils import verify_admin

cando_bp = Blueprint("cando", __name__)


@cando_bp.route("/users/<user_id>/cando", methods=["GET"])
def get_user_cando_achievements(user_id):
    """
    Get user's Can-Do achievements and progress.
    Returns achievements grouped by level with progress percentages.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]

        headers = {
            'Authorization': f'Bearer {user_token}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        if user_resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401

        auth_user_id = user_resp.json().get('id')

        if auth_user_id != user_id:
            admin_id, error = verify_admin(user_token)
            if error:
                return jsonify({"error": "Forbidden: Can only access your own data"}), 403

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

        achievements_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&select=*,cando_statements(level,descriptor,skill_type)&order=achieved_at.desc',
            headers=headers
        )

        if achievements_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch achievements"}), 500

        achievements = achievements_resp.json()
        achieved_ids = {a['cando_id'] for a in achievements if a.get('admin_approved') != False}

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

        for level_data in levels_data.values():
            total = level_data['total']
            achieved = level_data['achieved']
            level_data['percentage'] = round((achieved / total * 100), 1) if total > 0 else 0
            level_data['recent_achievements'].sort(
                key=lambda x: x.get('achieved_at', ''),
                reverse=True
            )

        level_order = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2']
        ordered_levels = [levels_data[lvl] for lvl in level_order if lvl in levels_data]

        total_achievements = len(achieved_ids)

        return jsonify({
            "user_id": user_id,
            "total_achievements": total_achievements,
            "progress_by_level": ordered_levels
        })

    except Exception as e:
        print(f"Error in get_user_cando_achievements: {e}")
        return jsonify({"error": str(e)}), 500


@cando_bp.route("/analyze_session", methods=["POST"])
def analyze_session_cando():
    """
    Analyze a voice session transcript for Can-Do achievements.
    Uses GPT to detect which Can-Do statements were demonstrated.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]

        headers = {
            'Authorization': f'Bearer {user_token}',
            'apikey': SUPABASE_SERVICE_KEY
        }
        user_resp = requests.get(f'{SUPABASE_URL}/auth/v1/user', headers=headers)
        if user_resp.status_code != 200:
            return jsonify({"error": "Invalid token"}), 401

        auth_user_id = user_resp.json().get('id')

        data = request.json
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        transcript = data.get('transcript')
        user_level = data.get('user_level')

        if not all([session_id, user_id, transcript]):
            return jsonify({"error": "Missing required fields: session_id, user_id, transcript"}), 400

        # Only the user themselves (normal post-session analysis) or an admin
        # (re-analysis tool in AdminView) may write achievements for user_id.
        if auth_user_id != user_id:
            admin_id, error = verify_admin(user_token)
            if error:
                return jsonify({"error": "Forbidden: Can only analyze your own sessions"}), 403

        if not user_level:
            headers = {
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
                'apikey': SUPABASE_SERVICE_KEY
            }
            profile_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=english_level',
                headers=headers
            )
            if profile_resp.status_code == 200 and profile_resp.json():
                user_level = profile_resp.json()[0].get('english_level', 'A2')
            else:
                user_level = 'A2'

        # Restrict candidate statements to the learner's level and ONE adjacent
        # higher level (Krashen's i+1 / ZPD ceiling). Previously this list was
        # 'A1' .. 'B2+' regardless of learner level, which let GPT award B2
        # descriptors to A2 users from a 1-minute coffee chat — a research
        # validity bug. Senior A2 learners should not be receiving B2 Can-Do
        # statements without an explicit level promotion.
        # C1/C2 included so self-reported advanced users get a correct window
        # instead of silently falling back to the A2 default.
        LEVEL_LADDER = ['A1', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C2']
        try:
            user_idx = LEVEL_LADDER.index(user_level)
        except ValueError:
            print(f"Unknown user_level '{user_level}', defaulting to A2 window")
            user_idx = LEVEL_LADDER.index('A2')

        # Window: current level + up to two adjacent rungs above (covers, e.g.,
        # A2 -> A2+, B1). Includes A1 for A1/A2 users to catch consolidation.
        low_idx = max(0, user_idx - 1)
        high_idx = min(len(LEVEL_LADDER) - 1, user_idx + 2)
        available_levels = LEVEL_LADDER[low_idx:high_idx + 1]

        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY
        }

        level_query = ','.join(available_levels)
        # Voice sessions only capture the learner's PRODUCTION (speaking +
        # interaction). Receptive 'listening' descriptors cannot be validly
        # assessed from a speaking-only transcript and were the source of
        # spurious B2 awards (e.g. "Can follow complex lines of argument in a
        # lecture..." awarded after a 1-minute coffee chat). Exclude them.
        skill_types = ['speaking', 'interaction']
        skill_query = ','.join(skill_types)
        statements_resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/cando_statements'
            f'?level=in.({level_query})'
            f'&skill_type=in.({skill_query})'
            f'&select=id,level,skill_type,descriptor',
            headers=headers
        )

        print(f"Querying Can-Do statements for levels: {level_query} | skills: {skill_query} | user_level: {user_level}")

        if statements_resp.status_code != 200:
            return jsonify({"error": "Failed to fetch Can-Do statements"}), 500

        statements = statements_resp.json()

        start_time = time.time()
        analysis_result = analyze_transcript_with_gpt(transcript, statements, user_level)
        processing_time = int((time.time() - start_time) * 1000)

        headers['Content-Type'] = 'application/json'
        log_data = {
            'session_id': session_id,
            'user_id': user_id,
            'transcript_length': len(transcript),
            'detected_achievements': analysis_result.get('detected_achievements', []),
            'model_used': 'gpt-4o-mini',
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

        detected = analysis_result.get('detected_achievements', [])
        new_achievements = []

        for achievement in detected:
            check_resp = requests.get(
                f'{SUPABASE_URL}/rest/v1/user_cando_achievements?user_id=eq.{user_id}&cando_id=eq.{achievement["cando_id"]}',
                headers=headers
            )

            if check_resp.status_code == 200 and len(check_resp.json()) == 0:
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
    Use GPT to analyze transcript and detect Can-Do achievements.
    """
    try:
        statements_text = "\n".join([
            f"{i+1}. [{stmt['id']}] ({stmt['level']} - {stmt['skill_type']}): {stmt['descriptor']}"
            for i, stmt in enumerate(statements)
        ])

        prompt = f"""You are an expert CEFR language assessor analyzing a learner's English conversation transcript for a PhD research project on senior language learners.

The learner's assigned level is: {user_level}
The candidate Can-Do statements below have already been pre-filtered to the
learner's level (and at most two adjacent rungs above). Do NOT award statements
outside this candidate list.

Analyze the conversation transcript and identify which Can-Do statements the
learner has UNAMBIGUOUSLY DEMONSTRATED through their own language production
(USER turns only). The assistant/teacher turns are context — they are NEVER
evidence of learner ability.

ASSESSMENT CRITERIA (be conservative — false positives invalidate research):
- Award a statement ONLY if the USER turns contain concrete, productive
  evidence that meets the full descriptor. Comprehending the teacher does not
  count as evidence.
- Each award MUST quote at least one verbatim USER utterance from the
  transcript as evidence. If you cannot quote a user utterance that
  demonstrates the descriptor, do not award it.
- A short, simple conversation (e.g. < 6 user turns or < ~60 seconds of
  speech) can demonstrate at most 1-2 statements. Do not pad.
- Do NOT award descriptors that describe LISTENING comprehension,
  documentaries, lectures, reading, or writing — this is a speaking session.
- Confidence scale (strict): 0.80 = clearly demonstrated, 0.90 = strongly
  demonstrated, 0.95+ = exceptionally demonstrated. Anything below 0.80 is
  insufficient evidence — do not include it.
- If there is NO clear evidence, return an empty array. An empty array is the
  correct, expected outcome for short or off-topic conversations.

TRANSCRIPT:
{transcript}

CAN-DO STATEMENTS TO EVALUATE (pre-filtered to learner's level window):
{statements_text}

For each Can-Do statement clearly demonstrated by USER turns, respond with:
1. The statement ID (in brackets from above)
2. Confidence score (0.80-1.0)
3. A verbatim quote of the USER utterance(s) that demonstrate the capability
   (max 100 words; must come from a USER turn, not the assistant)

Respond in JSON format:
{{
  "detected_achievements": [
    {{
      "cando_id": "uuid-here",
      "confidence": 0.85,
      "evidence": "Verbatim USER quote(s) demonstrating this capability..."
    }}
  ]
}}

Include only statements with confidence >= 0.80. If no statements were
clearly demonstrated, return an empty array."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert CEFR language assessor. Respond only in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2000
        )

        result_text = response.choices[0].message.content.strip()
        print(f"GPT response (first 500 chars): {result_text[:500]}")

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(1)
            print("Extracted JSON from markdown code block")

        if not result_text.startswith('{'):
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(0)
                print("Extracted JSON from text")

        result = json.loads(result_text)

        stmt_dict = {s['id']: s for s in statements}
        for achievement in result.get('detected_achievements', []):
            cando_id = achievement['cando_id']
            if cando_id in stmt_dict:
                achievement['descriptor'] = stmt_dict[cando_id]['descriptor']
                achievement['level'] = stmt_dict[cando_id]['level']

        return result

    except Exception as e:
        print(f"Error in GPT analysis: {e}")
        try:
            if 'result_text' in locals():
                print(f"Raw GPT response that caused error: {result_text}")
        except Exception as inner_e:
            print(f"Error accessing result_text in exception handler: {inner_e}")
        return {
            "detected_achievements": [],
            "error": True,
            "error_message": str(e)
        }


@cando_bp.route("/admin/users/<user_id>/cando/<cando_id>", methods=["POST"])
def admin_add_cando_achievement(user_id, cando_id):
    """
    Manually add a Can-Do achievement for a user (admin only).
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401

        user_token = auth_header.split(' ')[1]
        admin_id, error = verify_admin(user_token)
        if error:
            return jsonify({"error": error}), 403 if "Forbidden" in error else 401

        data = request.json or {}
        admin_notes = data.get('notes', '')

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


@cando_bp.route("/admin/users/<user_id>/cando/<cando_id>", methods=["DELETE"])
def admin_remove_cando_achievement(user_id, cando_id):
    """
    Remove a Can-Do achievement for a user (admin only).
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
