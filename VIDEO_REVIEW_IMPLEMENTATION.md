# Video Review System Implementation

## Overview
Implemented a complete video evidence review system with voting and admin approval workflow.

## Features

### 1. Public Video Viewing
- **All users** (authenticated or not) can view submitted climbing videos
- Videos are filtered by status: pending, approved, rejected, or all
- Video player embedded directly in the UI

### 2. User Voting System
- **Authenticated users** can vote thumbs up 👍 or thumbs down 👎 on videos
- Vote counts displayed for each video (upvotes, downvotes, total score)
- Votes stored in database as JSON array

### 3. Admin Approval Workflow
- **Admin users** see additional controls for pending videos
- Can approve ✅ or reject ❌ video submissions
- Only approved videos count toward ELO calculations
- Videos remain visible regardless of status for transparency

## Implementation Details

### Backend (Already Existed)
- **Database Table**: `video_reviews`
  - Fields: id, session_id, video_url, color, wall, status, votes, timestamps
  - Status values: 'pending', 'approved', 'rejected'
  - Votes stored as JSON array: `[{user_id: 1, vote: 'up'}, ...]`

- **API Endpoints**:
  - `GET /api/videos?status=<filter>` - Public endpoint to fetch videos
  - `POST /api/videos/:id/vote` - Authenticated users only
  - `POST /api/videos/:id/approve` - Admin only
  - `POST /api/videos/:id/reject` - Admin only

### Frontend Changes

#### 1. API Layer (`frontend/lib/api.ts`)
- Fixed duplicate function declarations
- Added video-related functions:
  - `getVideos(status?: string)` - Fetch videos with optional status filter
  - `voteOnVideo(videoId, vote)` - Submit upvote or downvote
  - `approveVideo(videoId)` - Admin approval
  - `rejectVideo(videoId)` - Admin rejection
- All POST endpoints include JWT Bearer token from localStorage

#### 2. Type Definitions (`frontend/lib/types.ts`)
Added `VideoReview` interface:
```typescript
export interface VideoReview {
  id: number;
  session_id: number;
  climber_name: string;
  video_url: string;
  color: string;
  wall: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: Array<{ user_id: number; vote: 'up' | 'down' }>;
  created_at: string;
  updated_at: string;
}
```

#### 3. Videos Page (`frontend/app/videos/page.tsx`)
Complete video review interface with:
- **Filter tabs**: All, Pending, Approved, Rejected
- **Video grid**: 2-column responsive layout
- **Video cards** showing:
  - Embedded video player
  - Climber name, color, wall section
  - Status badge (color-coded)
  - Vote counts (upvotes, downvotes, total score)
  - Voting buttons (disabled when not logged in)
  - Admin controls (only visible to admins for pending videos)
- **Authentication awareness**:
  - Shows "viewing mode" banner for non-logged users
  - Enables voting buttons only when authenticated
  - Shows admin controls only when user has admin role

#### 4. Navigation (`frontend/components/navigation.tsx`)
- Videos link already included: 🎥 Videos

### Server Changes (`src/server.ts`)
- Made `GET /api/videos` public (removed `authenticateToken` middleware)
- Maintains authentication for POST endpoints (vote, approve, reject)

## User Flows

### Non-Authenticated Users
1. Navigate to Videos page
2. See all videos with status filter
3. View vote counts and status
4. Cannot vote (buttons disabled)
5. See prompt to log in

### Authenticated Non-Admin Users
1. Navigate to Videos page
2. See all videos with status filter
3. Can upvote or downvote any video
4. Cannot approve/reject videos
5. Votes stored in database

### Admin Users
1. Navigate to Videos page
2. See all videos with status filter
3. Can upvote or downvote any video
4. See additional admin controls on pending videos
5. Can approve or reject pending videos
6. Approved videos count toward ELO

## Database Vote Storage
Votes are stored as JSON array in the `votes` column:
```json
[
  {"user_id": 1, "vote": "up"},
  {"user_id": 2, "vote": "down"},
  {"user_id": 3, "vote": "up"}
]
```

The backend handles:
- Adding new votes
- Updating existing user votes
- Preventing duplicate votes from same user

## Security
- Public GET endpoints for transparency
- Authentication required for voting (JWT verification)
- Admin-only approval/rejection endpoints
- CORS configured for frontend domains

## Next Steps (Optional Future Enhancements)
1. **Video Upload**: Add UI for users to submit videos with sessions
2. **User Vote Tracking**: Show which way current user voted
3. **Vote Notifications**: Alert video submitters when approved/rejected
4. **Bulk Actions**: Admin ability to approve/reject multiple videos
5. **Video Comments**: Allow discussion on video submissions
6. **Vote Threshold**: Auto-approve videos with high vote scores

## Testing
To test the system:
1. Start backend server: `npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Create test video reviews in database
4. Test as non-logged user, logged user, and admin
