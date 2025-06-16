const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../data/uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = moment().format('YYYY-MM-DD-HHmm');
    cb(null, `Recon-${timestamp}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Data directories
const DATA_DIR = path.join(__dirname, '../data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Ensure directories exist
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(UPLOADS_DIR);

// Routes

// Get current inventory CSV
app.get('/api/inventory/current', async (req, res) => {
  try {
    const files = await fs.readdir(PUBLIC_DIR);
    const csvFile = files.find(file => file.startsWith('Recon') && file.endsWith('.csv'));
    
    if (!csvFile) {
      return res.status(404).json({ error: 'No inventory CSV file found' });
    }
    
    const filePath = path.join(PUBLIC_DIR, csvFile);
    const stats = await fs.stat(filePath);
    
    res.json({
      filename: csvFile,
      lastModified: stats.mtime,
      size: stats.size,
      url: `/${csvFile}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload new inventory CSV
app.post('/api/inventory/upload', upload.single('inventory'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFilePath = req.file.path;
    const filename = req.file.filename;
    
    // Validate CSV format
    const vehicles = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(uploadedFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Check for various possible column names
          if (row['Stock #'] || row['Stock#'] || row['Stock '] || Object.keys(row).some(key => key.includes('Stock'))) {
            vehicles.push(row);
          }
        })
        .on('end', () => {
          resolve();
        })
        .on('error', reject);
    });

    if (vehicles.length === 0) {
      await fs.remove(uploadedFilePath);
      return res.status(400).json({ error: 'No valid vehicle data found in CSV' });
    }

    // Move old CSV to archive if exists
    const publicFiles = await fs.readdir(PUBLIC_DIR);
    const oldCsvFile = publicFiles.find(file => file.startsWith('Recon') && file.endsWith('.csv'));
    
    if (oldCsvFile) {
      const archiveDir = path.join(DATA_DIR, 'archive');
      fs.ensureDirSync(archiveDir);
      const archivePath = path.join(archiveDir, `archived-${Date.now()}-${oldCsvFile}`);
      await fs.move(path.join(PUBLIC_DIR, oldCsvFile), archivePath);
    }

    // Copy new file to public directory
    const publicFilePath = path.join(PUBLIC_DIR, filename);
    await fs.copy(uploadedFilePath, publicFilePath);

    res.json({
      message: 'Inventory uploaded successfully',
      filename: filename,
      vehicleCount: vehicles.length,
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailers list
app.get('/api/detailers', async (req, res) => {
  try {
    const detailersFile = path.join(DATA_DIR, 'detailers.json');
    
    if (await fs.pathExists(detailersFile)) {
      const detailers = await fs.readJson(detailersFile);
      res.json(detailers);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add detailer
app.post('/api/detailers', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Detailer name is required' });
    }

    const detailersFile = path.join(DATA_DIR, 'detailers.json');
    let detailers = [];
    
    if (await fs.pathExists(detailersFile)) {
      detailers = await fs.readJson(detailersFile);
    }

    // Check if detailer already exists
    if (detailers.find(d => d.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: 'Detailer already exists' });
    }

    const newDetailer = {
      id: Date.now().toString(),
      name,
      email: email || '',
      phone: phone || '',
      createdAt: new Date().toISOString(),
      active: true
    };

    detailers.push(newDetailer);
    await fs.writeJson(detailersFile, detailers, { spaces: 2 });

    res.json(newDetailer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update detailer
app.put('/api/detailers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, active } = req.body;

    const detailersFile = path.join(DATA_DIR, 'detailers.json');
    
    if (!(await fs.pathExists(detailersFile))) {
      return res.status(404).json({ error: 'Detailers file not found' });
    }

    const detailers = await fs.readJson(detailersFile);
    const detailerIndex = detailers.findIndex(d => d.id === id);

    if (detailerIndex === -1) {
      return res.status(404).json({ error: 'Detailer not found' });
    }

    detailers[detailerIndex] = {
      ...detailers[detailerIndex],
      name: name || detailers[detailerIndex].name,
      email: email !== undefined ? email : detailers[detailerIndex].email,
      phone: phone !== undefined ? phone : detailers[detailerIndex].phone,
      active: active !== undefined ? active : detailers[detailerIndex].active,
      updatedAt: new Date().toISOString()
    };

    await fs.writeJson(detailersFile, detailers, { spaces: 2 });

    res.json(detailers[detailerIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete detailer
app.delete('/api/detailers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const detailersFile = path.join(DATA_DIR, 'detailers.json');
    
    if (!(await fs.pathExists(detailersFile))) {
      return res.status(404).json({ error: 'Detailers file not found' });
    }

    const detailers = await fs.readJson(detailersFile);
    const filteredDetailers = detailers.filter(d => d.id !== id);

    if (filteredDetailers.length === detailers.length) {
      return res.status(404).json({ error: 'Detailer not found' });
    }

    await fs.writeJson(detailersFile, filteredDetailers, { spaces: 2 });

    res.json({ message: 'Detailer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get upload history
app.get('/api/uploads/history', async (req, res) => {
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    const csvFiles = files.filter(file => file.endsWith('.csv'));
    
    const history = await Promise.all(
      csvFiles.map(async (file) => {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          filename: file,
          uploadedAt: stats.birthtime,
          size: stats.size
        };
      })
    );

    history.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system info
app.get('/api/system/info', async (req, res) => {
  try {
    const info = {
      serverTime: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };

    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Vehicle Recon Backend Server running on port ${PORT}`);
  console.log(`Admin panel available at http://localhost:${PORT}/admin`);
});
