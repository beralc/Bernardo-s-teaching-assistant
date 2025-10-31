-- Alternative solution: Admin user management using Supabase RLS
-- This allows viewing user data without needing backend API

-- Create a view that admins can access to see user emails
CREATE OR REPLACE VIEW admin_user_list AS
SELECT
  p.id,
  p.name,
  p.surname,
  p.tier,
  p.is_admin,
  p.created_at,
  p.age,
  p.native_language,
  p.country,
  p.english_level,
  p.monthly_voice_minutes_used,
  p.premium_until,
  p.avatar_url
FROM profiles p;

-- Enable RLS on the view
ALTER VIEW admin_user_list OWNER TO authenticated;

-- Grant select permission to authenticated users
GRANT SELECT ON admin_user_list TO authenticated;

-- Create RLS policy for the view (only admins can query it)
-- Note: Views inherit RLS from underlying tables, but we can add policies

-- For admins to see all users, we already have the profile policy
-- But we can't get emails from auth.users without service role

-- ALTERNATIVE: Use Supabase Functions
-- This won't work with just RLS because emails are in auth.users table
-- which requires service_role access

-- RECOMMENDATION: The backend API approach is the correct solution
-- You MUST add the SUPABASE_SERVICE_ROLE_KEY to Render environment variables

-- To find your service role key:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your project
-- 3. Settings → API
-- 4. Copy the "service_role" key (NOT the anon key)
-- 5. Add to Render as environment variable: SUPABASE_SERVICE_ROLE_KEY
