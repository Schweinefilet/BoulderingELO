# Multi-User Account System

## Overview

BoulderingELO now supports individual user accounts with role-based access control. Each climber has their own username and password, and can either be a regular user or an administrator.

## User Roles

### Regular Users
- Can register their own account
- Can add their own climbing sessions (one at a time)
- Can view all sessions and leaderboards
- Can vote (thumbs up/down) on video proofs for red/black climbs

### Administrators
- All user permissions, plus:
- Can delete any session or climber
- Can manually add climbers
- Can manually add sessions for any climber
- Can approve or reject video proofs (final say)

## Setup Instructions

### 1. Initialize User Accounts

For existing climbers (Keith, Unmesh, Rehan), run the setup script:

```bash
node setup-users.js
```

This will create default accounts:
- Keith (admin): username `keith`, password `changeme123`
- Unmesh (user): username `unmesh`, password `changeme123`
- Rehan (user): username `rehan`, password `changeme123`

**⚠️ Users should change their passwords after first login!**

### 2. Create Additional Admin Accounts

To create a new admin account or update an existing user to admin:

```bash
node create-admin.js <username> <password> "<full name>"

# Example:
node create-admin.js keith mypassword "Keith Chambers"
```

### 3. Database Schema

The multi-user system adds these fields to the `climbers` table:
- `username` (TEXT, UNIQUE) - Login username
- `password` (TEXT) - bcrypt hashed password
- `role` (TEXT) - Either 'admin' or 'user'

Video proofs are tracked in the `video_reviews` table:
- `session_id` - The session being reviewed
- `video_url` - Link to video proof
- `color` - Climb color (red/black)
- `wall` - Wall section
- `status` - 'pending', 'approved', or 'rejected'
- `votes` - JSONB object tracking user votes

## API Endpoints

### Authentication

**POST /api/auth/register**
```json
{
  "username": "string",
  "password": "string",
  "name": "string"
}
```
Returns: `{ token: string, user: { climberId, username, role } }`

**POST /api/auth/login**
```json
{
  "username": "string",
  "password": "string"
}
```
Returns: `{ token: string, user: { climberId, username, role } }`

### Video Reviews

**GET /api/videos**
Returns all video reviews with vote counts

**POST /api/videos/:id/vote**
```json
{
  "vote": "up" | "down"
}
```
Requires: Authenticated user

**POST /api/videos/:id/approve** (Admin only)
Approves the video proof and session

**POST /api/videos/:id/reject** (Admin only)
Rejects the video proof and session

### Protected Endpoints

These endpoints now require authentication and/or admin role:

- `POST /api/sessions` - Requires authentication
- `DELETE /api/sessions/:id` - Requires admin role
- `POST /api/climbers` - Requires admin role
- `DELETE /api/climbers/:id` - Requires admin role

## Frontend Changes

### Login Screen
- Changed from single password to username/password
- Added registration mode toggle
- New users can create accounts directly

### Session Creation
- Sessions are now created for the logged-in user's account
- Admins can still create sessions for any climber

### Video Review UI (Coming Soon)
- View pending video proofs
- Thumbs up/down voting for all users
- Admin-only approve/reject buttons

## Security Notes

1. Passwords are hashed using bcrypt with 10 salt rounds
2. JWT tokens expire after 30 days
3. Tokens are stored in localStorage (client-side)
4. All admin operations check role on backend
5. Users can only create sessions for themselves (except admins)

## Migration from Single Password

The system automatically adds the new columns to existing databases:
```sql
ALTER TABLE climbers ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE climbers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE climbers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
```

Run `setup-users.js` to populate these fields for existing climbers.
