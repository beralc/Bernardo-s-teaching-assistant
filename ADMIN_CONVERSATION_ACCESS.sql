-- Add RLS policies to allow admins to view all conversations

-- Admin policy for viewing all conversation sessions
CREATE POLICY "Admins can view all sessions" ON conversation_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin policy for viewing all conversation messages
CREATE POLICY "Admins can view all messages" ON conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admin policy for viewing all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profiles
      WHERE admin_profiles.id = auth.uid()
      AND admin_profiles.is_admin = true
    )
  );
