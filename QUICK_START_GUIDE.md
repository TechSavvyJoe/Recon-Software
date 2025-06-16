# 🚗 Vehicle Recon System - Quick Start Guide

## 🔧 **How to Access Everything**

### **STEP 1: Ensure Server is Running**
```bash
cd "/Users/missionford/Vehicle Recon"
./start-server.sh
```

### **STEP 2: Access Points**
- **🎯 Main Application:** http://localhost:3001/
- **⚙️ Admin Panel:** http://localhost:3001/admin  
- **🧪 System Diagnostics:** http://localhost:3001/system-diagnostics.html

---

## 🎯 **Main Application Features**

### **Dashboard Tab**
- View all vehicles with status summaries
- Quick status overview and metrics
- Click any vehicle card to open detailed timeline modal

### **Workflow Tab**
- Kanban-style board showing vehicles by status
- Drag and drop functionality
- Visual workflow progression

### **Inventory Tab**
- Complete vehicle listing in table format
- Sortable columns and search functionality
- Quick action checkboxes for workflow updates
- Click rows to open vehicle details

### **Reports Tab**
- Analytics and status charts
- Performance metrics
- Workflow progression statistics

### **Upload Tab**
- Basic CSV upload functionality
- Data import and validation

### **Detailers Tab**
- View current detailers
- Assignment tracking

---

## ⚙️ **Admin Panel Features**

### **Dashboard Tab**
- System health monitoring
- Current file information
- Server status and uptime
- Active detailer count

### **Inventory Upload Tab**
- **Drag & Drop CSV Upload**
- Progress tracking
- File validation
- Automatic file archiving

### **Detailers Management Tab**
- **Add New Detailers:** Name, email, phone
- **Edit Existing:** Update contact information
- **Activate/Deactivate:** Control active status
- **Delete:** Remove detailers completely

### **Upload History Tab**
- View all previous CSV uploads
- File size and date information
- Upload tracking

---

## 📊 **How to Upload New Inventory**

### **Method 1: Admin Panel (Recommended)**
1. Go to http://localhost:3001/admin
2. Click "Inventory Upload" tab
3. Drag your CSV file to the upload zone OR click "Select CSV File"
4. Wait for upload progress to complete
5. System automatically validates and activates new inventory

### **Method 2: Main App Upload Tab**
1. Go to http://localhost:3001/
2. Click "Upload Data" tab
3. Use CSV upload section
4. Follow prompts to import data

---

## 👥 **How to Manage Detailers**

### **Add New Detailer**
1. Go to http://localhost:3001/admin
2. Click "Detailers" tab
3. Fill in the form:
   - **Name:** Required
   - **Email:** Optional
   - **Phone:** Optional
4. Click "Add Detailer"

### **Edit/Delete Detailers**
1. In the detailers list, use the action buttons
2. **Activate/Deactivate:** Toggle availability
3. **Delete:** Permanently remove (with confirmation)

---

## 🔍 **Troubleshooting**

### **Problem: Can't Access Admin Panel**
**Solution:**
1. Check if server is running: `curl http://localhost:3001/api/system/info`
2. If no response, restart: `./start-server.sh`
3. Admin URL: http://localhost:3001/admin

### **Problem: CSV Upload Fails**
**Solution:**
1. Ensure CSV has "Stock #" column (or similar)
2. Check file format (must be .csv)
3. View upload error message for details
4. Try sample format:
   ```csv
   Stock #,VIN,Year,Make,Model,Color
   TEST001,1HGBH41JXMN109186,2023,Honda,Civic,Blue
   ```

### **Problem: Main App Not Loading Data**
**Solution:**
1. Check browser console for errors (F12)
2. Run diagnostics: http://localhost:3001/system-diagnostics.html
3. Clear browser cache and reload
4. Check if backend is responding

### **Problem: Detailers Not Showing**
**Solution:**
1. Add detailers through admin panel first
2. Check API: `curl http://localhost:3001/api/detailers`
3. Refresh main application

---

## 🧪 **Test Everything is Working**

### **Quick Backend Test**
```bash
# Test server status
curl http://localhost:3001/api/system/info

# Test inventory API
curl http://localhost:3001/api/inventory/current

# Test detailers API
curl http://localhost:3001/api/detailers
```

### **Web Interface Test**
1. Open http://localhost:3001/system-diagnostics.html
2. Click "Run Full Diagnostics"
3. All status indicators should be green ✅

---

## 📋 **CSV File Format**

Your CSV files should include these columns (exact names may vary):
- **Stock #** (Required) - Vehicle stock number
- **VIN** - Vehicle identification number
- **Year** - Manufacturing year
- **Make** - Manufacturer (Ford, Honda, etc.)
- **Model** - Vehicle model
- **Color** - Vehicle color
- **Body** - Body style (4D Sedan, SUV, etc.)

**Example:**
```csv
Stock #,VIN,Year,Make,Model,Body,Color,Inventory Date
12345A,1HGBH41JXMN109186,2023,Honda,Civic,4D Sedan,Blue,2025-06-15
67890B,2T1BURHE0JC123456,2022,Toyota,Corolla,4D Sedan,Silver,2025-06-15
```

---

## 🎉 **You're All Set!**

The system should now be fully functional with:
- ✅ Backend server running on port 3001
- ✅ Main application for daily vehicle tracking
- ✅ Admin panel for file uploads and detailer management
- ✅ Automatic CSV processing and validation
- ✅ Real-time system monitoring

If you encounter any issues, use the diagnostics page or check the troubleshooting section above.
