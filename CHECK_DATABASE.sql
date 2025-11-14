-- Run this in Supabase SQL Editor to check if columns exist

-- Check profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('study_method', 'institution_name', 'name', 'surname', 'age', 'native_language', 'country')
ORDER BY column_name;

-- Check if any data exists in these columns
SELECT
  id,
  name,
  surname,
  age,
  native_language,
  country,
  study_method,
  institution_name,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
