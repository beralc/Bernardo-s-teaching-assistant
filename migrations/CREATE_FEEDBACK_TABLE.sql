-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- Creates the feedback table used by the Help > Send Feedback form.

CREATE TABLE IF NOT EXISTS feedback (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  message     text        NOT NULL CHECK (char_length(message) > 0),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own feedback; nobody can read rows via the client
CREATE POLICY "Users can insert their own feedback"
  ON feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);
