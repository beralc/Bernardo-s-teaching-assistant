# Avatar Upload - Storage Setup

## Issue: Avatar not displaying in header

If your avatar uploads successfully but doesn't show in the header icon next to A+, follow these steps:

## Step 1: Create Storage Bucket in Supabase

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name it: `avatars`
4. **Important:** Check "Public bucket" (so images can be viewed without authentication)
5. Click "Create bucket"

## Step 2: Set Bucket Policies

If you created a private bucket by mistake, you need to add policies:

1. Go to Storage → `avatars` bucket → Policies
2. Add these policies:

**Policy 1: Public Read Access**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'avatars' );
```

**Policy 2: Authenticated Upload**
```sql
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
```

**Policy 3: Users can update their own avatars**
```sql
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
```

## Step 3: Verify Upload is Working

1. Open your app
2. Open browser console (F12)
3. Click on the profile icon (next to A+)
4. Go to Personal tab
5. Click the camera icon to upload a photo
6. Watch the console for errors

**Expected console output:**
```
Photo uploaded! Remember to save your profile.
```

**If you see an error like:**
```
Error uploading photo: new row violates row-level security policy
```
→ Your bucket needs the policies from Step 2

## Step 4: Verify Avatar URL is Saved

1. After uploading, click "Save Changes"
2. Check Supabase Dashboard → Table Editor → profiles
3. Find your user row
4. Check the `avatar_url` column - should have a URL like:
   ```
   https://[your-project].supabase.co/storage/v1/object/public/avatars/[user-id]-[random].jpg
   ```

## Step 5: Check if Image Loads

1. Copy the avatar URL from the database
2. Paste it in a new browser tab
3. Does the image load?

**If YES:** The storage is configured correctly, issue is elsewhere
**If NO:** Check bucket permissions (Step 2)

## Step 6: Debug Avatar Display

After uploading and saving, check the browser console:

**Expected logs:**
```
MainApp avatarUrl state updated: https://...supabase.co/storage/v1/object/public/avatars/...
Avatar loaded successfully: https://...
```

**If you see:**
```
MainApp avatarUrl state updated:
```
→ The avatar URL is not being loaded from the database

**If you see:**
```
Failed to load avatar: https://...
```
→ The URL exists but the image can't load (check bucket permissions)

## Quick Fix: Make Bucket Public

The easiest solution is to make the bucket public:

1. Supabase Dashboard → Storage → avatars bucket
2. Click the gear icon (settings)
3. Check "Public bucket"
4. Save

Now all images in the bucket are publicly accessible without authentication.

## Troubleshooting

**Issue:** "Bucket not found"
- Go to Storage and create the `avatars` bucket

**Issue:** "RLS policy violation"
- Add the policies from Step 2

**Issue:** Avatar shows in modal but not in header
- Close and reopen the modal
- The header should update after clicking "Save Changes"
- Check console logs (Step 6)

**Issue:** Image URL is null in database
- The upload might have failed silently
- Check browser console for errors during upload
- Verify file is under 2MB

**Issue:** Image loads in browser but not in app
- Could be CORS issue
- Make sure bucket is public
- Try hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

## Testing Checklist

- [ ] `avatars` bucket exists in Supabase Storage
- [ ] Bucket is public OR has correct policies
- [ ] Upload a photo through the app
- [ ] Click "Save Changes"
- [ ] Check database - `avatar_url` is populated
- [ ] Open avatar URL in browser - image loads
- [ ] Check browser console - no errors
- [ ] Header icon shows the photo (not just UserIcon)

---

**After fixing:** Remove the debug console.logs from App.js lines 199-200 and 259-263 if you want cleaner logs.
