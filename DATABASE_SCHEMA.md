# Database Schema - English Teacher Assistant

All data is stored in **Supabase PostgreSQL** database.

## Tables

### 1. **profiles** (User Data)
Stores all user profile information.

```sql
Table: profiles
├── id (uuid, primary key, references auth.users)
├── name (text)
├── surname (text)
├── age (integer)
├── native_language (text)
├── country (text)
├── english_level (text) - A1, A2, B1, B2, C1, C2
├── learning_goals (jsonb array)
├── preferred_skills (jsonb array)
├── interests (jsonb array)
├── preferred_accent (text) - American, British, Australian, Other
├── study_frequency (text) - Daily, 3x per week, Weekly, Occasionally
├── avatar_url (text) - URL to profile photo in Supabase Storage
├── created_at (timestamp)
└── updated_at (timestamp)
```

### 2. **conversation_sessions** (Conversation Tracking)
Tracks each conversation session with duration and topic.

```sql
Table: conversation_sessions
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── started_at (timestamp)
├── ended_at (timestamp)
├── duration_minutes (integer)
├── topic (text) - e.g., "Ordering Coffee", "Daily Routine"
└── created_at (timestamp)
```

### 3. **transcriptions** (Conversation Content)
Stores all spoken text from both user and AI assistant.

```sql
Table: transcriptions
├── id (uuid, primary key)
├── user_id (uuid, references auth.users)
├── session_id (uuid, references conversation_sessions.id)
├── text (text) - Full transcript with "Bot: " or "User: " prefix
├── corrected_text (text) - Corrected version (optional)
└── created_at (timestamp)
```

## Relationships

```
auth.users (Supabase Auth)
    │
    ├── profiles (1:1) - User profile data
    │
    └── conversation_sessions (1:many)
            │
            └── transcriptions (1:many) - All messages in session
```

## Access Methods

### Direct Supabase Access
```javascript
import { supabase } from './supabaseClient';

// Get user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Get user's conversation sessions
const { data: sessions } = await supabase
  .from('conversation_sessions')
  .select('*')
  .eq('user_id', userId)
  .order('started_at', { ascending: false });

// Get transcripts for a session
const { data: transcripts } = await supabase
  .from('transcriptions')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true });
```

### Via REST API
Supabase automatically generates REST API endpoints:

**Base URL:** `https://[your-project].supabase.co/rest/v1/`

**Headers:**
- `apikey: [your-anon-key]`
- `Authorization: Bearer [user-jwt-token]`
- `Content-Type: application/json`

**Endpoints:**
- `GET /profiles?id=eq.[user-id]` - Get user profile
- `GET /conversation_sessions?user_id=eq.[user-id]` - Get all sessions
- `GET /transcriptions?session_id=eq.[session-id]` - Get session transcripts

## Storage

### Avatars Bucket
Profile photos are stored in Supabase Storage:

```
Bucket: avatars
├── [user-id]-[random].jpg
├── [user-id]-[random].png
└── ...
```

**Access:**
- Public bucket (anyone can view)
- Users can only upload/update their own avatar
- URLs: `https://[project].supabase.co/storage/v1/object/public/avatars/[filename]`

## Export User Data

### Full User Data Export
```javascript
async function exportUserData(userId) {
  // 1. Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // 2. Get all sessions with transcripts
  const { data: sessions } = await supabase
    .from('conversation_sessions')
    .select(`
      *,
      transcriptions (*)
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  return {
    profile,
    sessions,
    totalSessions: sessions.length,
    totalTranscripts: sessions.reduce((sum, s) => sum + s.transcriptions.length, 0)
  };
}
```

## Admin Queries

### Get all users with stats
```sql
SELECT
  p.id,
  p.name,
  p.surname,
  p.email,
  p.country,
  p.english_level,
  COUNT(DISTINCT cs.id) as total_sessions,
  SUM(cs.duration_minutes) as total_minutes,
  COUNT(t.id) as total_transcriptions
FROM profiles p
LEFT JOIN conversation_sessions cs ON p.id = cs.user_id
LEFT JOIN transcriptions t ON cs.id = t.session_id
GROUP BY p.id;
```

### Get conversation details
```sql
SELECT
  cs.id,
  cs.topic,
  cs.started_at,
  cs.duration_minutes,
  COUNT(t.id) as message_count
FROM conversation_sessions cs
LEFT JOIN transcriptions t ON cs.id = t.session_id
WHERE cs.user_id = '[user-id]'
GROUP BY cs.id
ORDER BY cs.started_at DESC;
```

## Connection Details

**Your Supabase Project:**
- URL: `REACT_APP_SUPABASE_URL`
- Anon Key: `REACT_APP_SUPABASE_ANON_KEY`

**Environment Variables (.env):**
```
REACT_APP_SUPABASE_URL=https://[your-project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
```
