# BoulderingELO

A web app that scores bouldering sessions using osu-style weighted top scores with live previews, leaderboards, and analytics.

## Architecture

- **Backend**: Node.js + Express + TypeScript (port 3000)
- **Frontend**: Next.js 14 + TypeScript + Tailwind + Aceternity UI (port 3001)
- **Storage**: JSON file-based (data.json) for quick prototyping

## Quick Start

### 1. Backend API

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev -- -p 3001
```

Frontend runs on `http://localhost:3001`

### 3. Open the App

Visit `http://localhost:3001` in your browser

## Features

### Pages

1. **Sessions** - Add new sessions with live score preview and marginal gains calculator
2. **Leaderboard** - View rankings by date range or lifetime totals
3. **Analytics** - Charts showing score trends, color breakdowns, and top sessions

### Scoring Model

- Decay per placement: r = 0.95
- Base points: Green (0.25), Blue (0.75), Yellow (3.5), Orange (12), Red (48), Black (192)
- Weighted sum formula applies decay to each send based on placement

## API Endpoints

- `POST /api/climbers` {name}
- `GET /api/climbers`
- `POST /api/sessions` {climberId, date, counts, notes}
- `GET /api/sessions?from=&to=&climberId=`
- `GET /api/sessions/:id`
- `GET /api/leaderboard?from=&to=`

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
cd frontend
npm run build
npm start
```

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

## Next Steps

- [ ] Replace JSON storage with SQLite/Postgres (backend)
- [ ] Add admin toggles for decay (r) and base points
- [ ] Add authentication
- [ ] Add GitHub Actions workflow for auto-deploy
# BoulderingELO