# Codebase Structure

**Analysis Date:** 2026-01-23

## Directory Layout

```
Bernardo-s-teaching-assistant/
├── app/                           # Flask backend API
│   ├── app.py                     # Main backend server (1000 lines)
│   ├── prompt.json                # System prompt and behavioral instructions (35KB)
│   ├── requirements.txt            # Python dependencies
│   ├── static/                    # Deprecated (Flask template static assets)
│   └── templates/                 # Deprecated (Flask template files)
├── frontend/                      # React frontend application
│   └── frontend-app/              # Vercel-deployed React app
│       ├── src/                   # React source code
│       │   ├── App.js             # Main React component (4535 lines, monolithic)
│       │   ├── supabaseClient.js  # Supabase client initialization
│       │   ├── index.js           # Entry point
│       │   ├── App.css            # App styles
│       │   ├── index.css          # Global styles
│       │   ├── App.test.js        # Basic test file
│       │   ├── setupTests.js      # Jest configuration
│       │   └── reportWebVitals.js # Performance metrics
│       ├── public/                # Static assets (favicon, manifest)
│       ├── build/                 # Production build output (generated)
│       ├── package.json           # Frontend dependencies
│       ├── package-lock.json      # Dependency lock file
│       ├── craco.config.js        # Create React App configuration override
│       ├── tailwind.config.js     # Tailwind CSS configuration
│       └── README.md              # Frontend documentation
├── .planning/                     # GSD planning directory
│   └── codebase/                  # Codebase analysis documents
├── FAVICON/                       # Favicon source files
└── *.md, *.sql, *.pdf            # Documentation and database setup scripts
```

## Directory Purposes

**`app/`:**
- Purpose: Flask backend API server
- Contains: Route handlers, OpenAI integration, admin operations, database queries
- Key files: `app/app.py` (all backend logic)

**`app/static/`:**
- Purpose: Deprecated - old Flask template static assets
- Contains: Not actively used (React is main frontend)
- Note: Disabled in app.py line 35-40

**`app/templates/`:**
- Purpose: Deprecated - old Flask template files
- Contains: Old HTML templates
- Note: Disabled for security (SECURITY comment in app.py line 35)

**`frontend/frontend-app/src/`:**
- Purpose: React source code
- Contains: Single-file monolithic React component, Supabase client, styles, tests
- Key files: `App.js` (entire UI logic), `supabaseClient.js` (Supabase init)

**`frontend/frontend-app/public/`:**
- Purpose: Static assets served by React
- Contains: favicon.ico, manifest.json, index.html

**`frontend/frontend-app/build/`:**
- Purpose: Generated production build
- Committed: No (appears in .gitignore)
- Generated: By `npm run build`

**`.planning/codebase/`:**
- Purpose: Architecture and codebase analysis documents
- Committed: Yes
- Generated: By GSD analysis tools

## Key File Locations

**Entry Points:**
- Frontend: `frontend/frontend-app/public/index.html` (main HTML file)
- Frontend JS: `frontend/frontend-app/src/index.js` (React mount point)
- Backend: `app/app.py` (Flask app initialization, lines 1-40)

**Configuration:**
- Backend: `app/app.py` lines 1-40 (CORS, environment variables)
- Frontend: `frontend/frontend-app/src/supabaseClient.js` (Supabase URL and key)
- Frontend build: `frontend/frontend-app/craco.config.js` (Create React App overrides)
- Styling: `frontend/frontend-app/tailwind.config.js` (Tailwind configuration)

**Core Logic:**
- Text/voice chat: `app/app.py` lines 48-203
- Admin endpoints: `app/app.py` lines 240-437
- Can-Do analysis: `app/app.py` lines 625-1000
- UI components: `frontend/frontend-app/src/App.js` (all screens and interactions)
- Session management: `frontend/frontend-app/src/App.js` lines 100-145 (startSession, endSession)

**Testing:**
- Frontend tests: `frontend/frontend-app/src/App.test.js`
- Test setup: `frontend/frontend-app/src/setupTests.js`
- Test config: `frontend/frontend-app/package.json` (Jest configuration via react-scripts)

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `SeniorFirstEnglishAssistant`, `TalkView`, `AdminView`) - all defined as functions within App.js
- Utilities: camelCase (e.g., `supabaseClient.js`, `reportWebVitals.js`)
- Config: kebab-case or `.config.js` pattern (e.g., `craco.config.js`, `tailwind.config.js`)
- Styles: Match component name or purpose (e.g., `App.css`, `index.css`)

