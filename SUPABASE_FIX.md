# Supabase Errors - Quick Fix Guide

## Errors You're Seeing

1. **406 Not Acceptable** on profiles table
2. **404 Not Found** on conversation_sessions table
3. **"Could not find the table in the schema cache"**

## What Happened

The SQL ran successfully ("Success. No rows returned") but:
1. The tables might be in a different schema
2. Supabase's API cache hasn't refreshed
3. Profiles for existing users weren't created

## Fix Instructions

### Step 1: Verify Tables Exist

Go to Supabase Dashboard → Table Editor

You should see these tables:
- `profiles`
- `conversation_sessions`
- `conversation_messages`
- `transcriptions`

**If you DON'T see them:** The tables were created in the wrong schema. Run this instead:

```sql
-- Force tables into public schema
SET search_path TO public;

-- Then re-run the entire supabase_schema.sql file
```

### Step 2: Refresh API Cache

1. Go to Supabase Dashboard
2. Click **Settings** (gear icon)
3. Click **API**
4. Scroll down and click **"Reload schema cache"** button
5. Wait 30 seconds

### Step 3: Create Profile for Your Current User

Your user already exists but doesn't have a profile. Run this SQL:

```sql
-- Check if your user has a profile
SELECT * FROM auth.users;
-- Copy your user ID from the results

-- Manually create your profile
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT * FROM public.profiles;
```

### Step 4: Test API Access

Go to Supabase Dashboard → API → click "profiles" table

You should see a cURL example. Try this in your browser's console:

```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);

console.log({ data, error });
```

If you still get 406 error, check:
- RLS policies are enabled
- Your user is authenticated
- The table is in the `public` schema

### Step 5: Re-run Updated Schema

I've updated the `supabase_schema.sql` file with a fix. Re-run it in Supabase SQL Editor:

The new version includes:
```sql
-- Manually create profiles for existing users (run this once)
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

This will create profiles for all existing users.

## Troubleshooting

### If tables are in wrong schema:

```sql
-- Check which schema they're in
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('profiles', 'conversation_sessions');

-- If they're in a different schema, drop and recreate:
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS conversation_sessions CASCADE;
DROP TABLE IF EXISTS conversation_messages CASCADE;

-- Then re-run the full schema
```

### If RLS is blocking access:

```sql
-- Temporarily disable RLS to test (DON'T do this in production!)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Try to access from app
-- Then re-enable:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### If Supabase cache is stuck:

1. Go to Project Settings → General
2. Click "Pause project"
3. Wait 1 minute
4. Click "Resume project"
5. This forces a full cache refresh

## Expected Behavior After Fix

1. **Account Modal**:
   - Opens without errors
   - Shows empty fields for new users
   - Saves successfully when you fill them in

2. **Progress Tab**:
   - Shows "0 min" for all stats (no sessions yet)
   - No errors in console

3. **Conversation Starters**:
   - Clicking a topic switches to Talk tab
   - Automatically starts listening after 800ms
   - AI begins conversation about that topic

## Still Having Issues?

Share these details:
1. Screenshot of Table Editor showing which tables exist
2. Copy the exact error from browser console
3. Result of: `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'profiles';`
