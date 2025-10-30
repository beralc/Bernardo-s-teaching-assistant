# English Teacher Assistant

An AI-powered English learning application with voice conversation practice, based on linguistic theories (Krashen, Schmidt, Swain, Long).

## Features

✅ **Voice Chat** - Real-time conversation with AI using OpenAI Realtime API
✅ **Conversation Starters** - Pre-defined topics to practice
✅ **Progress Tracking** - View practice time, sessions, and conversation history
✅ **User Profiles** - Complete profile management with photo upload
✅ **Accessibility** - Dark mode, font sizing, senior-first design
✅ **Transcription Storage** - All conversations saved with timestamps

## Architecture

```
┌─────────────────────────────────────────────┐
│           React Frontend                     │
│  - User Interface                            │
│  - Voice recording                           │
│  - Real-time transcription display           │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌──────────────────────┐
│   Flask     │  │      Supabase         │
│   Backend   │  │   - PostgreSQL DB     │
│             │  │   - Authentication    │
│  - OpenAI   │  │   - File Storage      │
│    Chat API │  │   - REST API          │
│  - Realtime │  │                       │
│    API      │  │                       │
└─────────────┘  └──────────────────────┘
```

## Database Structure

### Tables
1. **profiles** - User information (name, country, English level, avatar)
2. **conversation_sessions** - Each conversation with topic and duration
3. **transcriptions** - All spoken text (user + bot) linked to sessions

See `DATABASE_SCHEMA.md` for complete details.

## Tech Stack

**Frontend:**
- React 19.2.0
- Tailwind CSS 4.1
- Supabase Client
- Web Audio API

**Backend:**
- Flask (Python)
- OpenAI API (GPT-4o-mini for text, GPT-4o-realtime for voice)
- Supabase (PostgreSQL + Storage + Auth)

## Setup

### 1. Install Dependencies

**Frontend:**
```bash
cd frontend/frontend-app
npm install
```

**Backend:**
```bash
cd app
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` files:

**Frontend** (`frontend/frontend-app/.env`):
```
REACT_APP_SUPABASE_URL=https://[your-project].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[your-anon-key]
REACT_APP_FLASK_API_URL=http://127.0.0.1:5000
```

**Backend** (`app/.env`):
```
OPENAI_API_KEY=[your-openai-key]
```

### 3. Database Setup

Run these SQL commands in Supabase SQL Editor:

```sql
-- Add columns
alter table conversation_sessions
add column if not exists topic text;

alter table transcriptions
add column if not exists session_id uuid references conversation_sessions(id);

alter table profiles
add column if not exists avatar_url text;

-- Create storage bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Storage policies
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars');

create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');
```

### 4. Run the App

**Backend:**
```bash
cd app
python app.py
```

**Frontend:**
```bash
cd frontend/frontend-app
npm start
```

Visit: `http://localhost:3000`

## Usage

### 1. Sign Up / Login
- Create account with profile information
- Upload profile photo (optional)

### 2. Start Conversation
- Go to **Starters** tab
- Select a topic (e.g., "Ordering Coffee")
- Click microphone to start talking
- AI responds with voice and text

### 3. View Progress
- Go to **Progress** tab
- See practice time statistics
- View past conversations
- Click to expand and see full transcripts

### 4. Account Settings
- Click profile icon (top right)
- Edit personal info, learning preferences, password
- Upload/change profile photo

## API Documentation

See `BACKEND_API.md` for:
- REST API endpoints
- Data export methods
- Admin queries
- Integration examples

## Key Features Explained

### Conversation Flow
1. User selects topic → Session created in database
2. User speaks → Transcribed and saved
3. AI responds → Also transcribed and saved
4. Session ends → Duration calculated and saved

### Data Storage
- **Profiles**: User demographics and preferences
- **Sessions**: Topic, duration, timestamps
- **Transcriptions**: All messages with "Bot:" or "User:" prefix
- **Avatars**: Supabase Storage bucket

### Transcription Format
```
Bot: Hello! Ready to practice ordering coffee?
I'd like a cappuccino please
Bot: Great choice! Would you like any sugar or milk with that?
Yes, with milk please
```

## Deployment

### Option 1: Vercel (Frontend) + Render (Backend)
- **Frontend**: Deploy to Vercel (auto-deploy from GitHub)
- **Backend**: Deploy Flask to Render

### Option 2: DigitalOcean App Platform
- Deploy both frontend and backend together
- Single platform, easy scaling

### Option 3: Docker
- Create Docker containers for both services
- Deploy to any cloud provider

See deployment guides in each directory.

## Files Structure

```
english teacher assisstant/
├── app/                      # Flask backend
│   ├── app.py               # Main Flask app
│   ├── prompt.json          # AI behavior configuration
│   └── templates/           # Legacy HTML templates
├── frontend/
│   └── frontend-app/        # React app
│       ├── src/
│       │   ├── App.js       # Main React component
│       │   └── supabaseClient.js
│       └── package.json
├── DATABASE_SCHEMA.md       # Database documentation
├── BACKEND_API.md          # API documentation
└── README.md               # This file
```

## Troubleshooting

### Transcriptions not saving
1. Check browser console for errors
2. Verify `session_id` column exists in `transcriptions` table
3. Ensure session is created before speaking

### Avatar upload fails
1. Check Supabase Storage bucket exists
2. Verify storage policies are set
3. Check file size (max 2MB)

### Voice chat not working
1. Check microphone permissions in browser
2. Verify OpenAI API key is valid
3. Check Flask backend is running
4. Look for WebSocket errors in console

## Support

For issues or questions:
1. Check browser console for errors
2. Check Flask logs for backend errors
3. Review Supabase logs for database issues

## License

Private project - All rights reserved
