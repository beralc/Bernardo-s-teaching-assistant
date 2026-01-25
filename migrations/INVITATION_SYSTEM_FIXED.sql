-- ============================================
-- INVITATION CODE SYSTEM + TIER MANAGEMENT
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create invitation_codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  max_uses int default 1,
  current_uses int default 0,
  expires_at timestamptz,
  created_by uuid references auth.users,
  description text,
  tag text, -- e.g., 'BETA', 'FOUNDER', 'SCHOOL_X'
  grants_premium boolean default false,
  premium_duration_days int default 30,
  created_at timestamptz default now(),
  is_active boolean default true
);

-- 2. Create invitation_code_uses tracking table
CREATE TABLE IF NOT EXISTS invitation_code_uses (
  id uuid default gen_random_uuid() primary key,
  code_id uuid references invitation_codes(id) on delete cascade,
  used_by uuid references auth.users on delete cascade,
  used_at timestamptz default now()
);

-- 3. Add tier system to profiles table (INCLUDING is_admin)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tier text default 'free' check (tier in ('free', 'starter', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS premium_until timestamptz,
ADD COLUMN IF NOT EXISTS invitation_code_used text,
ADD COLUMN IF NOT EXISTS monthly_voice_minutes_used int default 0,
ADD COLUMN IF NOT EXISTS last_usage_reset timestamptz default now(),
ADD COLUMN IF NOT EXISTS is_admin boolean default false;

-- 4. Create usage_logs table for tracking voice conversation usage
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  action_type text not null, -- 'voice_conversation', 'text_message', etc.
  duration_minutes decimal(10, 2),
  cost_usd decimal(10, 4),
  metadata jsonb,
  created_at timestamptz default now()
);

-- 5. Enable Row Level Security
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for invitation_codes
-- Admins can see all codes
CREATE POLICY "Admins can view all invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert invitation codes"
  ON invitation_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update invitation codes"
  ON invitation_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 7. RLS Policies for invitation_code_uses
CREATE POLICY "Users can view their own code uses"
  ON invitation_code_uses FOR SELECT
  TO authenticated
  USING (used_by = auth.uid());

CREATE POLICY "Anyone can insert code uses"
  ON invitation_code_uses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8. RLS Policies for usage_logs
CREATE POLICY "Users can view their own usage logs"
  ON usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage logs"
  ON usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 9. Create function to validate invitation code
CREATE OR REPLACE FUNCTION validate_invitation_code(code_input text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record invitation_codes%ROWTYPE;
  result jsonb;
BEGIN
  -- Find the code
  SELECT * INTO code_record
  FROM invitation_codes
  WHERE code = code_input
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses = -1 OR current_uses < max_uses);

  -- Check if code exists and is valid
  IF code_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid, expired, or fully used code'
    );
  END IF;

  -- Return valid code info
  RETURN jsonb_build_object(
    'valid', true,
    'code_id', code_record.id,
    'grants_premium', code_record.grants_premium,
    'premium_duration_days', code_record.premium_duration_days,
    'description', code_record.description
  );
END;
$$;

-- 10. Create function to use invitation code
CREATE OR REPLACE FUNCTION use_invitation_code(code_input text, user_id_input uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record invitation_codes%ROWTYPE;
  result jsonb;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT * INTO code_record
  FROM invitation_codes
  WHERE code = code_input
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses = -1 OR current_uses < max_uses)
  FOR UPDATE;

  -- Check if code exists and is valid
  IF code_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid, expired, or fully used code'
    );
  END IF;

  -- Check if user already used this code
  IF EXISTS (
    SELECT 1 FROM invitation_code_uses
    WHERE code_id = code_record.id AND used_by = user_id_input
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You have already used this invitation code'
    );
  END IF;

  -- Increment usage counter
  UPDATE invitation_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  -- Record the usage
  INSERT INTO invitation_code_uses (code_id, used_by)
  VALUES (code_record.id, user_id_input);

  -- Update user profile with tier info
  IF code_record.grants_premium THEN
    UPDATE profiles
    SET
      tier = 'premium',
      premium_until = now() + (code_record.premium_duration_days || ' days')::interval,
      invitation_code_used = code_input
    WHERE id = user_id_input;
  ELSE
    UPDATE profiles
    SET invitation_code_used = code_input
    WHERE id = user_id_input;
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'grants_premium', code_record.grants_premium,
    'premium_duration_days', code_record.premium_duration_days
  );
END;
$$;

-- 11. Create function to reset monthly usage (run via cron or manually)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET
    monthly_voice_minutes_used = 0,
    last_usage_reset = now()
  WHERE last_usage_reset < date_trunc('month', now());
END;
$$;

-- 12. Insert some initial invitation codes for beta testing
INSERT INTO invitation_codes (code, max_uses, description, tag, is_active)
VALUES
  ('BETA2025', 50, 'Beta tester access - 50 uses', 'BETA', true),
  ('FOUNDER10', 10, 'Founding member - Premium access', 'FOUNDER', true),
  ('BERNARDO', -1, 'Personal invitation from Bernardo - unlimited', 'PERSONAL', true)
ON CONFLICT (code) DO NOTHING;

-- 13. Make yourself an admin (replace with your actual user ID from auth.users)
-- First, find your user ID by running: SELECT id, email FROM auth.users;
-- Then uncomment and run:
-- UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID_HERE';

-- ============================================
-- DONE! Next steps:
-- 1. Find your user ID: SELECT id, email FROM auth.users;
-- 2. Make yourself admin: UPDATE profiles SET is_admin = true WHERE id = 'your-id';
-- 3. Update App.js line 181 to: .select('avatar_url, is_admin')
-- 4. Update App.js line 189 to: setIsAdmin(profile.is_admin || false);
-- 5. Refresh your app - Admin tab should appear!
-- ============================================
