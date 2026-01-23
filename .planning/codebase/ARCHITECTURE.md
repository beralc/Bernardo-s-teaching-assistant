# Architecture

**Analysis Date:** 2026-01-23

## Pattern Overview

**Overall:** Tiered client-server architecture with React frontend, Flask backend API, and Supabase backend-as-a-service.

**Key Characteristics:**
- Frontend and backend are completely separated (frontend on Vercel, backend on Render)
- API-driven communication via HTTP/HTTPS with bearer token authentication
- Supabase handles authentication, database, and file storage
- OpenAI integration for conversational AI via gpt-4o-mini (text) and gpt-4o-realtime-preview (voice)
- Admin-protected routes with role-based access control

## Layers

**Frontend (React):**
- Purpose: Senior-first UI with accessibility features (high contrast, font sizing)
- Location: `frontend/frontend-app/src/`
- Contains: React components, state management, audio handling, Supabase client SDK integration
- Depends on: Supabase JS client, React, Tailwind CSS
- Used by: Browser clients (deployed on Vercel)

**Backend API (Flask):**
- Purpose: OpenAI integration, admin operations, session analysis, voice orchestration
- Location: `app/app.py`
- Contains: RESTful endpoints for chat, voice sessions, user management, Can-Do achievement analysis
- Depends on: Flask, OpenAI SDK, Supabase REST API (via requests), environment variables
- Used by: Frontend application via HTTP requests

**Data Layer (Supabase):**
- Purpose: PostgreSQL database, authentication, file storage, real-time subscriptions
- Location: Cloud-hosted (not in repository)
- Contains: User profiles, conversation sessions, transcriptions, achievements, file storage for avatars
- Depends on: External service (Supabase)
- Used by: Both frontend (JWT tokens) and backend (service role key)

## Data Flow

**Text Chat Flow:**

1. User enters text in `TalkView` component (`frontend/frontend-app/src/App.js` lines 1780+)
2. Frontend sends POST to `/chat_text` with text and session context
3. Backend (`app/app.py` lines 48-88) loads prompt.json as system message, calls OpenAI ChatCompletion
4. Response returned to frontend and rendered in conversation UI
5. Transcription optionally saved to Supabase `transcriptions` table

**Voice Chat Flow:**

1. User clicks microphone in `TalkView`
2. Frontend requests WebRTC session from POST `/webrtc_session` (`app/app.py` lines 90-203)
3. Backend:
   - Fetches user's voice preference from Supabase profiles
   - Loads prompt.json as instructions
   - Creates ephemeral session with OpenAI Realtime API
   - Returns session ID, WebSocket URL, and ephemeral token
4. Frontend connects WebSocket to OpenAI, handles audio I/O
5. On voice activity detection, user audio transcribed and conversation continues
6. Session ends when microphone stopped or timeout
7. Optional: transcript sent to `/analyze_session` for Can-Do achievement detection

**Session Tracking & Analytics:**

1. On session start: `startSession()` creates entry in `conversation_sessions` table with topic
2. Transcriptions saved row-by-row to `transcriptions` table as they're captured
3. On session end: `endSession()` updates `conversation_sessions` with duration and end time
4. Optional: `analyzeSessionForCando()` sends transcript to backend, GPT analyzes achievement capability

**State Management:**

- Frontend: React hooks (useState, useEffect, useRef) for UI state, conversation tracking, user info
- Session context persisted in Flask session for single-tab usage (maintains `context` array)
- User state synced with Supabase via onAuthStateChange listener
- Profile data cached in React state after fetch

## Key Abstractions

**OpenAI Integration:**
- Purpose: Conversational AI backbone for both text and voice
- Examples: Lines 73-88 (ChatCompletion), lines 141-193 (Realtime session)
- Pattern: Direct HTTP requests with API key, prompt engineering via prompt.json, structured conversation history

**User Context (Prompt):**
- Purpose: Behavioral instructions and user topic context for AI consistency
- Examples: `app/prompt.json` (35KB configuration document)
- Pattern: Loaded as JSON, injected as system prompt or WebRTC instructions, merged with current topic

**Session Management:**
- Purpose: Track conversation state and analytics
- Examples: `sessionLogId`, `sessionStartTime`, `sessionConversation` (global state in App.js)
- Pattern: Started on topic selection, ended on UI navigation or timeout, persisted to Supabase

**Admin Verification:**
- Purpose: Enforce admin-only access to management endpoints
- Examples: `verify_admin()` function (`app/app.py` lines 206-238)
- Pattern: Bearer token validation → Supabase user lookup → profiles table `is_admin` check

**Can-Do Achievement Analysis:**
- Purpose: Automatic skill recognition from conversation transcripts
- Examples: `analyze_session_cando()` (`app/app.py` lines 625-778), `analyzeSessionForCando()` (App.js lines 208-273)
- Pattern: Transcript → GPT analysis with CEFR framework → user_cando_achievements table insert

## Entry Points

**Frontend Root:**
- Location: `frontend/frontend-app/src/index.js`
- Triggers: Browser load
- Responsibilities: Mounts React app, initializes Supabase auth listener, renders SeniorFirstEnglishAssistant component

**Main App Component:**
- Location: `frontend/frontend-app/src/App.js` lines 31-63 (SeniorFirstEnglishAssistant)
- Triggers: Auth state change
- Responsibilities: Authentication check, route to OnboardingScreen or MainApp

**Backend Entry:**
- Location: `app/app.py` lines 1-40 (Flask initialization) and lines 996-1000 (server start)
- Triggers: Python process start
- Responsibilities: Configure CORS, load OpenAI API key, initialize Flask app, listen on port 5000 (dev) or from PORT env var

**Key Route Handlers:**
- `POST /chat_text` - Text conversation endpoint
- `POST /webrtc_session` - Voice session initialization
- `GET /admin/users`, `POST /admin/users` - User management
- `POST /analyze_session` - Can-Do skill detection

## Error Handling

**Strategy:** Try-catch blocks with descriptive error messages returned as JSON with HTTP status codes.

**Patterns:**
- Frontend: Try-catch in async functions, console.error for debugging, fallback UI states
- Backend: HTTP error codes (400 bad request, 401 unauthorized, 403 forbidden, 500 server error), exception catching with str(e) in JSON response
- OpenAI failures: Detailed logging (status code, response text) before returning error to client

**Example (app.py lines 196-203):**
```python
except requests.exceptions.HTTPError as http_err:
    print(f"HTTP error occurred: {http_err}")
    print(f"Response status code: {http_err.response.status_code}")
    print(f"Response text: {http_err.response.text}")
    return jsonify({"error": f"HTTP error from OpenAI: {http_err.response.status_code} - {http_err.response.text}"}), 500
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    return jsonify({"error": str(e)}), 500
```

## Cross-Cutting Concerns

**Logging:** Console.log (frontend) and print statements (backend) for debugging. OpenAI responses logged for troubleshooting (app.py line 173).

**Validation:**
- Frontend: Input validation for passwords, file sizes (2MB avatar limit, app.js lines 671-674), email format checked by Supabase
- Backend: Request data validation (email/password required, app.py lines 310-319)

**Authentication:**
- Frontend: Supabase auth.onAuthStateChange() listener, JWT stored in Supabase session
- Backend: Bearer token extraction from Authorization header, token validated via Supabase auth API (app.py lines 209-215)
- Route Protection: All `/admin/` routes require verified admin status before database operations

---

*Architecture analysis: 2026-01-23*
