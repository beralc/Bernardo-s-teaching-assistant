# URGENT: Setup Steps to Fix "Loading users..." Issue

## Problem
The backend is not responding because:
1. Render backend needs `SUPABASE_SERVICE_ROLE_KEY` environment variable
2. Vercel frontend needs `REACT_APP_FLASK_API_URL` environment variable
3. Backend is on cold start (Render free tier sleeps after 15 min of inactivity)

## Solution: Follow These Steps

### Step 1: Get Supabase Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **service_role** key (NOT the anon key!)
5. Copy the full key (starts with `eyJ...`)

### Step 2: Add Environment Variable to Render

1. Go to https://dashboard.render.com
2. Select your **backend service** (bernardo-s-teaching-assistant)
3. Click **Environment** tab in the left sidebar
4. Click **Add Environment Variable** button
5. Add:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Paste the service role key from Step 1
6. Click **Save Changes**
7. Render will automatically redeploy (takes 3-5 minutes)

### Step 3: Add Environment Variable to Vercel

1. Go to https://vercel.com/dashboard
2. Select your **frontend project**
3. Go to **Settings** → **Environment Variables**
4. Click **Add**
5. Add:
   - **Name**: `REACT_APP_FLASK_API_URL`
   - **Value**: `https://bernardo-s-teaching-assistant.onrender.com`
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**
7. Go to **Deployments** tab
8. Click the 3 dots on the latest deployment
9. Click **Redeploy** to rebuild with new variable

### Step 4: Wait for Deployments

- **Render**: 3-5 minutes
- **Vercel**: 1-2 minutes

### Step 5: Wake Up the Backend

After both are deployed, the backend might still be cold. To wake it up:

1. Open a new browser tab
2. Go to: https://bernardo-s-teaching-assistant.onrender.com/
3. Wait 30-60 seconds for it to wake up
4. You should see the basic Flask page

### Step 6: Test the Users Tab

1. Go to https://bernardo-s-teaching-assistant.vercel.app
2. Log in with your admin account
3. Click **Admin** tab
4. Click **Users** tab
5. Should show list of users (no more "Loading users...")

## Troubleshooting

### Still seeing "Loading users..."?

Open browser console (F12) and check for errors. If you see:

**"Failed to fetch"** or **"NetworkError"**:
- Backend is still waking up or crashed
- Go to Render dashboard → Logs to see what's wrong
- Check that `SUPABASE_SERVICE_ROLE_KEY` was added correctly

**"Error loading users: User not allowed"**:
- The service role key is wrong or not set
- Double-check you copied the **service_role** key, not the anon key
- Make sure there are no extra spaces when pasting

**"Error: Not authenticated"**:
- Your session expired - log out and log back in

### How to check Render logs:

1. Go to https://dashboard.render.com
2. Select your backend service
3. Click **Logs** in the left sidebar
4. Look for errors like:
   - `ModuleNotFoundError: No module named 'supabase'` - The dependencies didn't install
   - `KeyError: 'SUPABASE_SERVICE_ROLE_KEY'` - Environment variable not set
   - Python traceback errors - There's a bug in the code

### If backend won't start:

Check that `requirements.txt` includes:
```
Flask==2.3.2
python-dotenv==1.0.0
requests==2.31.0
openai==0.27.0
Flask-Cors==4.0.0
supabase==2.3.4
```

## Why This Happened

The original code tried to use Supabase Admin API directly from the browser, which doesn't work because:
- Admin API requires the **service role key** (secret, powerful key)
- Service role key can't be in browser (anyone could see it and take over your database)
- Solution: Backend API that securely uses the service role key

Now the flow is:
1. Frontend → Backend API (with user's session token)
2. Backend verifies user is admin
3. Backend → Supabase Admin API (with service role key)
4. Backend → Frontend (with results)

## Security Notes

✅ **Safe:**
- Service role key on backend (Render environment variables)
- Session tokens expire automatically
- Admin verification on every request

❌ **Never do this:**
- Put service role key in frontend code
- Put service role key in .env file that gets committed to Git
- Disable admin authentication checks

---

## Quick Checklist

- [ ] Got Supabase service role key
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` to Render
- [ ] Added `REACT_APP_FLASK_API_URL` to Vercel
- [ ] Redeployed Vercel
- [ ] Waited for deployments to finish
- [ ] Woke up backend by visiting the URL
- [ ] Tested Users tab - seeing user list!

Once all steps are done, the user management system will work perfectly!
