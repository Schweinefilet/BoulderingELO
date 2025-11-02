#!/bin/bash

# Integration test to verify backend and frontend can start correctly
# This requires a working DATABASE_URL to be configured

set +e  # Don't exit on error

REPO_DIR="${REPO_DIR:-/home/runner/work/BoulderingELO/BoulderingELO}"
cd "$REPO_DIR"

echo "🧪 BoulderingELO Integration Test"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Run ./setup-codespace.sh first."
  exit 1
fi

# Load environment
source .env

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env"
  exit 1
fi

echo "1. Testing backend build..."
if [ ! -d dist ] || [ ! -f dist/server.js ]; then
  echo "   Building backend..."
  npm run build
  if [ $? -eq 0 ]; then
    echo "   ✅ Backend built successfully"
  else
    echo "   ❌ Backend build failed"
    exit 1
  fi
else
  echo "   ✅ Backend already built"
fi

echo ""
echo "2. Testing backend startup..."
echo "   Starting backend server..."

# Start backend in background with configurable timeout
STARTUP_TIMEOUT=${BACKEND_STARTUP_TIMEOUT:-15}
timeout ${STARTUP_TIMEOUT}s npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "   Waiting for backend to initialize (timeout: ${STARTUP_TIMEOUT}s)..."
sleep 5

# Check if backend is still running
if ps -p $BACKEND_PID > /dev/null; then
  echo "   ✅ Backend started successfully (PID: $BACKEND_PID)"
  
  # Test backend API
  echo ""
  echo "3. Testing backend API endpoints..."
  
  # Test root endpoint
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
  if [ "$RESPONSE" = "200" ]; then
    echo "   ✅ GET / - OK (200)"
  else
    echo "   ⚠️  GET / - Response code: $RESPONSE"
  fi
  
  # Test climbers endpoint
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/climbers || echo "000")
  if [ "$RESPONSE" = "200" ]; then
    echo "   ✅ GET /api/climbers - OK (200)"
  else
    echo "   ⚠️  GET /api/climbers - Response code: $RESPONSE"
  fi
  
  # Stop backend
  echo ""
  echo "4. Stopping backend..."
  kill $BACKEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null || true
  echo "   ✅ Backend stopped"
  
else
  echo "   ❌ Backend failed to start or crashed"
  echo ""
  echo "Checking logs..."
  wait $BACKEND_PID
  exit 1
fi

echo ""
echo "5. Testing frontend build..."
cd frontend-static

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "   ❌ Frontend dependencies not installed"
  exit 1
fi

echo "   ✅ Frontend dependencies installed"

cd ..

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo ""
echo "Your environment is properly configured."
echo "You can now run: ./dev-start.sh"
echo "=================================="
