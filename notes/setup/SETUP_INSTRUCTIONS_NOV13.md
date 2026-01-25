# Setup Instructions - November 13, 2024

## Changes Made Today

### 1. Removed Can-Do Gamification System
- Hidden Can-Do achievements from Profile and Progress tabs
- Disabled automatic Can-Do analysis after conversations
- Database tables and backend code **preserved** (just commented out)
- Can be re-enabled later if needed for research

### 2. Added Senior-Friendly Metrics
New "Your Learning Journey" section in Progress tab shows:
- **Conversations**: Total number of sessions completed
- **Practice Streak**: Consecutive days with practice
- **Topics Explored**: Number of unique topics discussed

No gamification, no badges - just simple, encouraging progress metrics.

### 3. Added Study Method Tracking
New required fields in signup form:
- "Are you studying at an academy or with an app?" dropdown
  - Options: Academy / App / Self-study / Private tutor / Other
- Conditional "Institution/App name" field (appears when Academy/App selected)

Also appears in Profile view for editing.

### 4. Updated Country List
- Full list of 195 countries (was only ~17)
- Spain appears **first** in the dropdown
- Applied to both signup form and profile edit view

### 5. Fixed Invitation Request Email
- Changed from `bernardomorales@example.com` to `bernardm@ucm.es`

### 6. Removed Favicon
- Commented out favicon references (no more console errors)

---

## Database Migration Required

⚠️ **IMPORTANT: Run this SQL in Supabase BEFORE testing**

```sql
-- Add study method and institution name fields to profiles table
-- Run this in Supabase SQL Editor

-- Add study_method column (dropdown options)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS study_method text
CHECK (study_method IN ('Academy', 'App', 'Self-study', 'Private tutor', 'Other', NULL));

-- Add institution_name column (free text for academy/app name)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS institution_name text;

-- Comment for documentation
COMMENT ON COLUMN profiles.study_method IS 'How the user is currently studying English: Academy, App, Self-study, Private tutor, or Other';
COMMENT ON COLUMN profiles.institution_name IS 'Name of the academy, app, or institution where user studies (if applicable)';
```

**Or run the file:** `ADD_STUDY_METHOD_FIELDS.sql`

---

## Deployment Status

✅ **Code pushed to GitHub**
✅ **Vercel will auto-deploy** (1-2 minutes)

### Testing Checklist

After Vercel deploys (check https://vercel.com/dashboard):

1. **Hard refresh browser:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows)

2. **Test Signup Form:**
   - [ ] Country dropdown shows Spain first, then full list
   - [ ] "Are you studying at an academy or with an app?" dropdown appears
   - [ ] Selecting "Academy" or "App" shows name field (required)
   - [ ] Selecting "Self-study" doesn't show name field
   - [ ] "Request code" link goes to bernardm@ucm.es
   - [ ] Can complete signup successfully

3. **Test Progress Tab:**
   - [ ] Can-Do achievements section is GONE
   - [ ] New "Your Learning Journey" section appears
   - [ ] Shows: Conversations, Practice Streak, Topics Explored
   - [ ] Metrics calculate correctly from your data

4. **Test Profile Tab:**
   - [ ] Can-Do checklist section is GONE
   - [ ] "Studying at" dropdown appears
   - [ ] "Institution/App name" field appears when editing
   - [ ] Can save profile with new fields
   - [ ] Data persists after save

5. **Test Admin Panel:**
   - [ ] Users table should show new columns (if viewing raw data)

---

## For Your PhD Research

### Data You Can Now Collect:

**Before (only CEFR level):**
- english_level (A1-C2)

**Now (rich study context):**
- english_level (A1-C2)
- study_method (Academy/App/Self-study/Private tutor/Other)
- institution_name (which academy or app they use)
- country (full list of 195 countries)

**Example SQL to analyze:**
```sql
-- See which academies/apps your participants use
SELECT
  study_method,
  institution_name,
  COUNT(*) as participant_count
FROM profiles
WHERE study_method IN ('Academy', 'App')
GROUP BY study_method, institution_name
ORDER BY participant_count DESC;

-- Compare practice time by study method
SELECT
  p.study_method,
  AVG(cs.duration_minutes) as avg_session_length,
  COUNT(DISTINCT cs.user_id) as num_users
FROM profiles p
JOIN conversation_sessions cs ON p.id = cs.user_id
GROUP BY p.study_method;
```

### Research Benefits:

1. **Control for confounding variables**: You can now control for whether participants are also using other apps/attending academies
2. **Comparative analysis**: Compare AI-only learners vs AI+academy learners
3. **Institutional partnerships**: Identify which academies send you students
4. **Demographic richness**: Better country data for international analysis

---

## What's Preserved (Can Re-enable)

All Can-Do system code is **commented out**, not deleted:

- Frontend: `App.js` lines 1044-1114 (Profile), 2540-2607 (Progress)
- Backend: Can-Do analysis function still exists
- Database: All Can-Do tables intact
- Admin: Can-Do management tab hidden but code remains

To re-enable: Uncomment the code blocks and remove `// DISABLED` comments.

---

## Files Changed

**Modified:**
- `frontend/frontend-app/src/App.js` (+274 lines, comprehensive changes)
- `frontend/frontend-app/public/index.html` (commented favicon)

**Created:**
- `ADD_STUDY_METHOD_FIELDS.sql` (database migration)
- `SETUP_INSTRUCTIONS_NOV13.md` (this file)

---

## Next Steps

1. ✅ Run SQL migration in Supabase
2. ✅ Wait for Vercel deployment (1-2 min)
3. ✅ Hard refresh browser
4. ✅ Test all checklist items above
5. ⏸️ Test with a friend/colleague signup
6. ⏸️ Export data to verify new columns appear

---

## Support

If something doesn't work:
1. Check Vercel deployment logs
2. Check browser console for errors (F12)
3. Verify SQL migration ran successfully in Supabase
4. Hard refresh again (cache can be stubborn)

The Can-Do system removal is clean and reversible. All data collection for your PhD continues working. The new study method tracking will give you much richer research data!
