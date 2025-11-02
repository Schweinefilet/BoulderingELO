#!/bin/bash

# Development start script for running both backend and frontend
# This script helps developers quickly start both services

set -e

REPO_DIR="${REPO_DIR:-/home/runner/work/BoulderingELO/BoulderingELO}"
cd "$REPO_DIR"

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found!"
  echo ""
  echo "Please run ./setup-codespace.sh first to set up the environment."
  exit 1
fi

# Load environment variables
source .env

# Check if DATABASE_URL is configured
if [[ "$DATABASE_URL" == *"localhost"* ]]; then
  echo "⚠️  Warning: DATABASE_URL is set to localhost"
  echo ""
  echo "If you haven't set up a local PostgreSQL database, you may encounter connection errors."
  echo "Consider using a cloud database (see setup-codespace.sh output for instructions)."
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "🚀 Starting BoulderingELO Development Environment..."
echo ""

# Check if backend is already built
if [ ! -d "dist" ]; then
  echo "📦 Building backend for the first time..."
  npm run build
  echo "✅ Backend built successfully"
  echo ""
fi

echo "Starting services..."
echo ""
echo "Backend will run on http://localhost:3000"
echo "Frontend will run on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  echo "✅ Services stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "🔧 Starting backend..."
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend in background
echo "🎨 Starting frontend..."
cd frontend-static
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Services started!"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
