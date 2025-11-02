# Project Context Document - November 2024

## Table of Contents
1. [Project Overview](#project-overview)
2. [PhD Research Context](#phd-research-context)
3. [Technical Architecture](#technical-architecture)
4. [Key Files and Structure](#key-files-and-structure)
5. [Features Implemented](#features-implemented)
6. [Recent Work Completed](#recent-work-completed)
7. [Current State and In Progress](#current-state-and-in-progress)
8. [Environment and Deployment](#environment-and-deployment)
9. [Important Design Decisions](#important-design-decisions)
10. [Next Steps](#next-steps)

---

## Project Overview

**Project Name:** Bernardo's Teaching Assistant
**Purpose:** AI-powered English language teaching tool for PhD research
**Institution:** Universidad Complutense de Madrid
**Researcher:** Bernardo Morales
**Target Users:** Senior adult learners (50+ years old)
**Focus:** Spoken English proficiency (listening, speaking, interaction)

### What This Is
This is NOT a commercial product. This is a research tool being developed for Bernardo's PhD dissertation on using AI to teach English to senior learners. All features and design decisions are driven by research requirements, not commercial considerations.

### Deployment Status
- **Frontend:** https://bernardo-s-teaching-assistant.vercel.app (React app on Vercel)
- **Backend:** https://bernardo-s-teaching-assistant.onrender.com (Flask API on Render)
- **Database:** Supabase (PostgreSQL with authentication)
- **Repository:** https://github.com/beralc/Bernardo-s-teaching-assistant

---

## PhD Research Context

### Research Design
- **Type:** Mixed-methods study
- **Participants:** 40-60 senior learners (50+ years old)
- **Groups:** Experimental (using AI) vs Control (traditional methods)
- **Duration:** Several months of data collection
- **Data:** Quantitative (usage metrics, pre/post assessments) + Qualitative (interviews, surveys)

### Research Questions
**RQ1:** Can AI-powered conversational practice improve spoken English proficiency in senior learners?
**RQ2:** How do Second Language Acquisition (SLA) principles manifest in AI-mediated learning processes?

### Target Learners
- **Age:** 50+ years old
- **CEFR Levels:** A2 (Elementary) to B2 (Upper-Intermediate)
- **Characteristics:**
  - Heightened language learning anxiety
  - Previous negative learning experiences possible
  - Slower processing speed (cognitive aging)
  - High motivation and discipline
  - Rich life experience to leverage

### SLA Theories Being Implemented
The AI assistant is grounded in these Second Language Acquisition theories:

1. **Krashen's Input Hypothesis (i+1)**
   - Provide comprehensible input slightly above learner's current level
   - Level-specific language complexity (A2: simple sentences, B1: compound, B2: complex)

2. **Krashen's Affective Filter Hypothesis**
   - Minimize anxiety to maximize language acquisition
   - Critical for senior learners who often have low self-efficacy
   - Never use words like "wrong," "mistake," "error"

3. **Schmidt's Noticing Hypothesis**
   - Learners must consciously notice linguistic features to acquire them
   - Use recasts (implicit corrections) to draw attention naturally

4. **Swain's Output Hypothesis**
   - Language production helps learners notice gaps and develop fluency
   - Encourage maximum learner output (60-70% learner speech, 30-40% AI)

5. **Long's Interaction Hypothesis**
   - Conversational interaction facilitates acquisition through negotiation of meaning
   - Use confirmation checks, clarification requests, comprehension checks

6. **Vygotsky's Zone of Proximal Development (ZPD)**
   - Teach within the zone between independent and assisted performance
   - Adjust difficulty based on real-time learner performance

7. **Bruner's Scaffolding**
   - Provide temporary support structures that gradually fade
   - Types: modeling, sentence frames, hints, task simplification, co-construction

### Data Collection Needs
For the PhD research, the system needs to collect:
- Session duration and frequency
- Turn counts (conversational exchanges)
- Error types and correction patterns
- SLA principle implementation evidence
- CEFR level progression (Can-Do achievements)
- Learner self-assessment data
- Qualitative feedback (surveys, interviews)

---

## Technical Architecture

### Tech Stack
- **Frontend:** React 18.x (Create React App)
- **Backend:** Flask 2.3.2 (Python)
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** OpenAI GPT-4o Realtime API (for voice), GPT-4o-mini (for text chat)
- **Authentication:** Supabase Auth
- **Deployment:** Vercel (frontend), Render (backend, free tier with cold starts)

### System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │◄───────►│  Flask Backend   │◄───────►│   Supabase DB   │
│   (Vercel)      │  HTTPS  │    (Render)      │   REST  │   (PostgreSQL)  │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│                 │         │                  │
│  OpenAI Realtime│         │  Supabase Auth   │
│  API (Voice)    │         │                  │
│                 │         │                  │
└─────────────────┘         └──────────────────┘
```

### How Voice Sessions Work

1. **Session Creation:**
   - User clicks "Start Practice" in frontend
   - Frontend calls backend: `POST /webrtc_session` with optional topic
   - Backend loads `prompt.json` (AI behavior instructions)
   - Backend calls OpenAI Realtime API to create ephemeral session
   - OpenAI returns: session_id, websocket_url, ephemeral_token

2. **WebSocket Connection:**
   - Frontend establishes WebSocket connection directly to OpenAI
   - Uses ephemeral token for authentication
   - Audio streams bidirectionally: user microphone ↔ OpenAI ↔ speaker

3. **Voice Activity Detection (VAD):**
   - Server-side VAD configured (threshold: 0.5, silence: 1000ms)
   - OpenAI detects when user stops speaking and generates response
   - Supports interruption (user can interrupt AI mid-sentence)

4. **Transcription:**
   - Input audio transcribed via Whisper-1
   - Both user and AI speech transcribed for session logs

### How Text Chat Works

1. User types message in frontend
2. Frontend calls backend: `POST /chat_text` with text
3. Backend loads `prompt.json` as system prompt
4. Backend calls OpenAI ChatCompletion API (gpt-4o-mini)
5. Conversation context stored in Flask session
6. Response returned to frontend

### Authentication Flow

1. **User Registration/Login:**
   - Frontend uses Supabase Auth UI
   - Email + password authentication
   - Creates record in `auth.users` (Supabase managed)

2. **Profile Creation:**
   - Database trigger automatically creates profile in `profiles` table
   - Profile includes: name, surname, age, country, english_level, tier, is_admin

3. **Session Management:**
   - Supabase provides JWT access token
   - Frontend includes token in Authorization header for backend requests
   - Backend verifies token for protected endpoints

### Admin Access

Admin functionality requires `is_admin = true` in profiles table.

**Admin Endpoints:**
- `GET /admin/users` - List all users
- `POST /admin/users` - Create new user
- `DELETE /admin/users/{id}` - Delete user
- `POST /admin/users/{id}/reset-password` - Reset password
- `PATCH /admin/users/{id}/tier` - Update user tier

All admin endpoints verify admin status via `verify_admin()` helper function.

---

## Key Files and Structure

### Backend Structure (`/app/`)

```
app/
├── app.py                    # Main Flask application (469 lines)
├── prompt.json               # AI behavior instructions (528 lines) ⭐ CRITICAL
├── requirements.txt          # Python dependencies
└── templates/
    └── index.html           # Basic landing page
```

### Frontend Structure (`/frontend/frontend-app/src/`)

```
frontend-app/src/
├── App.js                    # Main React component (3500+ lines)
├── App.css                   # Styles
├── index.js                  # React entry point
└── ...
```

### Database Files

```
/
├── supabase_cando_schema.sql          # Can-Do checklist database schema
├── import_cando_statements.py         # Import script for Can-Do statements
├── cefr_statements_filtered.json      # 328 filtered CEFR Can-Do statements
├── CEFR Descriptors.xlsx              # Original CEFR descriptors
└── ALTERNATIVE_ADMIN_WITH_RLS.sql     # Old admin approach (not used)
```

### Important Documentation Files

```
/
├── context_nov2.md                    # THIS FILE - full project context
├── CANDO_SETUP_INSTRUCTIONS.md        # Setup guide for Can-Do checklist
├── URGENT_SETUP_STEPS.md              # Backend environment setup guide
└── Full_Proposal_Bernardo_v4_signed_signed.pdf  # PhD research proposal
```

---

## Key Files Deep Dive

### 1. `app/app.py` - Flask Backend (469 lines)

**Critical Sections:**

**Lines 15-26: CORS Configuration**
```python
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://bernardo-s-teaching-assistant.vercel.app",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
```
**Recently added PATCH** to support tier updates.

**Lines 46-86: Text Chat Endpoint**
- Loads `prompt.json` as system prompt
- Converts entire prompt_data to JSON string
- Maintains conversation context in Flask session
- Uses gpt-4o-mini model

**Lines 88-179: WebRTC Session Endpoint**
- Creates OpenAI Realtime session for voice
- Loads `prompt.json` as instructions
- Optionally injects topic context into prompt
- Configures VAD (Voice Activity Detection)
- Returns: session_id, websocket_url, ephemeral_token

**Lines 182-214: Admin Verification Helper**
```python
def verify_admin(user_token):
    # Get user from token
    # Check if user is admin in profiles table
    # Return user_id or error
```

**Lines 217-462: Admin Endpoints**
- User management (list, create, delete)
- Password reset
- Tier management

**Important:** Backend uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations (bypasses RLS).

### 2. `app/prompt.json` - AI Behavior (528 lines) ⭐ MOST CRITICAL FILE

This file defines HOW the AI behaves. It's the pedagogical core of the PhD research.

**Recent History:**
- **Version 1:** Original simple prompt (~75 lines)
- **Version 2 (Stage 1 - Nov 2):** Comprehensive rewrite to 528 lines with detailed, prescriptive instructions

**Structure:**
```json
{
  "persona": {
    "name": "Bernardo's Teaching Assistant",
    "role": "English teacher specializing in senior adult learners (50+ years old)",
    "level": "Adapt language complexity to learner's validated CEFR level: A2, B1, or B2",
    "goal": "Improve spoken English proficiency through evidence-based SLA principles"
  },
  "behavior": {
    "senior_learner_adaptations": { ... },
    "correction_style": { ... },
    "input_hypothesis_implementation": { ... },
    "output_hypothesis_implementation": { ... },
    "interaction_hypothesis_implementation": { ... },
    "noticing_hypothesis_implementation": { ... },
    "zone_of_proximal_development_implementation": { ... },
    "scaffolding_implementation": { ... },
    "affective_filter_hypothesis_implementation": { ... },
    "conversation_management": { ... },
    "prohibited_behaviors": { ... },
    "response_template": { ... }
  }
}
```

**Key Features:**

1. **Senior Learner Adaptations (lines 16-55)**
   - Patience protocol: wait time, no interrupting
   - Clarity protocol: clear articulation, simple vocabulary
   - Encouragement protocol: praise in EVERY response
   - Anxiety reduction: never use "wrong," "mistake," "error"
   - Cognitive aging: max 1 new concept per turn

2. **Correction Style (lines 57-172)**
   - **Recasts (70% of corrections):** Reformulate error naturally without drawing attention
     - Example: "I go yesterday" → "Oh, you went yesterday? What did you buy?"
   - **Expansions:** Add missing elements to telegraphic speech
   - **Clarification requests:** Prompt self-correction
   - **Explicit correction (10% max):** Only for persistent high-impact errors
   - **Selective correction:** Address max 2-3 errors per turn, ignore low-priority errors

3. **Level-Specific Input (lines 177-224)**
   - **A2:** Present simple, past simple, 2000-3000 words, 8-12 word sentences
   - **B1:** +Present perfect, conditionals, 3000-4000 words, 12-15 word sentences
   - **B2:** +Past perfect, mixed conditionals, 4000-6000 words, 15-20 word sentences
   - Each level has exact grammar structures, vocabulary ranges, example outputs

4. **Scaffolding Types (lines 352-416)**
   - Modeling: Demonstrate first, then invite learner to try
   - Sentence frames: Partial sentences to complete
   - Strategic hints: Just-in-time guidance
   - Task simplification: Break into steps
   - Co-construction: Build utterances collaboratively
   - 4-stage fading: Heavy → Moderate → Light → Independent

5. **Response Template (lines 512-525)**
   Every response should follow this structure:
   1. ACKNOWLEDGE/PRAISE: Recognize success/effort
   2. RECAST/EXPAND: Model correct form naturally if error exists
   3. CONTINUE CONVERSATION: Ask follow-up or add comment
   4. SCAFFOLD (optional): Provide support if learner struggled

6. **Prohibited Behaviors (lines 495-510)**
   - NEVER speak languages other than English
   - NEVER complete learner's sentences unless asked
   - NEVER use condescending language
   - NEVER say "wrong," "mistake," "incorrect"
   - NEVER skip positive feedback
   - NEVER mention age negatively

**How It's Used:**
- Text chat: Entire prompt converted to JSON string, sent as system message (app.py:60-65)
- Voice: Entire prompt sent as `instructions` parameter to Realtime API (app.py:95-112)
- Topic injection: If topic provided, added to `behavior.current_topic` before sending

**Important Design Decision:**
The prompt is EXTREMELY detailed and prescriptive (not "wishy washy"). Every correction technique has step-by-step procedures and examples. This ensures consistent, research-aligned AI behavior.

### 3. `frontend/frontend-app/src/App.js` - Main React Component

**Key State Variables:**
```javascript
const [session, setSession] = useState(null)  // Supabase session
const [profile, setProfile] = useState(null)  // User profile data
const [activeTab, setActiveTab] = useState('home')  // UI navigation
const [isConnected, setIsConnected] = useState(false)  // WebSocket status
const [isRecording, setIsRecording] = useState(false)  // Voice recording
```

**Main Components/Tabs:**
1. **Home:** Landing page
2. **Profile:** User profile settings
3. **Practice:** Voice conversation interface
4. **Chat:** Text chat interface
5. **Topics:** Predefined conversation topics
6. **Can Do:** Can-Do checklist (TO BE IMPLEMENTED)
7. **Admin:** User management (admin only)

**Voice Session Flow (Practice Tab):**
1. User clicks "Start Practice" → calls `createRealtimeSession()`
2. Backend returns ephemeral token
3. Frontend establishes WebSocket to OpenAI
4. Audio streams via WebSocket (PCM16 format)
5. Transcripts displayed in UI
6. User clicks "End Practice" → closes WebSocket

**Admin Panel Features (lines ~2700-3500):**
- **Users Tab:** List all users, create/delete, reset passwords, change tiers
- **Analytics Tab:** (Placeholder for future)
- **Settings Tab:** (Placeholder for future)

**Tier Dropdown (lines 3397-3411):**
Recently added - allows admin to change user tier directly from user list.

### 4. Database Schema

**Current Tables:**

**`profiles` (Supabase, managed by triggers)**
```sql
id UUID (references auth.users)
name TEXT
surname TEXT
age INTEGER
country TEXT
native_language TEXT
english_level TEXT  -- Self-reported (not validated)
tier TEXT  -- 'free', 'premium', 'unlimited'
is_admin BOOLEAN
monthly_voice_minutes_used INTEGER
premium_until TIMESTAMP
avatar_url TEXT
created_at TIMESTAMP
```

**Row-Level Security (RLS):**
- Users can read/update their own profile
- Admins can read all profiles
- Service role can insert/update any profile

**Can-Do Tables (NEW - being set up):**

**`cando_statements`** (328 rows)
- Master table of CEFR Can-Do descriptors
- Columns: level, skill_type, mode, activity, descriptor, keywords

**`user_cando_achievements`**
- Tracks which statements each user achieved
- Columns: user_id, cando_id, detected_by, confidence_score, evidence_text

**`session_cando_analysis`**
- Logs every AI analysis for research
- Columns: session_id, detected_achievements, processing_time, model_used

---

## Features Implemented

### 1. User Authentication
- Email/password registration and login via Supabase
- Profile creation with demographic data
- Session management with JWT tokens
- Password reset functionality

### 2. Voice Conversation Practice
- Real-time voice conversation with AI using OpenAI Realtime API
- WebSocket connection for low-latency audio streaming
- Server-side Voice Activity Detection (VAD)
- Speech-to-text transcription (Whisper-1)
- Support for interruptions (user can interrupt AI)
- Optional topic selection (predefined conversation starters)

### 3. Text Chat
- Alternative to voice for learners who prefer typing
- Chat completion with conversation context
- Same AI behavior as voice (uses same prompt.json)

### 4. User Tiers
- **Free:** Limited minutes per month
- **Premium:** More minutes
- **Unlimited:** No limits
- Tier displayed in profile
- Admin can change tiers

### 5. Admin Panel
- **User Management:**
  - List all users with merged auth + profile data
  - Create new users (email, password, name, tier, is_admin)
  - Delete users
  - Reset user passwords
  - Change user tiers (recently added dropdown)
- **Admin Verification:**
  - All admin endpoints verify `is_admin = true`
  - Uses Supabase service role key for privileged operations

### 6. Conversation Topics
- Predefined topics to help learners start conversations
- Topics can be selected before starting voice session
- Topic context injected into prompt dynamically

---

## Recent Work Completed

### November 2, 2024 - Session Summary

**1. Fixed CORS Issue with PATCH Requests**
- Problem: Admin couldn't update user tiers - CORS blocked PATCH method
- Solution: Added PATCH to allowed methods in app.py:22
- Status: ✅ Fixed and deployed

**2. Stage 1: Prompt.json Complete Rewrite** ⭐ MAJOR WORK
- **Before:** 75 lines, vague, "wishy washy"
- **After:** 528 lines, extremely detailed and prescriptive

**What Changed:**
- Added missing SLA theories (Vygotsky's ZPD, Bruner's Scaffolding)
- Changed from "correct EVERY error" to selective recasts/expansions (70% implicit)
- Added comprehensive senior learner adaptations (patience, clarity, encouragement)
- Defined exact level-specific input (A2/B1/B2 grammar, vocabulary, sentence length)
- Created 4-step response template for consistency
- Added 6 scaffolding types with examples
- Added 12 prohibited behaviors
- Removed contradictions (no more "short answers" vs "comprehensive explanations")

**Rationale:**
- PhD research requires consistent, theoretically-grounded AI behavior
- Senior learners need special adaptations (lower anxiety, more patience)
- Automatic detection and research data collection need predictable AI responses

**Status:** ✅ Deployed to Render

**3. Can-Do Checklist - Preparation Phase**
- Examined CEFR Descriptors.xlsx file structure (1836 rows)
- Filtered for speaking/listening/interaction only (excluded reading/writing)
- Extracted 328 relevant Can-Do statements (A1-B2+)
- Created database schema (supabase_cando_schema.sql)
- Created import script (import_cando_statements.py)
- Created setup instructions (CANDO_SETUP_INSTRUCTIONS.md)

**Status:** 🟡 Ready for database setup (user needs to run SQL and import)

---

## Current State and In Progress

### ✅ Fully Working
1. User registration and authentication
2. Voice conversation with AI (OpenAI Realtime API)
3. Text chat with AI
4. Admin user management (create, delete, reset password, change tier)
5. Conversation topics
6. Tier system (free/premium/unlimited)
7. Prompt.json with comprehensive SLA implementation

### 🟡 Partially Working / Needs Setup
1. **Can-Do Checklist:** Database schema created, needs SQL execution and data import
2. **Profile Settings:** Basic UI exists but some fields not editable

### ❌ Not Yet Implemented
1. Can-Do Checklist UI (learner view)
2. Can-Do Checklist admin panel
3. Automatic AI detection of Can-Do achievements
4. Session analytics/logging for research
5. Pre/post assessment system
6. Research data export functionality
7. Usage tracking and tier limits enforcement
8. Survey and qualitative data collection tools

### 📋 Current Todo List
1. ✅ Examine CEFR Descriptors.xlsx structure and extract data
2. ✅ Create Supabase database tables for Can-Do statements and achievements
3. 🟡 Import CEFR Can-Do statements into database (waiting for user to run script)
4. ⬜ Create backend API endpoint for AI session analysis
5. ⬜ Integrate AI Can-Do detection after voice sessions
6. ⬜ Create backend API to fetch user achievements
7. ⬜ Build frontend Can-Do checklist component in learner profile
8. ⬜ Add admin panel for reviewing/managing Can-Do achievements

---

## Environment and Deployment

### Environment Variables

**Backend (.env file):**
```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (NOT the anon key!)
PORT=5000  (Render provides this)
```

**Frontend (.env file):**
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...  (The anon/public key)
REACT_APP_FLASK_API_URL=https://bernardo-s-teaching-assistant.onrender.com
```

**Important Notes:**
- Backend uses **service role key** for admin operations (bypasses RLS)
- Frontend uses **anon key** for user operations (respects RLS)
- Never expose service role key in frontend!

### Deployment Configuration

**Vercel (Frontend):**
- Auto-deploys from GitHub main branch
- Environment variables set in Vercel dashboard
- Build command: `npm run build`
- Output directory: `build`

**Render (Backend):**
- Auto-deploys from GitHub main branch
- Build command: `pip install -r requirements.txt`
- Start command: `python app.py` (binds to 0.0.0.0:$PORT)
- **Free tier:** App sleeps after 15 minutes of inactivity (cold start ~30-60 seconds)
- Environment variables set in Render dashboard

**Supabase:**
- Database and auth hosted on Supabase
- No deployment needed (SaaS)
- SQL migrations run manually in SQL Editor

### Cold Start Issue (Render Free Tier)
- After 15 minutes of no requests, backend sleeps
- First request after sleep takes 30-60 seconds to wake up
- User sees "Loading users..." or connection timeout
- **Workaround:** Keep a separate tab open hitting backend every 10 minutes OR upgrade to paid tier

---

## Important Design Decisions

### 1. Why Backend API Instead of Direct Supabase Calls?

**Problem:** Admin operations (list users, create users) require service role key.
**Why Not Frontend:** Service role key in frontend = anyone can steal it and take over database
**Solution:** Backend API that securely uses service role key, frontend uses user's session token

**Flow:**
```
Frontend (user token) → Backend (verify admin) → Supabase (service role key) → Backend → Frontend
```

### 2. Why Prompt.json Is So Detailed

**Problem:** Original prompt was vague ("gently correct errors", "be supportive")
**Issue:** Inconsistent AI behavior, doesn't align with specific SLA principles, hard to replicate for research
**Solution:** 528-line extremely prescriptive prompt with step-by-step procedures and examples

**Benefits:**
- Consistent AI behavior across sessions (research requirement)
- Explicit SLA theory implementation (can cite in PhD dissertation)
- Clear senior learner adaptations (lower anxiety, patience, encouragement)
- Reproducible results

### 3. Why Not Auto-Calculate CEFR Levels?

**Problem:** User suggested AI calculate CEFR level from conversations
**Issue:** CEFR assessment requires trained human raters and standardized tests. AI can't reliably assess CEFR levels - would produce invalid research data
**Solution:** Manual CEFR placement via pre-test scored by researcher, then admin sets validated level in system

**Planned Flow:**
1. Researcher conducts oral pre-test (standardized)
2. Researcher scores using CEFR rubric (inter-rater reliability)
3. Admin sets validated level in user profile
4. AI uses validated level to provide appropriate i+1 input
5. Post-test compares improvement

### 4. Why Selective Corrections Instead of Correcting Everything?

**Problem:** Original prompt said "MUST correct every grammar or vocabulary mistake"
**Issue:** Overwhelming corrections raises affective filter (Krashen), especially in anxious senior learners
**Solution:** Selective implicit corrections via recasts

**Research Basis:**
- Lyster & Ranta (1997): Recasts are most effective corrective feedback in L2 classrooms
- Ellis (2009): Selective correction focuses learner attention without overwhelming
- Affective Filter Hypothesis: Too many corrections = high anxiety = blocks acquisition

**Implementation:**
- Address max 2-3 errors per turn
- Use recasts (70%), expansions (20%), explicit correction (10%)
- Prioritize communication-impairing errors
- Ignore article errors in A2 (take years to acquire), one-off slips, phonological variations

### 5. Why Automatic Can-Do Detection Instead of Manual Only?

**Problem:** Manual Can-Do tracking = time-intensive for researcher
**Solution:** AI analyzes session transcripts and detects demonstrated competencies

**Benefits:**
- **Learner Motivation:** Immediate feedback, visible progress
- **Research Data:** Logs AI confidence scores, evidence excerpts, timestamps
- **Scalability:** Can handle 40-60 participants
- **Accuracy Analysis:** Compare AI detections vs researcher ratings (research question!)

**Hybrid Approach:**
- AI automatically detects and logs achievements with confidence scores
- Researcher can review and approve/reject AI suggestions (admin panel)
- Provides research data on AI accuracy

---

## Next Steps

### Immediate (This Week)
1. **User Action Required:** Run SQL and import script to set up Can-Do database
2. **Backend:** Create API endpoint for AI session analysis (`POST /analyze_session`)
3. **Backend:** Create API endpoint to fetch user achievements (`GET /users/{id}/cando`)
4. **Backend:** Implement AI Can-Do detection logic after voice sessions

### Short Term (Next 2 Weeks)
5. **Frontend:** Build Can-Do Checklist component in learner profile
6. **Frontend:** Add progress bars and visual indicators
7. **Frontend:** Add admin panel for reviewing Can-Do achievements
8. **Backend:** Add manual Can-Do assignment endpoint for admin

### Medium Term (Next Month)
9. **Research Dashboard:** Analytics for session duration, turn counts, error patterns
10. **Assessment System:** Pre/post test administration and scoring tools
11. **Stage 2:** Manual CEFR level assignment in admin panel
12. **Stage 3:** Dynamic prompt injection based on user's validated CEFR level

### Long Term (Future Phases)
13. **Experimental vs Control:** Group assignment and differentiated features
14. **Survey Tools:** Qualitative data collection integrated in app
15. **Data Export:** Research data export for SPSS/R analysis
16. **Usage Limits:** Enforce tier-based minute limits
17. **Payment Integration:** (Only if needed for sustainability after PhD)

---

## How to Use This Context Document

### For Bernardo
- Share this file when starting a new Claude Code session
- Update this file when major changes occur
- Reference specific sections when asking questions

### For Future Claude Sessions
This document provides:
- ✅ Full project understanding (purpose, tech stack, architecture)
- ✅ PhD research context (critical for design decisions)
- ✅ Current state (what works, what's in progress)
- ✅ File structure and key code locations
- ✅ Recent changes and why they were made
- ✅ Next steps and priorities

### Quick Start for New Session
1. Read "Project Overview" and "PhD Research Context" first
2. Understand this is research, not commercial (drives all decisions)
3. Review "Current State" to see what's working
4. Check "Recent Work Completed" for latest changes
5. Look at "Next Steps" for priorities
6. Reference "Key Files Deep Dive" when working on specific components

---

## Critical Things to Remember

1. **This is PhD research:** All decisions must align with research methodology and SLA theories
2. **Target users are seniors (50+):** Require patience, encouragement, low anxiety
3. **prompt.json is sacred:** Any changes must be theoretically justified
4. **No breaking changes:** App is deployed and potentially in use by research participants
5. **Service role key security:** Backend only, never in frontend
6. **CEFR levels:** Manual validation by researcher, not AI-calculated
7. **Selective corrections:** Not every error, focus on high-impact
8. **Research data collection:** Everything should log data for analysis

---

## Contact and Resources

**Researcher:** Bernardo Morales
**Institution:** Universidad Complutense de Madrid
**GitHub:** https://github.com/beralc/Bernardo-s-teaching-assistant
**Deployment:**
- Frontend: https://bernardo-s-teaching-assistant.vercel.app
- Backend: https://bernardo-s-teaching-assistant.onrender.com

**Key References:**
- Full PhD Proposal: `Full_Proposal_Bernardo_v4_signed_signed.pdf`
- CEFR Descriptors: `CEFR Descriptors.xlsx`
- Backend Code: `app/app.py`
- AI Behavior: `app/prompt.json` ⭐
- Frontend Code: `frontend/frontend-app/src/App.js`

---

**Document Version:** 1.0
**Last Updated:** November 2, 2024
**Status:** Complete and comprehensive for session handoff

---

*This document should be updated whenever major changes occur. Treat it as the single source of truth for project context.*
