-- Copy profile_picture_url to avatar_url and then drop the old column
-- Run this in Supabase SQL Editor

-- Step 1: Copy any existing data from profile_picture_url to avatar_url
UPDATE profiles 
SET avatar_url = profile_picture_url 
WHERE profile_picture_url IS NOT NULL 
  AND (avatar_url IS NULL OR avatar_url = '');

-- Step 2: Drop the old profile_picture_url column
ALTER TABLE profiles 
DROP COLUMN IF EXISTS profile_picture_url;

-- Step 3: Verify - show all avatar URLs
SELECT id, name, avatar_url 
FROM profiles 
WHERE avatar_url IS NOT NULL;
