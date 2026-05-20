import os
import requests
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

formspree_bp = Blueprint("formspree", __name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = "Bernardo's English Helper <hello@bernardomorales.com>"
INVITATION_CODE = "BETA2026OOFVED"
SIGNUP_URL = "https://englishhelper.bernardomorales.com/"


def detect_language(data: dict) -> str:
    """
    Returns 'es' or 'en'.
    Checks explicit language fields first, then falls back to 'es'.
    """
    for key in ("language", "idioma", "_language", "lang"):
        val = str(data.get(key, "")).lower()
        if val in ("en", "english", "inglés", "ingles"):
            return "en"
        if val in ("es", "spanish", "español", "espanol"):
            return "es"
    return "es"  # default: Spanish


def build_email(name: str, language: str) -> tuple[str, str, str]:
    """Returns (to_name, subject, html_body)."""
    first = name.split()[0] if name else "there"

    if language == "en":
        subject = "You're in — here's your English Helper invitation"
        html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="color:#16a34a;">Welcome to English Helper! 🎉</h2>
  <p>Hi {first},</p>
  <p>Thanks for signing up. You're one of the first people to try <strong>English Helper</strong> — an AI-powered English tutor designed to help you speak with confidence.</p>

  <p>Here's your personal invitation code:</p>
  <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 24px;text-align:center;margin:24px 0;">
    <span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#15803d;">{INVITATION_CODE}</span>
  </div>

  <h3 style="color:#15803d;">How to get started:</h3>
  <ol style="line-height:2;">
    <li>Go to <a href="{SIGNUP_URL}" style="color:#16a34a;">{SIGNUP_URL}</a></li>
    <li>Click <strong>Sign Up</strong></li>
    <li>Fill in your name, email, and password</li>
    <li>Enter the invitation code above when prompted</li>
    <li>Start your first English conversation!</li>
  </ol>

  <p>If you have any questions, just reply to this email.</p>
  <p>Looking forward to hearing from you,<br><strong>Bernardo</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:12px;color:#9ca3af;">English Helper · <a href="{SIGNUP_URL}" style="color:#9ca3af;">{SIGNUP_URL}</a></p>
</div>
"""
    else:
        subject = "Ya estás dentro — aquí está tu invitación a English Helper"
        html = f"""
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;">
  <h2 style="color:#16a34a;">¡Bienvenido a English Helper! 🎉</h2>
  <p>Hola {first},</p>
  <p>Gracias por registrarte. Eres una de las primeras personas en probar <strong>English Helper</strong> — un tutor de inglés con inteligencia artificial diseñado para ayudarte a hablar con confianza.</p>

  <p>Este es tu código de invitación personal:</p>
  <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 24px;text-align:center;margin:24px 0;">
    <span style="font-size:24px;font-weight:bold;letter-spacing:4px;color:#15803d;">{INVITATION_CODE}</span>
  </div>

  <h3 style="color:#15803d;">Cómo empezar:</h3>
  <ol style="line-height:2;">
    <li>Entra en <a href="{SIGNUP_URL}" style="color:#16a34a;">{SIGNUP_URL}</a></li>
    <li>Haz clic en <strong>Registrarse</strong></li>
    <li>Rellena tu nombre, correo y contraseña</li>
    <li>Introduce el código de invitación de arriba cuando te lo pidan</li>
    <li>¡Empieza tu primera conversación en inglés!</li>
  </ol>

  <p>Si tienes cualquier duda, responde a este correo y te ayudo.</p>
  <p>¡Hasta pronto!<br><strong>Bernardo</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="font-size:12px;color:#9ca3af;">English Helper · <a href="{SIGNUP_URL}" style="color:#9ca3af;">{SIGNUP_URL}</a></p>
</div>
"""

    return first, subject, html


@formspree_bp.route("/formspree_webhook", methods=["POST", "OPTIONS"])
@cross_origin(origins="*")
def formspree_webhook():
    """
    Receives Formspree webhook payloads and sends a confirmation email
    to the submitter via Resend.
    """
    if not RESEND_API_KEY:
        print("RESEND_API_KEY not set — skipping email")
        return jsonify({"ok": True}), 200

    try:
        data = request.json or {}

        email = data.get("email", "").strip()
        name = data.get("name", data.get("nombre", "")).strip()
        language = detect_language(data)

        if not email:
            print("Formspree webhook: no email in payload, skipping")
            return jsonify({"ok": True}), 200

        first, subject, html = build_email(name, language)

        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": FROM_EMAIL,
                "to": [email],
                "subject": subject,
                "html": html
            },
            timeout=10
        )

        if resp.status_code in (200, 201, 202):
            print(f"Invitation email sent to {email} ({language})")
        else:
            print(f"Resend error {resp.status_code}: {resp.text}")

    except Exception as e:
        print(f"formspree_webhook error: {e}")

    # Always return 200 so Formspree doesn't retry indefinitely
    return jsonify({"ok": True}), 200
