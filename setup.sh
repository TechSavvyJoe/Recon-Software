#!/bin/bash

echo "🚗 Vehicle Reconditioning Tracker Setup"
echo "======================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data/uploads
mkdir -p data/archive
mkdir -p logs

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
if [ ! -f package.json ]; then
    echo "❌ Server package.json not found. Creating..."
    cat > package.json << 'EOF'
{
  "name": "vehicle-recon-server",
  "version": "1.0.0",
  "description": "Vehicle Reconditioning Tracker Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "csv-parser": "^3.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF
fi

npm install

cd ..

# Create sample data if it doesn't exist
if [ ! -f "data/detailers.json" ]; then
    echo "👥 Creating sample detailers data..."
    cat > data/detailers.json << 'EOF'
[
  {
    "id": "det001",
    "name": "John Smith",
    "specialty": "Interior Detail",
    "rating": 4.8,
    "available": true
  },
  {
    "id": "det002",
    "name": "Jane Doe",
    "specialty": "Exterior Detail",
    "rating": 4.9,
    "available": true
  },
  {
    "id": "det003",
    "name": "Mike Johnson",
    "specialty": "Full Detail",
    "rating": 4.7,
    "available": false
  },
  {
    "id": "det004",
    "name": "Sarah Williams",
    "specialty": "Paint Correction",
    "rating": 5.0,
    "available": true
  },
  {
    "id": "det005",
    "name": "Tom Brown",
    "specialty": "Ceramic Coating",
    "rating": 4.6,
    "available": true
  }
]
EOF
fi

# Create sample inventory if it doesn't exist
if [ ! -f "public/sample-inventory.csv" ]; then
    echo "🚙 Creating sample inventory data..."
    cat > public/sample-inventory.csv << 'EOF'
Stock #,Year,Make,Model,VIN,Status,Days in Inventory,Estimated Completion
INV001,2023,Ford,F-150,1FTFW1E50NFB12345,New Arrival,1,
INV002,2022,Toyota,Camry,4T1C11BK8NU123456,Mechanical,3,2024-12-20
INV003,2023,Honda,Civic,2HGFC2F59PH123456,Detailing,5,2024-12-18
INV004,2022,Chevrolet,Silverado,1GCUYDED9NZ123456,Photos,7,2024-12-19
INV005,2023,Nissan,Altima,1N4BL4BV4PC123456,Title,2,2024-12-21
INV006,2022,Ford,Escape,1FMCU9GD8NUA12345,Lot Ready,9,
EOF
fi

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm start"
echo ""
echo "🌐 The application will be available at:"
echo "   http://localhost:3001"
echo ""
echo "📂 File structure:"
echo "   - Frontend: /public/"
echo "   - Backend: /server/"
echo "   - Data: /data/"
echo ""
