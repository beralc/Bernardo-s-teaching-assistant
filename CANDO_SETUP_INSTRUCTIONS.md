# Can-Do Checklist Setup Instructions

## Overview
This will set up automatic Can-Do achievement tracking for your PhD research.

**What this does:**
- Tracks 328 CEFR Can-Do statements (speaking/listening/interaction, A1-B2+)
- AI automatically detects achievements after each voice session
- Learners see their progress in their profile
- You (admin) can review/manage achievements

---

## Step 1: Create Database Tables in Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the **entire contents** of `supabase_cando_schema.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd+Enter)
8. You should see: "Success. No rows returned"

**What this creates:**
- `cando_statements` table (328 Can-Do statements)
- `user_cando_achievements` table (tracks who achieved what)
- `session_cando_analysis` table (logs AI analysis for research)
- Row-level security policies
- Helper functions

---

## Step 2: Import CEFR Can-Do Statements

From your terminal in the project directory:

```bash
cd "/Users/bernardomorales/Desktop/english teacher assisstant"
python3 import_cando_statements.py
```

**Expected output:**
```
================================================================================
CEFR Can-Do Statements Import Script
================================================================================

📂 Loading filtered CEFR statements...
✅ Loaded 328 statements

🔄 Preparing data for Supabase...
✅ Prepared 328 records for import

📤 Importing to Supabase...
  Batch 1/7: Importing 50 statements... ✅ Success
  Batch 2/7: Importing 50 statements... ✅ Success
  ...
  Batch 7/7: Importing 28 statements... ✅ Success

================================================================================
Import Summary
================================================================================
✅ Successfully imported: 328 statements
================================================================================

🎉 Import completed successfully!
```

---

## Step 3: Verify Data in Supabase

1. Go to Supabase dashboard → **Table Editor**
2. Select `cando_statements` table
3. You should see 328 rows
4. Check a few entries to make sure data looks correct

**Sample row:**
- level: "B1"
- skill_type: "speaking"
- descriptor: "Can reasonably fluently sustain a straightforward description..."
- keywords: ["reasonably", "fluently", "sustain", "straightforward", "description", ...]

---

## What Happens Next

After the data is imported, I'll implement:

### Backend (Flask API):
- **POST /analyze_session**: Analyze voice session transcript for Can-Do achievements
- **GET /users/{id}/cando**: Get user's achievements and progress
- **POST /admin/users/{id}/cando/{statement_id}**: Manually mark achievement

### Frontend (React):
- **Learner Profile**: Can-Do checklist showing progress by level
- **Admin Panel**: Review AI-detected achievements, manually add/remove

### AI Detection:
After each voice session ends, backend will:
1. Get conversation transcript
2. Send to GPT-4 with Can-Do statements for user's level
3. AI returns: which statements were demonstrated + confidence + evidence
4. Save to `user_cando_achievements` table
5. Show new achievements to learner (with confetti 🎉)

---

## Troubleshooting

### "Missing environment variables" error
Make sure your `.env` file has:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### SQL errors in Supabase
- Make sure you copied the **entire** SQL file
- Check if tables already exist (drop them first if needed)
- Check SQL Editor logs for specific error messages

### Import script fails
- Verify environment variables are set correctly
- Check Supabase service role key has proper permissions
- Try running with `python3 -v import_cando_statements.py` for verbose output

---

## Database Schema Summary

### `cando_statements` (328 rows)
Master table of all Can-Do descriptors
- Columns: level, skill_type, mode, activity, descriptor, keywords

### `user_cando_achievements`
Tracks which statements each user has achieved
- Columns: user_id, cando_id, detected_by, confidence_score, evidence_text
- detected_by: 'ai_automatic', 'admin_manual', 'ai_suggested'

### `session_cando_analysis`
Logs every AI analysis for research purposes
- Tracks: session_id, detected_achievements, processing_time, model_used
- Useful for analyzing AI accuracy in your PhD research

---

## Research Benefits

This system will provide quantitative data for your PhD:

**RQ1 (Effectiveness):**
- Track Can-Do progression over time
- Compare experimental vs control groups
- Measure improvement rates by level/skill

**RQ2 (SLA Principles):**
- Evidence of Output Hypothesis: achievements in speaking
- Evidence of Noticing: detection of specific grammatical structures
- Evidence of ZPD: statements at i+1 level being achieved

**Mixed Methods:**
- Quantitative: Achievement timestamps, confidence scores, level progression
- Qualitative: Evidence excerpts showing learner language production
- AI accuracy analysis: Compare AI detections vs your manual ratings

---

Ready to proceed? Run the SQL and import script, then let me know when it's done!
