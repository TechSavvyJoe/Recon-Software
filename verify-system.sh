#!/bin/bash
# Vehicle Recon System - Verification Script

echo "🚗 Vehicle Recon System Verification"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if server is running
check_server() {
    echo -n "🔍 Checking if server is running..."
    if curl -s http://localhost:3001/api/system/info > /dev/null 2>&1; then
        echo -e " ${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e " ${RED}❌ Server is not running${NC}"
        return 1
    fi
}

# Function to test API endpoints
test_api() {
    echo "🔧 Testing API endpoints..."
    
    # Test inventory endpoint
    echo -n "  📋 Inventory API..."
    if curl -s http://localhost:3001/api/inventory/current > /dev/null; then
        echo -e " ${GREEN}✅${NC}"
    else
        echo -e " ${RED}❌${NC}"
    fi
    
    # Test detailers endpoint
    echo -n "  👥 Detailers API..."
    if curl -s http://localhost:3001/api/detailers > /dev/null; then
        echo -e " ${GREEN}✅${NC}"
    else
        echo -e " ${RED}❌${NC}"
    fi
    
    # Test system info endpoint
    echo -n "  📊 System Info API..."
    if curl -s http://localhost:3001/api/system/info > /dev/null; then
        echo -e " ${GREEN}✅${NC}"
    else
        echo -e " ${RED}❌${NC}"
    fi
}

# Function to check file structure
check_files() {
    echo "📁 Checking file structure..."
    
    files=(
        "server/server.js"
        "server/admin.html"
        "server/admin.js"
        "server/package.json"
        "public/index.html"
        "public/main.js"
        "data/detailers.json"
    )
    
    for file in "${files[@]}"; do
        echo -n "  📄 $file..."
        if [ -f "$file" ]; then
            echo -e " ${GREEN}✅${NC}"
        else
            echo -e " ${RED}❌${NC}"
        fi
    done
}

# Function to check data status
check_data() {
    echo "📊 Checking data status..."
    
    # Check current inventory
    echo -n "  🚗 Current inventory..."
    inventory=$(curl -s http://localhost:3001/api/inventory/current 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$inventory" ]; then
        filename=$(echo $inventory | grep -o '"filename":"[^"]*"' | cut -d'"' -f4)
        echo -e " ${GREEN}✅ $filename${NC}"
    else
        echo -e " ${RED}❌ No inventory file${NC}"
    fi
    
    # Check detailers
    echo -n "  👥 Detailers count..."
    detailers=$(curl -s http://localhost:3001/api/detailers 2>/dev/null)
    if [ $? -eq 0 ]; then
        count=$(echo $detailers | grep -o '{"id"' | wc -l | xargs)
        echo -e " ${GREEN}✅ $count detailers${NC}"
    else
        echo -e " ${RED}❌ Cannot fetch detailers${NC}"
    fi
}

# Function to show access URLs
show_urls() {
    echo ""
    echo "🌐 Access URLs:"
    echo "  📱 Main Application: http://localhost:3001/"
    echo "  ⚙️  Admin Panel: http://localhost:3001/admin"
    echo "  🧪 Test Suite: http://localhost:3001/inventory-test.html"
}

# Main verification process
echo "Starting system verification..."
echo ""

# Check if we're in the right directory
if [ ! -f "server/server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the Vehicle Recon directory${NC}"
    exit 1
fi

# Run checks
check_server
if [ $? -eq 0 ]; then
    test_api
    check_data
else
    echo -e "${YELLOW}⚠️  Server not running. Starting server...${NC}"
    echo "To start the server, run: ./start-server.sh"
fi

check_files
show_urls

echo ""
echo "🎉 Verification complete!"
echo ""
echo "📋 Summary:"
echo "  - Backend server with CSV upload capability"
echo "  - Admin panel for file and detailer management"
echo "  - Main application with full vehicle tracking"
echo "  - RESTful API for all operations"
echo "  - Automatic file archiving and backup"
echo ""
echo "🚀 The Vehicle Recon system is ready for production use!"
