-- Fix avatar_url column issue
-- Run this in Supabase SQL Editor

-- Check if avatar_url column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'profiles'
        AND column_name = 'avatar_url'
    ) THEN
        -- Add avatar_url column if it doesn't exist
        ALTER TABLE profiles ADD COLUMN avatar_url text;

        -- Copy data from profile_picture_url if it exists
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND column_name = 'profile_picture_url'
        ) THEN
            UPDATE profiles SET avatar_url = profile_picture_url WHERE profile_picture_url IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('avatar_url', 'profile_picture_url');
