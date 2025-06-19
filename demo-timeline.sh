#!/bin/bash

# Vehicle Reconditioning Tracker - Timeline Demo Script
echo "🚗 Vehicle Reconditioning Tracker - Timeline Demo"
echo "=================================================="
echo ""

# Check if server is running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Server is running on port 3001"
else
    echo "❌ Server is not running. Starting server..."
    cd "/Users/missionford/Vehicle Recon/server"
    npm start &
    sleep 3
    echo "✅ Server started on port 3001"
fi

echo ""
echo "🌐 Opening applications in browser..."
echo ""

# Open the main application
echo "📱 Main Application: http://localhost:3001"
open "http://localhost:3001"

sleep 2

# Open the timeline test page
echo "🧪 Timeline Test Page: http://localhost:3001/timeline-test.html"
open "http://localhost:3001/timeline-test.html"

echo ""
echo "🎯 Demo Instructions:"
echo "======================"
echo ""
echo "1. MAIN APPLICATION (http://localhost:3001):"
echo "   • Upload the test CSV: test-timeline-inventory.csv"
echo "   • Go to Workflow tab to see vehicles in different stages"
echo "   • Click any vehicle to open the timeline modal"
echo "   • Try clicking the workflow stage circles"
echo ""
echo "2. TIMELINE TEST PAGE (http://localhost:3001/timeline-test.html):"
echo "   • Click 'Open Vehicle Details Modal' button"
echo "   • See the horizontal timeline with progress bar"
echo "   • Click the stage circles to change status"
echo "   • Hover over Mechanical to see sub-steps"
echo "   • Click sub-step circles to complete them"
echo ""
echo "🔧 KEY FEATURES TO TEST:"
echo "========================"
echo "✅ Horizontal timeline with progress bar"
echo "✅ Clickable workflow stages"
echo "✅ Mechanical sub-steps (Email, Pickup, Return)"
echo "✅ Out-of-order completion (Detail/Photos before Mechanical)"
echo "✅ Real-time notifications"
echo "✅ Data persistence"
echo ""
echo "🎉 Timeline implementation is COMPLETE and ready for use!"
echo ""
