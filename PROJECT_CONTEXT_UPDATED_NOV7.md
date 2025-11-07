# Project Context Document - Updated November 7, 2024

## Table of Contents
1. [Project Overview](#project-overview)
2. [PhD Research Context](#phd-research-context)
3. [Technical Architecture](#technical-architecture)
4. [Deployment Guide](#deployment-guide)
5. [Features Implemented](#features-implemented)
6. [Can-Do Achievement System](#can-do-achievement-system)
7. [Recent Work Completed](#recent-work-completed)
8. [Current State](#current-state)
9. [Environment Configuration](#environment-configuration)
10. [Important Design Decisions](#important-design-decisions)
11. [Next Steps](#next-steps)

---

## Project Overview

**Project Name:** Bernardo's Teaching Assistant
**Purpose:** AI-powered English language teaching tool for PhD research
**Institution:** Universidad Complutense de Madrid
**Researcher:** Bernardo Morales
**Target Users:** Senior adult learners (50+ years old)
**Focus:** Spoken English proficiency (listening, speaking, interaction)

### What This Is
This is **NOT a commercial product**. This is a research tool being developed for Bernardo's PhD dissertation on using AI to teach English to senior learners. All features and design decisions are driven by research requirements, not commercial considerations.

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

### SLA Theories Implemented
The AI assistant is grounded in these Second Language Acquisition theories:

1. **Krashen's Input Hypothesis (i+1)** - Comprehensible input slightly above current level
2. **Krashen's Affective Filter Hypothesis** - Minimize anxiety to maximize acquisition
3. **Schmidt's Noticing Hypothesis** - Conscious noticing of linguistic features
4. **Swain's Output Hypothesis** - Language production develops fluency
5. **Long's Interaction Hypothesis** - Negotiation of meaning through interaction
6. **Vygotsky's Zone of Proximal Development (ZPD)** - Teach within assisted performance zone
7. **Bruner's Scaffolding** - Temporary support structures that gradually fade

---

## Technical Architecture

### Tech Stack
**Frontend:**
- React 19.2.0
- Tailwind CSS 4.1.16
- Supabase JS Client 2.77.0
- Deployed on Vercel

**Backend:**
- Python 3.x + Flask
- OpenAI API (GPT-4o, Whisper, Realtime API)
- Deployed on Render (free tier)

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS) policies
- Real-time subscriptions

### Key Technologies
- **Voice:** OpenAI Realtime API with WebSockets
- **Transcription:** Whisper-1
- **AI Chat:** GPT-4o (text and voice)
- **Authentication:** Supabase Auth (JWT)

### Repository Structure
```
├── app/
│   ├── app.py                      # Flask backend
│   ├── prompt.json                 # AI teaching assistant instructions (528 lines)
│   ├── requirements.txt
│   └── .env                        # Backend environment variables
├── frontend/frontend-app/
│   ├── src/
│   │   ├── App.js                  # Main React component (4000+ lines)
│   │   ├── supabaseClient.js       # Supabase initialization
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── .env                        # Frontend environment variables
├── supabase_cando_schema.sql      # Can-Do checklist database schema
├── import_cando_statements.py     # Import 328 CEFR Can-Do statements
├── cefr_statements_filtered.json  # Filtered CEFR descriptors
├── CEFR Descriptors.xlsx          # Original CEFR framework data
└── PROJECT_CONTEXT_UPDATED_NOV7.md # This file
```

---

## Deployment Guide

### Git and GitHub Workflow

#### Initial Setup (Already Done)
```bash
# Repository is already initialized and connected
git remote -v
# origin  https://github.com/beralc/Bernardo-s-teaching-assistant.git
```

#### Making Changes and Deploying

**1. Check Current Status**
```bash
cd "/Users/bernardomorales/Desktop/english teacher assisstant"
git status
```

**2. Stage Your Changes**
```bash
# Stage specific files
git add app/app.py
git add frontend/frontend-app/src/App.js

# Or stage all changes
git add .
```

**3. Commit Your Changes**
```bash
git commit -m "Description of what you changed"

# Example with detailed message
git commit -m "Fix Can-Do API endpoint to return correct data structure

- Changed response format from {levels} to {progress_by_level}
- Added total_achievements count
- Fixed frontend display of achievements"
```

**4. Push to GitHub**
```bash
git push origin main
```

**5. Automatic Deployments**
- **Vercel (Frontend):** Deploys automatically within 1-2 minutes
- **Render (Backend):** May need manual trigger (see below)

#### Manual Backend Deployment on Render

**When Backend Changes Are Made:**
1. Push code to GitHub (as above)
2. Go to https://dashboard.render.com
3. Click on "bernardo-s-teaching-assistant" service
4. Click **"Manual Deploy"** button (top right)
5. Select **"Deploy latest commit"**
6. Wait 2-3 minutes for build and deployment
7. Check "Deploy live" status

**When to Manually Deploy:**
- Changes to `app/app.py`
- Changes to `app/prompt.json`
- Changes to `requirements.txt`

#### Checking Deployment Status

**Frontend (Vercel):**
- Go to: https://vercel.com/dashboard
- Check deployment status and logs
- Auto-deploys on every push to main branch

**Backend (Render):**
- Go to: https://dashboard.render.com
- Check logs for errors
- Free tier: Service sleeps after 15 min inactivity

#### Viewing Logs

**Render Logs (Backend):**
1. Go to Render dashboard
2. Click on service
3. Click "Logs" tab
4. Search for errors or specific log messages
5. Useful for debugging GPT-4 responses, API errors

**Browser Console (Frontend):**
1. Open app in browser
2. Press F12 or Right-click → Inspect
3. Go to Console tab
4. Look for `[ProgressView]` or error messages

#### Common Git Commands

```bash
# View commit history
git log --oneline -10

# See what changed in a file
git diff frontend/frontend-app/src/App.js

# Undo uncommitted changes to a file
git restore frontend/frontend-app/src/App.js

# Create a new branch (for experimental features)
git checkout -b feature-name

# Switch back to main
git checkout main

# Pull latest changes (if working from multiple machines)
git pull origin main
```

#### Deployment Checklist

Before pushing major changes:
- [ ] Test locally (run `npm start` for frontend, `python app.py` for backend)
- [ ] Check console for errors
- [ ] Commit with descriptive message
- [ ] Push to GitHub
- [ ] Wait for Vercel auto-deploy (frontend)
- [ ] Manually deploy on Render (backend if needed)
- [ ] Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
- [ ] Test the changes in production

---

## Features Implemented

### 1. User Authentication
- Email/password registration via Supabase
- Profile creation with demographic data (age, native language, CEFR level)
- Session management with JWT tokens
- Password reset functionality
- Avatar upload

### 2. Voice Conversation Practice ⭐ Core Feature
- **Real-time voice conversation** using OpenAI Realtime API
- WebSocket connection for low-latency audio streaming
- Server-side Voice Activity Detection (VAD)
- Automatic speech-to-text transcription (Whisper-1)
- **Support for interruptions** - user can interrupt AI mid-sentence
- Optional topic selection (conversation starters)
- Session logging with duration, timestamps, transcriptions

### 3. Conversation Starters
- Predefined topics to reduce anxiety and provide structure
- Topics injected into AI context dynamically
- Examples: Travel, Hobbies, Daily Routine, Future Plans

### 4. User Tiers and Usage Tracking
- **Free:** Limited minutes per month (5 min for testing)
- **Starter:** 150 min/month
- **Premium:** 300 min/month
- **Unlimited:** No limits
- Real-time usage tracking in profile
- Monthly reset of usage counters
- Admin can change user tiers

### 5. Admin Panel
- **User Management:**
  - List all users with auth + profile data
  - Create new users (email, password, name, tier, admin status)
  - Delete users
  - Reset passwords
  - Change user tiers via dropdown
  - View user Can-Do achievements
- **Invitation Code System:**
  - Generate time-limited invitation codes
  - Assign tiers to codes
  - Track code usage
- **Can-Do Management:**
  - View user achievements by level
  - See AI detection confidence scores
  - Track automatic vs manual assignments

### 6. Progress Tracking
- **Time Statistics:**
  - Total practice time
  - Daily average
  - Today's practice time
- **Conversation History:**
  - Searchable conversation sessions
  - Expandable transcripts
  - Session duration and timestamps
- **🏆 Unlocked Achievements (NEW):**
  - Display Can-Do achievements grouped by CEFR level
  - Visual progress indicators
  - Achievement dates and AI detection badges
  - Total achievements count

---

## Can-Do Achievement System ⭐ NEW

### Overview
The Can-Do Achievement System tracks learner progress through CEFR (Common European Framework of Reference) Can-Do statements. These are specific competencies like "Can describe past events" or "Can give detailed explanations."

### How It Works

**1. Database (328 CEFR Statements)**
- Imported from official CEFR descriptors
- Filtered for speaking, listening, interaction only
- Covers levels A1 through C2
- Each statement has: level, skill_type, descriptor, keywords

**2. Automatic Detection**
- After each voice conversation, backend analyzes transcript
- GPT-4o identifies which Can-Do statements were demonstrated
- Returns: statement ID, confidence score (0.6-1.0), evidence excerpt
- Saves to database with timestamp and detection method

**3. Frontend Display**
- **Profile Tab:** Detailed checklist with progress bars per level
- **Progress Tab:** Game-like "unlocked achievements" with badges
- Shows: checkmark, descriptor, unlock date, "AI Detected" badge
- Groups by CEFR level (A2, B1, B2, etc.)

### Key Files

**Database Schema:**
- `supabase_cando_schema.sql` - Tables and RLS policies
- `cando_statements` - Master list of 328 statements
- `user_cando_achievements` - User's unlocked achievements
- `session_cando_analysis` - Analysis logs for research

**Backend API:**
- `POST /analyze_session` - Analyzes transcript, detects achievements
- `GET /users/{id}/cando` - Fetches user's achievements and progress

**Frontend Components:**
- Profile → Can-Do Checklist section (detailed view)
- Progress → 🏆 Unlocked Achievements (game-like view)

### Detection Algorithm

**1. Level Range Selection**
- User's assigned level: A2
- Analysis range: A1, A2, A2+, B1, B1+, B2, B2+, C1, C2
- **Rationale:** Detect when learners exceed their assigned level (research goal!)

**2. GPT-4 Analysis**
```
Prompt: "Analyze this transcript for demonstrated Can-Do statements.
        User is level A2 but may perform above this level.
        Use confidence scores: 0.6+ demonstrated, 0.8+ clearly, 0.95+ exceptional"
```

**3. Confidence Threshold**
- Only achievements with confidence ≥ 0.6 are saved
- Researcher can review and approve/reject (admin panel - future)

**4. Deduplication**
- System checks if statement already achieved
- Won't duplicate achievements

### Data Collected for Research
- Which statements detected
- Confidence scores
- Evidence excerpts (quotes from transcript)
- Session ID and timestamp
- Processing time
- Model used (gpt-4o)
- Detection method (ai_automatic vs admin_manual)

---

## Recent Work Completed

### November 7, 2024 - Can-Do System Completion ⭐ MAJOR MILESTONE

**1. Fixed Race Condition in Session End**
- **Problem:** `endSession()` called twice simultaneously, causing duplicate API calls
- **Cause:** Async function with guard check at start, but variables cleared at end
- **Solution:** Capture and clear sessionLogId/sessionStartTime immediately after guard
- **Result:** Single clean API call per session end

**2. Expanded Can-Do Analysis Range**
- **Problem:** Only analyzing ±1 level (A2 → A1, A2, A2+)
- **Issue:** Couldn't detect when learners used B2/C1 language
- **Solution:** Changed to "current level + 2 below + ALL above"
- **Result:** A2 learner now analyzed against A1-C2 statements

**3. Improved GPT-4 Prompt for Detection**
- **Problem:** Overly conservative ("when in doubt, don't mark")
- **Solution:**
  - Emphasize research context (PhD study on senior learners)
  - State "learner may perform ABOVE assigned level"
  - Changed to confidence-based (0.6-1.0 scale)
  - Removed "be conservative" instruction
- **Result:** More accurate recognition of achievements

**4. Fixed JSON Parsing from GPT-4**
- **Problem:** GPT-4 returning responses in markdown code blocks
- **Error:** "Expecting value: line 1 column 1" (JSON parse error)
- **Solution:**
  - Regex extraction from markdown (```json ... ```)
  - Extract JSON even if surrounded by text
  - Better error logging with raw response
- **Result:** Robust JSON parsing

**5. Fixed Backend API Response Structure**
- **Problem:** Backend returned `{user_id, levels: [...]}` but frontend expected `{total_achievements, progress_by_level: [...]}`
- **Solution:**
  - Fetch achievements WITH JOINed statement details
  - Build `achievements_by_statement` map
  - Add `recent_achievements` array to each level
  - Return `total_achievements` count
  - Return `progress_by_level` (not "levels")
- **Result:** Frontend displays all 5 achievements correctly

**6. Built Progress View Achievements Display**
- **Added:** 🏆 Unlocked Achievements section in Progress tab
- **Features:**
  - Total achievements badge (e.g., "5 🎉")
  - Grouped by CEFR level with gradient badges
  - Each achievement shows: ✓ checkmark, descriptor, date, "AI Detected" badge
  - Beautiful gradients (green-to-emerald backgrounds)
  - Empty state with call-to-action
- **Result:** Game-like achievement unlocking experience

**7. Fixed UI Background Colors**
- **Problem:** Empty state had dark gray background (hard to read)
- **Solution:** Changed to light blue (bg-blue-50/blue-900/20)
- **Result:** Much better visibility and aesthetics

### November 2, 2024 - Prompt.json Rewrite

**Major Rewrite of AI Teaching Assistant Instructions**
- **Before:** 75 lines, vague
- **After:** 528 lines, extremely detailed and prescriptive
- **Changes:**
  - Added missing SLA theories (Vygotsky's ZPD, Bruner's Scaffolding)
  - Changed from "correct EVERY error" to selective recasts/expansions
  - Added comprehensive senior learner adaptations
  - Defined exact level-specific input (A2/B1/B2)
  - Created 4-step response template
  - Added 6 scaffolding types with examples
  - Added 12 prohibited behaviors
- **Status:** ✅ Deployed to Render

---

## Current State

### ✅ Fully Implemented and Working
- User authentication and profiles
- Voice conversation with OpenAI Realtime API
- Conversation starters and topics
- Usage tracking (time, sessions, transcripts)
- User tiers (Free, Premium, Unlimited)
- Admin panel (user management, tier changes, code generation)
- **Can-Do Achievement System:**
  - ✅ 328 statements imported to database
  - ✅ Automatic AI detection after sessions
  - ✅ Frontend display in Profile tab
  - ✅ Frontend display in Progress tab
  - ✅ Confidence scoring and evidence logging
  - ✅ Research data collection (analysis logs)

### 🟡 Partially Implemented
- **Can-Do Admin Review:** Can view achievements, but no approve/reject UI yet
- **Manual Can-Do Assignment:** Backend endpoint exists, but no admin UI

### ⏳ Planned but Not Started
- Research analytics dashboard
- Pre/post test administration tools
- Data export for SPSS/R analysis
- Survey tools integration
- Experimental vs Control group features

---

## Environment Configuration

### Frontend Environment Variables (.env in frontend/frontend-app/)
```bash
REACT_APP_SUPABASE_URL=https://sxmidcvenpllqccmcvft.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...  (The anon/public key)
REACT_APP_FLASK_API_URL=https://bernardo-s-teaching-assistant.onrender.com
```

### Backend Environment Variables (.env in app/)
```bash
OPENAI_API_KEY=sk-proj-...  (Your OpenAI API key)
SUPABASE_URL=https://sxmidcvenpllqccmcvft.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (The service_role secret key)
```

### Important Notes
- **Backend uses service role key** for admin operations (bypasses RLS)
- **Frontend uses anon key** for user operations (respects RLS)
- **Never expose service role key in frontend!**
- Service role key available at: Supabase → Settings → API → service_role secret

### Render Configuration
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python app.py`
- **Environment Variables:** Set in Render dashboard → Environment tab
- **Free Tier:** Sleeps after 15 min inactivity, ~30-60s cold start

### Vercel Configuration
- **Build Command:** `npm run build`
- **Output Directory:** `build`
- **Root Directory:** `frontend/frontend-app`
- **Environment Variables:** Set in Vercel dashboard → Settings → Environment Variables

---

## Important Design Decisions

### 1. Why Backend API Instead of Direct Supabase Calls?
**Problem:** Admin operations require service role key
**Why Not Frontend:** Service role key in frontend = security risk
**Solution:** Backend API securely uses service role key

**Flow:**
```
Frontend (user token) → Backend (verify admin) → Supabase (service role) → Response
```

### 2. Why Prompt.json Is So Detailed
**Problem:** Original prompt was vague, inconsistent AI behavior
**Issue:** Can't replicate for research, no clear SLA alignment
**Solution:** 528-line extremely prescriptive prompt with step-by-step procedures

**Benefits:**
- Consistent AI behavior (research requirement)
- Explicit SLA theory implementation
- Clear senior learner adaptations
- Reproducible results

### 3. Why Not Auto-Calculate CEFR Levels?
**Problem:** User suggested AI calculate CEFR level
**Issue:** CEFR requires trained raters and standardized tests
**Solution:** Manual placement via pre-test scored by researcher

**Flow:**
1. Researcher conducts oral pre-test
2. Researcher scores using CEFR rubric
3. Admin sets validated level in system
4. AI uses level for i+1 input
5. Post-test measures improvement

### 4. Why Selective Corrections?
**Problem:** "Correct every error" overwhelms learners
**Issue:** Raises affective filter (Krashen)
**Solution:** Selective implicit corrections via recasts

**Implementation:**
- Max 2-3 errors per turn
- 70% recasts, 20% expansions, 10% explicit
- Prioritize communication-impairing errors
- Ignore articles in A2, one-off slips

### 5. Why Automatic Can-Do Detection?
**Problem:** Manual tracking is time-intensive
**Solution:** AI analyzes transcripts and detects competencies

**Benefits:**
- Learner motivation (immediate feedback, visible progress)
- Research data (AI confidence scores, evidence, timestamps)
- Scalability (40-60 participants)
- Accuracy analysis (AI vs human ratings = research question!)

**Hybrid Approach:**
- AI automatically detects with confidence scores
- Researcher can review and approve/reject (future)
- Provides data on AI accuracy

### 6. Why Expanded Level Range (A1-C2)?
**Problem:** Only analyzing ±1 level missed above-level performance
**Research Goal:** Track when senior learners exceed assigned level
**Solution:** Analyze all levels at or above current level

**Rationale:**
- Senior learners often underestimate abilities
- PhD research interested in performance beyond formal assessment
- Demonstrates Zone of Proximal Development (ZPD) in action

---

## Next Steps

### Immediate Priorities
1. ✅ ~~Deploy backend with JSON parsing fixes~~
2. ✅ ~~Test Can-Do detection with complex language~~
3. ✅ ~~Verify achievements display in both Profile and Progress tabs~~
4. **Test with multiple users** to ensure detection works across profiles
5. **Monitor Render logs** for GPT-4 responses and errors

### Short Term (Next 2 Weeks)
6. **Admin Can-Do Review UI:**
   - View all user achievements
   - Approve/reject AI suggestions
   - Manually assign achievements
7. **Can-Do Analytics:**
   - Most common achievements
   - Average confidence scores
   - Detection accuracy metrics
8. **Mobile Responsiveness:**
   - Test on iPhone/Android
   - Fix any layout issues in Progress tab

### Medium Term (Next Month)
9. **Research Dashboard:**
   - Session duration analytics
   - Turn count tracking
   - Error pattern analysis
   - SLA principle implementation evidence
10. **Pre/Post Assessment Tools:**
    - Oral test administration interface
    - Scoring rubrics
    - Progress comparison
11. **Data Export:**
    - Export to CSV/Excel for SPSS/R
    - Include all research variables

### Long Term
12. **Experimental vs Control:**
    - Group assignment
    - Differentiated features
13. **Survey Integration:**
    - Post-session quick surveys
    - Mid-study questionnaires
14. **Advanced Analytics:**
    - Machine learning on error patterns
    - Predictive models for learner success

---

## Troubleshooting

### Can-Do Achievements Not Showing
1. Check browser console for `[ProgressView]` errors
2. Verify backend is deployed on Render
3. Check Render logs for GPT-4 responses
4. Test API endpoint: `/users/{id}/cando`
5. Verify user has valid session token

### Voice Not Working
1. Check microphone permissions
2. Verify OPENAI_API_KEY is set in Render
3. Check Render logs for WebSocket errors
4. Wait 30s for cold start (free tier)
5. Hard refresh browser (Cmd+Shift+R)

### Backend Not Responding
1. Check Render dashboard - should show "Live"
2. Check if service is sleeping (free tier)
3. Test endpoint: `curl https://bernardo-s-teaching-assistant.onrender.com/`
4. Check environment variables in Render

### Frontend Not Updating
1. Check Vercel deployment status
2. Verify latest commit is deployed
3. Clear browser cache
4. Hard refresh (Cmd+Shift+R)
5. Check environment variables in Vercel

---

## Research Data Structure

### What Gets Logged
**Every Voice Session:**
- session_id, user_id
- started_at, ended_at, duration_minutes
- topic (if selected)
- All transcriptions (user and AI)

**Every Can-Do Analysis:**
- session_id, user_id
- transcript_length
- detected_achievements (array of statement IDs)
- confidence_scores (0.6-1.0)
- evidence_excerpts
- processing_time_ms
- model_used (gpt-4o)
- error_occurred (boolean)

**User Profile Data:**
- age, native_language, country
- english_level (validated CEFR)
- learning_goals, interests
- tier (free/premium/unlimited)
- monthly_voice_minutes_used

### Research Analyses Possible
1. **RQ1 - Effectiveness:**
   - Pre/post CEFR level comparison
   - Can-Do achievement progression over time
   - Practice time correlation with improvement

2. **RQ2 - SLA Principles:**
   - AI detection of i+1 input provision
   - Correction type frequency (recast vs explicit)
   - Scaffolding usage patterns
   - Interaction features (turn-taking, negotiation)

3. **Secondary Questions:**
   - AI detection accuracy (compare to human ratings)
   - Senior learner usage patterns
   - Anxiety reduction over time
   - Technology adoption curves

---

## Contact and Support

**Developer/Researcher:** Bernardo Morales
**Institution:** Universidad Complutense de Madrid
**Repository:** https://github.com/beralc/Bernardo-s-teaching-assistant

**For Technical Issues:**
- Check Render logs (backend)
- Check Vercel logs (frontend)
- Check browser console (frontend errors)
- Review this context document

**For Research Questions:**
- Refer to PhD research context section
- Review SLA theories implemented
- Check data structure for research analyses

---

## Version History

- **Nov 7, 2024:** Can-Do system fully implemented and working, deployment guide added
- **Nov 2, 2024:** Prompt.json rewrite (528 lines), Can-Do preparation phase
- **Oct 31, 2024:** Admin panel improvements, tier management
- **Oct 30, 2024:** Initial deployment to Vercel and Render
- **Oct 29, 2024:** User authentication, voice conversation, basic features

---

**Last Updated:** November 7, 2024
**Status:** ✅ Production Ready - Can-Do System Operational
