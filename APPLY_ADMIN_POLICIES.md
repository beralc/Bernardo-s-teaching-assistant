# How to Apply Admin Conversation Access

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on "SQL Editor" in the left sidebar

## Step 2: Run the SQL Script

1. Click "New Query"
2. Copy the entire contents of `ADMIN_CONVERSATION_ACCESS.sql`
3. Paste into the SQL editor
4. Click "Run" or press Cmd+Enter

## Step 3: Verify the Policies

After running the script, verify the policies were created:

```sql
-- Check conversation_sessions policies
SELECT * FROM pg_policies WHERE tablename = 'conversation_sessions';

-- Check conversation_messages policies
SELECT * FROM pg_policies WHERE tablename = 'conversation_messages';

-- Check profiles policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

You should see policies named:
- "Admins can view all sessions"
- "Admins can view all messages"
- "Admins can view all profiles"

## Step 4: Test the Admin View

1. Wait for Vercel to deploy (1-2 minutes)
2. Go to https://bernardo-s-teaching-assistant.vercel.app/
3. Log in with your admin account
4. Go to the Admin tab
5. Click "User Conversations" tab
6. You should see:
   - List of all users
   - Click a user to see their sessions
   - Click a session to see the full conversation
   - Export section at the top

## What This Enables

✅ **Admin Dashboard** - Two tabs: Invitation Codes | User Conversations

✅ **View All Users** - See every registered user with their profile info

✅ **View User Sessions** - Click any user to see all their conversation sessions

✅ **View Conversations** - Click any session to read the full conversation transcript

✅ **Export Data** - Select date range and export all conversations as JSON

## Export Format

When you export conversations, you get a JSON file with this structure:

```json
[
  {
    "session_id": "uuid-here",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "started_at": "2025-10-31T10:00:00Z",
    "ended_at": "2025-10-31T10:05:00Z",
    "duration_minutes": 5,
    "topic": "Daily Routine",
    "messages": [
      {
        "role": "user",
        "content": "Hi, I want to practice",
        "timestamp": "2025-10-31T10:00:15Z"
      },
      {
        "role": "assistant",
        "content": "Great! Let's talk about your daily routine...",
        "timestamp": "2025-10-31T10:00:18Z"
      }
    ]
  }
]
```

## Important Notes

- **From now on**, all conversations are automatically saved to the database
- **Past conversations** (before this update) are NOT in the database
- Only admins can see all conversations
- Regular users can only see their own conversations (in Progress tab)
- The export is in JSON format - you can import it into Excel, Google Sheets, or any analysis tool

## Troubleshooting

### "Error loading users"
- Make sure the RLS policies were applied correctly
- Check that your account has `is_admin = true` in the profiles table

### "No users found"
- The policies might not be active yet
- Try logging out and logging back in
- Check browser console for errors

### "Export not working"
- Make sure both start and end dates are selected
- The date range must contain some conversations
- Check that the conversations have messages (not just empty sessions)
