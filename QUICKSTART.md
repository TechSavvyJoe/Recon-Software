# Vehicle Recon Tracker - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Initial Setup
```bash
# Navigate to the project directory
cd "/Users/missionford/Vehicle Recon"

# Run the setup script
chmod +x setup.sh
./setup.sh
```

### Step 2: Start the Server
```bash
# Start the backend server
./start-server.sh
```

### Step 3: Access the Application
- **Main App**: Open [http://localhost:3001](http://localhost:3001) in your browser
- **Admin Panel**: Open [http://localhost:3001/admin](http://localhost:3001/admin)

### Step 4: Upload Your Inventory
1. Go to the Admin Panel
2. Click "Inventory Upload" tab
3. Drag and drop your CSV file or click to select
4. Wait for upload confirmation

## 📊 Using the Main Application

### Dashboard View
- See overview of all vehicles in different stages
- Track bottlenecks and delays
- Monitor detailer performance

### Inventory Management
- Click column headers to sort
- Use the search box to filter vehicles
- Click on any vehicle to see details

### Workflow Updates
- Drag vehicles between stages
- Click "Complete" to advance workflow
- Check off substeps as completed

### Reports
- View average time in each stage
- Identify process bottlenecks
- Export data for analysis

## 🔧 Common Tasks

### Add a New Detailer
1. Go to Admin Panel → Detailers tab
2. Fill in the detailer information
3. Click "Add Detailer"

### Update Vehicle Status
1. Find the vehicle in the inventory
2. Click on it to open details
3. Use the workflow timeline to update status

### Export Data
1. Go to the main app
2. Click the "Export" button
3. Save the CSV file

## ❓ Troubleshooting

**Server won't start?**
- Check if port 3001 is available
- Run `npm install` in the server directory

**CSV upload fails?**
- Verify your CSV has the required columns
- Check that Stock # column has values

**Data not saving?**
- Check browser localStorage is enabled
- Ensure server is running

## 📞 Need Help?
Contact support at support@missionford.com
