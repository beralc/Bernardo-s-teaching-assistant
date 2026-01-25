# Invitation Code System - Setup Guide

## What Was Implemented

A complete invitation code system has been added to your app to control access during launch. Here's what's new:

### 1. Database Tables (INVITATION_SYSTEM.sql)

**New tables created:**
- `invitation_codes` - Stores all invitation codes with metadata
- `invitation_code_uses` - Tracks which users used which codes
- `usage_logs` - Tracks voice conversation usage for tier limits

**Enhanced tables:**
- `profiles` - Added `tier`, `premium_until`, `invitation_code_used`, `monthly_voice_minutes_used`, `is_admin`

### 2. Signup Flow Modified

**Changes to OnboardingScreen (frontend/frontend-app/src/App.js:800-1000):**
- Added required invitation code field to signup form
- Validates code before allowing signup
- Automatically applies tier benefits (free vs premium)
- Shows success message with premium duration if applicable

**User experience:**
- Signup form now requires an invitation code
- Code is validated in real-time
- Link to request code if user doesn't have one
- Clear error messages for invalid codes

### 3. Admin Dashboard Created

**New "Admin" tab (only visible to admin users):**
- Generate new invitation codes with custom settings
- View all existing codes with usage stats
- Activate/deactivate codes
- Track how many times each code was used

**Code configuration options:**
- Custom prefix (e.g., BETA, FOUNDER)
- Max uses (-1 for unlimited)
- Grant premium access (optional)
- Premium duration in days
- Description and tags for organization

## Setup Instructions

### Step 1: Run the SQL Script

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of `INVITATION_SYSTEM.sql`
3. Run the script
4. Verify tables were created successfully

### Step 2: Make Yourself Admin

1. In Supabase Dashboard, go to SQL Editor
2. Find your user ID:
   ```sql
   SELECT id, email FROM auth.users;
   ```
3. Copy your user ID and run:
   ```sql
   UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';
   ```
4. Refresh your app - you should now see the "Admin" tab

### Step 3: Generate Your First Codes

1. Log into your app
2. Click the "Admin" tab at the bottom
3. Fill out the form:
   - **Prefix**: BETA2025
   - **Tag**: Beta Tester
   - **Max Uses**: 50
   - **Grants Premium**: Uncheck (unless you want to give free premium)
   - **Description**: "Initial beta testers"
4. Click "Generate Code"
5. The code will be displayed (e.g., BETA2025X7K4L2)

### Step 4: Distribute Codes

**Option A: Share codes manually**
- Give codes to friends/family via email or message
- Each code can be used multiple times (based on max_uses)

**Option B: Create unique single-use codes**
- Set Max Uses to 1
- Generate multiple codes
- Give each person their own code

**Option C: Email automation (future)**
- Set up a contact form on your landing page
- Automatically email codes to new requests

### Step 5: Test the Signup Flow

1. Open app in incognito/private browser window
2. Click "Need an account? Sign Up"
3. Try signing up WITHOUT a code → Should show error
4. Enter one of your generated codes
5. Complete signup → Should work!
6. Check Admin dashboard → Code usage should increment

## Default Codes Included

The SQL script creates these starter codes:

| Code | Max Uses | Premium | Description |
|------|----------|---------|-------------|
| BETA2025 | 50 | No | Beta tester access |
| FOUNDER10 | 10 | No | Founding member access |
| BERNARDO | Unlimited | No | Personal invitation from Bernardo |

**Note:** These are just examples. You can delete/modify them in the Admin dashboard.

## Tier System Overview

**Free Tier (Default)**
- Basic access to all features
- No voice minute limits yet (see below)
- Invitation code required

**Premium Tier**
- Granted via special invitation codes
- Time-limited (e.g., 30 days)
- Future: More voice minutes, priority features

**To grant premium access:**
1. Generate code with "Grants Premium" checked
2. Set duration (e.g., 30 days)
3. User signs up with that code
4. Profile automatically set to premium tier
5. `premium_until` field tracks expiration

## Usage Tracking (Not Yet Active)

The system is ready to track voice conversation usage:

**Database structure in place:**
- `usage_logs` table exists
- `monthly_voice_minutes_used` column in profiles
- `reset_monthly_usage()` function ready

**To activate limits (future task):**
1. Modify `startSession()` in App.js to log usage
2. Check `monthly_voice_minutes_used` before starting
3. Set up monthly reset via Supabase Edge Function
4. Define tier limits (e.g., Free: 30 min/month, Premium: 300 min/month)

## Admin Features

**What admins can do:**
- Access Admin tab in bottom navigation
- Generate unlimited invitation codes
- See all codes and their usage stats
- Activate/deactivate codes
- View user emails (via SQL queries)

**To add more admins:**
```sql
UPDATE profiles
SET is_admin = true
WHERE email = 'new_admin@example.com';
```

## Security Features

**Row Level Security (RLS) enabled:**
- Only admins can view/create invitation codes
- Users can only see their own code uses
- Codes validated server-side before signup
- Race conditions prevented with database locks

**Code validation prevents:**
- Using expired codes
- Using fully-used codes
- Using inactive codes
- Using same code twice by same user

## Next Steps

### Immediate (Manual Testing)
1. ✅ Run SQL script
2. ✅ Make yourself admin
3. ✅ Generate test codes
4. ✅ Test signup with code
5. ✅ Verify code usage increments

### Soon (Usage Limits)
- [ ] Add voice minute tracking to session logs
- [ ] Implement tier-based limits in TalkView
- [ ] Show usage stats in user profile
- [ ] Set up monthly reset (Supabase Edge Function)

### Later (Scale)
- [ ] Landing page with code request form
- [ ] Email automation for code distribution
- [ ] Analytics dashboard (code performance)
- [ ] Referral system (users invite friends)
- [ ] Paid tier with Stripe integration

## Troubleshooting

**"Error: function validate_invitation_code does not exist"**
- The SQL script didn't run completely
- Re-run the entire INVITATION_SYSTEM.sql file

**"Code validated but signup fails"**
- Check browser console for errors
- Verify Supabase RLS policies are correct
- Check that profiles table has new columns

**"Admin tab not showing"**
- Verify `is_admin = true` in profiles table
- Hard refresh the app (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for React errors

**"Can't see invitation codes in admin panel"**
- Verify you're marked as admin
- Check RLS policies on invitation_codes table
- Generate at least one code first

## File Reference

**Modified files:**
- `frontend/frontend-app/src/App.js` (lines 800-1000, 136-145, 1901-2131)

**New files:**
- `INVITATION_SYSTEM.sql` - Complete database setup
- `INVITATION_SYSTEM_SETUP.md` - This guide

**Related docs:**
- `INSTRUCTIONS.md` - Complete launch strategy
- `NOTES.md` - Business strategy and pricing
- `DATABASE_SCHEMA.md` - Full database documentation

## Support

If you run into issues:
1. Check browser console (F12) for errors
2. Check Supabase logs for SQL errors
3. Verify all SQL ran successfully
4. Review the RLS policies

---

**Status:** ✅ Fully Implemented and Ready to Use

Last updated: January 29, 2025
