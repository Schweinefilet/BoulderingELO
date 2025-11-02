#!/bin/bash

# Script to set up local PostgreSQL for development
# This is optional - you can also use a cloud database

set -e

echo "🗄️  Setting up local PostgreSQL for BoulderingELO"
echo "================================================"
echo ""
echo "This script will:"
echo "  1. Install PostgreSQL (if not already installed)"
echo "  2. Start the PostgreSQL service"
echo "  3. Create a database and user for BoulderingELO"
echo "  4. Update your .env file"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  exit 0
fi

REPO_DIR="${REPO_DIR:-/home/runner/work/BoulderingELO/BoulderingELO}"
cd "$REPO_DIR"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
  echo "📦 Installing PostgreSQL..."
  sudo apt-get update -qq
  sudo apt-get install -y postgresql postgresql-contrib
  echo "✅ PostgreSQL installed"
else
  echo "✅ PostgreSQL is already installed"
fi

# Start PostgreSQL service
echo ""
echo "🚀 Starting PostgreSQL service..."
sudo service postgresql start
sleep 2

# Check if service is running
if sudo service postgresql status | grep -q "online"; then
  echo "✅ PostgreSQL service is running"
else
  echo "❌ Failed to start PostgreSQL service"
  exit 1
fi

# Create database and user
echo ""
echo "🗄️  Creating database and user..."

# Drop existing database if it exists (for clean setup)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS boulderingelo_dev;" 2>/dev/null || true

# Create database
sudo -u postgres createdb boulderingelo_dev
echo "✅ Database 'boulderingelo_dev' created"

# Check if user exists, create if not
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'")
if [ -z "$USER_EXISTS" ]; then
  sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
  echo "✅ User 'postgres' created"
else
  # Update password
  sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
  echo "✅ User 'postgres' password updated"
fi

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE boulderingelo_dev TO postgres;"
echo "✅ Privileges granted"

# Update .env file
echo ""
echo "📝 Updating .env file..."
if [ -f .env ]; then
  # Replace DATABASE_URL line
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boulderingelo_dev|' .env
  echo "✅ .env file updated"
else
  echo "⚠️  .env file not found. Run ./setup-codespace.sh first"
  exit 1
fi

echo ""
echo "✅ Local PostgreSQL setup complete!"
echo ""
echo "Database connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: boulderingelo_dev"
echo "  User: postgres"
echo "  Password: postgres"
echo ""
echo "Connection string:"
echo "  postgresql://postgres:postgres@localhost:5432/boulderingelo_dev"
echo ""
echo "Next steps:"
echo "  1. Build backend: npm run build"
echo "  2. Start the app: ./dev-start.sh"
echo ""
