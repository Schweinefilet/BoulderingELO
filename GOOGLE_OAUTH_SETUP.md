# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for BoulderingELO.

## Prerequisites
- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Name your project (e.g., "BoulderingELO")
5. Click "Create"

### 2. Enable Google+ API

1. In your project, go to "APIs & Services" > "Library"
2. Search for "Google+ API"
3. Click on it and then click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: BoulderingELO
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. Skip the "Scopes" section (click "Save and Continue")
7. Add test users if needed
8. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Name it (e.g., "BoulderingELO Web Client")
5. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://schweinefilet.github.io` (for GitHub Pages)
   - Add any other domains where your app will be hosted
6. Add **Authorized redirect URIs**:
   - `http://localhost:5173`
   - `https://schweinefilet.github.io/BoulderingELO`
   - Add any other domains where your app will be hosted
7. Click "Create"
8. **Copy your Client ID** - you'll need this!

### 5. Configure Backend Environment Variables

Add the Google Client ID to your backend environment:

**For Render.com:**
1. Go to your Render dashboard
2. Select your BoulderingELO API service
3. Go to "Environment"
4. Add a new environment variable:
   - Key: `GOOGLE_CLIENT_ID`
   - Value: Your Google OAuth Client ID (from step 4)
5. Save changes

**For local development:**
Add to your `.env` file:
```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 6. Configure Frontend Environment Variables

**For GitHub Pages (production):**
Update `frontend-static/.env.production`:
```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

**For local development:**
Update `frontend-static/.env.local`:
```bash
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 7. Rebuild and Deploy

After configuring the environment variables:

1. **Backend**: Render will automatically rebuild when you push changes
2. **Frontend**: 
   ```bash
   cd frontend-static
   npm run build
   git add .
   git commit -m "Add Google OAuth"
   git push
   ```

## Testing

1. Open your app
2. Click on the "Sign in with Google" button on the login screen
3. You should see the Google sign-in popup
4. Sign in with your Google account
5. You'll be automatically logged into BoulderingELO

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure all your app URLs are added to "Authorized JavaScript origins" and "Authorized redirect URIs" in Google Cloud Console
- Check that the URLs exactly match (including http/https and trailing slashes)

### "idpiframe_initialization_failed" error
- This usually happens when third-party cookies are blocked
- Ask users to allow cookies for your site

### Google button not appearing
- Check browser console for errors
- Verify `VITE_GOOGLE_CLIENT_ID` is set correctly
- Make sure the Google OAuth library is loaded

## Security Notes

- Never commit your `.env` files with real credentials to Git
- Keep your OAuth Client Secret secure (not needed for this implementation)
- Regularly review authorized users in Google Cloud Console
- Use the same Client ID for both frontend and backend

## UTF-8 Support

The application now has proper UTF-8 encoding configured for the database connection, ensuring foreign names and special characters display correctly.
