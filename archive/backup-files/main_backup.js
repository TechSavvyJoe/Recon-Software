// --- Vehicle Reconditioning Tracker App ---
// Advanced UI/UX and logic for the app, including tab switching, modals, data loading, CSV/Google Sheet import, and all features.

// --- Global State ---
let currentVehicleData = [];
let detailerNames = [];
let activeVehicleId = null;
let statusToUpdateTo = null;
let stageBeingCompletedForForm = null;

const RECON_STATUSES = [
  'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Lot Ready', 'Sold'
];

// Enhanced workflow steps with sub-stages and title tracking
const WORKFLOW_STEPS = {
  'New Arrival': { 
    icon: 'fas fa-car', 
    color: 'blue',
    description: 'Vehicle arrived at lot'
  },
  'Mechanical': { 
    icon: 'fas fa-wrench', 
    color: 'yellow',
    description: 'Mechanical inspection and service',
    subSteps: [
      { id: 'email-sent', label: 'Email Sent to Service Manager', description: 'Initial service request sent' },
      { id: 'in-service', label: 'Vehicle Picked Up for Service', description: 'Technician has vehicle' },
      { id: 'completed', label: 'Service Completed', description: 'Vehicle returned from service' }
    ]
  },
  'Detailing': { 
    icon: 'fas fa-spray-can', 
    color: 'purple',
    description: 'Vehicle cleaning and detailing'
  },
  'Photos': { 
    icon: 'fas fa-camera', 
    color: 'pink',
    description: 'Photography for listings'
  },
  'Title': {
    icon: 'fas fa-file-contract',
    color: 'orange', 
    description: 'Title processing and documentation'
  },
  'Lot Ready': { 
    icon: 'fas fa-check-circle', 
    color: 'green',
    description: 'Ready for sale'
  },
  'Sold': { 
    icon: 'fas fa-handshake', 
    color: 'gray',
    description: 'Vehicle sold'
  }
};

