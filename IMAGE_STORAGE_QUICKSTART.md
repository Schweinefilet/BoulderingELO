# Quick Start: Fixing Disappearing Images

## The Problem
Your images keep disappearing because Render's free tier uses **ephemeral storage** - files are deleted every time the server restarts (sleep/wake, deployment, etc.).

## The Solution (Choose One)

### Option 1: Cloudinary (Recommended - Permanent Storage)

**Setup time:** 5 minutes

1. Create free account: [cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Get credentials from dashboard (Cloud Name, API Key, API Secret)
3. Add to Render environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   ```
4. Render will auto-redeploy
5. Done! Images now permanent ✅

**Full guide:** See `CLOUDINARY_SETUP.md`

### Option 2: Dropbox Links (No Setup Required)

**Already works!** Just paste Dropbox share links:

1. Upload image to Dropbox
2. Get share link: `https://www.dropbox.com/s/abc123/image.jpg?dl=0`
3. In admin panel, paste in "Or paste a Dropbox/Imgur link" field
4. Press Enter
5. Done! ✅

### Option 3: Imgur Links (No Setup Required)

**Already works!** Use direct image URLs:

1. Upload to [imgur.com](https://imgur.com)
2. Right-click image → Copy image address
3. Paste in admin panel link field
4. Press Enter
5. Done! ✅

## How to Use (After Setup)

### Uploading Images in Admin Panel:

**Method 1 - File Upload:**
- Click "Choose File" button
- Select image from computer
- Automatically uploaded to Cloudinary (if configured) or local storage

**Method 2 - Dropbox/Imgur Link:**
- Paste link in text field below file upload
- Press Enter
- Link automatically converted and saved

## Status Check

Check Render logs after deployment:
- ✅ `Cloudinary configured for persistent image storage` = Working!
- ⚠️ `Cloudinary not configured - images will be stored locally` = Using ephemeral storage

## Cost

- **Cloudinary Free Tier:** 25GB storage, 25GB bandwidth/month - FREE forever
- **Dropbox:** Your existing Dropbox account - FREE
- **Imgur:** Unlimited - FREE

## Need Help?

See full documentation in `CLOUDINARY_SETUP.md`
