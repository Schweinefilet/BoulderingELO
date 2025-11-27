# Quick Start - Visual Guide

## 🚨 Seeing "ERR_CONNECTION_REFUSED" errors?

This is the most common issue and happens when the backend server isn't running. Here's how to fix it:

```
┌─────────────────────────────────────────────────────────┐
│  ERROR: ERR_CONNECTION_REFUSED                          │
│  localhost:3000/api/climbers: Failed to load resource   │
└─────────────────────────────────────────────────────────┘
                          ↓
                What does this mean?
                          ↓
    Frontend (port 5173) can't reach Backend (port 3000)
                          ↓
                   Why is this happening?
                          ↓
           ┌──────────────┴──────────────┐
           ↓                             ↓
    Backend not running         Backend failed to start
           ↓                             ↓
    Solution:                    Check why:
    npm start                    ./check-env.sh
```

## Setup Flow

```
Step 1: Run Setup Script
┌─────────────────────────┐
│ ./setup-codespace.sh    │
└───────────┬─────────────┘
            ↓
    ┌───────────────────┐
    │ Installs all deps │
    │ Creates .env      │
    └───────┬───────────┘
            ↓

Step 2: Configure Database
┌─────────────────────────────────────┐
│ Choose one:                         │
│                                     │
│ A) Cloud Database (RECOMMENDED)     │
│    1. Go to neon.tech               │
│    2. Create free database          │
│    3. Copy connection string        │
│    4. export DATABASE_URL='...'     │
│                                     │
│ B) Local Database (Advanced)        │
│    ./setup-local-db.sh              │
└───────────────┬─────────────────────┘
                ↓

Step 3: Start Application
┌─────────────────────────────────────┐
│ Option A: Quick Start               │
│   ./dev-start.sh                    │
│                                     │
│ Option B: Manual (2 terminals)      │
│   Terminal 1: npm run build && npm start  │
│   Terminal 2: cd frontend-static && npm run dev │
└───────────────┬─────────────────────┘
                ↓

Step 4: Access Application
┌─────────────────────────────────────┐
│ Frontend: http://localhost:5173     │
│ Backend:  http://localhost:3000     │
└─────────────────────────────────────┘
```

## Troubleshooting Flow

```
Problem: Application not working
            ↓
    Run diagnostic script
    ┌─────────────────┐
    │ ./check-env.sh  │
    └────────┬────────┘
             ↓
    ┌────────────────────────────────────────┐
    │ What does the diagnostic show?          │
    └─┬──────┬──────┬──────┬─────────────────┘
      ↓      ↓      ↓      ↓
   Missing  .env   Deps   Backend    Database
   .env     wrong  missing not built  failed
      ↓      ↓      ↓      ↓          ↓
   Run     Fix    Run     npm run    Check
   setup   URL    setup   build      DATABASE_URL
```

## Common Issues & Quick Fixes

### Issue 1: ERR_CONNECTION_REFUSED
```bash
# Diagnostic
./check-env.sh

# If backend not running
npm start

# If database not configured
export DATABASE_URL='postgresql://...'
# OR edit .env file
```

### Issue 2: Failed to connect to database
```bash
# Check your database URL
grep DATABASE_URL .env

# For cloud database: verify connection string
# For local database: 
sudo service postgresql status
sudo service postgresql start
```

### Issue 3: Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Issue 4: Dependencies missing
```bash
# Reinstall everything
./setup-codespace.sh
```

## File Structure Reference

```
BoulderingELO/
├── Setup & Documentation
│   ├── setup-codespace.sh      # Main setup script
│   ├── CODESPACE_GUIDE.md      # Detailed setup guide
│   ├── SCRIPTS_README.md       # Script documentation
│   └── README.md               # Project overview
│
├── Development Scripts
│   ├── dev-start.sh            # Start both servers
│   ├── check-env.sh            # Diagnose issues
│   ├── test-setup.sh           # Test your setup
│   └── setup-local-db.sh       # Local PostgreSQL setup
│
├── Configuration
│   ├── .env                    # Your config (git-ignored)
│   ├── .env.example            # Template
│   └── package.json            # Dependencies
│
├── Backend (Node.js + Express + PostgreSQL)
│   ├── src/
│   │   ├── server.ts           # Main server file
│   │   ├── db.ts               # Database logic
│   │   ├── score.ts            # Scoring algorithm
│   │   └── types.ts            # TypeScript types
│   └── dist/                   # Compiled JavaScript (built)
│
└── Frontend (React + Vite)
    └── frontend-static/
        ├── src/
        │   ├── App.tsx         # Main application
        │   └── lib/
        │       ├── api.ts      # Backend API client
        │       ├── scoring.ts  # Scoring calculations
        │       └── storage.ts  # Local storage
        └── dist/               # Built frontend (production)
```

## Environment Variables Explained

Your `.env` file contains:

```bash
# Development or production
NODE_ENV=development

# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boulderingelo_dev

# Backend server port
PORT=3000

# Secret key for JWT authentication (change in production!)
JWT_SECRET=codespace-jwt-secret-key-change-in-production

# Application password
APP_PASSWORD=climbing123
```

## Next Steps After Setup

1. **Access the app:** http://localhost:5173
2. **Create admin account:** First user to register becomes admin
3. **Add climbers:** Use admin panel
4. **Record sessions:** Start logging climbs
5. **View analytics:** Check leaderboard and stats

## Getting Help

- **Quick diagnostic:** `./check-env.sh`
- **Detailed guide:** See [CODESPACE_GUIDE.md](CODESPACE_GUIDE.md)
- **Script reference:** See [SCRIPTS_README.md](SCRIPTS_README.md)
- **API documentation:** See [README.md](README.md)
