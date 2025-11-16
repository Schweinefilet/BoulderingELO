# BoulderingELO

A web app that scores bouldering sessions using weighted top scores with live previews, leaderboards, and analytics.

🌐 **Live App**: https://schweinefilet.github.io/BoulderingELO/

## 🚀 Quick Links

- **New to setup?** → [QUICKSTART.md](QUICKSTART.md) - Visual setup guide
- **Using Codespaces?** → [CODESPACE_GUIDE.md](CODESPACE_GUIDE.md) - Detailed Codespace instructions  
- **Need help with scripts?** → [SCRIPTS_README.md](SCRIPTS_README.md) - Script documentation
- **Seeing connection errors?** → [Troubleshooting](#troubleshooting-connection-errors)

## Architecture

- **Backend**: Node.js + Express + PostgreSQL (Render.com)
- **Frontend**: React + Vite + TypeScript (GitHub Pages)
- **Storage**: PostgreSQL for shared data across all users

## Quick Start

### GitHub Codespace (Recommended for Quick Setup)

If you're using GitHub Codespaces, we have a streamlined setup process:

```bash
./setup-codespace.sh
```

For complete Codespace setup instructions, see **[CODESPACE_GUIDE.md](CODESPACE_GUIDE.md)**.

### Local Development

#### Backend
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your local PostgreSQL URL

# Build the backend
npm run build

# Run in production mode
npm start

# OR run in development mode (auto-reloads on changes)
npm run dev
```

Backend runs on `http://localhost:3000`

#### Frontend
```bash
# Navigate to frontend directory
cd frontend-static

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend runs on `http://localhost:5173`

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions to Render + GitHub Pages.

## Features

- **Wall Section Tracking** - Separate counts for overhang, mid wall, and side wall
- **Video Evidence** - Required for red/black climbs
- **Live Preview** - Real-time score calculation with marginal gains
- **Leaderboard** - Latest session scores for all climbers
- **Analytics** - Score trends, sends by color, and wall section breakdowns
- **Shared Data** - All users see the same sessions and leaderboard

## Guide

This guide walks a typical user through the site: how to add climbers and sessions, what each UI element means, and useful tips for interpreting scores and managing data.

- **Overview:** The app tracks bouldering sessions (counts by color and wall section) and computes a single session score using diminishing returns so that harder problems contribute more but repeated sends give diminishing gains.

- **Typical session workflow (UI):**
   - **Add / select a climber:** Use the "Add climber" button or the climber dropdown to create or select the person you're recording for.
   - **Create a new session:** Click "New session" (or similar). Set the session date/time and optional `notes`.
   - **Record climbs by color & section:** For each color grade (green → black) enter the number of successful sends. You can break the counts down by wall sections (overhang / midWall / sideWall) if you want more detail — these are combined into the session total for scoring.
   - **Attach video evidence (when required):** For the higher grades (red/black) the app may require video; use the upload control inside the session form to attach short clips. The frontend validates file size and type before upload.
   - **Live preview:** While you edit counts the score preview updates in real-time so you can see how each additional send affects the total.
   - **Save session:** Click "Save" (or "Submit session"). The session is stored in the backend and will appear on the leaderboard and in your session history.

- **Reading the session form fields:**
   - **Counts by color:** Enter integer sends for each color. Leave zero for colors not climbed.
   - **Wall sections:** Optional breakdown that helps analytics but gets merged into the counts for scoring.
   - **Notes:** Any free-form text you want to keep with the session.
   - **Video upload:** Required by default for the hardest grades; optional otherwise.

- **Leaderboards & analytics:**
   - **Leaderboard:** Shows recent sessions (or aggregated top sessions) sorted by score. Use the date filters to restrict to a specific range.
   - **Session history:** Click a climber and view their past sessions, trend charts, and sends-by-color breakdown.
   - **Interpreting scores:** Higher score = stronger session. Because of diminishing returns the first hard problems give large jumps; repeated easier sends add less.

- **Exporting & backup:**
   - **Export CSV:** Use the Export button on the sessions page to download session data as CSV for backup or spreadsheet analysis.
   - **Static / client-side mode:** When using the `frontend-static/` GitHub Pages version, data is stored in your browser's localStorage — export regularly to avoid data loss when clearing cache or switching devices.

- **Admin tips:**
   - **Expire wall sections:** Admins can permanently delete wall-section data via the admin panel. This is a destructive operation (data is removed, not filtered) — see `src/controllers/adminController.ts` for the implementation.
   - **Adjust scoring parameters:** The decay (`r`) and base point values are currently constants in `src/score.ts`. Admins and maintainers can change these values and redeploy the backend to affect all users.

- **Troubleshooting common user issues:**
   - **Uploads failing:** Check file size and format. If the frontend shows CORS or network errors, ensure the backend is running and that `VITE_API_URL` or `DATABASE_URL` are correctly set.
   - **No live preview / errors loading data:** Backend may be offline (see Troubleshooting section below). Use `./dev-start.sh` locally to start both services.

- **Privacy & data notes:**
   - Sessions and leaderboards are shared across users by design. If you prefer private tracking, run the `frontend-static/` build locally and use the browser-only mode (data is stored locally only).

### Scoring Model

- Decay per placement: r = 0.95
- Base points: Green (0.5), Blue (1.5), Yellow (4), Orange (12), Red (36), Black (108)
- Weighted sum formula: Score = Σ (base × (W(cumulative+count) - W(cumulative)))
- Where W(n) = (1 - r^n) / (1 - r)
- Weekly scores map to grade bands: V0 (<3), V1 (3–<6), V2 (6–<19), V3 (19–<45), V4 (45–<70), V5 (70–<106), V6 (106–<186), V7 (186–<297), V8 (297–<420), V9+ (≥420)

## API Endpoints

- `POST /api/climbers` {name}
- `GET /api/climbers`
- `POST /api/sessions` {climberId, date, counts, notes}
- `GET /api/sessions?from=&to=&climberId=`
- `GET /api/sessions/:id`
- `GET /api/leaderboard?from=&to=`

## Tech Stack

**Backend:**
- TypeScript
- Express
- JSON file storage

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Aceternity UI components

## Static GitHub Pages Version

A fully client-side version is available in `frontend-static/` that runs entirely in the browser with localStorage.

### Run Static Version Locally

```bash
cd frontend-static
npm install
npm run dev
# Open http://localhost:5173
```

The development server now uses `/` as the base path automatically, so assets and routes work without additional configuration when testing locally.

### Deploy to GitHub Pages

1. **Set the base path** (replace `BoulderingELO` with your repo name). This value is read from the `VITE_BASE` environment variable during the build:
```bash
cd frontend-static
VITE_BASE=/BoulderingELO/ npm run build
```

If the bundler dependencies are unavailable (for example, when registry access is blocked),
`npm run build` will reuse the prebuilt `dist/` assets that are checked into the repository and
emit a warning. Install the frontend dependencies and rerun the command to produce a fresh build.

2. **Deploy** (pushes `dist/` to `gh-pages` branch):
```bash
npm run deploy
```

3. **Enable GitHub Pages**: Go to your repo Settings → Pages → set source to `gh-pages` branch.

Your app will be live at: `https://<username>.github.io/BoulderingELO/`

**Note**: Data is stored in browser localStorage (per-device). Use the "Export CSV" button to backup your sessions.

## Troubleshooting Connection Errors

### "ERR_CONNECTION_REFUSED" Error

**Symptom:** Frontend shows errors like:
```
localhost:3000/api/climbers: Failed to load resource: net::ERR_CONNECTION_REFUSED
Failed to load data: TypeError: Failed to fetch
```

**Cause:** The backend server is not running or failed to start.

**Solution:**

1. **Check if backend is running:**
   ```bash
   ./check-env.sh
   ```

2. **Start the backend:**
   ```bash
   # Build first (if not already built)
   npm run build
   
   # Start backend
   npm start
   ```

3. **Configure database connection:**
   - Make sure `DATABASE_URL` is set in `.env` file
   - For cloud database (recommended): Get connection string from [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com)
   - For local database: Run `./setup-local-db.sh`

4. **Use the quick start script:**
   ```bash
   ./dev-start.sh  # Starts both backend and frontend
   ```

**For detailed troubleshooting**, see [CODESPACE_GUIDE.md](CODESPACE_GUIDE.md#troubleshooting) or [QUICKSTART.md](QUICKSTART.md).

## Development

### Run Tests

```bash
npm test
```

### Build for Production

```bash
# Backend
npm run build
npm start

# Frontend
cd frontend-static
npm run build
```

## Next Steps

- [ ] Replace JSON storage with SQLite/Postgres (backend)
- [ ] Add admin toggles for decay (r) and base points
- [ ] Add authentication
- [ ] Add GitHub Actions workflow for auto-deploy
