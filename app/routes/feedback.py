import json
import re
import time
import requests
from flask import Blueprint, request, jsonify
from config import openai_client, SUPABASE_URL, SUPABASE_SERVICE_KEY

feedback_bp = Blueprint("feedback", __name__)


@feedback_bp.route("/analyze_feedback", methods=["POST"])
def analyze_feedback():
    """
    Analyze a conversation transcript for corrective feedback patterns.
    Detects recasts, expansions, explicit corrections, and learner uptake.
    For SLA research (Thesis Chapter 11).
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

        data = request.json
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        transcript = data.get('transcript')  # Array of {role, content} objects

        if not all([session_id, user_id, transcript]):
            return jsonify({"error": "Missing required fields: session_id, user_id, transcript"}), 400

        print(f"analyze_feedback called: session={session_id}, user={user_id}, turns={len(transcript)}")

        start_time = time.time()

        print("Calling GPT for feedback analysis...")
        analysis_result = analyze_feedback_with_gpt(transcript)
        print(f"GPT analysis complete: {len(analysis_result.get('feedback_sequences', []))} sequences found")

        processing_time = int((time.time() - start_time) * 1000)

        headers = {
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'apikey': SUPABASE_SERVICE_KEY,
            'Content-Type': 'application/json'
        }

        feedback_sequences = analysis_result.get('feedback_sequences', [])
        recasts = sum(1 for f in feedback_sequences if f.get('feedback_type') == 'recast')
        expansions = sum(1 for f in feedback_sequences if f.get('feedback_type') == 'expansion')
        explicit = sum(1 for f in feedback_sequences if f.get('feedback_type') == 'explicit_correction')
        uptake_count = sum(1 for f in feedback_sequences if f.get('uptake_detected'))
        modified_count = sum(1 for f in feedback_sequences if f.get('modified_output'))

        analysis_data = {
            'session_id': session_id,
            'user_id': user_id,
            'model_used': 'gpt-4o-mini',
            'processing_time_ms': processing_time,
            'total_ai_turns': len([t for t in transcript if t.get('role') == 'assistant']),
            'recasts_count': recasts,
            'expansions_count': expansions,
            'explicit_corrections_count': explicit,
            'uptake_instances': uptake_count,
            'modified_output_instances': modified_count,
            'feedback_sequences': feedback_sequences  # JSONB column - don't stringify
        }

        headers['Prefer'] = 'return=representation'

        print(f"Inserting feedback analysis for session {session_id}")
        analysis_resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/session_feedback_analysis',
            headers=headers,
            json=analysis_data
        )

        print(f"Analysis insert response: {analysis_resp.status_code} - {analysis_resp.text[:500] if analysis_resp.text else 'empty'}")

        analysis_id = None
        if analysis_resp.status_code in [200, 201]:
            inserted = analysis_resp.json()
            if inserted and len(inserted) > 0:
                analysis_id = inserted[0].get('id')

        for seq in feedback_sequences:
            if seq.get('feedback_type') != 'none':
                instance_data = {
                    'session_id': session_id,
                    'user_id': user_id,
                    'analysis_id': analysis_id,
                    'turn_number': seq.get('turn_number'),
                    'feedback_type': seq.get('feedback_type'),
                    'learner_utterance': seq.get('learner_utterance'),
                    'learner_error': seq.get('learner_error'),
                    'ai_response': seq.get('ai_response'),
                    'corrected_form': seq.get('corrected_form'),
                    'uptake_detected': seq.get('uptake_detected', False),
                    'uptake_type': seq.get('uptake_type', 'not_applicable'),
                    'modified_output': seq.get('modified_output', False),
                    'confidence_score': seq.get('confidence'),
                    'evidence_notes': seq.get('evidence_notes')
                }

                instance_resp = requests.post(
                    f'{SUPABASE_URL}/rest/v1/feedback_instances',
                    headers=headers,
                    json=instance_data
                )
                if instance_resp.status_code not in [200, 201]:
                    print(f"Error inserting feedback instance: {instance_resp.status_code} - {instance_resp.text[:200]}")

        return jsonify({
            "success": True,
            "session_id": session_id,
            "processing_time_ms": processing_time,
            "summary": {
                "total_ai_turns": analysis_data['total_ai_turns'],
                "recasts": recasts,
                "expansions": expansions,
                "explicit_corrections": explicit,
                "uptake_instances": uptake_count,
                "modified_output_instances": modified_count
            },
            "feedback_sequences": feedback_sequences
        })

    except Exception as e:
        print(f"Error in analyze_feedback: {e}")
        return jsonify({"error": str(e)}), 500


def analyze_feedback_with_gpt(transcript):
    """
    Use GPT to analyze transcript for corrective feedback patterns.
    Based on SLA research frameworks (Lyster & Ranta, 1997; Sheen, 2006).
    """
    try:
        transcript_text = "\n".join([
            f"Turn {i+1} - {'Learner' if t.get('role') == 'user' else 'Teacher'}: {t.get('content', '')}"
            for i, t in enumerate(transcript)
        ])

        prompt = f"""You are an expert in Second Language Acquisition (SLA) research, analyzing a conversation between an English learner and an AI teacher.

Analyze the transcript for CORRECTIVE FEEDBACK patterns. Identify each instance where the AI teacher provides feedback on learner errors.

FEEDBACK TYPE DEFINITIONS (Lyster & Ranta, 1997):

1. **RECAST**: Teacher reformulates all or part of the learner's utterance minus the error, without explicitly indicating an error was made.
   - Example: Learner: "I goed to the store" → Teacher: "Oh, you went to the store. What did you buy?"

2. **EXPANSION**: Teacher expands on the learner's utterance while implicitly correcting or modeling correct form.
   - Example: Learner: "I like swim" → Teacher: "You like swimming! Swimming is great exercise."

3. **EXPLICIT CORRECTION**: Teacher clearly indicates the error and provides the correct form.
   - Example: Learner: "She don't like it" → Teacher: "Actually, we say 'she doesn't like it' because..."

Also detect UPTAKE (learner's response to feedback):
- **SUCCESSFUL**: Learner uses the corrected form
- **PARTIAL**: Learner attempts but doesn't fully succeed
- **NONE**: Learner doesn't incorporate the correction

And MODIFIED OUTPUT (learner self-corrects without explicit feedback).

TRANSCRIPT:
{transcript_text}

Respond in JSON format:
{{
  "feedback_sequences": [
    {{
      "turn_number": 2,
      "feedback_type": "recast|expansion|explicit_correction|none",
      "learner_utterance": "what the learner said",
      "learner_error": "the specific error (grammar, vocabulary, etc.)",
      "ai_response": "the teacher's response",
      "corrected_form": "the correct form provided",
      "uptake_detected": true/false,
      "uptake_type": "successful|partial|none|not_applicable",
      "modified_output": true/false,
      "confidence": 0.85,
      "evidence_notes": "brief explanation"
    }}
  ]
}}

Only include turns where feedback was provided (feedback_type != "none").
Be conservative - only mark clear instances of corrective feedback."""

        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an SLA research expert. Respond only in valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=3000
        )

        result_text = response.choices[0].message.content.strip()

        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', result_text, re.DOTALL)
        if json_match:
            result_text = json_match.group(1)

        if not result_text.startswith('{'):
            json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
            if json_match:
                result_text = json_match.group(0)

        result = json.loads(result_text)
        return result

    except Exception as e:
        print(f"Error in feedback GPT analysis: {e}")
        return {
            "feedback_sequences": [],
            "error": True,
            "error_message": str(e)
        }
