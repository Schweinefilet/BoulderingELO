# Changelog: iOS UI, Comparison Charts, and Google OAuth Fixes

## Date: November 5, 2025

### Summary
Comprehensive updates addressing iOS mobile UI issues, transforming analytics charts into comparison features, and fixing Google OAuth authentication and account linking.

---

## 1. iOS Mobile UI Fixes ✅

### Settings Modal
**Problem:** Settings modal was not scrolling properly on iOS devices, with potential viewport issues.

**Solution:**
- Added `-webkit-overflow-scrolling: touch` for smooth iOS scrolling
- Changed modal alignment from `center` to `flex-start` to prevent centering issues
- Reduced max height from 90vh to 85vh
- Added explicit margin-top and margin-bottom (20px) for proper spacing
- Maintained scrollbar hiding for clean UI

**Files Modified:**
- `frontend-static/src/App.tsx` (lines ~2463 & ~2489)

### Leaderboard Table
**Problem:** Horizontal scrolling was not smooth on iOS devices.

**Solution:**
- Added `-webkit-overflow-scrolling: touch` to the leaderboard table container
- Enables momentum scrolling for better iOS experience
- Maintains existing grid layout and responsive design

**Files Modified:**
- `frontend-static/src/App.tsx` (line ~1418)

---

## 2. Comparison Charts Feature ✅

### Overview
Transformed "Sends by Color" and "Sends by Wall Section" charts from showing all climbers to a comparison tool where users select 2-5 specific climbers.

### Features
- **Climber Selection UI:** 
  - Toggle buttons for each climber
  - Visual feedback: Selected climbers have blue border and darker background
  - Enforces 2-5 climber limit
  - Disabled state when limit reached
  - Helper text when less than 2 selected

- **Dynamic Charts:**
  - Only shows data for selected climbers
  - Maintains all color-coding and wall section logic
  - Shows placeholder message when insufficient climbers selected
  - Fully synced to current wall sections configuration

### Sends by Color Chart
- Bar chart comparing selected climbers across all climbing colors
- Uses latest session data for each climber
- Color scheme: Blue, Purple, Pink, Orange, Green, Cyan

**Files Modified:**
- `frontend-static/src/App.tsx` (lines ~2353-2410)

### Sends by Wall Section Chart
- Bar chart comparing selected climbers across all wall sections
- Dynamically adapts to current wall section configuration
- Aggregates all colors per section
- Dynamic naming: Capitalizes and spaces section names

**Files Modified:**
- `frontend-static/src/App.tsx` (lines ~2412-2522)

### State Management
- New state: `selectedClimbersForComparison` (array of climber IDs)
- Shared across both charts for consistent comparison
- Persists during session

**Files Modified:**
- `frontend-static/src/App.tsx` (line ~544)

---

## 3. Google OAuth Fixes ✅

### Problem Analysis
The original Google OAuth implementation had a critical flaw:
1. **Sign-in/Sign-up ambiguity:** Same endpoint handled both new user creation and existing user login
2. **Account linking issues:** Users trying to link Google to existing accounts would create duplicate accounts or fail
3. **Email conflicts:** System checked email against username, causing confusion

### Solutions Implemented

#### Backend Changes

**New Database Function:**
- `getClimberByGoogleId(googleId: string)` - Look up users by Google ID

**Files Modified:**
- `src/db.ts` (lines ~445-448)

**Enhanced Google Auth Flow:**
- First checks if Google ID is already linked to any account
- If found, logs user in immediately
- If not found, checks username/email and either:
  - Creates new user with Google account
  - Links Google to existing user by email match

**Files Modified:**
- `src/controllers/authController.ts` (lines ~54-121)

**New Endpoint: Link Google Account:**
- `POST /api/auth/link-google` (authenticated)
- Specifically for linking Google to currently logged-in user
- Validates Google token
- Checks for duplicate Google ID links
- Prevents one Google account from linking to multiple users
- Returns success message with Google ID

**Files Modified:**
- `src/controllers/authController.ts` (lines ~123-178)
- `src/routes/authRoutes.ts` (lines ~11 & ~18)

#### Frontend Changes

