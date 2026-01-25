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
