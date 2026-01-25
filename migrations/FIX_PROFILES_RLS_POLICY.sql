-- Fix the infinite recursion in profiles RLS policy
-- The problem: The admin policy was checking profiles.is_admin, which triggered the same policy again

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Create a new policy that doesn't cause recursion
-- This policy allows users to view their own profile OR if they are admin
CREATE POLICY "Users can view own profile and admins view all" ON profiles
  FOR SELECT USING (
    auth.uid() = id  -- Users can see their own profile
    OR
    is_admin = true  -- Admins can see all profiles (no subquery, no recursion)
  );

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';