**New API Function:**
- `linkGoogleAccount(credential: string)` - Calls new link endpoint

**Files Modified:**
- `frontend-static/src/lib/api.ts` (lines ~145-151)

**Settings Page Update:**
- Changed from `api.googleLogin()` to `api.linkGoogleAccount()`
- Properly handles linking flow for logged-in users
- Shows success/error messages specific to linking

**Files Modified:**
- `frontend-static/src/App.tsx` (lines ~2806-2821)

### User Flows

**New User Sign-up with Google:**
1. Click "Continue with Google" on login screen
2. Authenticate with Google
3. If email doesn't exist → Create new account
4. If email exists → Link Google to that account
5. Log in automatically

**Existing User Linking Google:**
1. Log in with username/password
2. Go to Settings → "Link Google Account"
3. Click "Continue with Google"
4. Authenticate with Google
5. System checks: Is this Google ID already linked elsewhere?
   - Yes → Error message
   - No → Link to current account
6. Success message, can now log in with Google

**Returning User with Google:**
1. Click "Continue with Google" on login screen
2. Authenticate with Google
3. System finds account by Google ID
4. Log in immediately

---

## 4. Data Synchronization ✅

### Wall Sections
- All charts now use `Object.keys(wallTotals)` for dynamic wall sections
- Profile view, sessions, and comparison charts all sync automatically
- When admin adds/removes/renames wall sections, all data updates

### Session Data
- Latest session data used for all comparisons
- Proper handling of missing wallCounts (defaults to 0)
- Maintains color totals and wall section breakdowns

---

## Technical Details

### Build Status
- ✅ Backend TypeScript compilation: Success
- ✅ Frontend Vite build: Success (767.13 kB)
- ✅ No TypeScript errors
- ✅ No lint errors

### Browser Compatibility
- iOS Safari: Improved with -webkit-overflow-scrolling
- Chrome/Firefox: Fully compatible
- Mobile responsive: Optimized for all screen sizes

### Database Schema
No migrations needed - existing `google_id` column in `climbers` table supports all new features.

---

## Testing Recommendations

### iOS Mobile
1. Test settings modal scrolling on iPhone/iPad
2. Verify leaderboard horizontal scroll on small screens
3. Check modal positioning and spacing

### Comparison Charts
1. Select 2-5 climbers and verify chart updates
2. Try to select more than 5 (should be disabled)
3. Change wall sections in admin and verify charts update
4. Check with climbers who have no session data

### Google OAuth
1. **New user:** Sign up with Google (should create account)
2. **Existing user:** Link Google from settings (should link)
3. **Duplicate check:** Try linking same Google to different account (should fail)
4. **Login:** Sign in with Google (should work after linking)
5. **Email match:** Create account with email, then sign in with Google using same email (should auto-link)

---

## Files Changed

### Frontend
- `frontend-static/src/App.tsx` (8 sections modified)
- `frontend-static/src/lib/api.ts` (1 function added)

### Backend
- `src/controllers/authController.ts` (2 functions: enhanced + 1 new)
- `src/db.ts` (1 function added)
- `src/routes/authRoutes.ts` (1 route added)

### Total Lines Changed: ~300 lines across 5 files

---

## Future Considerations

### Potential Enhancements
1. Add "Remember my selection" for comparison climbers
2. Show Google account status in settings (linked email)
3. Add ability to unlink Google account
4. Export comparison charts as images
5. Save comparison presets

### Known Limitations
1. Comparison charts show latest session only (not historical)
2. Maximum 5 climbers in comparison (intentional limit)
3. Google OAuth requires admin configuration (GOOGLE_CLIENT_ID)

---

## Deployment Notes

### Environment Variables
Ensure `VITE_GOOGLE_CLIENT_ID` and backend `GOOGLE_CLIENT_ID` are properly configured for Google OAuth to work.

### No Database Migration Needed
All database schema changes were previously implemented. This update uses existing structure.

### Build Commands
```bash
# Backend
cd /workspaces/BoulderingELO
npm run build

# Frontend  
cd /workspaces/BoulderingELO/frontend-static
npm run build
```

Both builds complete successfully with no errors.
