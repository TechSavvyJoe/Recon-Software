// GitHub Pages Configuration
// This file contains modifications needed for GitHub Pages deployment

// Override backend-dependent functions for client-side operation
window.GITHUB_PAGES_MODE = true;

// Mock API endpoints for demo mode
const mockAPIEndpoints = {
  '/api/inventory/current': {
    filename: 'demo-inventory.csv',
    lastModified: new Date().toISOString(),
    size: 1024,
    url: '/test-inventory.csv'
  },
  '/api/detailers': [
    { id: '1', name: 'Joe Wilson', email: 'joe@example.com', active: true },
    { id: '2', name: 'Mike Davis', email: 'mike@example.com', active: true },
    { id: '3', name: 'Sarah Johnson', email: 'sarah@example.com', active: true }
  ],
  '/api/system/info': {
    serverTime: new Date().toISOString(),
    uptime: 3600,
    nodeVersion: 'GitHub Pages',
    platform: 'Static Hosting'
  }
};

// Override fetch for demo mode
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // If it's an API call and we're in GitHub Pages mode, return mock data
  if (url.startsWith('/api/') && window.GITHUB_PAGES_MODE) {
    console.log('Mock API call:', url);
    const mockData = mockAPIEndpoints[url];
    if (mockData) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
        status: 200
      });
    }
  }
  
  // For regular files, use original fetch
  return originalFetch.apply(this, arguments);
};

// Demo data for GitHub Pages
window.DEMO_VEHICLE_DATA = [
  {
    'Stock #': 'ST001',
    'Year': 2022,
    'Make': 'Ford',
    'Model': 'F-150',
    'VIN': '1FTFW1E50NFC12345',
    'Status': 'In Mechanical',
    'Date In': '2025-06-10',
    'Color': 'Blue',
    'Detailer': 'Joe Wilson',
    'Photo Count': '3',
    workflow: {
      'New Arrival': { completed: true, date: '2025-06-10' },
      'Mechanical': { completed: false, date: null },
      'Detailing': { completed: false, date: null },
      'Photos': { completed: true, date: '2025-06-12' },
      'Title': { inHouse: false, date: null }
    }
  },
  {
    'Stock #': 'ST002',
    'Year': 2023,
    'Make': 'Chevrolet',
    'Model': 'Silverado',
    'VIN': '1GCRYDED5NZ123456',
    'Status': 'In Detailing',
    'Date In': '2025-06-08',
    'Color': 'Red',
    'Detailer': 'Mike Davis',
    'Photo Count': '0',
    workflow: {
      'New Arrival': { completed: true, date: '2025-06-08' },
      'Mechanical': { completed: true, date: '2025-06-11' },
      'Detailing': { completed: false, date: null },
      'Photos': { completed: false, date: null },
      'Title': { inHouse: true, date: '2025-06-09' }
    }
  },
  {
    'Stock #': 'ST003',
    'Year': 2021,
    'Make': 'Toyota',
    'Model': 'Camry',
    'VIN': '4T1C11AK5MU123456',
    'Status': 'Lot Ready',
    'Date In': '2025-06-05',
    'Color': 'White',
    'Detailer': 'Sarah Johnson',
    'Photo Count': '5',
    workflow: {
      'New Arrival': { completed: true, date: '2025-06-05' },
      'Mechanical': { completed: true, date: '2025-06-07' },
      'Detailing': { completed: true, date: '2025-06-09' },
      'Photos': { completed: true, date: '2025-06-10' },
      'Title': { inHouse: true, date: '2025-06-06' },
      'Lot Ready': { completed: true, date: '2025-06-10' }
    }
  }
];

// Initialize demo data when in GitHub Pages mode
document.addEventListener('DOMContentLoaded', function() {
  if (window.GITHUB_PAGES_MODE) {
    // Add demo banner
    const banner = document.createElement('div');
    banner.className = 'bg-blue-600 text-white p-2 text-center text-sm';
    banner.innerHTML = `
      <i class="fas fa-info-circle mr-2"></i>
      <strong>Demo Mode:</strong> This is a demonstration version running on GitHub Pages. 
      Full functionality requires a backend server.
      <a href="https://github.com/TechSavvyJoe/Recon-Software" class="ml-2 underline hover:text-blue-200">
        View Source Code
      </a>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Load demo data
    console.log('Loading demo data for GitHub Pages...');
    setTimeout(() => {
      if (typeof currentVehicleData !== 'undefined') {
        currentVehicleData.length = 0; // Clear any existing data
        currentVehicleData.push(...window.DEMO_VEHICLE_DATA);
        
        // Initialize the app with demo data
        if (typeof renderAllTabs === 'function') {
          renderAllTabs();
        }
        UIUtils.showToast('Demo data loaded! Try adding vehicles and testing features.', 'info', 8000);
      }
    }, 1000);
  }
});

console.log('GitHub Pages configuration loaded');
