-- Add voice preference field to profiles table
-- Run this in Supabase SQL Editor

-- Add voice_preference column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS voice_preference text DEFAULT 'sage';

-- Add check constraint for valid voices
ALTER TABLE profiles
ADD CONSTRAINT voice_preference_check
CHECK (voice_preference IN ('sage', 'shimmer', 'coral', 'ballad', 'echo', 'onyx', 'ash', 'verse', NULL));

-- Comment for documentation
COMMENT ON COLUMN profiles.voice_preference IS 'AI voice preference: sage, shimmer, coral, ballad, echo, onyx, ash, or verse';
