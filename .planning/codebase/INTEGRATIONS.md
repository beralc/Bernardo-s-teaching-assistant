# External Integrations

**Analysis Date:** 2026-01-23

## APIs & External Services

**AI & Language Models:**

- **OpenAI API** - Core AI conversation provider
  - Chat Completions: `gpt-4o-mini` model for text-based conversations
  - Realtime (WebRTC): `gpt-4o-realtime-preview` model for voice conversations with server-side voice activity detection (VAD)
  - Audio Transcription: `whisper-1` model for converting audio input to text
  - SDK/Client: `openai` Python package (v0.27.0) in `app/app.py`
  - Auth: `OPENAI_API_KEY` environment variable
  - Session endpoint: `POST https://api.openai.com/v1/realtime/sessions` (line 141 in `app/app.py`)
  - WebSocket connection: `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`

**Voice Features:**

- Audio format: PCM16 (16-bit signed integer, 16 kHz sample rate)
- Voice options: Configurable per user, stored in database, retrieved before session creation
  - Default voice: "sage"
  - User preference fetched from Supabase profiles table at line 114-133 in `app/app.py`

## Data Storage

**Databases:**

- **Supabase PostgreSQL**
  - Type: Cloud-hosted PostgreSQL with REST API
  - Connection: `SUPABASE_URL` environment variable points to project endpoint
  - Admin Key: `SUPABASE_SERVICE_ROLE_KEY` for service-level access
  - Client: `@supabase/supabase-js` SDK (v2.77.0) in `frontend/frontend-app/src/supabaseClient.js`

  **Tables Used:**
  - `profiles` - User profile data (name, surname, tier, cefr_level, voice_preference, is_admin, avatar_url)
  - `transcriptions` - Stores conversation transcripts and corrections (line 81-96 in `App.js`)
  - `session_logs` - Conversation session tracking
  - `cando_statements` - Curriculum statements for language learning (CEFR levels A1-C2)
  - `user_cando_achievements` - User progress on Can-Do statements

  **Admin API Endpoints Used:**
  - `GET /rest/v1/profiles` - Query user profiles
  - `GET /auth/v1/user` - Verify authenticated user identity
  - `GET /auth/v1/admin/users` - List all users (admin only)
  - `POST /auth/v1/admin/users` - Create new user (admin only)
  - `DELETE /auth/v1/admin/users/{user_id}` - Delete user (admin only)
  - `PUT /auth/v1/admin/users/{user_id}` - Reset user password (admin only)
  - `PATCH /rest/v1/profiles` - Update user tier and profile data
  - `GET /rest/v1/cando_statements` - Fetch language learning descriptors
  - `GET /rest/v1/user_cando_achievements` - Track completed achievements

**File Storage:**

- Local filesystem only (no cloud storage integration like S3, Google Cloud Storage)
- Avatar files: Potentially stored in Supabase Storage based on schema documentation, but currently referenced via URL in profiles table

**Caching:**

- None detected - no Redis, Memcached, or other caching layer

## Authentication & Identity

**Auth Provider:**

- **Supabase Authentication** (PostgreSQL-based, OAuth-ready)
  - Implementation: Supabase handles all user authentication
  - User registration, email/password login, session management
  - Uses JWT tokens for API authorization
  - Frontend: `supabase.auth.onAuthStateChange()` listener in `App.js` (line 35-51)
  - Token-based requests: `Authorization: Bearer {token}` header pattern throughout `app/app.py`

**Verification Pattern:**

- Frontend obtains token from Supabase auth session
- Token passed to Flask backend in `Authorization` header
- Backend verifies token against Supabase auth API endpoint: `GET ${SUPABASE_URL}/auth/v1/user` with Bearer token
- Admin verification: `verify_admin()` function checks `is_admin` flag in profiles table (line 206-238 in `app/app.py`)

## Monitoring & Observability

**Error Tracking:**

- None detected - no Sentry, Rollbar, or similar integration

**Logs:**

- Console logging only: Python `print()` statements in `app/app.py` for debugging
- Frontend: `console.log()`, `console.error()`, `console.warn()` calls
- No centralized logging service (CloudWatch, Datadog, etc.)

## CI/CD & Deployment

**Hosting:**

- Frontend: Vercel (deployed React app)
  - CORS origin configured: `https://bernardo-s-teaching-assistant.vercel.app` (line 18 in `app/app.py`)
  - Local dev origins: `http://localhost:3000`, `http://127.0.0.1:3000`

- Backend: Not specified, but Flask app expects to run on `http://127.0.0.1:5000` locally and requires deployment somewhere accessible from Vercel

**CI Pipeline:**

- None detected - no GitHub Actions, GitLab CI, CircleCI, Jenkins configuration

## Environment Configuration

**Required env vars:**

Backend (`app/`):
- `OPENAI_API_KEY` - OpenAI API key (required for all AI features)
- `SUPABASE_URL` - Supabase project URL (required for database access)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (required for admin operations)

Frontend (`frontend/frontend-app/`):
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `REACT_APP_FLASK_API_URL` - Flask backend URL (optional, defaults to `http://127.0.0.1:5000`)

**Secrets location:**

- Development: `.env` file in project root (loaded via `python-dotenv`)
- Production: Environment variables set in deployment platform (Vercel for frontend, wherever backend is deployed)

## Webhooks & Callbacks

**Incoming:**

- None detected - Flask app does not expose webhook endpoints for receiving data from external services

**Outgoing:**

- None detected - App does not make scheduled outbound webhook calls

## Data Flow Summary

**Text Chat Flow:**
1. User submits text in frontend
2. Frontend sends `POST /chat_text` to Flask backend with text content
3. Flask loads `prompt.json` system prompt, appends user message to session context
4. Flask calls OpenAI ChatCompletion API with `gpt-4o-mini` model
5. Response returned to frontend and displayed
6. Context maintained server-side in Flask session

**Voice Chat Flow:**
1. Frontend requests voice session via `POST /webrtc_session`
2. Flask fetches user's voice preference from Supabase profiles
3. Flask loads `prompt.json` instructions and user's current learning topic (if selected)
4. Flask calls OpenAI Realtime session creation endpoint
5. OpenAI returns session ID and ephemeral token
6. Frontend receives WebSocket URL and token
7. Frontend establishes WebRTC connection directly to OpenAI WebSocket
8. Audio/text exchange happens between user and OpenAI Realtime API
9. Frontend sends session transcript to `POST /analyze_session` for Can-Do achievement analysis (post-session)

**Session Analysis Flow:**
1. Frontend calls `POST /analyze_session` with conversation transcript
2. Flask fetches relevant Can-Do statements from Supabase (for user's current level)
3. Flask sends transcript + statements to OpenAI ChatCompletion (GPT-4) for analysis
4. OpenAI detects which Can-Do statements were demonstrated
5. Flask stores achievements in `user_cando_achievements` table
6. Frontend displays progress update

**Admin User Management Flow:**
1. Admin user logs in via Supabase
2. Frontend sends requests with JWT token in `Authorization` header
3. Flask verifies admin status by checking `is_admin` flag in profiles table
4. Flask uses Supabase Admin API to create/delete/modify users
5. Changes reflected in auth system and profiles table

---

*Integration audit: 2026-01-23*
