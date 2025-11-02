#!/bin/bash

set -e  # Exit on error

REPO_DIR="${REPO_DIR:-/home/runner/work/BoulderingELO/BoulderingELO}"
cd "$REPO_DIR"

echo "🚀 Setting up BoulderingELO in Codespace..."
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend-static
npm install
cd ..
echo "✅ Frontend dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "⚙️  Creating .env file..."
  cat > .env << 'EOF'
NODE_ENV=development
# IMPORTANT: Replace this with your actual database URL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boulderingelo_dev
PORT=3000
JWT_SECRET=codespace-jwt-secret-key-change-in-production
APP_PASSWORD=climbing123
EOF
  echo "✅ Configuration file created!"
else
  echo "✅ .env file already exists"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "📝 IMPORTANT: Database Setup Required"
echo "═══════════════════════════════════════════"
echo ""
echo "You need to configure a PostgreSQL database before running the app."
echo ""
echo "Option 1: Use a FREE cloud database (RECOMMENDED for Codespaces)"
echo "  1. Go to https://neon.tech (recommended) or https://supabase.com"
echo "  2. Sign up for a free account"
echo "  3. Create a new PostgreSQL database"
echo "  4. Copy the connection string (starts with postgresql://)"
echo "  5. Run: export DATABASE_URL='your-connection-string-here'"
echo "  6. Or edit $REPO_DIR/.env and replace DATABASE_URL"
echo ""
echo "Option 2: Use local PostgreSQL (Advanced)"
echo "  - Requires PostgreSQL to be installed and running"
echo "  - Run: sudo service postgresql start"
echo "  - Create database: createdb boulderingelo_dev"
echo ""
echo "═══════════════════════════════════════════"
echo ""
echo "🚀 Quick Start Commands:"
echo ""
echo "1. Set your database URL (choose one):"
echo "   export DATABASE_URL='postgresql://your-connection-string'"
echo "   OR edit $REPO_DIR/.env"
echo ""
echo "2. Build backend:"
echo "   npm run build"
echo ""
echo "3. Start backend (in one terminal):"
echo "   npm start"
echo ""
echo "4. Start frontend (in another terminal):"
echo "   cd frontend-static && npm run dev"
echo ""
echo "Backend will run on http://localhost:3000"
echo "Frontend will run on http://localhost:5173"
echo ""
echo "═══════════════════════════════════════════"
echo "✅ Setup complete! Follow the Quick Start commands above."
echo "═══════════════════════════════════════════"
echo ""
echo "💡 Tip: Run './check-env.sh' anytime to diagnose setup issues"
echo "📚 See CODESPACE_GUIDE.md for detailed instructions and troubleshooting"
