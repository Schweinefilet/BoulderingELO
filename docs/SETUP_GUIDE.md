# Multi-User Account System - Setup Guide

## What's Been Implemented

✅ **Backend Changes:**
- Replaced single-password auth with username/password per user
- Added bcrypt password hashing (10 salt rounds)
- Added JWT tokens with user info (climberId, username, role)
- Added role-based access control (admin vs user)
- Added video review system with voting
- Protected admin-only operations (delete, manual adds)

✅ **Database Schema:**
- `climbers` table: Added `username`, `password`, `role` columns
- `video_reviews` table: Tracks red/black climb videos with votes
- Migration-safe ALTER TABLE statements for existing databases

✅ **Frontend Changes:**
- Updated login screen to username/password (no more single password)
- Added registration mode toggle
- Users can create new accounts directly
- API client handles user roles and tokens

✅ **Scripts:**
- `setup-users.js` - Initialize accounts for existing climbers
- `create-admin.js` - Create/update admin accounts

## Next Steps - Run on Production

### 1. Wait for Backend Deployment

Render.com will automatically deploy the backend changes from GitHub. Check:
https://dashboard.render.com/

The backend will:
- Run database migrations automatically on startup
- Add username/password/role columns if they don't exist
- Create video_reviews table

### 2. Setup User Accounts

Once the backend is deployed, SSH into your Render instance or use their shell:

```bash
# Setup default accounts for Keith, Unmesh, Rehan
node setup-users.js

# Or create admin account manually
node create-admin.js keith YourSecurePassword "Keith Chambers"
```

This will create:
- **Keith** (admin) - Can delete, add manual points, approve videos
- **Unmesh** (user) - Can add own climbs, vote on videos
- **Rehan** (user) - Can add own climbs, vote on videos

**Default password is `changeme123` - users should change it!**

### 3. Frontend Already Deployed

The updated frontend is already live on GitHub Pages:
https://schweinefilet.github.io/BoulderingELO/

Users can now:
- Login with username/password
- Register new accounts
- See their role (admin badge coming soon)

## What Each Role Can Do

### Admin (Keith)
- ✅ Delete any session or climber
- ✅ Add climbers manually
- ✅ Add sessions for any climber
- ✅ Approve/reject video proofs (final say)
- ✅ Vote on video proofs
- ✅ View all sessions and analytics

### User (Unmesh, Rehan, etc.)
- ✅ Add their own climbing sessions (one at a time)
- ✅ Vote thumbs up/down on video proofs
- ✅ View all sessions and analytics
- ❌ Cannot delete sessions
- ❌ Cannot add sessions for other climbers
- ❌ Cannot approve/reject videos

## API Changes

### Old Login (Single Password)
```json
POST /api/auth/login
{ "password": "sharedpassword" }
```

### New Login (Per-User)
```json
POST /api/auth/login
{ "username": "keith", "password": "mypassword" }
```

Returns:
```json
{
  "token": "jwt-token-here",
  "user": {
    "climberId": 1,
    "username": "keith",
    "role": "admin"
  }
}
```

### New Registration
```json
POST /api/auth/register
{
  "username": "newuser",
  "password": "password123",
  "name": "Full Name"
}
```

## Video Review System (Backend Ready)

The backend is ready for video reviews:

- When a user adds a red/black climb, they must provide a video URL
- The session is created with `status: 'pending'`
- A `video_review` record is created
- Any user can vote thumbs up/down on the video
- Only admins can approve (status: 'approved') or reject (status: 'rejected')

**Frontend UI for video reviews coming next** - this will show:
- List of pending videos
- Vote counts (up/down)
- Admin approve/reject buttons

## Security Notes

- Passwords stored as bcrypt hashes (never plaintext)
- JWT tokens contain user info (climberId, username, role)
- Tokens expire after 30 days
- All admin operations validated on backend (not just frontend)
- Users can only create sessions for their own account (except admins)

## Troubleshooting

### "Authentication required" error
- Clear browser localStorage
- Login again with new username/password format

### Can't setup users
- Check DATABASE_URL environment variable is set
- Make sure backend migrations ran successfully
- Check Render logs for errors

### Old sessions showing wrong user
- Old sessions created before multi-user system don't have proper ownership
- Admin can re-assign them or delete and recreate

## Files Changed

- `src/db.ts` - Added multi-user database functions
- `src/server.ts` - Added authentication middleware and role checks
- `src/types.ts` - Updated type definitions
- `frontend-static/src/App.tsx` - Updated login UI
- `frontend-static/src/lib/api.ts` - Updated API client
- `create-admin.js` - New script to create admin accounts
- `setup-users.js` - New script to initialize user accounts
- `MULTI_USER.md` - Full documentation

## What's Not Yet Done (Optional Future Work)

- [ ] Frontend UI for video review voting
- [ ] Admin panel showing pending videos
- [ ] User profile page to change password
- [ ] Session ownership enforcement in frontend
- [ ] Admin badge/indicator in UI
- [ ] Delete account functionality
- [ ] Password reset flow
