# Deployment Instructions for Video Review Feature

## What Was Changed

I've updated the **`frontend-static`** folder (which is what gets deployed to GitHub Pages) with the video voting and approval features.

### Files Modified:
1. **`frontend-static/src/lib/api.ts`**
   - Added `VideoReview` interface
   - Added `getVideos()`, `voteOnVideo()`, `approveVideo()`, `rejectVideo()` functions

2. **`frontend-static/src/App.tsx`**
   - Added video state management (`videos`, `videoFilter`)
   - Added `loadVideos()` function
   - Replaced old "Video Evidence" section with new "Video Evidence Review" section featuring:
     - Filter tabs (All, Pending, Approved, Rejected)
     - Video grid with embedded players
     - Vote counts and scoring
     - Upvote/Downvote buttons (requires login)
     - Admin approval/rejection controls (admin only)

## To Deploy:

Run these commands in your terminal:

```bash
cd /workspaces/BoulderingELO

# Stage the changes
git add frontend-static/src/App.tsx frontend-static/src/lib/api.ts

# Commit the changes
git commit -m "Add video review voting and admin approval system"

# Push to GitHub
git push origin main
```

## What Happens Next:

1. GitHub Actions will automatically trigger (see `.github/workflows/deploy.yml`)
2. It will build the `frontend-static` folder using Vite
3. Deploy the built files to GitHub Pages
4. Your live site at https://schweinefilet.github.io/BoulderingELO/ will update in ~2-5 minutes

## Verify Deployment:

1. Go to your repository on GitHub
2. Click "Actions" tab
3. You should see a "Deploy to GitHub Pages" workflow running
4. Once it's green (complete), visit your live site
5. You should see the new "🎥 Video Evidence Review" section with voting features

## Testing the Feature:

### As a non-logged-in user:
- Can view all videos
- Can see vote counts
- Cannot vote (buttons disabled)
- Cannot approve/reject

### As a logged-in user:
- Can view all videos
- Can upvote or downvote any video
- Cannot approve/reject (not admin)

### As an admin:
- Can view all videos
- Can upvote or downvote any video
- Can approve or reject pending videos
- Only approved videos count toward ELO scores

## Note:

The `frontend` folder (Next.js) also has these features but is NOT deployed. Only `frontend-static` is deployed to GitHub Pages.
