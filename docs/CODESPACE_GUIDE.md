# BoulderingELO - Codespace Setup Guide

This guide will help you set up and run BoulderingELO in a GitHub Codespace environment.

> **Experiencing "ERR_CONNECTION_REFUSED" errors?** This happens when the backend server is not running. Follow the setup steps below to configure your database and start both servers. Jump to [Troubleshooting](#troubleshooting) for quick fixes.

## Quick Setup (5 minutes)

### Step 1: Run the Setup Script

```bash
chmod +x setup-codespace.sh
./setup-codespace.sh
```

This will:
- Install all backend dependencies
- Install all frontend dependencies
- Create a `.env` configuration file

### Step 2: Configure Database

You **must** configure a PostgreSQL database before the app will work. We recommend using a free cloud database for Codespaces.

#### Option A: Free Cloud Database (Recommended)

**Using Neon (Recommended - Free tier, no credit card required):**

1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project
4. Copy the connection string (it looks like: `postgresql://user:password@host/database`)
5. Set it as an environment variable:
   ```bash
   export DATABASE_URL='postgresql://your-connection-string-here'
   ```
   Or edit `.env` file and replace the `DATABASE_URL` value

**Using Supabase:**

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Project Settings → Database
4. Copy the "Connection string" (choose "Connection pooling" for better performance)
5. Set the `DATABASE_URL` as shown above

#### Option B: Local PostgreSQL (Advanced)

If you want to run PostgreSQL locally in the Codespace:

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Create database
sudo -u postgres createdb boulderingelo_dev

# Create user and set password
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE boulderingelo_dev TO postgres;"

# Update .env to use local database
# DATABASE_URL should be: postgresql://postgres:postgres@localhost:5432/boulderingelo_dev
```

### Step 3: Build and Start the Application

#### Option A: Manual Start (More Control)

**Terminal 1 - Backend:**
```bash
npm run build
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend-static
npm run dev
```

#### Option B: Quick Start Script (Easier)

```bash
chmod +x dev-start.sh
./dev-start.sh
```

This starts both backend and frontend in one command. Press Ctrl+C to stop both.

### Step 4: Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

The Codespace will automatically forward these ports and make them accessible via HTTPS.

## Troubleshooting

### "ERR_CONNECTION_REFUSED" Errors

**Example error in browser console:**
```
localhost:3000/api/climbers:1 Failed to load resource: net::ERR_CONNECTION_REFUSED
App.tsx:286 Failed to load data: TypeError: Failed to fetch
```

This means the frontend can't reach the backend. Common causes and solutions:

1. **Backend not running:** 
   - **Solution:** Start the backend in a separate terminal: `npm start`
   - Check the backend terminal for any startup errors

2. **Database not configured:** 
   - **Solution:** Check that `DATABASE_URL` in `.env` is a valid PostgreSQL connection string
   - Use `./check-env.sh` to diagnose database connection issues
   - See Step 2 above for database setup instructions

3. **Backend failed to start:** 
   - **Solution:** Check backend terminal for error messages
   - Common error: "password authentication failed" → DATABASE_URL has wrong credentials
   - Common error: "database does not exist" → Create the database in your PostgreSQL instance

4. **Dependencies not installed:** 
   - **Solution:** Run `./setup-codespace.sh` again

**Quick diagnostic:**
```bash
# Run the diagnostic script to check your setup
./check-env.sh

# Test if backend is running
curl http://localhost:3000/

# Check if backend process is running
lsof -i :3000
```

### "Failed to connect to database" Error

**Example error in backend console:**
```
Error: password authentication failed for user "postgres"
```

Solutions:

1. **Check DATABASE_URL:** Make sure it's correct in `.env` or environment variable
   ```bash
   # Check current value
   grep DATABASE_URL .env
   
   # Set it as environment variable instead
   export DATABASE_URL='postgresql://user:pass@host:5432/dbname'
   ```

2. **Cloud database:** Verify the connection string from your cloud provider
   - For Neon: Use the connection string from project dashboard
   - For Supabase: Use "Transaction pooling" connection string
   - Make sure to include password in the connection string

3. **Local database:** Make sure PostgreSQL service is running
   ```bash
   sudo service postgresql status
   # If not running:
   sudo service postgresql start
   ```

### Port Already in Use

If you see "Port 3000 already in use":
```bash
# Find and kill the process using the port
lsof -ti:3000 | xargs kill -9
```

### Missing Dependencies

If you see missing dependency errors:
```bash
# Reinstall backend dependencies
npm install

# Reinstall frontend dependencies
cd frontend-static
npm install
```

## Development Workflow

### Running Tests

```bash
# Backend tests
npm test

# Backend tests with coverage
npm test -- --coverage
```

### Building for Production

```bash
# Build backend
npm run build

# Build frontend
cd frontend-static
npm run build
```

### Rebuilding Backend

If you make changes to the backend TypeScript files:
```bash
npm run build
```

Or use watch mode during development:
```bash
npm run dev
```

## Environment Variables

The `.env` file contains:

- `NODE_ENV` - Set to "development" for local development
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Backend server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens (change in production!)
- `APP_PASSWORD` - Admin password for the app

## Understanding the Architecture

- **Backend:** Node.js + Express + PostgreSQL
  - Source: `/src`
  - Built output: `/dist`
  - Entry point: `src/server.ts`

- **Frontend:** React + Vite + TypeScript
  - Source: `/frontend-static/src`
  - Entry point: `frontend-static/src/main.tsx`
  - Main app: `frontend-static/src/App.tsx`

- **API Communication:**
  - Frontend uses `VITE_API_URL` from `.env.local` (defaults to `http://localhost:3000`)
  - Backend CORS is configured to allow `http://localhost:5173`

## Next Steps

1. **Create your first admin user:** The app will prompt you to create an admin account on first launch
2. **Add climbers:** Use the admin panel to add climbers
3. **Record sessions:** Start logging climbing sessions
4. **View leaderboard:** Check out the scoring and analytics

## Common Commands Reference

```bash
# Setup
./setup-codespace.sh              # Initial setup

# Development
npm run dev                       # Start backend in watch mode
cd frontend-static && npm run dev # Start frontend dev server
./dev-start.sh                    # Start both backend and frontend

# Building
npm run build                     # Build backend TypeScript
cd frontend-static && npm run build # Build frontend for production

# Testing
npm test                          # Run backend tests

# Database
export DATABASE_URL='...'         # Set database connection
```

## Getting Help

- Check the main [README.md](README.md) for feature documentation
- Review [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [MULTI_USER.md](MULTI_USER.md) for authentication details
