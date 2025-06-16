#!/bin/bash
# Vehicle Recon Backend Server Startup Script

echo "🚗 Starting Vehicle Recon Backend Server..."

# Navigate to server directory
cd "$(dirname "$0")/server"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directories if they don't exist
mkdir -p ../data/uploads
mkdir -p ../data/archive

# Start the server
echo "🚀 Starting server on port 3001..."
echo "📊 Admin panel will be available at: http://localhost:3001/admin"
echo "🎯 Main application will be available at: http://localhost:3001/"
echo ""

npm start
