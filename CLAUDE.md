# CLAUDE.md - AI Assistant Guide

> **Purpose:** This document provides AI assistants (like Claude) with comprehensive context about this codebase, its structure, conventions, and workflows to enable effective collaboration and development.

**Last Updated:** 2026-01-23
**Project:** Bernardo's English Teaching Assistant
**Repository:** Bernardo-s-teaching-assistant

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Technology Stack](#technology-stack)
4. [Key Architectural Decisions](#key-architectural-decisions)
5. [Development Workflows](#development-workflows)
6. [Database Schema & Migrations](#database-schema--migrations)
7. [AI/LLM Integration](#aillm-integration)
8. [Custom Claude Agents](#custom-claude-agents)
9. [Code Conventions & Best Practices](#code-conventions--best-practices)
10. [Common Development Tasks](#common-development-tasks)
11. [Important Files Reference](#important-files-reference)
12. [Testing & Deployment](#testing--deployment)
13. [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

### What This Application Does
An AI-powered English learning platform designed specifically for **senior adult learners (50+ years old)** that provides:
- Real-time voice conversation practice with AI
- CEFR-aligned language learning (A2, B1, B2 levels)
- Evidence-based pedagogy (Krashen, Schmidt, Swain, Long)
- Progress tracking and conversation history
- Senior-first UX design with accessibility features

### Target Users
- **Primary:** Senior adults (50+) learning English as a second language
- **Secondary:** ESL schools, language centers, community programs (B2B model)
- **Tertiary:** Administrators and teachers managing learner progress

### Business Model
- **B2B Focus:** Institutions pay monthly subscription for multiple users
- **Why B2B:** OpenAI Realtime API costs (~$0.06/min) make B2C economically unviable
- **Target Pricing:** $500-2000/month per institution based on user count

### Core Value Proposition
Natural, low-anxiety voice conversation practice with linguistically-informed AI that adapts to senior learners' unique needs (patience, encouragement, slower pacing, high-frequency vocabulary).

---

## Codebase Structure

```
Bernardo-s-teaching-assistant/
│
├── app/                          # Flask Backend (Python)
│   ├── app.py                   # Main Flask application with API endpoints
│   ├── prompt.json              # OpenAI system prompt (linguistic pedagogy rules)
│   ├── requirements.txt         # Python dependencies
│   ├── templates/               # Legacy HTML templates (DISABLED in production)
│   │   └── index.html
│   └── static/                  # Static assets for legacy templates
│       └── listening.gif
│
├── frontend/
│   └── frontend-app/            # React Frontend (JavaScript)
│       ├── src/
│       │   ├── App.js          # Main React component (ALL UI logic in one file)
│       │   ├── App.css         # Styling for main app
│       │   ├── index.js        # React entry point
│       │   ├── supabaseClient.js # Supabase configuration and client
│       │   └── setupTests.js
│       ├── public/             # Static assets (favicons, manifest, index.html)
│       ├── package.json        # NPM dependencies
│       ├── craco.config.js     # Tailwind CSS configuration
│       └── .env                # Environment variables (NOT in git)
│
├── .claude/                     # Claude Code configuration
│   ├── agents/                 # Custom Claude agent definitions
│   │   ├── senior-ux-designer.md
│   │   ├── english-helper-prompt-engineer.md
│   │   ├── lead-programmer-assistant.md
│   │   └── voice-ai-optimizer.md
│   └── settings.local.json     # Local Claude settings
│
├── *.sql                        # Database migration scripts (run manually in Supabase)
├── *.md                         # Documentation files (30 total)
├── .gitignore                   # Git ignore rules
├── README.md                    # Project overview and setup guide
├── DATABASE_SCHEMA.md           # Complete database documentation
├── BACKEND_API.md               # API endpoint documentation
├── CONTEXT.md                   # Development session history
└── CLAUDE.md                    # This file
```

### Key Structural Notes
1. **Monolithic Frontend:** All React UI is in `App.js` (~2000+ lines) - not componentized yet
2. **Two Backend Systems:**
   - Flask for OpenAI integration
   - Supabase for database, auth, and storage
3. **No Build System for Backend:** Flask runs directly with Python
4. **Manual Database Migrations:** SQL files are run manually in Supabase SQL editor

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **Tailwind CSS** | 4.1.16 | Utility-first styling |
| **Supabase Client** | 2.77.0 | Database, auth, storage client |
| **Web Audio API** | Native | Microphone access and audio handling |
| **Craco** | 7.1.0 | Override Create React App config for Tailwind |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Flask** | 2.3.2 | Python web framework |
| **OpenAI SDK** | 0.27.0 | OpenAI API integration |
| **Flask-CORS** | 4.0.0 | Cross-origin resource sharing |
| **python-dotenv** | 1.0.0 | Environment variable management |

### Database & Infrastructure
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth + Storage |
| **OpenAI GPT-4o-mini** | Text chat conversations |
| **OpenAI Realtime API** | Voice conversation (WebRTC) |
| **Vercel** (planned) | Frontend hosting |
| **Render** (planned) | Backend hosting |

### Development Tools
- **Node.js & npm:** Frontend package management
- **pip & venv:** Python package management
- **Git:** Version control
- **Claude Code:** AI-assisted development with custom agents

---

## Key Architectural Decisions

### 1. Why Monolithic React Component?
**Decision:** All UI logic in single `App.js` file
**Rationale:** Rapid MVP development; componentization planned for later
**Trade-off:** Harder to maintain but faster to iterate initially

### 2. Why OpenAI Realtime API Despite High Cost?
**Decision:** Use OpenAI Realtime API for voice conversations
**Alternatives Tested:** ElevenLabs + GPT-4o-mini, Google Cloud TTS
**Why Rejected:** 1.8s+ latency makes conversation unnatural; no interruption handling
**Mitigation:** B2B business model to spread costs across institutions

### 3. Why Supabase?
**Decision:** Use Supabase instead of custom PostgreSQL + Auth system
**Rationale:**
- Built-in authentication (reduces development time)
- Auto-generated REST API
- File storage (avatars)
- Real-time capabilities (potential future feature)
- Generous free tier

### 4. Why Flask Instead of Node.js Backend?
**Decision:** Python Flask backend
**Rationale:**
- Simple, lightweight for API proxy
- Python ecosystem for potential future ML/NLP features
- Easy to deploy on Render

### 5. Session Management Design
**Decision:** Sessions linked to topics, started manually by user
**Why:** Ensures accurate tracking; automatic session creation led to phantom sessions
**Implementation:** Session starts when user clicks microphone button with topic selected

### 6. Correction Strategy
**Decision:** Implicit feedback (recasts/expansions) over explicit corrections
**Rationale:** Based on SLA research - implicit feedback reduces anxiety in adult learners
**Implementation:** Encoded in `prompt.json` with detailed linguistic rules

---

## Development Workflows

### Git Branching Strategy
- **Main Branch:** `main` (not specified in git status output - use default)
- **Feature Branches:** `claude/claude-md-mkqwcwticbkba7qc-btUDL` (current)
- **Convention:** Feature branches start with `claude/` and end with session ID
- **Deployment:** Vercel auto-deploys from main branch

### Git Workflow
```bash
# Current branch
git status  # Shows: claude/claude-md-mkqwcwticbkba7qc-btUDL

# Always push to feature branch
git push -u origin claude/claude-md-mkqwcwticbkba7qc-btUDL

# Create pull request when ready
gh pr create --title "Feature description" --body "Details"
```

### Making Changes to This Project

#### Frontend Changes
```bash
cd frontend/frontend-app
npm install           # First time only
npm start             # Runs on http://localhost:3000

# Make changes to src/App.js
# Changes hot-reload automatically
```

#### Backend Changes
```bash
cd app
python3 -m venv venv  # First time only
source venv/bin/activate
pip install -r requirements.txt

python app.py         # Runs on http://127.0.0.1:5000

# Make changes to app.py or prompt.json
# Restart server after changes
```

#### Database Changes
```bash
# Create new SQL file: NEW_FEATURE.sql
# Write migration SQL
# Run manually in Supabase SQL Editor at:
# https://supabase.com/dashboard/project/[project-id]/sql
```

### Commit Message Convention
```bash
# Format: <type>: <description>
# Examples from recent commits:
git commit -m "Add voice preference selector with friendly names"
git commit -m "SECURITY: Disable old Flask template route to prevent unauthorized access"
git commit -m "Update Research Data export tab styling and text"
git commit -m "Remove Can-Do tab from admin panel and remove tip from Research Data"
```

**Types:**
- `Add:` New features
- `Update:` Changes to existing features
- `Fix:` Bug fixes
- `Remove:` Deleted features
- `SECURITY:` Security-related changes
- `Refactor:` Code restructuring

---

## Database Schema & Migrations

### Tables Overview

#### 1. `profiles` (User Profile Data)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT,
  surname TEXT,
  age INTEGER,
  native_language TEXT,
  country TEXT,
  english_level TEXT,  -- A1, A2, B1, B2, C1, C2
  learning_goals JSONB,
  preferred_skills JSONB,
  interests JSONB,
  preferred_accent TEXT,
  study_frequency TEXT,
  avatar_url TEXT,
  voice_preference TEXT,  -- Voice model selection
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `conversation_sessions` (Conversation Tracking)
```sql
CREATE TABLE conversation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_minutes INTEGER,
  topic TEXT,  -- e.g., "Ordering Coffee"
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `transcriptions` (Conversation Content)
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES conversation_sessions(id),
  text TEXT,  -- Includes "Bot: " or user message prefix
  corrected_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Storage: `avatars` Bucket
```sql
-- Supabase Storage bucket for user profile photos
-- Bucket name: avatars
-- Public: true
-- File naming: {user_id}-{timestamp}.{ext}
```

### Relationships
```
auth.users (Supabase Auth)
    │
    ├─── profiles (1:1)
    │
    └─── conversation_sessions (1:many)
              │
              └─── transcriptions (1:many)
```

### Row Level Security (RLS)
- **Enabled on all tables**
- Users can only access their own data
- Admin users have special policies for viewing all data
- Storage policies: Users can upload own avatar, anyone can view avatars

### Running Migrations
1. Create SQL file (e.g., `ADD_NEW_COLUMN.sql`)
2. Test locally in Supabase SQL Editor
3. Commit SQL file to repository
4. Run in production Supabase dashboard
5. Document in `DATABASE_SCHEMA.md`

**Example Migration Files:**
- `ADD_VOICE_PREFERENCE.sql` - Added voice model selection
- `INVITATION_SYSTEM.sql` - Added invitation system for premium users
- `FIX_AVATAR_COLUMNS.sql` - Fixed avatar storage columns

---

## AI/LLM Integration

### OpenAI Integration Architecture

#### Text Chat Endpoint (`/chat_text`)
```python
# app/app.py line 48-88
# Uses: GPT-4o-mini
# Purpose: Text-based conversation (currently less used than voice)
# System Prompt: Loaded from prompt.json
# Context: Stored in Flask session
```

#### Voice Chat Endpoint (`/webrtc_session`)
```python
# app/app.py line 90+
# Uses: GPT-4o-realtime-preview
# Purpose: Real-time voice conversation via WebRTC
# System Prompt: Loaded from prompt.json
# Configuration: VAD (Voice Activity Detection) settings included
```

### Linguistic Prompt Engineering

#### The `prompt.json` File
**Location:** `app/prompt.json`
**Size:** ~528 lines of detailed linguistic instructions
**Purpose:** Encode Second Language Acquisition (SLA) research into AI behavior

**Key Sections:**
1. **Persona** (lines 1-10)
   - English-only enforcement
   - Senior learner focus
   - Warm, patient, encouraging tone
   - CEFR level adaptation

2. **Senior Learner Adaptations** (lines 16-55)
   - Patience protocol (wait times, no interrupting)
   - Clarity protocol (articulation, vocabulary)
   - Encouragement protocol (specific praise)
   - Anxiety reduction (eliminate judgment)
   - Cognitive aging adaptations (working memory)

3. **Correction Techniques** (lines 57-172)
   - **Recast:** 70% of corrections (implicit reformulation)
   - **Expansion:** Elaborate incomplete utterances
   - **Clarification Request:** Prompt self-correction
   - **Explicit Correction:** <10%, only for persistent errors

4. **SLA Principles** (lines 174-450)
   - **Input Hypothesis** (Krashen): i+1 comprehensible input
   - **Output Hypothesis** (Swain): Maximize learner speech (60-70%)
   - **Interaction Hypothesis** (Long): Negotiation of meaning
   - **Noticing Hypothesis** (Schmidt): Attention to forms
   - **Affective Filter** (Krashen): Minimize anxiety

5. **Conversation Management** (lines 452-493)
   - Opening moves (welcoming)
   - Topic development (follow learner interest)
   - Closing moves (always positive)
   - Repair strategies (communication breakdowns)

**CRITICAL:** `prompt.json` is the source of truth for AI behavior. Changes here affect all conversations.

### Voice Model Selection
Users can select preferred voice model via `voice_preference` field:
- **alloy:** Neutral, balanced
- **echo:** Deep, clear
- **shimmer:** Warm, friendly (default for seniors)

---

## Custom Claude Agents

### Overview
This repository uses **Claude Code** with 4 custom agents defined in `.claude/agents/`:

### 1. `senior-ux-designer.md`
**Purpose:** UX/UI review and design for senior-friendly interfaces
**Use When:**
- Reviewing UI components
- Designing new interfaces
- Accessibility audits
- Interaction flow improvements

**Key Principles:**
- Font sizes: 16px minimum (20px+ for headings)
- High contrast: 4.5:1 minimum (7:1 preferred)
- Touch targets: 44x44px minimum
- Clear navigation and generous white space
- Plain language and short sentences

**Example Usage:**
```markdown
User: "I've created a new settings modal. Can you review it?"
Claude: *Launches senior-ux-designer agent to review for senior-friendly UX*
```

### 2. `english-helper-prompt-engineer.md`
**Purpose:** Create and refine prompts for English learning AI
**Use When:**
- Modifying `prompt.json`
- Improving AI conversation quality
- Adjusting for different proficiency levels
- Fixing AI behavior issues (e.g., wrong language, tone)

**Example Usage:**
```markdown
User: "The AI is sometimes responding in Spanish. Fix this."
Claude: *Launches english-helper-prompt-engineer to strengthen English-only enforcement*
```

### 3. `lead-programmer-assistant.md`
**Purpose:** Programming assistance, code review, architecture decisions
**Use When:**
- Complex feature implementation
- Code review and optimization
- Debugging technical issues
- Architecture guidance

### 4. `voice-ai-optimizer.md`
**Purpose:** Voice/audio AI optimization and cost reduction
**Use When:**
- Optimizing OpenAI Realtime API usage
- Comparing voice AI providers
- Reducing API costs
- Improving voice conversation quality

### When to Use Custom Agents
- **Proactive:** Use agents without being asked when their expertise is clearly needed
- **User Request:** Always use when user explicitly asks for that expertise
- **Complex Tasks:** Use for multi-step tasks requiring specialized knowledge

---

## Code Conventions & Best Practices

### React (Frontend) Conventions

#### File Structure
```javascript
// App.js structure (approximate lines):
// Lines 1-50: Imports and constants
// Lines 51-200: Helper functions
// Lines 201-500: Component definitions (OnboardingScreen, etc.)
// Lines 501-2000+: MainApp component (main UI)
```

#### State Management
```javascript
// All state is in MainApp component using useState
const [user, setUser] = useState(null);
const [profile, setProfile] = useState(null);
const [sessionId, setSessionId] = useState(null);
// ... etc
```

#### Supabase Patterns
```javascript
// Reading data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', user.id);

// Writing data
const { error } = await supabase
  .from('table_name')
  .insert({ field: value });

// File upload
const { error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file);
```

#### Styling Conventions
```jsx
// Tailwind classes directly in JSX
<button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
  Click Me
</button>

// Senior-friendly sizing
className="text-lg"  // 18px (good for seniors)
className="text-xl"  // 20px (better)
className="text-2xl" // 24px (headings)
```

### Python (Backend) Conventions

#### Flask Route Pattern
```python
@app.route("/endpoint_name", methods=["POST"])
def endpoint_function():
    """
    Docstring explaining endpoint purpose
    """
    data = request.json

    # Validate input
    if not data or 'required_field' not in data:
        return jsonify({"error": "Error message"}), 400

    try:
        # Business logic
        result = process_data(data)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

#### Environment Variables
```python
# Always use environment variables for secrets
import os
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
```

### SQL Conventions

#### File Naming
```
ADD_<FEATURE>_<DESCRIPTION>.sql
FIX_<ISSUE>_<DESCRIPTION>.sql
ALTERNATIVE_<DESCRIPTION>.sql
```

#### Migration Structure
```sql
-- Description of what this migration does
-- Date: YYYY-MM-DD
-- Author: Name

-- Add column with IF NOT EXISTS
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name type;

-- Create index if needed
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);

-- Add comment explaining purpose
COMMENT ON COLUMN table_name.column_name IS 'Description';
```

### Documentation Conventions

#### Markdown Files
- Use `#` for main title
- Use `##` for sections
- Use `###` for subsections
- Include code blocks with language tags
- Use tables for structured data
- Keep lines under 120 characters when possible

#### Code Comments
```javascript
// Single-line comments for brief explanations

/*
 * Multi-line comments for complex logic:
 * - Explain the why, not the what
 * - Document assumptions
 * - Note any workarounds
 */

/**
 * JSDoc for functions (if componentizing in future)
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object>} User profile data
 */
```

---

## Common Development Tasks

### 1. Adding a New Conversation Topic

**Files to Modify:**
- `frontend/frontend-app/src/App.js`

**Steps:**
```javascript
// 1. Find the CONVERSATION_STARTERS constant (around line 100)
const CONVERSATION_STARTERS = [
  {
    title: "New Topic Name",
    description: "Brief description for the user",
    icon: "🆕" // Emoji icon
  },
  // ... existing topics
];

// 2. Add specific instructions in startConversation function (around line 939)
// The AI will receive topic-specific context automatically
```

### 2. Adding a New Profile Field

**Files to Modify:**
1. Database: Create `ADD_NEW_FIELD.sql`
2. Frontend: `frontend/frontend-app/src/App.js`
3. Documentation: `DATABASE_SCHEMA.md`

**Steps:**
```sql
-- 1. Database migration (ADD_NEW_FIELD.sql)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS new_field_name TYPE DEFAULT value;
```

```javascript
// 2. Frontend - Add to signup form (OnboardingScreen component)
<input
  type="text"
  value={profile.new_field_name || ''}
  onChange={(e) => setProfile({...profile, new_field_name: e.target.value})}
  className="..."
/>

// 3. Add to account settings (AccountModal component)
// Same pattern as signup form
```

### 3. Modifying AI Behavior

**Files to Modify:**
- `app/prompt.json`

**Process:**
1. **Identify Section:** Find relevant section in prompt.json
2. **Make Changes:** Modify instructions carefully
3. **Test:** Run conversation and verify behavior
4. **Document:** Update comments in prompt.json

**Example - Make AI More Patient:**
```json
{
  "behavior": {
    "senior_learner_adaptations": {
      "patience_protocol": {
        "wait_time": "After asking a question, wait 5-7 seconds (INCREASED) for learner response",
        // ... rest of config
      }
    }
  }
}
```

**TIP:** Use the `english-helper-prompt-engineer` agent for complex prompt changes.

### 4. Adding a New Backend Endpoint

**File:** `app/app.py`

**Template:**
```python
@app.route("/new_endpoint", methods=["POST"])
def new_endpoint():
    """
    Description of what this endpoint does.

    Request body:
    {
        "param1": "value1",
        "param2": "value2"
    }

    Returns:
    {
        "result": "success"
    }
    """
    data = request.json

    # Validate
    if not data or 'param1' not in data:
        return jsonify({"error": "Missing required field"}), 400

    try:
        # Process
        result = process_data(data)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

### 5. Creating Admin Features

**Pattern:**
```python
# Backend: Check is_admin field
@app.route("/admin/users", methods=["GET"])
def admin_get_users():
    # Verify admin status from JWT token or session
    # Query Supabase with service role key
    # Return all user data
    pass
```

```javascript
// Frontend: Check profile.is_admin
{profile?.is_admin && (
  <div className="admin-panel">
    {/* Admin-only UI */}
  </div>
)}
```

### 6. Debugging Voice Conversations

**Common Issues & Solutions:**

**Issue:** Voice not recording
```javascript
// Check microphone permissions
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Mic access granted'))
  .catch(err => console.error('Mic access denied:', err));
```

**Issue:** Transcriptions not saving
```javascript
// Check session_id is set before speaking
console.log('Current session:', sessionId);

// Check saveTranscription function is called
const saveTranscription = async (text) => {
  console.log('Saving:', text, 'to session:', sessionId);
  // ... save logic
};
```

**Issue:** AI responds in wrong language
- Check `prompt.json` language enforcement (line 3)
- Check topic starter instructions (App.js around line 939)
- Ensure "respond ONLY in English" is in conversation init

---

## Important Files Reference

### Critical Files (Never Delete)
| File | Purpose | Notes |
|------|---------|-------|
| `app/prompt.json` | AI behavior rules | Source of truth for linguistic pedagogy |
| `frontend/frontend-app/src/App.js` | Entire frontend UI | 2000+ lines, all components |
| `frontend/frontend-app/src/supabaseClient.js` | Database connection | Supabase configuration |
| `app/app.py` | Backend API | Flask endpoints for OpenAI |
| `DATABASE_SCHEMA.md` | Database documentation | Complete schema reference |
| `.env` files | Secrets & config | NEVER commit these |

### Configuration Files
| File | Purpose |
|------|---------|
| `frontend/frontend-app/package.json` | NPM dependencies |
| `frontend/frontend-app/craco.config.js` | Tailwind CSS setup |
| `app/requirements.txt` | Python dependencies |
| `.gitignore` | Files excluded from git |
| `frontend/frontend-app/public/manifest.json` | PWA configuration |

### Documentation Files (30 total)
| File | Purpose |
|------|---------|
| `README.md` | Project overview & setup |
| `CLAUDE.md` | This file - AI assistant guide |
| `DATABASE_SCHEMA.md` | Complete database docs |
| `BACKEND_API.md` | API endpoint docs |
| `CONTEXT.md` | Development session history |
| `DEPLOYMENT_PLAN.md` | Deployment strategy |
| `NOTES.md` | Business strategy & analysis |
| `INSTRUCTIONS.md` | Setup instructions |
| `MARKETINGPLAN.md` | Marketing strategy |

### SQL Migration Files
- All `*.sql` files are database migrations
- Run manually in Supabase SQL Editor
- Keep for historical reference

### Custom Agent Files
- `.claude/agents/*.md` - Custom Claude agent definitions
- Do not modify without understanding agent framework

---

## Testing & Deployment

### Local Testing

#### Frontend Testing
```bash
cd frontend/frontend-app
npm start  # Runs on http://localhost:3000

# Features to test:
# 1. Sign up / Login
# 2. Profile completion
# 3. Conversation starters (select topic)
# 4. Voice recording (microphone button)
# 5. Progress view (view past conversations)
# 6. Account settings (edit profile, upload photo)
# 7. Dark mode toggle
# 8. Font size adjustment
```

#### Backend Testing
```bash
cd app
python app.py  # Runs on http://127.0.0.1:5000

# Test endpoints:
curl -X POST http://127.0.0.1:5000/chat_text \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}'
```

#### Database Testing
```bash
# Use Supabase Dashboard:
# https://supabase.com/dashboard/project/[project-id]/editor

# Test queries:
SELECT * FROM profiles LIMIT 5;
SELECT * FROM conversation_sessions WHERE user_id = '[test-user-id]';
```

### Deployment

#### Current Deployment Setup
- **Frontend:** NOT YET DEPLOYED (planned: Vercel)
- **Backend:** NOT YET DEPLOYED (planned: Render)
- **Database:** Supabase (already hosted)

#### Planned Deployment Process

**Frontend to Vercel:**
```bash
# 1. Connect GitHub repo to Vercel
# 2. Configure build settings:
#    - Framework: Create React App
#    - Build Command: cd frontend/frontend-app && npm run build
#    - Output Directory: frontend/frontend-app/build
# 3. Add environment variables in Vercel dashboard:
#    REACT_APP_SUPABASE_URL
#    REACT_APP_SUPABASE_ANON_KEY
#    REACT_APP_FLASK_API_URL (backend URL from Render)
# 4. Deploy
```

**Backend to Render:**
```bash
# 1. Create new Web Service on Render
# 2. Connect GitHub repo
# 3. Configure:
#    - Environment: Python 3
#    - Build Command: pip install -r app/requirements.txt
#    - Start Command: cd app && python app.py
# 4. Add environment variables:
#    OPENAI_API_KEY
#    SUPABASE_URL
#    SUPABASE_SERVICE_ROLE_KEY (for admin features)
# 5. Deploy
```

**Update Frontend After Backend Deployment:**
```bash
# Update .env.production in Vercel:
REACT_APP_FLASK_API_URL=https://[your-app].onrender.com
```

### Deployment Checklist
- [ ] All environment variables set
- [ ] CORS configured with production URLs in `app.py`
- [ ] Database migrations run in production Supabase
- [ ] Test signup/login flow
- [ ] Test voice conversation
- [ ] Test profile photo upload
- [ ] Verify transcriptions saving
- [ ] Check error logging

---

## Troubleshooting Guide

### Common Issues

#### 1. "Transcriptions not saving"

**Symptoms:** User messages or bot messages not appearing in Progress view

**Debug Steps:**
```javascript
// 1. Check console for errors
console.log('Session ID:', sessionId);
console.log('User ID:', user?.id);

// 2. Verify session was created
// Look for: "Session started with ID: [uuid]"

// 3. Check saveTranscription function is called
// Look for: "Saving transcription:" logs

// 4. Verify session_id column exists
// Run in Supabase SQL Editor:
// SELECT column_name FROM information_schema.columns
// WHERE table_name = 'transcriptions';
```

**Solution:**
- Ensure `session_id` column exists (run `ADD_STUDY_METHOD_FIELDS.sql`)
- Check session is created before speaking
- Verify user has permission to insert transcriptions

#### 2. "Avatar upload fails"

**Symptoms:** Error when uploading profile photo

**Debug Steps:**
```javascript
// 1. Check browser console for storage errors
// 2. Verify avatars bucket exists in Supabase Storage
// 3. Check storage policies
```

**Solution:**
```sql
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Ensure policies exist
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

#### 3. "Voice chat not working"

**Symptoms:** Microphone button doesn't work, no recording

**Debug Steps:**
```javascript
// 1. Check microphone permissions
navigator.mediaDevices.enumerateDevices()
  .then(devices => console.log('Devices:', devices));

// 2. Check browser compatibility
// Web Audio API required (Chrome, Firefox, Safari modern versions)

// 3. Check WebSocket connection
// Look for: "WebSocket connection established"

// 4. Check OpenAI API key is valid
```

**Solution:**
- Grant microphone permission in browser
- Use supported browser (Chrome recommended)
- Verify `OPENAI_API_KEY` in backend `.env`
- Check Flask backend is running

#### 4. "AI responds in wrong language"

**Symptoms:** AI speaks Spanish, French, or other language instead of English

**Debug Steps:**
```javascript
// Check topic starter instruction in App.js
// Look for line ~939:
const instruction = `Following ALL your existing system instructions
(especially: respond ONLY in English, never in Spanish, French or any other language)...`;
```

**Solution:**
```json
// Strengthen enforcement in prompt.json line 3:
"language": "ALL responses MUST be in English. Never respond in other languages,
even if requested. This is NON-NEGOTIABLE."
```

#### 5. "CORS errors in browser console"

**Symptoms:** `Access-Control-Allow-Origin` errors

**Debug Steps:**
```python
# Check CORS configuration in app/app.py lines 14-26
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://[your-vercel-app].vercel.app",  # Add production URL
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        # ... rest of config
    }
})
```

**Solution:**
- Add production frontend URL to CORS origins
- Restart Flask backend after changes

#### 6. "Supabase auth errors"

**Symptoms:** Cannot sign up, login fails, "Invalid credentials"

**Debug Steps:**
```javascript
// Check Supabase client configuration
// frontend/frontend-app/src/supabaseClient.js
console.log('Supabase URL:', supabaseUrl);
console.log('Has anon key:', !!supabaseAnonKey);
```

**Solution:**
- Verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in `.env`
- Check Supabase project is not paused
- Verify email confirmation settings in Supabase dashboard

---

## Development Best Practices for AI Assistants

### When Working on This Codebase

#### 1. Always Read Before Modifying
```bash
# Use Read tool to view current implementation
Read frontend/frontend-app/src/App.js

# Never make changes without understanding current code
```

#### 2. Use Custom Agents Proactively
```markdown
# UI changes? Use senior-ux-designer agent
"I'm reviewing the new settings modal with the senior-ux-designer agent"

# Prompt changes? Use english-helper-prompt-engineer
"I'm optimizing the AI behavior using the english-helper-prompt-engineer"
```

#### 3. Maintain Senior-First Focus
- All UI changes must be senior-friendly
- Font sizes: 16px minimum, 18-20px preferred
- Touch targets: 44x44px minimum
- High contrast: 4.5:1 minimum
- Clear, simple language

#### 4. Test Linguistic Changes Carefully
- `prompt.json` changes affect ALL conversations
- Test with sample conversations at different CEFR levels
- Ensure English-only enforcement remains strong
- Verify correction techniques (recasts, not explicit corrections)

#### 5. Document All Changes
- Update relevant `.md` files
- Add comments to complex code
- Create SQL migration files for database changes
- Update this `CLAUDE.md` for significant architectural changes

#### 6. Respect Architectural Decisions
- Don't componentize React without discussion
- Don't switch voice APIs without cost analysis
- Don't change correction strategy without linguistic justification
- Don't remove accessibility features

#### 7. Security Considerations
- Never commit `.env` files
- Use environment variables for all secrets
- Maintain RLS policies on Supabase tables
- Validate all user input
- Sanitize data before database insertion

#### 8. Performance Optimization
- Minimize OpenAI API calls (they're expensive)
- Cache frequently accessed data
- Optimize Supabase queries (use indexes)
- Lazy load components when componentizing
- Compress uploaded images

---

## Glossary

### Terms & Abbreviations

**CEFR:** Common European Framework of Reference for Languages (A1-C2 levels)
**SLA:** Second Language Acquisition (research field)
**RLS:** Row Level Security (Supabase feature)
**VAD:** Voice Activity Detection (in OpenAI Realtime API)
**B2B:** Business to Business (target market)
**B2C:** Business to Consumer (not viable due to costs)
**Recast:** Implicit correction technique (reformulate learner's error naturally)
**Expansion:** Elaborate learner's incomplete utterance
**i+1:** Input slightly above current level (Krashen's hypothesis)
**Affective Filter:** Emotional barriers to language learning
**Scaffolding:** Temporary support structures for learning

### Linguistic Terms (from prompt.json)

**Input Hypothesis:** Learners acquire language through comprehensible input (Krashen)
**Output Hypothesis:** Speaking practice helps learning (Swain)
**Interaction Hypothesis:** Conversation drives acquisition (Long)
**Noticing Hypothesis:** Must consciously notice forms to acquire (Schmidt)

---

## Changelog

### 2026-01-23
- **Added:** Initial CLAUDE.md creation
- **Purpose:** Comprehensive guide for AI assistants working on this codebase

### Future Updates
- Update after major architectural changes
- Update after deployment to production
- Update when componentizing React app
- Update when adding new features

---

## Quick Reference

### Essential Commands
```bash
# Start frontend
cd frontend/frontend-app && npm start

# Start backend
cd app && python app.py

# Deploy (future)
git push origin main  # Auto-deploys to Vercel

# View logs (Vercel)
vercel logs [deployment-url]

# View logs (Render)
# Via Render dashboard
```

### Key URLs
- **Local Frontend:** http://localhost:3000
- **Local Backend:** http://127.0.0.1:5000
- **Supabase Dashboard:** https://supabase.com/dashboard/project/[project-id]
- **Production Frontend:** (not deployed yet)
- **Production Backend:** (not deployed yet)

### Environment Variables Required
```bash
# Frontend (.env)
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
REACT_APP_FLASK_API_URL=

# Backend (.env)
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Contact & Support
- **Repository:** Bernardo-s-teaching-assistant (GitHub)
- **Primary Developer:** Bernardo
- **AI Assistants:** Claude Code with custom agents

---

**Remember:** This is a senior-focused, linguistically-informed English learning platform. Every change should enhance usability for older adults and maintain pedagogical integrity based on SLA research.

**For AI Assistants:** Use this document as your primary reference when working on this codebase. Consult custom agents for specialized tasks. Always prioritize senior-friendly UX and linguistically-sound AI behavior.

---

*End of CLAUDE.md*