**Functions:**
- Handler functions: `handle[ActionName]` (e.g., `handleSaveProfile`, `handlePasswordChange`, `handleSaveTranscription`)
- Async operations: `async function name()` (e.g., `startSession`, `endSession`, `saveTranscription`)
- Helpers: verb-based (e.g., `verify_admin`, `analyzeSessionForCando`, `formatElapsedTime`)
- Getters: `get[Noun]` (e.g., `getInitialMessage`)
- Icons: `[Name]Icon` (e.g., `UserIcon`, `MicIcon`, `AdminIcon`)

**Variables:**
- State: camelCase (e.g., `isLoggedIn`, `selectedTopic`, `userInfo`, `conversationRef`)
- Constants: UPPER_SNAKE_CASE (e.g., `TIER_LIMITS`, `API_BASE_URL`, `OPENAI_API_KEY`)
- Boolean: prefixed with `is` or `has` (e.g., `isAdmin`, `isEditingProfile`, `hasError`)
- URLs/Keys: CONSTANT_CASE (e.g., `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `REACT_APP_FLASK_API_URL`)

**Types/Interfaces:**
- No TypeScript - plain JavaScript
- Supabase table names: snake_case (e.g., `conversation_sessions`, `user_cando_achievements`, `transcriptions`)
- Database columns: snake_case (e.g., `created_at`, `email_confirmed_at`, `voice_preference`)

## Where to Add New Code

**New Feature (UI screen/flow):**
- Primary code: Add function component to `frontend/frontend-app/src/App.js` (following pattern of TalkView, AdminView, ProgressView around lines 1780+)
- Tests: `frontend/frontend-app/src/App.test.js`
- Styling: Add classes to component or extend `App.css`

**New API Endpoint:**
- Implementation: Add `@app.route()` decorator and handler function to `app/app.py`
- Pattern: Follow existing endpoints (lines 48-1000) - extract Bearer token, verify admin if needed, call Supabase REST API
- Error handling: Return `jsonify({"error": "message"})` with appropriate HTTP status

**New Component/Module:**
- If small/isolated: Define as function inside `App.js` (current pattern)
- If reusable: Could extract to separate file in `frontend/frontend-app/src/` (not done currently)
- Database table: Create via Supabase console, add RLS policies, call via REST API from backend

**Utilities/Helpers:**
- Shared functions: Define at module level in `App.js` (e.g., `saveTranscription`, `startSession`, `analyzeSessionForCando`)
- Reusable components: Currently all inline in App.js; could extract to separate files if refactoring

**Database Operations:**
- From frontend: Use Supabase JS client (e.g., `supabase.from('table_name').select()`)
- From backend: Use Supabase REST API via `requests` library with service role key
- Follow pattern in app.py lines 114-133 for fetching, lines 343-352 for inserting

## Special Directories

**`node_modules/`:**
- Purpose: NPM dependencies
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

**`build/`:**
- Purpose: Production build output
- Generated: Yes (by npm run build)
- Committed: No (generated at deploy time by Vercel)

**`public/`:**
- Purpose: Static web assets
- Generated: No (checked in)
- Contains: index.html, favicon, manifest.json (branding files)

**`.planning/`:**
- Purpose: GSD orchestration directory
- Generated: Partially (created by orchestrator, filled by agents)
- Committed: Yes

## File Size & Complexity

**Large files needing refactoring:**
- `frontend/frontend-app/src/App.js` (4535 lines) - Contains all UI logic, state, handlers, helpers, and icon definitions
  - Recommendation: Split into separate component files in a new `components/` directory
  - Sub-components identified: OnboardingScreen, MainApp, NavButton, TalkView, ListeningView, ConversationStartersView, ProgressView, ChatBubble, AdminView

- `app/app.py` (1000 lines) - Contains all routes and business logic
  - Recommendation: Extract into blueprint files (auth.py, admin.py, chat.py, analysis.py)

---

*Structure analysis: 2026-01-23*
