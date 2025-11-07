# Cloudinary Setup Guide

## Why Cloudinary?

Render.com's free tier uses **ephemeral storage**, meaning all uploaded files are deleted when the server restarts (which happens frequently on free tier). To make your wall section images **permanent**, we need cloud storage.

**Cloudinary** provides:
- ✅ **Persistent storage** - Images never disappear
- ✅ **Free tier** - 25GB storage, 25GB bandwidth/month
- ✅ **Automatic image optimization** - Compression, resizing, format conversion
- ✅ **CDN delivery** - Fast loading worldwide
- ✅ **No credit card required** for free tier

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up for a free account
3. Verify your email

### 2. Get Your API Credentials

1. After logging in, go to your **Dashboard**
2. You'll see your credentials:
   - **Cloud Name** (e.g., `dxxxxx`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (click the eye icon to reveal)

### 3. Add Environment Variables to Render

1. Go to your Render dashboard
2. Click on your **BoulderingELO** service
3. Go to **Environment** tab
4. Add these three environment variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

5. Click **Save Changes**
6. Render will automatically redeploy with the new configuration

### 4. Verify Setup

After redeployment:
1. Check your Render logs - you should see: `✅ Cloudinary configured for persistent image storage`
2. Upload a new wall section image in the admin panel
3. The response will include `"storage": "cloudinary"`
4. Your images will now persist across server restarts!

## Alternative: Dropbox Links

If you don't want to set up Cloudinary, you can use **Dropbox** or **Imgur** links:

### Dropbox Method:
1. Upload image to Dropbox
2. Get the share link (e.g., `https://www.dropbox.com/s/abc123/image.jpg?dl=0`)
3. In the admin panel, paste the link in the "Or paste a Dropbox/Imgur link" field
4. Press Enter
5. The app will automatically convert it to a direct link

### Imgur Method:
1. Upload to [imgur.com](https://imgur.com)
2. Right-click the image and copy the direct link (ends in `.jpg`, `.png`, etc.)
3. Paste in the admin panel
4. Press Enter

## Troubleshooting

### Images still disappearing?
- Make sure you added all 3 environment variables to Render
- Check Render logs for the Cloudinary confirmation message
- Try uploading a new image after configuration

### Upload errors?
- Verify your API credentials are correct
- Check you haven't exceeded Cloudinary's free tier limits (25GB)
- Try using Dropbox/Imgur links as a backup

### Can't see Cloudinary confirmation in logs?
- Environment variables might not be set correctly
- Make sure there are no extra spaces in the values
- Redeploy the service after adding variables

## Cost Information

**Cloudinary Free Tier includes:**
- 25 GB storage
- 25 GB bandwidth per month
- 25 credits per month (1 credit = 1,000 transformations)
- No credit card required
- Perfect for a climbing gym app!

If you exceed limits, you can upgrade to paid plans starting at $99/month, but the free tier should be more than enough for most gyms.
