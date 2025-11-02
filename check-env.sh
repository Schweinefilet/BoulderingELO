#!/bin/bash

# Diagnostic script to check if the environment is properly configured

set +e  # Don't exit on error

REPO_DIR="${REPO_DIR:-/home/runner/work/BoulderingELO/BoulderingELO}"
cd "$REPO_DIR"

echo "🔍 BoulderingELO Environment Diagnostics"
echo "========================================"
echo ""

# Check if .env exists
echo "1. Checking .env file..."
if [ -f .env ]; then
  echo "   ✅ .env file exists"
  
  # Check DATABASE_URL
  if grep -q "DATABASE_URL" .env; then
    DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2-)
    if [[ "$DB_URL" == *"localhost"* ]]; then
      echo "   ⚠️  DATABASE_URL is set to localhost"
      echo "      This requires a local PostgreSQL installation"
    else
      echo "   ✅ DATABASE_URL is configured (non-localhost)"
    fi
  else
    echo "   ❌ DATABASE_URL not found in .env"
  fi
else
  echo "   ❌ .env file not found"
  echo "      Run ./setup-codespace.sh to create it"
fi

echo ""
echo "2. Checking backend dependencies..."
if [ -d node_modules ]; then
  echo "   ✅ node_modules exists"
  
  # Check for critical packages
  if [ -d node_modules/express ]; then
    echo "   ✅ express installed"
  else
    echo "   ❌ express not installed"
  fi
  
  if [ -d node_modules/pg ]; then
    echo "   ✅ pg (PostgreSQL client) installed"
  else
    echo "   ❌ pg not installed"
  fi
else
  echo "   ❌ node_modules not found"
  echo "      Run: npm install"
fi

echo ""
echo "3. Checking frontend dependencies..."
if [ -d frontend-static/node_modules ]; then
  echo "   ✅ Frontend node_modules exists"
  
  if [ -d frontend-static/node_modules/react ]; then
    echo "   ✅ react installed"
  else
    echo "   ❌ react not installed"
  fi
  
  if [ -d frontend-static/node_modules/vite ]; then
    echo "   ✅ vite installed"
  else
    echo "   ❌ vite not installed"
  fi
else
  echo "   ❌ Frontend node_modules not found"
  echo "      Run: cd frontend-static && npm install"
fi

echo ""
echo "4. Checking backend build..."
if [ -d dist ]; then
  echo "   ✅ dist folder exists"
  if [ -f dist/server.js ]; then
    echo "   ✅ server.js compiled"
  else
    echo "   ⚠️  server.js not found in dist"
  fi
else
  echo "   ⚠️  Backend not built yet"
  echo "      Run: npm run build"
fi

echo ""
echo "5. Checking port availability..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "   ⚠️  Port 3000 is already in use"
  echo "      A backend server may already be running"
  PID=$(lsof -ti:3000)
  echo "      Process ID: $PID"
else
  echo "   ✅ Port 3000 is available"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "   ⚠️  Port 5173 is already in use"
  echo "      A frontend server may already be running"
  PID=$(lsof -ti:5173)
  echo "      Process ID: $PID"
else
  echo "   ✅ Port 5173 is available"
fi

echo ""
echo "6. Testing database connection..."
if [ -f .env ]; then
  source .env
  if [ -n "$DATABASE_URL" ]; then
    # Try to connect to the database using Node.js
    node -e "
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: '$DATABASE_URL' });
    pool.query('SELECT NOW()')
      .then(() => {
        console.log('   ✅ Database connection successful');
        pool.end();
      })
      .catch((err) => {
        console.log('   ❌ Database connection failed:', err.message);
        pool.end();
      });
    " 2>&1
  else
    echo "   ⚠️  DATABASE_URL not set"
  fi
else
  echo "   ⚠️  Cannot test - .env file not found"
fi

echo ""
echo "========================================"
echo "Summary:"
echo ""
echo "Next steps based on diagnostics:"

if [ ! -f .env ]; then
  echo "  1. Run: ./setup-codespace.sh"
fi

if [ ! -d node_modules ] || [ ! -d frontend-static/node_modules ]; then
  echo "  2. Install dependencies (or run ./setup-codespace.sh)"
fi

if [ ! -d dist ]; then
  echo "  3. Build backend: npm run build"
fi

echo "  4. Configure DATABASE_URL in .env file"
echo "  5. Start the application: ./dev-start.sh"
echo ""
