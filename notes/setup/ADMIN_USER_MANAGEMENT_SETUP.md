# Admin User Management Setup Guide

## What Was Added

A complete user management system in the admin dashboard that allows you to:
- ✅ View all registered users with their full profiles
- ✅ Create new users with custom settings
- ✅ Delete users
- ✅ Reset user passwords

## How It Works

The system uses a **secure backend API** approach:
1. Frontend calls Flask backend API endpoints
2. Backend authenticates admin using session token
3. Backend uses Supabase service role key to perform admin operations
4. This keeps the service role key secure (never exposed to browser)

## Required Setup Steps

### Step 1: Get Your Supabase Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Under "Project API keys", find **service_role** key
5. Copy the full key (starts with `eyJ...`)

⚠️ **IMPORTANT**: This key is secret! Never commit it to Git or share it publicly.

### Step 2: Update Local .env File

Edit `/app/.env` and replace the placeholder:

```bash
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 3: Update Render Environment Variables

1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service role key from Step 1
6. Click **Save Changes**

Render will automatically redeploy with the new variable.

### Step 4: Wait for Deployment

- **Vercel** (frontend): Auto-deploys when you push to GitHub (1-2 minutes)
- **Render** (backend): Auto-deploys when environment variable is added (3-5 minutes)

### Step 5: Test the Feature

1. Go to https://bernardo-s-teaching-assistant.vercel.app
2. Log in with your admin account
3. Click the **"Users"** tab in Admin Dashboard
4. You should see:
   - List of all users in a table
   - "Create New User" button
   - "Reset PW" and "Delete" buttons for each user

## Backend API Endpoints

All endpoints require admin authentication via Bearer token.

### GET /admin/users
Lists all users with merged auth + profile data.

### POST /admin/users
Creates a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "John",
  "surname": "Doe",
  "tier": "premium",
  "is_admin": false
}
```

### DELETE /admin/users/<user_id>
Deletes a user by ID.

### POST /admin/users/<user_id>/reset-password
Resets a user's password.

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

## User Interface Features

### View All Users
- **Table columns**: Email, Name, Tier, Admin Status, Email Verified, Created Date, Actions
- **Color-coded badges**:
  - Purple = Unlimited tier
  - Amber = Premium tier
  - Gray = Free tier
- **Status indicators**:
  - Green ✓ = Verified email / Is admin
  - Red ✗ = Unverified email

### Create New User
1. Click **"+ Create New User"** button
2. Fill in the form:
   - **Email*** (required)
   - **Password*** (required, min 6 chars)
   - First Name (optional)
   - Last Name (optional)
   - Tier dropdown (free/premium/unlimited)
   - Is Admin checkbox
3. Click **"Create User"**
4. User is created with email auto-confirmed

### Delete User
1. Click **"Delete"** button for any user
2. Confirm in the dialog
3. User and their profile are permanently removed

### Reset Password
1. Click **"Reset PW"** button for any user
2. Enter new password in the prompt (min 6 chars)
3. Password is updated immediately

## Troubleshooting

### "Error loading users: User not allowed"
- The Supabase service role key is not set or is incorrect
- Check Render environment variables
- Verify the key is the **service_role** key, not the **anon** key

### "Error: Not authenticated"
- Your session expired - log out and log back in
- Your account might not have admin privileges

### "Forbidden: Admin access required"
- Your account's `is_admin` field is not set to `true`
- Run this SQL in Supabase:
  ```sql
  UPDATE profiles SET is_admin = true WHERE id = 'your-user-id';
  ```

### Backend not responding
- Check if Render service is running
- View Render logs for Python errors
- Verify `supabase==2.3.4` is in requirements.txt
- Ensure Flask-CORS is allowing requests from your domain

### Users list is empty
- There might actually be no users yet
- Check Supabase Auth dashboard to verify users exist
- Check browser console for errors

## Security Notes

✅ **Secure**:
- Service role key stored on backend only
- Admin verification on every request
- Session tokens expire automatically
- HTTPS encryption for all API calls

❌ **Do NOT**:
- Commit .env file to Git
- Share service role key
- Store service role key in frontend code
- Disable admin authentication checks

## Files Modified

- `/app/app.py` - Added 4 admin API endpoints + Supabase client
- `/app/requirements.txt` - Added `supabase==2.3.4`
- `/app/.env` - Added SUPABASE_SERVICE_ROLE_KEY placeholder
- `/frontend/frontend-app/src/App.js` - Updated user management functions to call backend API

## Next Steps

Once setup is complete, you can:
1. Create test users to verify functionality
2. Promote other users to admin if needed
3. Manage user tiers and permissions
4. Reset passwords for users who forget them
5. Remove spam or test accounts

The user management system is now fully functional and secure!
