const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from project root and public directory
app.use(express.static(path.join(__dirname, '..')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Serve main application from root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index-consolidated.html'));
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../data/uploads');
        await fs.mkdir(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        cb(null, `inventory-${timestamp}.csv`);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Vehicle Reconditioning Tracker API'
    });
});

// Inventory management
app.post('/api/inventory/upload', upload.single('inventory'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Archive previous current inventory if it exists
        const currentPath = path.join(__dirname, '../data/current-inventory.csv');
        const archivePath = path.join(__dirname, '../data/archive');
        
        try {
            await fs.mkdir(archivePath, { recursive: true });
            const stats = await fs.stat(currentPath);
            const archiveFile = path.join(archivePath, `archived-${Date.now()}-${path.basename(currentPath)}`);
            await fs.copyFile(currentPath, archiveFile);
            await fs.unlink(currentPath);
        } catch (err) {
            // File doesn't exist, that's ok
        }
        
        // Create new current inventory link
        await fs.copyFile(req.file.path, currentPath);
        
        res.json({ 
            message: 'File uploaded successfully',
            filename: req.file.filename,
            size: req.file.size,
            path: currentPath
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

app.get('/api/inventory/current', async (req, res) => {
    try {
        const currentPath = path.join(__dirname, '../data/current-inventory.csv');
        const stats = await fs.stat(currentPath);
        
        res.json({
            filename: 'current-inventory.csv',
            size: stats.size,
            lastModified: stats.mtime,
            url: '/data/current-inventory.csv'
        });
    } catch (error) {
        res.status(404).json({ error: 'No current inventory file found' });
    }
});

app.get('/api/inventory/history', async (req, res) => {
    try {
        const uploadsPath = path.join(__dirname, '../data/uploads');
        const archivePath = path.join(__dirname, '../data/archive');
        
        let files = [];
        
        try {
            const uploadFiles = await fs.readdir(uploadsPath);
            const uploadStats = await Promise.all(
                uploadFiles.map(async file => {
                    const filePath = path.join(uploadsPath, file);
                    const stats = await fs.stat(filePath);
                    return { 
                        filename: file, 
                        size: stats.size, 
                        date: stats.mtime,
                        type: 'upload'
                    };
                })
            );
            files.push(...uploadStats);
        } catch (err) {
            // Directory doesn't exist
        }
        
        try {
            const archiveFiles = await fs.readdir(archivePath);
            const archiveStats = await Promise.all(
                archiveFiles.map(async file => {
                    const filePath = path.join(archivePath, file);
                    const stats = await fs.stat(filePath);
                    return { 
                        filename: file, 
                        size: stats.size, 
                        date: stats.mtime,
                        type: 'archive'
                    };
                })
            );
            files.push(...archiveStats);
        } catch (err) {
            // Directory doesn't exist
        }
        
        // Sort by date, newest first
        files.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json(files);
    } catch (error) {
        console.error('Error getting inventory history:', error);
        res.status(500).json({ error: 'Failed to get inventory history' });
    }
});

// Detailer management
const detailersPath = path.join(__dirname, '../data/detailers.json');

app.get('/api/detailers', async (req, res) => {
    try {
        const data = await fs.readFile(detailersPath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        // Return default detailers if file doesn't exist
        const defaultDetailers = [
            {
                id: "det001",
                name: "John Smith",
                specialty: "Interior Detail",
                rating: 4.8,
                available: true
            },
            {
                id: "det002",
                name: "Jane Doe",
                specialty: "Exterior Detail",
                rating: 4.9,
                available: true
            },
            {
                id: "det003",
                name: "Mike Johnson",
                specialty: "Full Detail",
                rating: 4.7,
                available: false
            },
            {
                id: "det004",
                name: "Sarah Williams",
                specialty: "Paint Correction",
                rating: 5.0,
                available: true
            },
            {
                id: "det005",
                name: "Tom Brown",
                specialty: "Ceramic Coating",
                rating: 4.6,
                available: true
            }
        ];
        res.json(defaultDetailers);
    }
});

app.post('/api/detailers', async (req, res) => {
    try {
        const { name, specialty, rating, email, phone } = req.body;
        
        if (!name || !specialty) {
            return res.status(400).json({ error: 'Name and specialty are required' });
        }
        
        let detailers = [];
        try {
            const data = await fs.readFile(detailersPath, 'utf8');
            detailers = JSON.parse(data);
        } catch (err) {
            // File doesn't exist, start with empty array
        }
        
        const newDetailer = {
            id: `det${String(Date.now()).slice(-6)}`,
            name,
            specialty,
            rating: rating || 4.0,
            email: email || '',
            phone: phone || '',
            createdAt: new Date().toISOString(),
            available: true
        };
        
        detailers.push(newDetailer);
        
        // Ensure directory exists
        await fs.mkdir(path.dirname(detailersPath), { recursive: true });
        await fs.writeFile(detailersPath, JSON.stringify(detailers, null, 2));
        
        res.json(newDetailer);
    } catch (error) {
        console.error('Error creating detailer:', error);
        res.status(500).json({ error: 'Failed to create detailer' });
    }
});

app.put('/api/detailers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, specialty, rating, available, email, phone } = req.body;
        
        let detailers = [];
        try {
            const data = await fs.readFile(detailersPath, 'utf8');
            detailers = JSON.parse(data);
        } catch (err) {
            return res.status(404).json({ error: 'Detailers file not found' });
        }
        
        const detailerIndex = detailers.findIndex(d => d.id === id);
        if (detailerIndex === -1) {
            return res.status(404).json({ error: 'Detailer not found' });
        }
        
        // Update detailer
        detailers[detailerIndex] = {
            ...detailers[detailerIndex],
            name: name || detailers[detailerIndex].name,
            specialty: specialty || detailers[detailerIndex].specialty,
            rating: rating !== undefined ? rating : detailers[detailerIndex].rating,
            available: available !== undefined ? available : detailers[detailerIndex].available,
            email: email !== undefined ? email : detailers[detailerIndex].email,
            phone: phone !== undefined ? phone : detailers[detailerIndex].phone,
            updatedAt: new Date().toISOString()
        };
        
        await fs.writeFile(detailersPath, JSON.stringify(detailers, null, 2));
        
        res.json(detailers[detailerIndex]);
    } catch (error) {
        console.error('Error updating detailer:', error);
        res.status(500).json({ error: 'Failed to update detailer' });
    }
});

app.delete('/api/detailers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        let detailers = [];
        try {
            const data = await fs.readFile(detailersPath, 'utf8');
            detailers = JSON.parse(data);
        } catch (err) {
            return res.status(404).json({ error: 'Detailers file not found' });
        }
        
        const detailerIndex = detailers.findIndex(d => d.id === id);
        if (detailerIndex === -1) {
            return res.status(404).json({ error: 'Detailer not found' });
        }
        
        const deletedDetailer = detailers.splice(detailerIndex, 1)[0];
        await fs.writeFile(detailersPath, JSON.stringify(detailers, null, 2));
        
        res.json({ message: 'Detailer deleted successfully', detailer: deletedDetailer });
    } catch (error) {
        console.error('Error deleting detailer:', error);
        res.status(500).json({ error: 'Failed to delete detailer' });
    }
});

// Vehicle data management (optional - for future API integration)
app.get('/api/vehicles', (req, res) => {
    res.json({ message: 'Vehicle data is managed client-side. Use localStorage for persistence.' });
});

// Serve sample data
app.get('/sample-inventory.csv', (req, res) => {
    const samplePath = path.join(__dirname, '../public/sample-inventory.csv');
    res.sendFile(samplePath);
});

// Admin interface
app.get('/admin', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Vehicle Recon Admin</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100">
            <div class="container mx-auto px-4 py-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h1 class="text-2xl font-bold mb-6">Vehicle Reconditioning Tracker - Admin Panel</h1>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="border rounded-lg p-4">
                            <h2 class="text-lg font-semibold mb-4">System Status</h2>
                            <div class="space-y-2">
                                <div class="flex justify-between">
                                    <span>Server Status:</span>
                                    <span class="text-green-600 font-medium">Running</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Port:</span>
                                    <span>${PORT}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Started:</span>
                                    <span>${new Date().toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="border rounded-lg p-4">
                            <h2 class="text-lg font-semibold mb-4">Quick Actions</h2>
                            <div class="space-y-2">
                                <a href="/" class="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700">
                                    Open Application
                                </a>
                                <a href="/api/health" class="block w-full bg-green-600 text-white text-center py-2 px-4 rounded hover:bg-green-700">
                                    API Health Check
                                </a>
                                <a href="/api/detailers" class="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded hover:bg-purple-700">
                                    View Detailers
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 border rounded-lg p-4">
                        <h2 class="text-lg font-semibold mb-4">API Endpoints</h2>
                        <div class="space-y-2 text-sm">
                            <div><code class="bg-gray-100 px-2 py-1 rounded">GET /api/health</code> - Health check</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">POST /api/inventory/upload</code> - Upload CSV</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">GET /api/inventory/current</code> - Current inventory info</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">GET /api/detailers</code> - Get detailers</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">POST /api/detailers</code> - Add detailer</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">PUT /api/detailers/:id</code> - Update detailer</div>
                            <div><code class="bg-gray-100 px-2 py-1 rounded">DELETE /api/detailers/:id</code> - Delete detailer</div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Fallback to serve the main app for any unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index-consolidated.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('🚗 Vehicle Reconditioning Tracker Server');
    console.log('=========================================');
    console.log(`🌐 Server running on port ${PORT}`);
    console.log(`📱 Application: http://localhost:${PORT}`);
    console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin`);
    console.log(`🔧 API health: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('Ready to track vehicle reconditioning! 🎉');
});

module.exports = app;
