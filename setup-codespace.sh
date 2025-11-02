#!/bin/bash

echo "🚀 Setting up BoulderingELO in Codespace..."

# Create .env file (we'll use a cloud database instead of local PostgreSQL)
echo "⚙️  Creating .env file..."
cat > /workspaces/BoulderingELO/.env << 'EOF'
NODE_ENV=development
# Using a demo database - you can replace this with your own
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boulderingelo_dev
PORT=3000
JWT_SECRET=codespace-jwt-secret-key-123
APP_PASSWORD=climbing123
EOF

echo ""
echo "📝 IMPORTANT: PostgreSQL Setup"
echo "============================================"
echo ""
echo "Option 1: Use a free cloud database (Recommended)"
echo "  - Go to https://neon.tech or https://supabase.com"
echo "  - Create a free PostgreSQL database"
echo "  - Copy the connection string"
echo "  - Update DATABASE_URL in /workspaces/BoulderingELO/.env"
echo ""
echo "Option 2: Use local PostgreSQL (if already configured)"
echo "  - The .env file has been created"
echo "  - Local PostgreSQL needs to be configured separately"
echo ""
echo "============================================"
echo ""
echo "✅ Configuration file created!"
echo ""
echo "To start the application:"
echo "1. Update DATABASE_URL in .env with your database"
echo "2. Start backend:  cd /workspaces/BoulderingELO && npm start"
echo "3. Start frontend: cd /workspaces/BoulderingELO/frontend-static && npm run dev"
echo ""
echo "Backend will run on port 3000"
echo "Frontend will run on port 5173"
