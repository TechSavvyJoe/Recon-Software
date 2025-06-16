# 🚀 Vehicle Reconditioning Tracker - Quick Start Guide

## 📋 Overview
Complete CSV-based vehicle reconditioning tracking system with backend API and admin panel.

## ⚡ Quick Start

### 1. Start the System
```bash
cd "/Users/missionford/Vehicle Recon"
./start-server.sh
```

### 2. Access Points
- **Main App**: http://localhost:3001/
- **Admin Panel**: http://localhost:3001/admin  
- **System Test**: http://localhost:3001/integration-test.html

## 🎯 Key Features

### Main Application
- **Dashboard**: View all active vehicles
- **Workflow**: Track reconditioning progress
- **Inventory**: Manage vehicle database
- **Reports**: Analytics and insights
- **Admin Button**: Quick access to admin panel

### Admin Panel
- **CSV Upload**: Drag-and-drop new inventory files
- **Detailer Management**: Add/edit/manage detailers
- **Upload History**: Track all file changes
- **System Dashboard**: Monitor system health

## 📁 Data Management

### Current Test Data
- **3 Test Vehicles** in CSV format
- **3 Active Detailers**: John Smith, Mike Johnson, Sarah Davis
- **Automatic Archiving**: Old files preserved in `data/archive/`

### File Structure
```
/data/
  ├── detailers.json          # Detailer database
  ├── uploads/                # Current CSV files
  └── archive/                # Archived inventory files
```

## 🔧 Admin Tasks

### Upload New Inventory
1. Go to Admin Panel → Inventory Upload tab
2. Drag CSV file to upload zone
3. System automatically archives old file
4. New inventory immediately available

### Manage Detailers
1. Go to Admin Panel → Detailers tab
2. Add new detailers with contact info
3. Activate/deactivate as needed
4. Changes reflected immediately in main app

## 🧪 Testing

### Run Integration Tests
1. Visit: http://localhost:3001/integration-test.html
2. Click "Run All Tests"
3. Verify all components are operational

### Manual Verification
- ✅ Main app loads and displays vehicles
- ✅ Admin button opens admin panel in new tab
- ✅ CSV upload works with drag-and-drop
- ✅ Detailer management functions properly
- ✅ All API endpoints respond correctly

## 🚨 Troubleshooting

### Server Not Starting
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process if needed
sudo kill -9 $(lsof -t -i:3001)

# Restart server
./start-server.sh
```

### Admin Panel Not Accessible
1. Verify server is running on port 3001
2. Check browser console for JavaScript errors
3. Ensure admin button click handler is working

### CSV Upload Issues
1. Verify CSV file format matches expected structure
2. Check file permissions in `data/uploads/` directory
3. Review server logs for upload errors

## 📞 Support

### File Locations
- **Main App**: `/public/index.html`
- **Backend**: `/server/server.js`
- **Admin Panel**: `/server/admin.html`
- **Configuration**: `/server/package.json`

### Key Commands
```bash
# Start server
./start-server.sh

# Verify system
./verify-system.sh

# Check server status
curl http://localhost:3001/api/inventory/current
```

---

**Last Updated**: June 15, 2025  
**System Version**: 2.0 (CSV-Integrated)  
**Status**: Production Ready ✅
