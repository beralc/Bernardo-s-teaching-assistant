import os
import sys

# Ensure app directory is in Python path (works for both direct run and gunicorn)
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from flask_cors import CORS
from config import SECRET_KEY


def create_app():
    app = Flask(__name__)
    app.secret_key = SECRET_KEY

    CORS(app, resources={
        r"/*": {
            "origins": [
                "https://bernardo-s-teaching-assistant.vercel.app",
                "https://englishhelper.bernardomorales.com",
                "http://localhost:3000",
                "http://127.0.0.1:3000"
            ],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Register blueprints
    from routes.chat import chat_bp
    from routes.voice import voice_bp
    from routes.admin import admin_bp
    from routes.cando import cando_bp
    from routes.feedback import feedback_bp
    from routes.user import user_bp

    app.register_blueprint(chat_bp)
    app.register_blueprint(voice_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(cando_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(user_bp)

    return app


# Module-level app for both `python app.py` and `gunicorn app:app`
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
