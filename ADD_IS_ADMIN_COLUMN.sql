-- Add is_admin column to profiles table if it doesn't exist
-- This column is needed for admin functionality

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set your account as admin
-- IMPORTANT: Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- You can find your user ID in the URL when you view your profile in Supabase
-- Or check the error message - it shows: 34d2ac20-19be-437d-8e5f-6def8a4a520d

UPDATE profiles
SET is_admin = true
WHERE id = '34d2ac20-19be-437d-8e5f-6def8a4a520d';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'is_admin';

-- Verify your admin status
SELECT id, name, surname, is_admin
FROM profiles
WHERE is_admin = true;
