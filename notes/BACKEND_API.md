# Backend API Documentation

## Current Backend Architecture

Your app has **TWO backend systems**:

### 1. **Flask Backend** (`app/app.py`)
Handles OpenAI API integration for voice and text chat.

### 2. **Supabase Backend** (PostgreSQL + Storage + Auth)
Handles all user data, authentication, and storage.

---

## Flask API Endpoints

**Base URL:** `http://127.0.0.1:5000` (local) or your deployed URL

### 1. **Text Chat**
```http
POST /chat_text
Content-Type: application/json

{
  "text": "Hello, how are you?"
}
```

**Response:**
```json
{
  "response_text": "I'm doing great! How can I help you practice English today?"
}
```

### 2. **WebRTC Session (Voice Chat)**
```http
POST /webrtc_session
Content-Type: application/json

{
  "topic": {
    "title": "Ordering Coffee",
    "description": "Practice ordering at a cafe"
  }
}
```

**Response:**
```json
{
  "session_id": "sess_abc123",
  "websocket_url": "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
  "ephemeral_token": "eph_token_xyz"
}
```

### 3. **Clear Context**
```http
POST /clear_context
```

**Response:**
```json
{
  "message": "Context cleared."
}
```

---

## Supabase REST API

**Base URL:** `https://[your-project].supabase.co/rest/v1/`

**Authentication:**
All requests require these headers:
```http
apikey: [your-supabase-anon-key]
Authorization: Bearer [user-jwt-token]
Content-Type: application/json
```

### User Profile

#### Get Profile
```http
GET /profiles?id=eq.[user-id]
```

**Response:**
```json
{
  "id": "user-uuid",
  "name": "John",
  "surname": "Doe",
  "age": 25,
  "native_language": "Spanish",
  "country": "Spain",
  "english_level": "B1",
  "avatar_url": "https://[project].supabase.co/storage/v1/object/public/avatars/photo.jpg",
  "created_at": "2025-01-29T10:00:00Z",
  "updated_at": "2025-01-29T12:00:00Z"
}
```

#### Update Profile
```http
PATCH /profiles?id=eq.[user-id]
Content-Type: application/json

{
  "name": "John",
  "english_level": "B2",
  "country": "Spain"
}
```

### Conversation Sessions

#### Get All Sessions
```http
GET /conversation_sessions?user_id=eq.[user-id]&order=started_at.desc
```

**Response:**
```json
[
  {
    "id": "session-uuid",
    "user_id": "user-uuid",
    "started_at": "2025-01-29T10:00:00Z",
    "ended_at": "2025-01-29T10:15:00Z",
    "duration_minutes": 15,
    "topic": "Ordering Coffee",
    "created_at": "2025-01-29T10:00:00Z"
  }
]
```

#### Get Session with Transcripts
```http
GET /conversation_sessions?id=eq.[session-id]&select=*,transcriptions(*)
```

**Response:**
```json
{
  "id": "session-uuid",
  "topic": "Ordering Coffee",
  "duration_minutes": 15,
  "transcriptions": [
    {
      "id": "trans-uuid",
      "text": "Bot: Hello! Ready to practice ordering coffee?",
      "created_at": "2025-01-29T10:01:00Z"
    },
    {
      "id": "trans-uuid-2",
      "text": "I'd like a cappuccino please",
      "created_at": "2025-01-29T10:01:30Z"
    }
  ]
}
```

### Transcriptions

#### Get Session Transcripts
```http
GET /transcriptions?session_id=eq.[session-id]&order=created_at.asc
```

**Response:**
```json
[
  {
    "id": "trans-uuid",
    "user_id": "user-uuid",
    "session_id": "session-uuid",
    "text": "Bot: Hello! Ready to practice?",
    "corrected_text": null,
    "created_at": "2025-01-29T10:01:00Z"
  },
  {
    "id": "trans-uuid-2",
    "user_id": "user-uuid",
    "session_id": "session-uuid",
    "text": "I want to practice my English",
    "corrected_text": null,
    "created_at": "2025-01-29T10:01:30Z"
  }
]
```

---

## File Storage API

**Base URL:** `https://[your-project].supabase.co/storage/v1/`

### Upload Avatar
```http
POST /object/avatars/[filename]
Content-Type: image/jpeg
Authorization: Bearer [user-jwt-token]

[binary image data]
```

### Get Avatar URL
```http
GET /object/public/avatars/[filename]
```

Returns the image directly.

---

## Admin Endpoints (if you build them)

### Example Admin API in Flask

Add to `app.py`:

```python
@app.route("/admin/users", methods=["GET"])
def get_all_users():
    """Get all users with their stats"""
    # Requires admin authentication
    from supabase import create_client

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get all users
    users = supabase.table('profiles').select('*').execute()

    # Get session counts
    result = []
    for user in users.data:
        sessions = supabase.table('conversation_sessions')\
            .select('id, duration_minutes')\
            .eq('user_id', user['id'])\
            .execute()

        result.append({
            'user': user,
            'total_sessions': len(sessions.data),
            'total_minutes': sum(s['duration_minutes'] or 0 for s in sessions.data)
        })

    return jsonify(result)

@app.route("/admin/export/<user_id>", methods=["GET"])
def export_user_data(user_id):
    """Export all data for a specific user"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Get profile
    profile = supabase.table('profiles')\
        .select('*')\
        .eq('id', user_id)\
        .single()\
        .execute()

    # Get sessions with transcripts
    sessions = supabase.table('conversation_sessions')\
        .select('*, transcriptions(*)')\
        .eq('user_id', user_id)\
        .execute()

    return jsonify({
        'profile': profile.data,
        'sessions': sessions.data
    })
```

---

## Data Export Examples

### Export User Data (JavaScript)
```javascript
async function exportUserData(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: sessions } = await supabase
    .from('conversation_sessions')
    .select(`
      *,
      transcriptions (*)
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  // Convert to CSV or JSON
  const exportData = {
    profile,
    sessions,
    exportedAt: new Date().toISOString()
  };

  // Download as JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `user-data-${userId}.json`;
  a.click();
}
```

### Export to CSV (Python)
```python
import csv
from supabase import create_client

def export_transcripts_csv(user_id):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    sessions = supabase.table('conversation_sessions')\
        .select('*, transcriptions(*)')\
        .eq('user_id', user_id)\
        .execute()

    with open(f'transcripts_{user_id}.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Session Topic', 'Date', 'Speaker', 'Text'])

        for session in sessions.data:
            for trans in session['transcriptions']:
                speaker = 'Bot' if trans['text'].startswith('Bot:') else 'User'
                text = trans['text'].replace('Bot: ', '').replace('User: ', '')
                writer.writerow([
                    session['topic'],
                    session['started_at'],
                    speaker,
                    text
                ])
```

---

## Environment Variables

Create `.env` files:

### Frontend `.env`
```
REACT_APP_SUPABASE_URL=https://[your-project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_FLASK_API_URL=http://127.0.0.1:5000
```

### Backend `.env`
```
OPENAI_API_KEY=[your-openai-key]
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_KEY=[your-service-role-key]
```

---

## Security Notes

1. **Never expose service role key** in frontend
2. **Row Level Security (RLS)** is enabled on all tables
3. Users can only access their own data
4. Admin endpoints should require authentication
5. Use HTTPS in production
