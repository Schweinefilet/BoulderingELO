#!/bin/bash

echo "🚀 Starting BoulderingELO..."
echo ""

# Start backend in background
echo "Starting backend API on port 3000..."
cd /workspaces/BoulderingELO
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend on port 3001..."
cd /workspaces/BoulderingELO/frontend
npm run dev -- -p 3001 &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers started!"
echo ""
echo "📍 Backend API: http://localhost:3000"
echo "📍 Frontend UI: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
