# Helper Scripts

This directory contains several helper scripts to make development easier.

## Setup Scripts

### `setup-codespace.sh`
**Purpose:** Initial setup for GitHub Codespaces
**What it does:**
- Installs backend dependencies
- Installs frontend dependencies
- Creates `.env` configuration file
- Displays database setup instructions

**Usage:**
```bash
./setup-codespace.sh
```

**When to use:** Run this once when you first open the Codespace

### `setup-local-db.sh`
**Purpose:** Set up local PostgreSQL database
**What it does:**
- Installs PostgreSQL (if needed)
- Creates database and user
- Updates `.env` with local database URL

**Usage:**
```bash
./setup-local-db.sh
```

**When to use:** If you want to use a local PostgreSQL database instead of a cloud database (advanced users)

## Development Scripts

### `dev-start.sh`
**Purpose:** Start both backend and frontend servers
**What it does:**
- Builds backend if not already built
- Starts backend on port 3000
- Starts frontend on port 5173
- Manages both processes together

**Usage:**
```bash
./dev-start.sh
```

**When to use:** Use this to start the full application for development. Press Ctrl+C to stop both servers.

## Diagnostic Scripts

### `check-env.sh`
**Purpose:** Diagnose environment setup issues
**What it does:**
- Checks if `.env` file exists and is configured
- Verifies all dependencies are installed
- Checks if backend is built
- Tests database connection
- Checks port availability

**Usage:**
```bash
./check-env.sh
```

**When to use:** 
- When you encounter errors
- To verify setup before starting servers
- To diagnose "ERR_CONNECTION_REFUSED" errors

### `test-setup.sh`
**Purpose:** Integration test for the entire setup
**What it does:**
- Verifies backend builds correctly
- Starts backend and tests it responds
- Tests API endpoints
- Verifies frontend dependencies

**Usage:**
```bash
./test-setup.sh
```

**When to use:** To verify your complete environment is working before development

## Legacy Scripts

### `start.sh`
**Purpose:** Original start script
**Note:** Consider using `dev-start.sh` for development instead

## Quick Reference

```bash
# First time setup
./setup-codespace.sh
# Configure DATABASE_URL in .env

# Check if everything is set up correctly
./check-env.sh

# Start development servers
./dev-start.sh

# Or start manually:
# Terminal 1:
npm run build
npm start

# Terminal 2:
cd frontend-static
npm run dev
```

## Troubleshooting

If you encounter issues:
1. Run `./check-env.sh` to diagnose the problem
2. Check `CODESPACE_GUIDE.md` for detailed troubleshooting
3. Verify `DATABASE_URL` is correctly set in `.env`
4. Make sure dependencies are installed (run `./setup-codespace.sh` again)
