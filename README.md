# Vehicle Reconditioning Tracker

A comprehensive web application for tracking vehicle reconditioning workflow with CSV-based inventory management and admin panel.

## 🌐 Live Demo

**Try the live demo:** [https://techsavvyjoe.github.io/Recon-Software/](https://techsavvyjoe.github.io/Recon-Software/)

The GitHub Pages demo runs entirely in your browser with no backend required. Features include:
- 📊 Full inventory management with CSV import/export
- 🚀 Sample data to explore all functionality
- 💾 Local storage persistence (data saved in your browser)
- 📱 Mobile-responsive design
- 🎯 Complete workflow tracking

## 🚀 New Features

### Backend Server & Admin Panel
- **CSV-Based Inventory**: Uses CSV files instead of JSON for better compatibility
- **Admin Panel**: Web-based interface for managing inventory uploads and detailers
- **File Upload**: Drag-and-drop CSV upload with validation
- **Detailer Management**: Add, edit, and manage detailer information
- **Upload History**: Track all inventory file uploads

### Core Functionality
- **🎯 Timeline Workflow**: Visual progression through reconditioning stages
- **📊 Dashboard Analytics**: Real-time status tracking and metrics  
- **🚗 Vehicle Management**: Add, edit, delete vehicles with full history
- **👥 Detailer Assignment**: Track and manage detailer workloads
- **📈 Reporting**: Comprehensive analytics and status reports
- **💾 Data Persistence**: Auto-save to browser localStorage

## 🛠 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Backend Setup
1. Navigate to the project directory
2. Make the startup script executable:
   ```bash
   chmod +x start-server.sh
   ```
3. Start the backend server:
   ```bash
   ./start-server.sh
   ```
   Or manually:
   ```bash
   cd server
   npm install
   npm start
   ```

### Access Points
- **Main Application**: http://localhost:3001/
- **Admin Panel**: http://localhost:3001/admin

## 📁 Project Structure
```
Vehicle Recon/
├── server/                 # Backend server
│   ├── server.js          # Main server file
│   ├── admin.html         # Admin panel UI
│   ├── admin.js           # Admin panel logic
│   └── package.json       # Server dependencies
├── public/                # Frontend files
│   ├── index.html         # Main application
│   ├── main_clean.js      # Application logic
│   └── *.csv             # Current inventory file
├── data/                  # Data storage
│   ├── uploads/          # CSV upload history
│   ├── archive/          # Archived inventory files
│   └── detailers.json   # Detailer information
└── src/                   # Source files
    └── main.js           # Updated main logic
```

## 🔧 Admin Panel Features

### Inventory Management
- Upload new CSV inventory files
- Automatic backup of previous files
- Upload progress tracking
- File validation

### Detailer Management
- Add new detailers with contact information
- Activate/deactivate detailers
- View detailer performance metrics

### System Monitoring
- Server uptime and status
- Upload history tracking
- File management

## 📄 CSV Format

The application expects CSV files with the following columns:
```
Stock #, VIN, Year, Make, Model, Body, Color, Inventory Date, Created, Tags, Odometer, Original Cost, Unit Cost, Vehicle Source, Photos
```

## 🔄 Workflow Stages
1. **New Arrival** - Vehicle intake and initial processing
2. **Mechanical** - Service and repair (3-step sub-process)
3. **Detailing** - Cleaning and cosmetic work
4. **Photos** - Photography for listings
5. **Title** - Title processing (with in-house tracking)
6. **Lot Ready** - Ready for sale
7. **Sold** - Vehicle sold

## 🎯 Usage

### For Daily Operations
1. Access the main application at http://localhost:3001/
2. View dashboard for current status
3. Update vehicle progress through workflow stages
4. Assign detailers and track completion

### For Administration
1. Access admin panel at http://localhost:3001/admin
2. Upload new inventory CSV files when updates are available
3. Manage detailer roster
4. Monitor system status and upload history

## 🔒 Data Storage
- **Vehicle Data**: Stored in browser localStorage with CSV backup
- **Detailers**: Stored in server-side JSON file
- **Uploads**: Archived in data/uploads directory
- **Configuration**: Server-side JSON files

## 🚀 Future Enhancements
- User authentication and role management
- Database integration (PostgreSQL/MySQL)
- Email notifications for workflow updates
- Advanced reporting and analytics
- Mobile app companion
- Integration with DMS systems

## 📝 License
MIT License - see LICENSE file for details

## 🤝 Contributing
Contributions welcome! Please read the contributing guidelines before submitting PRs.

---
*Vehicle Reconditioning Tracker - Streamlining automotive workflow management*