// --- Utility Functions ---
function $(id) { return document.getElementById(id); }
function showMessageModal(title, text) {
  const modal = $('message-modal');
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 id="message-modal-title" class="text-xl font-bold mb-2">${title}</h2>
      <div id="message-modal-text" class="mb-4">${text}</div>
      <button id="message-modal-ok-button" class="action-button action-button-primary">OK</button>
    </div>
  `;
  modal.style.display = 'block';
  modal.querySelector('#message-modal-ok-button').onclick = closeAllModals;
  modal.querySelector('.close-modal').onclick = closeAllModals;
}
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}
function getStatusColor(status) {
  const colors = {
    'New Arrival': 'bg-blue-100 text-blue-800',
    'Mechanical': 'bg-yellow-100 text-yellow-800',
    'Detailing': 'bg-purple-100 text-purple-800',
    'Photos': 'bg-pink-100 text-pink-800',
    'Lot Ready': 'bg-green-100 text-green-800',
    'Sold': 'bg-gray-300 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(/\r|\n|"/g, '').trim());
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString();
}
function formatDuration(ms) {
  if (ms < 0 || isNaN(ms)) return '';
  let s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  h = h % 24; m = m % 60; s = s % 60;
  let str = '';
  if (d > 0) str += `${d}d `;
  if (h > 0) str += `${h}h `;
  if (m > 0) str += `${m}m `;
  if (d === 0 && h === 0) str += `${s}s`;
  return str.trim() || '0s';
}

// --- SPA Tab Switching and Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Tab switching event listeners
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.onclick = (e) => {
      e.preventDefault();
      const tabId = tab.getAttribute('data-tab');
      console.log('Switching to tab:', tabId);
      switchTab(tabId);
    };
  });
  
  // Modal close logic
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal')) {
      closeAllModals();
    }
    if (e.target.classList.contains('modal') && e.target.style.display === 'block') {
      closeAllModals();
    }
  });
  
  // Load initial data
  console.log('Loading initial data...');
  await loadInitialData();
  console.log('Data loaded:', currentVehicleData.length, 'vehicles');
  
  // Start with dashboard tab
  switchTab('dashboard');
  console.log('App initialized successfully');
});

function switchTab(tabId) {
  // Deactivate all tabs and content
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('bg-sky-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  // Activate the selected tab and content
  const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(`${tabId}-content`);
  if (activeButton) {
    activeButton.classList.add('bg-sky-500', 'text-white');
    activeButton.classList.remove('bg-gray-200', 'text-gray-700');
  }
  if (activeContent) {
    activeContent.classList.add('active');
  }
  // Render content
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'workflow') renderWorkflow();
  if (tabId === 'inventory') renderInventory();
  if (tabId === 'reports') renderReports();
  if (tabId === 'upload') renderUpload();
  if (tabId === 'detailers') renderDetailers();
}

// --- Data Loading ---
async function loadInitialData() {
  try {
    let url = './Recon -Mission Ford of Dearborn-2025-05-30-1153 - Sheet1.json';
    if (!url.startsWith('./')) url = './' + url;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inventory JSON');
    const json = await res.json();
    currentVehicleData = parseVehicleDataFromJson(json);
    if (currentVehicleData.length === 0) {
      // Fallback to sample data if JSON parsing fails
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because the JSON file format is invalid. The actual data file has formatting issues.');
    }
    renderAllTabs();
  } catch (e) {
    // Use sample data as fallback
    currentVehicleData = getSampleData();
    showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    renderAllTabs();
  }
}

function getSampleData() {
  return [
    {
      'Stock #': 'T250518A',
      'VIN': '1FMCU9G67LUC03251',
      'Year': '2020',
      'Make': 'Ford',
      'Model': 'Escape',
      'Color': 'White',
      'Status': 'Mechanical',
      'Detailer': 'John Smith',
      'Date In': '5/19/2025',
      'Date Out': '',
      'Notes': 'Needs brake inspection',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-19T08:30:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: false, 
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-19T09:00:00', notes: 'Service request email sent to manager' }
          }
        },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: false },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250519B',
      'VIN': '1HGBH41JXMN109186',
      'Year': '2019',
      'Make': 'Honda',
      'Model': 'Civic',
      'Color': 'Blue',
      'Status': 'Detailing',
      'Detailer': 'Mike Johnson',
      'Date In': '5/20/2025',
      'Date Out': '',
      'Notes': 'Minor scratches on rear bumper',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-20T09:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-21T11:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-20T10:00:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-20T14:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-21T11:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: false, date: '2025-05-21T15:00:00', notes: 'Detailing in progress' },
        'Photos': { completed: false },
        'Title': { completed: true, inHouse: true, date: '2025-05-20T16:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250520C',
      'VIN': '2T1BURHE0JC123456',
      'Year': '2018',
      'Make': 'Toyota',
      'Model': 'Corolla',
      'Color': 'Silver',
      'Status': 'Photos',
      'Detailer': 'Sarah Davis',
      'Date In': '5/18/2025',
      'Date Out': '',
      'Notes': 'Ready for photography',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-18T08:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-19T10:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-18T09:00:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-18T13:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-19T10:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-19T16:00:00', notes: 'Detailing completed' },
        'Photos': { completed: false, date: '2025-05-20T09:00:00', notes: 'Photography in progress' },
        'Title': { completed: true, inHouse: true, date: '2025-05-18T17:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250521D',
      'VIN': '1G1ZD5ST8JF123789',
      'Year': '2017',
      'Make': 'Chevrolet',
      'Model': 'Malibu',
      'Color': 'Black',
      'Status': 'Lot Ready',
      'Detailer': 'Tom Wilson',
      'Date In': '5/15/2025',
      'Date Out': '5/22/2025',
      'Notes': 'Complete - ready for sale',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-15T08:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-16T12:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-15T09:30:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-15T14:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-16T12:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-20T14:00:00', notes: 'Detailing completed' },
        'Photos': { completed: true, date: '2025-05-21T10:00:00', notes: 'Photography completed' },
        'Title': { completed: true, inHouse: true, date: '2025-05-21T15:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: true, date: '2025-05-22T09:00:00', notes: 'Vehicle ready for sale' },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250522E',
      'VIN': '5NPE34AF4JH123456',
      'Year': '2021',
      'Make': 'Hyundai',
      'Model': 'Elantra',
      'Color': 'Red',
      'Status': 'New Arrival',
      'Detailer': '',
      'Date In': '5/23/2025',
      'Date Out': '',
      'Notes': 'Just arrived - inspection pending',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-23T14:30:00', notes: 'Vehicle received at lot' },
        'Mechanical': { completed: false, subSteps: {} },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: false },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    }
  ];
}

function parseVehicleDataFromJson(json) {
  // Try to parse the malformed JSON structure
  try {
    const rows = json.data;
    if (!rows || rows.length < 5) return [];
    
    // The JSON has broken headers across multiple rows, try to reconstruct
    let vehicles = [];
    
    // Find where actual data starts (look for rows with VIN-like patterns)
    let dataStartIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 3 && typeof row[3] === 'string' && row[3].length === 17) {
        dataStartIndex = i;
        break;
      }
    }
    
    if (dataStartIndex === -1) return [];
    
    // Process each data row
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 10) continue;
      
      let v = {
        'Stock #': row[2] || '',
        'VIN': row[3] || '',
        'Year': row[7] || '',
        'Make': row[8] || '',
        'Model': row[9] || '',
        'Color': row[11] || '',
        'Status': 'New Arrival', // Default status
        'Detailer': '',
        'Date In': row[5] || '',
        'Date Out': '',
        'Notes': ''
      };
      
      // Only add if we have essential data
      if (v['Stock #'] && v['VIN'] && v['Make']) {
        // Assign random status for demo
        const statuses = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Lot Ready'];
        v['Status'] = statuses[Math.floor(Math.random() * statuses.length)];
        vehicles.push(v);
      }
    }
    
    return vehicles;
  } catch (e) {
    console.error('JSON parsing failed:', e);
    return [];
  }
}

// --- SPA Tab Switching and Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Tab switching event listeners
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.onclick = (e) => {
      e.preventDefault();
      const tabId = tab.getAttribute('data-tab');
      console.log('Switching to tab:', tabId);
      switchTab(tabId);
    };
  });
  
  // Modal close logic
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal')) {
      closeAllModals();
    }
    if (e.target.classList.contains('modal') && e.target.style.display === 'block') {
      closeAllModals();
    }
  });
  
  // Load initial data
  console.log('Loading initial data...');
  await loadInitialData();
  console.log('Data loaded:', currentVehicleData.length, 'vehicles');
  
  // Start with dashboard tab
  switchTab('dashboard');
  console.log('App initialized successfully');
});

function switchTab(tabId) {
  // Deactivate all tabs and content
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('bg-sky-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  // Activate the selected tab and content
  const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(`${tabId}-content`);
  if (activeButton) {
    activeButton.classList.add('bg-sky-500', 'text-white');
    activeButton.classList.remove('bg-gray-200', 'text-gray-700');
  }
  if (activeContent) {
    activeContent.classList.add('active');
  }
  // Render content
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'workflow') renderWorkflow();
  if (tabId === 'inventory') renderInventory();
  if (tabId === 'reports') renderReports();
  if (tabId === 'upload') renderUpload();
  if (tabId === 'detailers') renderDetailers();
}

// --- Data Loading ---
async function loadInitialData() {
  try {
    let url = './Recon -Mission Ford of Dearborn-2025-05-30-1153 - Sheet1.json';
    if (!url.startsWith('./')) url = './' + url;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inventory JSON');
    const json = await res.json();
    currentVehicleData = parseVehicleDataFromJson(json);
    if (currentVehicleData.length === 0) {
      // Fallback to sample data if JSON parsing fails
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because the JSON file format is invalid. The actual data file has formatting issues.');
    }
    renderAllTabs();
  } catch (e) {
    // Use sample data as fallback
    currentVehicleData = getSampleData();
    showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    renderAllTabs();
  }
}

function getSampleData() {
  return [
    {
      'Stock #': 'T250518A',
      'VIN': '1FMCU9G67LUC03251',
      'Year': '2020',
      'Make': 'Ford',
      'Model': 'Escape',
      'Color': 'White',
      'Status': 'Mechanical',
      'Detailer': 'John Smith',
      'Date In': '5/19/2025',
      'Date Out': '',
      'Notes': 'Needs brake inspection',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-19T08:30:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: false, 
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-19T09:00:00', notes: 'Service request email sent to manager' }
          }
        },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: false },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250519B',
      'VIN': '1HGBH41JXMN109186',
      'Year': '2019',
      'Make': 'Honda',
      'Model': 'Civic',
      'Color': 'Blue',
      'Status': 'Detailing',
      'Detailer': 'Mike Johnson',
      'Date In': '5/20/2025',
      'Date Out': '',
      'Notes': 'Minor scratches on rear bumper',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-20T09:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-21T11:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-20T10:00:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-20T14:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-21T11:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: false, date: '2025-05-21T15:00:00', notes: 'Detailing in progress' },
        'Photos': { completed: false },
        'Title': { completed: true, inHouse: true, date: '2025-05-20T16:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250520C',
      'VIN': '2T1BURHE0JC123456',
      'Year': '2018',
      'Make': 'Toyota',
      'Model': 'Corolla',
      'Color': 'Silver',
      'Status': 'Photos',
      'Detailer': 'Sarah Davis',
      'Date In': '5/18/2025',
      'Date Out': '',
      'Notes': 'Ready for photography',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-18T08:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-19T10:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-18T09:00:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-18T13:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-19T10:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-19T16:00:00', notes: 'Detailing completed' },
        'Photos': { completed: false, date: '2025-05-20T09:00:00', notes: 'Photography in progress' },
        'Title': { completed: true, inHouse: true, date: '2025-05-18T17:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250521D',
      'VIN': '1G1ZD5ST8JF123789',
      'Year': '2017',
      'Make': 'Chevrolet',
      'Model': 'Malibu',
      'Color': 'Black',
      'Status': 'Lot Ready',
      'Detailer': 'Tom Wilson',
      'Date In': '5/15/2025',
      'Date Out': '5/22/2025',
      'Notes': 'Complete - ready for sale',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-15T08:00:00', notes: 'Vehicle received at lot' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-16T12:00:00',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-15T09:30:00', notes: 'Service request email sent' },
            'in-service': { completed: true, date: '2025-05-15T14:00:00', notes: 'Vehicle picked up for service' },
            'completed': { completed: true, date: '2025-05-16T12:00:00', notes: 'Mechanical work completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-20T14:00:00', notes: 'Detailing completed' },
        'Photos': { completed: true, date: '2025-05-21T10:00:00', notes: 'Photography completed' },
        'Title': { completed: true, inHouse: true, date: '2025-05-21T15:00:00', notes: 'Title received in-house' },
        'Lot Ready': { completed: true, date: '2025-05-22T09:00:00', notes: 'Vehicle ready for sale' },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250522E',
      'VIN': '5NPE34AF4JH123456',
      'Year': '2021',
      'Make': 'Hyundai',
      'Model': 'Elantra',
      'Color': 'Red',
      'Status': 'New Arrival',
      'Detailer': '',
      'Date In': '5/23/2025',
      'Date Out': '',
      'Notes': 'Just arrived - inspection pending',
      workflow: {
        'New Arrival': { completed: true, date: '2025-05-23T14:30:00', notes: 'Vehicle received at lot' },
        'Mechanical': { completed: false, subSteps: {} },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: false },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    }
  ];
}

function parseVehicleDataFromJson(json) {
  // Try to parse the malformed JSON structure
  try {
    const rows = json.data;
    if (!rows || rows.length < 5) return [];
    
    // The JSON has broken headers across multiple rows, try to reconstruct
    let vehicles = [];
    
    // Find where actual data starts (look for rows with VIN-like patterns)
    let dataStartIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > 3 && typeof row[3] === 'string' && row[3].length === 17) {
        dataStartIndex = i;
        break;
      }
    }
    
    if (dataStartIndex === -1) return [];
    
    // Process each data row
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 10) continue;
      
      let v = {
        'Stock #': row[2] || '',
        'VIN': row[3] || '',
        'Year': row[7] || '',
        'Make': row[8] || '',
        'Model': row[9] || '',
        'Color': row[11] || '',
        'Status': 'New Arrival', // Default status
        'Detailer': '',
        'Date In': row[5] || '',
        'Date Out': '',
        'Notes': ''
      };
      
      // Only add if we have essential data
      if (v['Stock #'] && v['VIN'] && v['Make']) {
        // Assign random status for demo
        const statuses = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Lot Ready'];
        v['Status'] = statuses[Math.floor(Math.random() * statuses.length)];
        vehicles.push(v);
      }
    }
    
    return vehicles;
  } catch (e) {
    console.error('JSON parsing failed:', e);
    return [];
  }
}

// --- UI Rendering ---
function renderAllTabs() {
  renderDashboard();
  renderWorkflow();
  renderInventory();
  renderReports();
  renderUpload();
  renderDetailers();
}

function renderDashboard() {
  const el = $('dashboard-content');
  if (!el) return;
  let html = `<div class="mb-4 flex flex-wrap gap-4">`;
  // Status summary cards
  RECON_STATUSES.forEach(status => {
    const count = currentVehicleData.filter(v => v['Status'] === status).length;
    html += `<div class="flex-1 min-w-[120px] bg-white rounded-lg shadow p-4 text-center">
      <div class="text-lg font-bold">${count}</div>
      <div class="text-sm">${status}</div>
    </div>`;
  });
  html += '</div>';
  // List vehicles in progress
  html += `<h2 class="text-xl font-bold mt-6 mb-2">Vehicles In Progress</h2><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">`;
  currentVehicleData.filter(v => v['Status'] !== 'Sold').forEach(v => {
    html += `<div class="dashboard-vehicle-card bg-sky-50 rounded-lg p-4 shadow cursor-pointer hover:bg-sky-100" onclick="showVehicleDetailModal('${v['Stock #']}')">
      <div class="font-bold">${v['Year']} ${v['Make']} ${v['Model']}</div>
      <div class="text-sm text-gray-600">Stock #: ${v['Stock #']}</div>
      <div class="mt-2"><span class="px-2 py-1 rounded ${getStatusColor(v['Status'])}">${v['Status']}</span></div>
    </div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}

window.showVehicleDetailModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  // Initialize workflow if not exists
  const workflow = getWorkflowStatus(v);
  
  const modal = $('vehicle-detail-modal');
  const content = $('vehicle-detail-content');
  
  // Build timeline HTML
  let timelineHtml = '<div class="timeline-container">';
  
  const allSteps = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'];
  
  allSteps.forEach((step, index) => {
    const stepData = workflow[step];
    const stepInfo = WORKFLOW_STEPS[step] || { icon: 'fas fa-circle', color: 'gray' };
    const progress = getStepProgress(v, step);
    
    let statusClass = 'pending';
    if (stepData.completed) {
      statusClass = 'completed';
    } else if (progress.progress > 0 && progress.progress < 100) {
      statusClass = 'in-progress';
    }
    
    timelineHtml += `
      <div class="timeline-item ${statusClass}">
        <div class="timeline-icon ${statusClass}">
          <i class="${stepInfo.icon}"></i>
          ${progress.progress > 0 && progress.progress < 100 ? `<div class="progress-ring" style="--progress: ${progress.progress}"></div>` : ''}
        </div>
        <div class="timeline-content">
          <div class="timeline-step-header">
            <div class="timeline-step-title">${step}</div>
            ${stepData.date ? `<div class="timeline-step-date">${formatDate(stepData.date)}</div>` : ''}
          </div>
          
          ${step === 'Title' ? `
            <div class="mt-2">
              <label class="flex items-center space-x-2">
                <input type="checkbox" ${stepData.inHouse ? 'checked' : ''} 
                       onchange="toggleTitleInHouse('${stockNum}')"
                       class="form-checkbox h-4 w-4 text-blue-600">
                <span class="text-sm ${stepData.inHouse ? 'text-green-600' : 'text-red-600'}">
                  Title ${stepData.inHouse ? 'In House' : 'Not In House'}
                </span>
              </label>
            </div>
          ` : ''}
          
          ${step === 'Mechanical' ? `
            <div class="mechanical-substeps mt-2">
              ${WORKFLOW_STEPS.Mechanical.subSteps.map(subStep => {
                const subStepData = stepData.subSteps?.[subStep.id];
                const isCompleted = subStepData?.completed;
                return `
                  <div class="substep ${isCompleted ? 'completed' : ''} mb-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <i class="fas fa-${isCompleted ? 'check-circle text-green-500' : 'circle text-gray-300'} text-sm"></i>
                        <span class="text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}">${subStep.label}</span>
                      </div>
                      ${!isCompleted ? `
                        <button onclick="updateMechanicalSubStep('${stockNum}', '${subStep.id}')" 
                                class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                          ${subStep.id === 'email-sent' ? 'Send Email' : subStep.id === 'in-service' ? 'Start Service' : 'Complete'}
                        </button>
                      ` : ''}
                    </div>
                    ${subStepData?.date ? `<div class="text-xs text-gray-500 ml-6">${formatDate(subStepData.date)}</div>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
          
          ${(['Detailing', 'Photos'].includes(step) && !stepData.completed) ? `
            <div class="mt-2">
              <button onclick="completeWorkflowStep('${stockNum}', '${step}')" 
                      class="px-3 py-1 text-sm bg-${stepInfo.color}-500 text-white rounded hover:bg-${stepInfo.color}-600">
                <i class="${stepInfo.icon} mr-1"></i>Mark Complete
              </button>
            </div>
          ` : ''}
          
          ${stepData.notes ? `<div class="timeline-step-notes mt-2 text-sm text-gray-600">${stepData.notes}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  timelineHtml += '</div>';
  
  // Calculate if vehicle can be lot ready
  const canBeReady = canBeLotReady(v);
  
  content.innerHTML = `
    <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 class="text-2xl font-bold mb-4">${v['Year']} ${v['Make']} ${v['Model']}</h2>
        <div class="space-y-2 mb-4">
          <div><strong>Stock #:</strong> ${v['Stock #']}</div>
          <div><strong>VIN:</strong> ${v['VIN']}</div>
          <div><strong>Color:</strong> ${v['Color'] || 'N/A'}</div>
          <div><strong>Current Status:</strong> <span class="px-2 py-1 rounded ${getStatusColor(v['Status'])}">${v['Status']}</span></div>
          <div><strong>Detailer:</strong> ${v['Detailer'] || '<span class="text-gray-400">None assigned</span>'}</div>
          <div><strong>Date In:</strong> ${formatDate(v['Date In'])}</div>
          <div><strong>Date Out:</strong> ${formatDate(v['Date Out'])}</div>
        </div>
        
        <div class="mb-4">
          <strong>Notes:</strong>
          <textarea id="vehicle-notes-${stockNum}" class="w-full mt-1 p-2 border rounded" rows="3">${v['Notes'] || ''}</textarea>
          <button onclick="updateVehicleNotes('${stockNum}')" class="mt-2 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
            Update Notes
          </button>
        </div>
        
        <div class="space-y-2">
          <button class="action-button action-button-primary" onclick="showStatusUpdateModal('${stockNum}')">
            <i class="fas fa-edit mr-2"></i>Update Status
          </button>
          <button class="action-button action-button-secondary" onclick="deleteVehicle('${stockNum}')">
            <i class="fas fa-trash mr-2"></i>Delete Vehicle
          </button>
        </div>
      </div>
      
      <div>
        <h3 class="text-xl font-bold mb-4">Reconditioning Timeline</h3>
        ${timelineHtml}
        
        <div class="mt-4 p-3 bg-gray-50 rounded">
          <h4 class="font-semibold mb-2">Ready for Lot?</h4>
          <div class="text-sm space-y-1">
            <div class="flex items-center ${v.timeline.find(t => t.step === 'Mechanical' && t.completed) ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${v.timeline.find(t => t.step === 'Mechanical' && t.completed) ? 'fa-check' : 'fa-times'} mr-2"></i>
              Mechanical Complete
            </div>
            <div class="flex items-center ${v.detailingCompleted ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${v.detailingCompleted ? 'fa-check' : 'fa-times'} mr-2"></i>
              Detailing Complete
            </div>
            <div class="flex items-center ${v.photosCompleted ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${v.photosCompleted ? 'fa-check' : 'fa-times'} mr-2"></i>
              Photos Complete
            </div>
            <div class="flex items-center ${v.titleInHouse ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${v.titleInHouse ? 'fa-check' : 'fa-times'} mr-2"></i>
              Title In-House
            </div>
          </div>
          ${canMoveToLotReady(v) ? `
            <button onclick="moveToLotReady('${stockNum}')" class="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              <i class="fas fa-check-circle mr-2"></i>Move to Lot Ready
            </button>
          ` : `
            <div class="mt-3 text-center text-gray-500 text-sm">Complete all steps above to move to Lot Ready</div>
          `}
        </div>
      </div>
    </div>
  `;
  modal.style.display = 'block';
};

window.showStatusUpdateModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  const modal = $('status-update-modal');
  const content = $('status-update-content');
  let options = RECON_STATUSES.map(s => `<option value="${s}"${s === v['Status'] ? ' selected' : ''}>${s}</option>`).join('');
  content.innerHTML = `
    <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
    <h2 class="text-xl font-bold mb-2">Update Status for ${v['Year']} ${v['Make']} ${v['Model']}</h2>
    <div class="mb-2">Current Status: <span class="px-2 py-1 rounded ${getStatusColor(v['Status'])}">${v['Status']}</span></div>
    <div class="mb-2">
      <label class="block mb-1 font-semibold">New Status:</label>
      <select id="status-update-select" class="border rounded px-2 py-1 w-full">${options}</select>
    </div>
    <div class="mb-2">
      <label class="block mb-1 font-semibold">Notes:</label>
      <textarea id="status-update-notes" class="border rounded px-2 py-1 w-full" rows="2">${v['Notes'] || ''}</textarea>
    </div>
    <button class="action-button action-button-primary" id="status-update-save">Save</button>
  `;
  modal.style.display = 'block';
  $('status-update-save').onclick = function() {
    updateVehicleStatus(stockNum);
  };
};

window.updateVehicleStatus = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  const newStatus = $('status-update-select').value;
  const newNotes = $('status-update-notes').value;
  v['Status'] = newStatus;
  v['Notes'] = newNotes;
  
  // Update workflow to match new status
  const workflow = getWorkflowStatus(v);
  const statusIndex = RECON_STATUSES.indexOf(newStatus);
  
  // Mark all previous steps as completed
  RECON_STATUSES.slice(0, statusIndex + 1).forEach(status => {
    if (workflow[status]) {
      workflow[status].completed = true;
      if (!workflow[status].date) {
        workflow[status].date = new Date().toISOString();
      }
    }
  });
  
  autoSave();
  closeAllModals();
  renderAllTabs();
};

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  let html = `<div class="mb-4 flex justify-between items-center">
    <h2 class="text-xl font-bold">Inventory</h2>
    <div class="space-x-2">
      <button class="action-button action-button-primary" onclick="showAddVehicleModal()">Add Vehicle</button>
      <button class="action-button action-button-secondary" onclick="exportToCSV()">Export CSV</button>
    </div>
  </div>`;
  
  html += `<div class="overflow-x-auto">
    <table class="min-w-full bg-white border border-gray-200 text-xs">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Stock #</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Mech</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Detail</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Photos</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Title</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Detailer</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Date In</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">`;
  
  currentVehicleData.forEach(v => {
    const workflow = getWorkflowStatus(v);
    html += `<tr class="hover:bg-gray-50">
      <td class="px-2 py-2 font-medium text-gray-900">${v['Stock #']}</td>
      <td class="px-2 py-2">
        <div class="font-medium">${v['Year']} ${v['Make']}</div>
        <div class="text-gray-500">${v['Model']} - ${v['Color'] || 'N/A'}</div>
      </td>
      <td class="px-2 py-2">
        <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Mechanical'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Mechanical')"
               class="form-checkbox h-4 w-4 text-blue-600">
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Detailing'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Detailing')"
               class="form-checkbox h-4 w-4 text-purple-600">
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Photos'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Photos')"
               class="form-checkbox h-4 w-4 text-pink-600">
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Title'].inHouse ? 'checked' : ''} 
               onchange="window.toggleTitleInHouse('${v['Stock #']}')"
               class="form-checkbox h-4 w-4 text-orange-600"
               title="Title In House">
      </td>
      <td class="px-2 py-2 text-gray-900">${v['Detailer'] || 'Unassigned'}</td>
      <td class="px-2 py-2 text-gray-900">${formatDate(v['Date In'])}</td>
      <td class="px-2 py-2">
        <div class="flex space-x-1">
          <button onclick="window.showVehicleDetailModal('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="window.showStatusUpdateModal('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600" title="Update Status">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="window.deleteVehicle('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

// Add new function to toggle workflow steps from checkboxes
window.toggleWorkflowStep = function(stockNum, step) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const workflow = getWorkflowStatus(v);
  const isCompleted = workflow[step].completed;
  
  if (isCompleted) {
    // Uncomplete the step
    workflow[step].completed = false;
    workflow[step].date = null;
    workflow[step].notes = null;
  } else {
    // Complete the step
    workflow[step].completed = true;
    workflow[step].date = new Date().toISOString();
    workflow[step].notes = `${step} completed via quick action`;
  }
  
  // Update vehicle status based on workflow
  v['Status'] = determineCurrentStatus(v);
  
  autoSave();
  renderAllTabs();
};

// Add function to update vehicle notes
window.updateVehicleNotes = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const notesTextarea = $(`vehicle-notes-${stockNum}`);
  if (notesTextarea) {
    v['Notes'] = notesTextarea.value;
    autoSave();
    showMessageModal('Success', 'Notes updated successfully!');
  }
};

// --- Enhanced Timeline and Title Management Functions ---

function getWorkflowStatus(vehicle) {
  if (!vehicle.workflow) {
    vehicle.workflow = {
      'New Arrival': { completed: true, date: vehicle['Date In'] ? new Date(vehicle['Date In']).toISOString() : new Date().toISOString(), notes: 'Vehicle received at lot' },
      'Mechanical': { 
        completed: false,
        subSteps: {}
      },
      'Detailing': { completed: false },
      'Photos': { completed: false },
      'Title': { completed: false, inHouse: false },
      'Lot Ready': { completed: false },
      'Sold': { completed: false }
    };
  }
  return vehicle.workflow;
}

function getStepProgress(vehicle, step) {
  const workflow = getWorkflowStatus(vehicle);
  const stepData = workflow[step];
  
  if (stepData.completed) {
    return { progress: 100, status: 'completed' };
  }
  
  if (step === 'Mechanical' && stepData.subSteps) {
    const subSteps = Object.values(stepData.subSteps);
    if (subSteps.length === 0) return { progress: 0, status: 'pending' };
    
    const completedCount = subSteps.filter(s => s.completed).length;
    const totalCount = 3; // email-sent, in-service, completed
    const progress = Math.round((completedCount / totalCount) * 100);
    
    return { progress, status: progress > 0 ? 'in-progress' : 'pending' };
  }
  
  return { progress: 0, status: 'pending' };
}

function canBeLotReady(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  return workflow['Mechanical'].completed && 
         workflow['Detailing'].completed && 
         workflow['Photos'].completed && 
         workflow['Title'].inHouse;
}

function canMoveToLotReady(vehicle) {
  return canBeLotReady(vehicle) && !getWorkflowStatus(vehicle)['Lot Ready'].completed;
}

window.moveToLotReady = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  if (!canBeLotReady(v)) {
    showMessageModal('Cannot Move to Lot Ready', 'Please complete all required steps first: Mechanical, Detailing, Photos, and ensure Title is in-house.');
    return;
  }
  
  const workflow = getWorkflowStatus(v);
  workflow['Lot Ready'].completed = true;
  workflow['Lot Ready'].date = new Date().toISOString();
  workflow['Lot Ready'].notes = 'Vehicle ready for sale';
  
  v['Status'] = 'Lot Ready';
  v['Date Out'] = new Date().toLocaleDateString();
  
  autoSave();
  closeAllModals();
  renderAllTabs();
  showMessageModal('Success', `${v['Year']} ${v['Make']} ${v['Model']} has been moved to Lot Ready!`);
};

window.toggleTitleInHouse = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const workflow = getWorkflowStatus(v);
  workflow['Title'].inHouse = !workflow['Title'].inHouse;
  workflow['Title'].completed = workflow['Title'].inHouse;
  workflow['Title'].date = new Date().toISOString();
  workflow['Title'].notes = workflow['Title'].inHouse ? 'Title received in-house' : 'Title not in-house';
  
  // Update vehicle status
  updateVehicleStatus(v);
  
  // Refresh the modal
  showVehicleDetailModal(stockNum);
  renderAllTabs();
};

window.updateMechanicalSubStep = function(stockNum, subStepId) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const workflow = getWorkflowStatus(v);
  const mechanicalStep = workflow['Mechanical'];
  
  if (!mechanicalStep.subSteps) {
    mechanicalStep.subSteps = {
      'email-sent': { completed: false },
      'in-service': { completed: false },
      'completed': { completed: false }
    };
  }
  
  // Toggle the sub-step
  const subStep = mechanicalStep.subSteps[subStepId];
  if (subStep) {
    subStep.completed = !subStep.completed;
    subStep.date = subStep.completed ? new Date().toISOString() : null;
    subStep.notes = subStep.completed ? `${subStepId} completed` : null;
    
    // Check if all mechanical sub-steps are complete
    const allSubStepsComplete = Object.values(mechanicalStep.subSteps).every(s => s.completed);
    if (allSubStepsComplete && !mechanicalStep.completed) {
      mechanicalStep.completed = true;
      mechanicalStep.date = new Date().toISOString();
      mechanicalStep.notes = 'All mechanical work completed';
      
      // Update vehicle status
      v['Status'] = determineCurrentStatus(v);
    } else if (!allSubStepsComplete && mechanicalStep.completed) {
      mechanicalStep.completed = false;
      mechanicalStep.date = null;
    }
    
    v['Last Updated'] = new Date().toISOString();
    autoSave();
    renderAllTabs();
  }
}

// --- Data Persistence Functions ---
function saveDataToStorage() {
  try {
    const dataToSave = {
      vehicles: currentVehicleData,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem('vehicleReconData', JSON.stringify(dataToSave));
    console.log('Data saved to localStorage');
  } catch (error) {
    console.error('Failed to save data:', error);
    showMessageModal('Storage Error', 'Failed to save data to browser storage.');
  }
}

function loadDataFromStorage() {
  try {
    const savedData = localStorage.getItem('vehicleReconData');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.vehicles && Array.isArray(parsed.vehicles)) {
        currentVehicleData = parsed.vehicles;
        console.log('Data loaded from localStorage:', parsed.vehicles.length, 'vehicles');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Failed to load data:', error);
    return false;
  }
}

function clearStoredData() {
  try {
    localStorage.removeItem('vehicleReconData');
    showMessageModal('Success', 'Stored data has been cleared.');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}

function exportDataAsJSON() {
  try {
    const dataToExport = {
      vehicles: currentVehicleData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-recon-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageModal('Success', 'Data exported successfully!');
  } catch (error) {
    console.error('Failed to export data:', error);
    showMessageModal('Error', 'Failed to export data.');
  }
}

function importDataFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.vehicles && Array.isArray(imported.vehicles)) {
          currentVehicleData = imported.vehicles;
          saveDataToStorage();
          renderAllTabs();
          showMessageModal('Success', `Imported ${imported.vehicles.length} vehicles successfully!`);
          resolve(true);
        } else {
          showMessageModal('Error', 'Invalid data format.');
          reject(new Error('Invalid format'));
        }
      } catch (error) {
        showMessageModal('Error', 'Failed to parse imported file.');
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

// Auto-save function - call this whenever data changes
function autoSave() {
  saveDataToStorage();
}

// --- Missing Window-Scoped Functions ---

// Show add vehicle modal
window.showAddVehicleModal = function() {
  const modal = $('add-vehicle-modal');
  if (modal) {
    modal.style.display = 'block';
    // Clear form
    $('add-vehicle-form').reset();
  }
};

// Handle add vehicle form submission
window.handleAddVehicle = function() {
  const form = $('add-vehicle-form');
  if (!form) return;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const stockNumber = $('add-stock-number').value.trim();
    const year = parseInt($('add-year').value);
    const make = $('add-make').value.trim();
    const model = $('add-model').value.trim();
    const color = $('add-color').value.trim();
    const detailer = $('add-detailer').value;
    const notes = $('add-notes').value.trim();
    
    // Validate required fields
    if (!stockNumber || !year || !make || !model) {
      showMessageModal('Error', 'Please fill in all required fields (Stock #, Year, Make, Model).');
      return;
    }
    
    // Check if stock number already exists
    if (currentVehicleData.find(v => v['Stock #'] === stockNumber)) {
      showMessageModal('Error', `A vehicle with stock number "${stockNumber}" already exists.`);
      return;
    }
    
    // Create new vehicle object
    const newVehicle = {
      'Stock #': stockNumber,
      'Year': year,
      'Make': make,
      'Model': model,
      'Color': color || '',
      'Status': 'New Arrival',
      'Date In': new Date().toISOString().split('T')[0],
      'Detailer': detailer || '',
      'Notes': notes || '',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { 
          completed: true, 
          date: new Date().toISOString(), 
          notes: 'Vehicle added to inventory' 
        },
        'Mechanical': { 
          completed: false,
          subSteps: {
            'email-sent': { completed: false },
            'in-service': { completed: false },
            'completed': { completed: false }
          }
        },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: false },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    };
    
    // Add to data array
    currentVehicleData.push(newVehicle);
    
    // Save and refresh
    autoSave();
    renderAllTabs();
    closeModal('add-vehicle-modal');
    showMessageModal('Success', `Vehicle ${stockNumber} added successfully!`);
  });
};

// Complete workflow step function
function completeWorkflowStep(stockNum, step) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow[step].completed = true;
  workflow[step].date = new Date().toISOString();
  workflow[step].notes = `${step} completed`;
  
  // Update vehicle status
  vehicle['Status'] = determineCurrentStatus(vehicle);
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
}

// Move vehicle to lot ready
function moveToLotReady(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const canMove = canBeLotReady(vehicle);
  
  if (!canMove.eligible) {
    showMessageModal('Cannot Move to Lot Ready', `Missing requirements: ${canMove.missing.join(', ')}`);
    return;
  }
  
  // Mark as lot ready
  workflow['Lot Ready'].completed = true;
  workflow['Lot Ready'].date = new Date().toISOString();
  workflow['Lot Ready'].notes = 'Moved to lot ready - all requirements met';
  
  vehicle['Status'] = 'Lot Ready';
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
  showMessageModal('Success', `Vehicle ${stockNum} moved to Lot Ready!`);
}

// Update mechanical sub-step
function updateMechanicalSubStep(stockNum, subStepId) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const mechanicalStep = workflow['Mechanical'];
  
  if (!mechanicalStep.subSteps) {
    mechanicalStep.subSteps = {
      'email-sent': { completed: false },
      'in-service': { completed: false },
      'completed': { completed: false }
    };
  }
  
  // Toggle the sub-step
  const subStep = mechanicalStep.subSteps[subStepId];
  if (subStep) {
    subStep.completed = !subStep.completed;
    subStep.date = subStep.completed ? new Date().toISOString() : null;
    subStep.notes = subStep.completed ? `${subStepId} completed` : null;
    
    // Check if all mechanical sub-steps are complete
    const allSubStepsComplete = Object.values(mechanicalStep.subSteps).every(s => s.completed);
    if (allSubStepsComplete && !mechanicalStep.completed) {
      mechanicalStep.completed = true;
      mechanicalStep.date = new Date().toISOString();
      mechanicalStep.notes = 'All mechanical work completed';
      
      // Update vehicle status
      vehicle['Status'] = determineCurrentStatus(vehicle);
    } else if (!allSubStepsComplete && mechanicalStep.completed) {
      mechanicalStep.completed = false;
      mechanicalStep.date = null;
    }
    
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    renderAllTabs();
  }
}
