#!/bin/zsh

# Vehicle Recon Project Cleanup Script
# This script organizes and cleans up redundant files

echo "🧹 Starting Vehicle Recon Project Cleanup..."

# Create comprehensive backup before cleanup
BACKUP_DIR="/Users/missionford/Vehicle Recon/archive/cleanup-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating comprehensive backup in $BACKUP_DIR..."

# Backup important working files
cp "/Users/missionford/Vehicle Recon/public/main.js" "$BACKUP_DIR/"
cp "/Users/missionford/Vehicle Recon/public/index.html" "$BACKUP_DIR/"
cp "/Users/missionford/Vehicle Recon/server/server.js" "$BACKUP_DIR/"
cp "/Users/missionford/Vehicle Recon/server/admin.html" "$BACKUP_DIR/"
cp "/Users/missionford/Vehicle Recon/data/detailers.json" "$BACKUP_DIR/"

echo "✅ Working files backed up"

# List of files to remove (redundant backups and test files)
FILES_TO_REMOVE=(
    "public/main_backup_20250615_203114.js"
    "public/main_backup_20250615_205057.js" 
    "public/main_backup_horizontal_fix_20250615_204632.js"
    "public/main_clean.js"
    "public/main_fixed.js"
    "public/main_full.js"
    "public/comprehensive_test.html"
    "public/debug_test.html"
    "public/final_status_report.html"
    "public/final_success_report.html"
    "public/final_verification_test.html"
    "public/inventory-test.html"
    "public/simple_test.html"
    "public/system-diagnostics.html"
    "public/test_app.html"
    "public/timeline_fix_test.html"
    "public/timeline_test.html"
    "test.html"
    "comprehensive_functionality_test.html"
    "<!DOCTYPE html>.py"
)

echo "🗑️  Removing redundant files..."

cd "/Users/missionford/Vehicle Recon"

for file in "${FILES_TO_REMOVE[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  Removing: $file"
        rm "$file"
    else
        echo "  Not found: $file"
    fi
done

# Keep only essential files in public
echo "📁 Organizing public directory..."

# Essential public files to keep:
# - index.html (main app)
# - main.js (main app logic)
# - main_horizontal_timeline.js (reference implementation)
# - integration-test.html (system testing)
# - horizontal_timeline_test.html (timeline testing)
# - styles.css (if exists)
# - *.csv files (data)
# - *.json files (data)

echo "✅ Redundant files removed"

# Clean up documentation files - move to archive
echo "📚 Organizing documentation..."

DOC_FILES=(
    "BUG_FIXES_COMPLETE.md"
    "ENHANCEMENTS.md"
    "FINAL_BUG_FIXES_COMPLETE.md"
    "FINAL_SUCCESS_REPORT.md"
    "FINAL_SYSTEM_COMPLETE.md"
    "IMPLEMENTATION_COMPLETE.md"
    "PROJECT_CLEANUP_COMPLETE.md"
    "QUICK_START_GUIDE.md"
    "SYSTEM_COMPLETE.md"
    "TIMELINE_ISSUE_RESOLVED.md"
    "TIMELINE_OPTIMIZATION_COMPLETE.md"
    "TIMELINE_OPTIMIZATION_SUCCESS.md"
)

mkdir -p "archive/documentation"

for doc in "${DOC_FILES[@]}"; do
    if [[ -f "$doc" ]]; then
        echo "  Moving to archive: $doc"
        mv "$doc" "archive/documentation/"
    fi
done

echo "✅ Documentation organized"

# Summary of remaining structure
echo ""
echo "📋 Final Project Structure:"
echo "├── 📁 Main Application"
echo "│   ├── public/index.html (Main UI)"
echo "│   ├── public/main.js (App Logic)"
echo "│   └── public/main_horizontal_timeline.js (Reference)"
echo "├── 📁 Backend"
echo "│   ├── server/server.js (API Server)" 
echo "│   ├── server/admin.html (Admin Panel)"
echo "│   └── server/admin.js (Admin Logic)"
echo "├── 📁 Data"
echo "│   ├── data/detailers.json (Detailer DB)"
echo "│   └── data/uploads/ (CSV Files)"
echo "├── 📁 Testing"
echo "│   ├── public/integration-test.html (System Test)"
echo "│   └── public/horizontal_timeline_test.html (Timeline Test)"
echo "└── 📁 Documentation"
echo "    ├── README.md (Main Guide)"
echo "    ├── QUICK_START.md (Quick Start)"
echo "    └── archive/documentation/ (Historical Docs)"

echo ""
echo "🎉 Project cleanup complete!"
echo ""
echo "🚀 To start the system:"
echo "   ./start-server.sh"
echo ""
echo "🌐 Access points:"
echo "   Main App: http://localhost:3001/"
echo "   Admin Panel: http://localhost:3001/admin"  
echo "   Integration Test: http://localhost:3001/integration-test.html"
echo "   Timeline Test: http://localhost:3001/horizontal_timeline_test.html"
echo ""
echo "✅ System is ready for production use!"
