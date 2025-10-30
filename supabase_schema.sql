-- Supabase Database Schema for English Teacher Assistant
-- Run this in your Supabase SQL editor

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  surname text,
  profile_picture_url text,
  age int,
  native_language text,
  country text,
  timezone text,

  -- Learning profile
  english_level text CHECK (english_level IN ('A1','A2','B1','B2','C1','C2')),
  learning_goals text[],
  preferred_skills text[],
  interests text[],
  preferred_accent text CHECK (preferred_accent IN ('American', 'British', 'Australian', 'Other')),
  study_frequency text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Existing transcriptions table (if it doesn't exist already)
CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  text text not null,
  corrected_text text,
  created_at timestamptz default now()
);

-- 3. Conversation Sessions Table (for tracking time spent)
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_minutes int,
  topic text,
  created_at timestamptz default now()
);

-- 4. Conversation Messages Table (for saving full conversations)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references conversation_sessions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text CHECK (role IN ('user', 'bot', 'assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Transcriptions RLS Policies
CREATE POLICY "Users can view own transcriptions" ON transcriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transcriptions" ON transcriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Conversation Sessions RLS Policies
CREATE POLICY "Users can view own sessions" ON conversation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON conversation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON conversation_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Conversation Messages RLS Policies
CREATE POLICY "Users can view own messages" ON conversation_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON conversation_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup (might not work for existing users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manually create profiles for existing users (run this once)
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
