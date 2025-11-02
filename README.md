# BoulderingELO

A web app that scores bouldering sessions using osu-style weighted top scores with live previews, leaderboards, and analytics.

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

### Scoring Model

- Decay per placement: r = 0.95
- Base points: Green (0.25), Blue (0.75), Yellow (3.5), Orange (12.5), Red (56), Black (120)
- Weighted sum formula: Score = Σ (base × (W(cumulative+count) - W(cumulative)))
- Where W(n) = (1 - r^n) / (1 - r)

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

### Deploy to GitHub Pages

1. **Set the base path** (replace `BoulderingELO` with your repo name):
```bash
cd frontend-static
VITE_BASE=/BoulderingELO/ npm run build
```

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