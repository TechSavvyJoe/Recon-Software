// --- Vehicle Reconditioning Tracker App ---
// Enhanced version with timeline UI, data persistence, and workflow management

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
    'Title': 'bg-orange-100 text-orange-800',
    'Lot Ready': 'bg-green-100 text-green-800',
    'Sold': 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function formatDuration(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

// --- Main App Initialization ---
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
  
  // First try to load from localStorage
  const storedData = loadDataFromStorage();
  if (storedData && storedData.length > 0) {
    console.log('Loaded data from localStorage:', storedData.length, 'vehicles');
    currentVehicleData = storedData;
  } else {
    await loadInitialData();
  }
  
  console.log('Data loaded:', currentVehicleData.length, 'vehicles');
  
  // Initialize add vehicle form handler
  window.handleAddVehicle();
  
  // Start with dashboard tab
  switchTab('dashboard');
  console.log('App initialized successfully');
});

function switchTab(tabId) {
  // Deactivate all tabs and content
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Activate selected tab and content
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = $(tabId + '-content');
  
  if (activeTab) {
    activeTab.classList.add('active');
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

// --- Data Loading Functions ---
async function loadInitialData() {
  try {
    // Try to get current inventory from backend first
    const inventoryResponse = await fetch('/api/inventory/current');
    if (inventoryResponse.ok) {
      const inventoryInfo = await inventoryResponse.json();
      const csvResponse = await fetch(inventoryInfo.url);
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        currentVehicleData = parseVehicleDataFromCSV(csvText);
      }
    } else {
      // Fallback to local file
      let url = './Recon -Mission Ford of Dearborn-2025-06-10-0955.csv';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load inventory CSV');
      const csvText = await res.text();
      currentVehicleData = parseVehicleDataFromCSV(csvText);
    }
    
    if (currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because no valid CSV data was found.');
    }
    
    // Load detailers from backend
    await loadDetailersFromBackend();
    
    autoSave();
    renderAllTabs();
  } catch (e) {
    currentVehicleData = getSampleData();
    showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    autoSave();
    renderAllTabs();
  }
}

async function loadDetailersFromBackend() {
  try {
    const response = await fetch('/api/detailers');
    if (response.ok) {
      const detailers = await response.json();
      detailerNames = detailers.filter(d => d.active !== false).map(d => d.name);
    }
  } catch (error) {
    console.error('Failed to load detailers from backend:', error);
    // Keep existing detailer names if backend fails
  }
}

function parseVehicleDataFromCSV(csvText) {
  const vehicles = [];
  
  if (typeof window.Papa !== 'undefined') {
    const results = window.Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(header) {
        return header.replace(/["\r\n]/g, '').trim();
      }
    });
    
    results.data.forEach(row => {
      if (row['Stock #'] || row['Stock#']) {
        const vehicle = {
          'Stock #': row['Stock #'] || row['Stock#'] || '',
          'VIN': row['VIN'] || '',
          'Year': parseInt(row['Year']) || new Date().getFullYear(),
          'Make': row['Make'] || '',
          'Model': row['Model'] || '',
          'Body': row['Body'] || '',
          'Color': row['Color'] || '',
          'Status': 'New Arrival',
          'Detailer': '',
          'Date In': row['Inventory Date'] || row['Created'] || new Date().toISOString().split('T')[0],
          'Notes': row['Tags'] ? `Tags: ${row['Tags']}` : '',
          'Odometer': row['Odometer'] ? parseInt(row['Odometer'].replace(/[,\s]/g, '')) : 0,
          'Original Cost': row['Original Cost'] || '',
          'Unit Cost': row['Unit Cost'] || '',
          'Vehicle Source': row['Vehicle Source'] || '',
          'Photos': parseInt(row['Photos']) || 0,
          'Last Updated': new Date().toISOString()
        };
        
        if (!vehicle.workflow) {
          vehicle.workflow = getWorkflowStatus(vehicle);
        }
        
        vehicles.push(vehicle);
      }
    });
  }
  
  return vehicles;
}

// --- Workflow and Status Management ---
function getWorkflowStatus(vehicle) {
  if (!vehicle.workflow) {
    vehicle.workflow = {
      'New Arrival': { completed: true, date: vehicle['Date In'] ? new Date(vehicle['Date In']).toISOString() : new Date().toISOString(), notes: 'Vehicle received at lot' },
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
    };
  }
  return vehicle.workflow;
}

function determineCurrentStatus(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  
  if (workflow['Sold'].completed) return 'Sold';
  if (workflow['Lot Ready'].completed) return 'Lot Ready';
  if (workflow['Photos'].completed) return 'Photos';
  if (workflow['Detailing'].completed) return 'Detailing';
  if (workflow['Mechanical'].completed) return 'Mechanical';
  return 'New Arrival';
}

function canBeLotReady(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  const missing = [];
  
  if (!workflow['Mechanical'].completed) missing.push('Mechanical');
  if (!workflow['Detailing'].completed) missing.push('Detailing');
  if (!workflow['Photos'].completed) missing.push('Photos');
  if (!workflow['Title'].inHouse) missing.push('Title In-House');
  
  return {
    eligible: missing.length === 0,
    missing: missing
  };
}

// --- Rendering Functions ---
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
  
  const statusCounts = {};
  RECON_STATUSES.forEach(status => statusCounts[status] = 0);
  currentVehicleData.forEach(v => {
    if (statusCounts[v['Status']] !== undefined) {
      statusCounts[v['Status']]++;
    }
  });
  
  let html = '<h2 class="text-2xl font-bold mb-4">Dashboard Overview</h2>';
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">';
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorClass = getStatusColor(status);
    html += `<div class="p-4 rounded-lg ${colorClass}">
      <div class="text-lg font-bold">${count}</div>
      <div class="text-sm">${status}</div>
    </div>`;
  });
  
  html += '</div>';
  
  // Recent vehicles
  html += '<h3 class="text-xl font-bold mb-4">Recent Vehicles</h3>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
  
  currentVehicleData.slice(0, 6).forEach(v => {
    html += `<div class="bg-white rounded-lg p-4 shadow cursor-pointer hover:bg-gray-50" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <div class="font-bold">${v['Year']} ${v['Make']} ${v['Model']}</div>
      <div class="text-sm text-gray-600">Stock #: ${v['Stock #']}</div>
      <div class="text-sm"><span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span></div>
      <div class="text-xs text-gray-500 mt-1">In: ${formatDate(v['Date In'])}</div>
    </div>`;
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderWorkflow() {
  const el = $('workflow-content');
  if (!el) return;
  
  html = '<h2 class="text-2xl font-bold mb-4">Workflow Board</h2>';
  html += '<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    html += `<div class="bg-gray-100 rounded-lg p-4">
      <h3 class="font-bold mb-3 ${getStatusColor(status)} px-2 py-1 rounded text-center">${status} (${vehicles.length})</h3>
      <div class="space-y-2">`;
    
    vehicles.forEach(v => {
      html += `<div class="bg-white rounded p-3 shadow-sm cursor-pointer hover:bg-gray-50" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
        <div class="font-medium text-sm">${v['Year']} ${v['Make']}</div>
        <div class="text-xs text-gray-600">${v['Model']}</div>
        <div class="text-xs text-gray-500">Stock: ${v['Stock #']}</div>
      </div>`;
    });
    
    html += '</div></div>';
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  
  let html = `<div class="mb-4 flex justify-between items-center">
    <h2 class="text-xl font-bold">Inventory</h2>
    <div class="space-x-2">
      <button class="action-button action-button-primary" onclick="window.showAddVehicleModal()">Add Vehicle</button>
      <button class="action-button action-button-secondary" onclick="window.exportToCSV()">Export CSV</button>
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
    html += `<tr class="hover:bg-gray-50 cursor-pointer" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-2 py-2 font-medium text-gray-900">${v['Stock #']}</td>
      <td class="px-2 py-2">
        <div class="font-medium">${v['Year']} ${v['Make']}</div>
        <div class="text-gray-500">${v['Model']} - ${v['Color'] || 'N/A'}</div>
      </td>
      <td class="px-2 py-2">
        <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </td>
      <td class="px-2 py-2 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Mechanical'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Mechanical')"
               class="form-checkbox h-4 w-4 text-blue-600">
      </td>
      <td class="px-2 py-2 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Detailing'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Detailing')"
               class="form-checkbox h-4 w-4 text-purple-600">
      </td>
      <td class="px-2 py-2 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Photos'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Photos')"
               class="form-checkbox h-4 w-4 text-pink-600">
      </td>
      <td class="px-2 py-2 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Title'].inHouse ? 'checked' : ''} 
               onchange="window.toggleTitleInHouse('${v['Stock #']}')"
               class="form-checkbox h-4 w-4 text-orange-600"
               title="Title In House">
      </td>
      <td class="px-2 py-2 text-gray-900">${v['Detailer'] || 'Unassigned'}</td>
      <td class="px-2 py-2 text-gray-900">${formatDate(v['Date In'])}</td>
      <td class="px-2 py-2" onclick="event.stopPropagation()">
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

function renderReports() {
  const el = $('reports-content');
  if (!el) return;
  
  // Calculate metrics
  const totalVehicles = currentVehicleData.length;
  const soldVehicles = currentVehicleData.filter(v => v['Status'] === 'Sold').length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  const avgDaysInProcess = totalVehicles > 0 ? 
    currentVehicleData.reduce((sum, v) => {
      const dateIn = new Date(v['Date In']);
      const now = new Date();
      return sum + ((now - dateIn) / (1000 * 60 * 60 * 24));
    }, 0) / totalVehicles : 0;
  
  let html = '<h2 class="text-2xl font-bold mb-4">Reports & Analytics</h2>';
  html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';
  html += `<div class="bg-blue-100 p-4 rounded-lg">
    <div class="text-2xl font-bold text-blue-800">${totalVehicles}</div>
    <div class="text-blue-600">Total Vehicles</div>
  </div>`;
  html += `<div class="bg-green-100 p-4 rounded-lg">
    <div class="text-2xl font-bold text-green-800">${soldVehicles}</div>
    <div class="text-green-600">Sold</div>
  </div>`;
  html += `<div class="bg-yellow-100 p-4 rounded-lg">
    <div class="text-2xl font-bold text-yellow-800">${lotReadyVehicles}</div>
    <div class="text-yellow-600">Lot Ready</div>
  </div>`;
  html += `<div class="bg-purple-100 p-4 rounded-lg">
    <div class="text-2xl font-bold text-purple-800">${Math.round(avgDaysInProcess)}</div>
    <div class="text-purple-600">Avg Days in Process</div>
  </div>`;
  html += '</div>';
  
  // Status breakdown table
  html += '<h3 class="text-xl font-bold mb-2">Status Breakdown</h3>';
  html += '<div class="overflow-x-auto"><table class="min-w-full bg-white border">';
  html += '<thead><tr><th class="border px-4 py-2">Status</th><th class="border px-4 py-2">Count</th><th class="border px-4 py-2">Percentage</th></tr></thead><tbody>';
  
  RECON_STATUSES.forEach(status => {
    const count = currentVehicleData.filter(v => v['Status'] === status).length;
    const percentage = totalVehicles > 0 ? ((count / totalVehicles) * 100).toFixed(1) : 0;
    html += `<tr><td class="border px-4 py-2">${status}</td><td class="border px-4 py-2">${count}</td><td class="border px-4 py-2">${percentage}%</td></tr>`;
  });
  
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function renderUpload() {
  const el = $('upload-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-4">Data Import/Export</h2>';
  html += '<div class="space-y-6">';
  html += '<div class="bg-white p-6 rounded-lg shadow">';
  html += '<h3 class="text-lg font-semibold mb-4">Import CSV File</h3>';
  html += '<input type="file" id="csv-upload" accept=".csv" class="mb-4">';
  html += '<button onclick="window.handleCsvUpload()" class="action-button action-button-primary">Import CSV</button>';
  html += '</div>';
  html += '<div class="bg-white p-6 rounded-lg shadow">';
  html += '<h3 class="text-lg font-semibold mb-4">Export Data</h3>';
  html += '<button onclick="window.exportToCSV()" class="action-button action-button-secondary mr-2">Export to CSV</button>';
  html += '<button onclick="window.clearAllData()" class="action-button bg-red-500 hover:bg-red-600 text-white">Clear All Data</button>';
  html += '</div></div>';
  
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) return;
  
  // Get unique detailers from current data
  const detailers = [...new Set(currentVehicleData.map(v => v['Detailer']).filter(d => d))];
  
  let html = '<h2 class="text-2xl font-bold mb-4">Detailer Management</h2>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
  
  detailers.forEach(detailer => {
    const assignedVehicles = currentVehicleData.filter(v => v['Detailer'] === detailer);
    const completedCount = assignedVehicles.filter(v => getWorkflowStatus(v)['Detailing'].completed).length;
    
    html += `<div class="bg-white p-4 rounded-lg shadow">
      <h3 class="font-bold text-lg">${detailer}</h3>
      <div class="text-sm text-gray-600">
        <div>Assigned: ${assignedVehicles.length} vehicles</div>
        <div>Completed: ${completedCount} details</div>
        <div>In Progress: ${assignedVehicles.length - completedCount}</div>
      </div>
      <div class="mt-2">
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: ${assignedVehicles.length > 0 ? (completedCount / assignedVehicles.length) * 100 : 0}%"></div>
        </div>
      </div>
    </div>`;
  });
  
  html += '</div>';
  el.innerHTML = html;
}

// --- Window-Scoped Functions for Modal and Interaction Handlers ---

window.showVehicleDetailModal = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const modal = $('vehicle-timeline-modal');
  if (!modal) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const lotReadyStatus = canBeLotReady(vehicle);
  
  // Update modal header
  $('timeline-vehicle-title').innerHTML = `${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']}`;
  $('timeline-vehicle-details').innerHTML = `
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div><strong>Stock #:</strong> ${vehicle['Stock #']}</div>
      <div><strong>VIN:</strong> ${vehicle['VIN'] || 'N/A'}</div>
      <div><strong>Color:</strong> ${vehicle['Color'] || 'N/A'}</div>
      <div><strong>Date In:</strong> ${formatDate(vehicle['Date In'])}</div>
      <div><strong>Status:</strong> <span class="px-2 py-1 rounded text-xs ${getStatusColor(vehicle['Status'])}">${vehicle['Status']}</span></div>
      <div><strong>Detailer:</strong> ${vehicle['Detailer'] || 'Unassigned'}</div>
    </div>
  `;
  
  // Update progress circle
  const completedSteps = Object.values(workflow).filter(step => step.completed).length;
  const totalSteps = Object.keys(workflow).length;
  const progressPercent = (completedSteps / totalSteps) * 100;
  
  $('timeline-overall-progress').innerHTML = `
    <svg class="timeline-progress-svg" viewBox="0 0 36 36">
      <path class="timeline-progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <path class="timeline-progress-bar" stroke-dasharray="${progressPercent}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <text x="18" y="20.35" class="timeline-progress-text">${Math.round(progressPercent)}%</text>
    </svg>
  `;
  
  // Update lot ready requirements
  $('timeline-requirements-list').innerHTML = `
    <div class="space-y-2">
      ${lotReadyStatus.missing.map(req => `
        <div class="flex items-center space-x-2">
          <i class="fas fa-times text-red-500"></i>
          <span class="text-red-600">${req}</span>
        </div>
      `).join('')}
      ${lotReadyStatus.eligible ? '<div class="flex items-center space-x-2"><i class="fas fa-check text-green-500"></i><span class="text-green-600">All requirements met!</span></div>' : ''}
    </div>
  `;
  
  // Generate timeline
  let timelineHtml = '';
  Object.entries(WORKFLOW_STEPS).forEach(([stepName, stepConfig]) => {
    const stepData = workflow[stepName];
    const isCompleted = stepData?.completed;
    const isInProgress = !isCompleted && stepName === vehicle['Status'];
    const isPending = !isCompleted && !isInProgress;
    
    let stepClass = 'pending';
    if (isCompleted) stepClass = 'completed';
    else if (isInProgress) stepClass = 'in-progress';
    
    timelineHtml += `
      <div class="timeline-item ${stepClass}">
        <div class="timeline-icon ${stepClass}">
          <i class="${stepConfig.icon}"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h4 class="timeline-step-title">${stepName}</h4>
            <div class="timeline-actions">
              ${!isCompleted && stepName !== 'New Arrival' ? `
                <button onclick="completeWorkflowStep('${stockNum}', '${stepName}')" 
                        class="timeline-action-btn timeline-complete-btn">
                  <i class="fas fa-check"></i> Complete
                </button>
              ` : ''}
              ${stepName === 'Title' ? `
                <label class="timeline-checkbox-label">
                  <input type="checkbox" ${stepData?.inHouse ? 'checked' : ''} 
                         onchange="window.toggleTitleInHouse('${stockNum}')"
                         class="timeline-checkbox">
                  In-House
                </label>
              ` : ''}
            </div>
          </div>
          <p class="timeline-step-description">${stepConfig.description}</p>
          
          ${stepName === 'Mechanical' && stepConfig.subSteps ? `
            <div class="timeline-substeps">
              <h5 class="timeline-substeps-title">Mechanical Process:</h5>
              <div class="timeline-substeps-list">
                ${stepConfig.subSteps.map(subStep => {
                  const subStepData = stepData?.subSteps?.[subStep.id];
                  const subCompleted = subStepData?.completed || false;
                  return `
                    <div class="timeline-substep ${subCompleted ? 'completed' : 'pending'}">
                      <button onclick="updateMechanicalSubStep('${stockNum}', '${subStep.id}')" 
                              class="timeline-substep-btn">
                        <i class="fas ${subCompleted ? 'fa-check-circle' : 'fa-circle'} ${subCompleted ? 'text-green-500' : 'text-gray-400'}"></i>
                        ${subStep.label}
                      </button>
                      <p class="timeline-substep-desc">${subStep.description}</p>
                      ${subCompleted && subStepData?.date ? `<div class="timeline-substep-date">Completed: ${formatDate(subStepData.date)}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
          
          ${isCompleted && stepData?.date ? `<div class="timeline-date">Completed: ${formatDate(stepData.date)}</div>` : ''}
          ${stepData?.notes ? `<div class="timeline-notes">${stepData.notes}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  $('timeline-container').innerHTML = '<div class="timeline-line"></div>' + timelineHtml;
  
  // Show notes section
  const notesHtml = `
    <div class="timeline-notes-section">
      <h4>Notes</h4>
      <textarea id="vehicle-notes-${stockNum}" 
                class="w-full p-3 border rounded-md resize-none" 
                rows="3" 
                placeholder="Add notes about this vehicle...">${vehicle['Notes'] || ''}</textarea>
      <button onclick="window.updateVehicleNotes('${stockNum}')" 
              class="mt-2 px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600">
        Save Notes
      </button>
    </div>
    <div class="timeline-actions-section">
      <button class="action-button action-button-primary" onclick="window.showStatusUpdateModal('${stockNum}')">
        Update Status
      </button>
      <button class="action-button action-button-secondary" onclick="window.deleteVehicle('${stockNum}')">
        Delete Vehicle
      </button>
      ${lotReadyStatus.eligible ? `
        <button onclick="moveToLotReady('${stockNum}')" class="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          Move to Lot Ready
        </button>
      ` : ''}
    </div>
  `;
  
  $('timeline-container').innerHTML += notesHtml;
  
  modal.style.display = 'block';
};

window.toggleWorkflowStep = function(stockNum, step) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const workflow = getWorkflowStatus(v);
  const isCompleted = workflow[step].completed;
  
  if (isCompleted) {
    workflow[step].completed = false;
    workflow[step].date = null;
    workflow[step].notes = null;
  } else {
    workflow[step].completed = true;
    workflow[step].date = new Date().toISOString();
    workflow[step].notes = `${step} completed via quick action`;
  }
  
  v['Status'] = determineCurrentStatus(v);
  v['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
};

window.toggleTitleInHouse = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow['Title'].inHouse = !workflow['Title'].inHouse;
  
  if (workflow['Title'].inHouse && !workflow['Title'].completed) {
    workflow['Title'].completed = true;
    workflow['Title'].date = new Date().toISOString();
    workflow['Title'].notes = 'Title received in-house';
  }
  
  vehicle['Status'] = determineCurrentStatus(vehicle);
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
};

window.updateMechanicalSubStep = function(stockNum, subStepId) {
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
  
  const subStep = mechanicalStep.subSteps[subStepId];
  if (subStep) {
    subStep.completed = !subStep.completed;
    subStep.date = subStep.completed ? new Date().toISOString() : null;
    subStep.notes = subStep.completed ? `${subStepId} completed` : null;
    
    const allSubStepsComplete = Object.values(mechanicalStep.subSteps).every(s => s.completed);
    if (allSubStepsComplete && !mechanicalStep.completed) {
      mechanicalStep.completed = true;
      mechanicalStep.date = new Date().toISOString();
      mechanicalStep.notes = 'All mechanical work completed';
      
      vehicle['Status'] = determineCurrentStatus(vehicle);
    } else if (!allSubStepsComplete && mechanicalStep.completed) {
      mechanicalStep.completed = false;
      mechanicalStep.date = null;
    }
    
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    renderAllTabs();
    
    // Refresh the modal if it's open
    if ($('vehicle-timeline-modal').style.display === 'block') {
      window.showVehicleDetailModal(stockNum);
    }
  }
};

window.updateVehicleNotes = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const notesTextarea = $(`vehicle-notes-${stockNum}`);
  if (notesTextarea) {
    v['Notes'] = notesTextarea.value;
    v['Last Updated'] = new Date().toISOString();
    autoSave();
    showMessageModal('Success', 'Notes updated successfully!');
  }
};

function completeWorkflowStep(stockNum, step) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow[step].completed = true;
  workflow[step].date = new Date().toISOString();
  workflow[step].notes = `${step} completed`;
  
  vehicle['Status'] = determineCurrentStatus(vehicle);
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
  
  // Refresh the modal if it's open
  if ($('vehicle-timeline-modal').style.display === 'block') {
    window.showVehicleDetailModal(stockNum);
  }
}

function moveToLotReady(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const canMove = canBeLotReady(vehicle);
  
  if (!canMove.eligible) {
    showMessageModal('Cannot Move to Lot Ready', `Missing requirements: ${canMove.missing.join(', ')}`);
    return;
  }
  
  workflow['Lot Ready'].completed = true;
  workflow['Lot Ready'].date = new Date().toISOString();
  workflow['Lot Ready'].notes = 'Moved to lot ready - all requirements met';
  
  vehicle['Status'] = 'Lot Ready';
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
  closeAllModals();
  showMessageModal('Success', `Vehicle ${stockNum} moved to Lot Ready!`);
}

// --- Vehicle Management Functions ---

window.showAddVehicleModal = function() {
  const modal = $('add-vehicle-modal');
  if (modal) {
    modal.style.display = 'block';
    const form = $('add-vehicle-form');
    if (form) form.reset();
  }
};

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
    
    if (!stockNumber || !year || !make || !model) {
      showMessageModal('Error', 'Please fill in all required fields (Stock #, Year, Make, Model).');
      return;
    }
    
    if (currentVehicleData.find(v => v['Stock #'] === stockNumber)) {
      showMessageModal('Error', `A vehicle with stock number "${stockNumber}" already exists.`);
      return;
    }
    
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
    
    currentVehicleData.push(newVehicle);
    autoSave();
    renderAllTabs();
    closeModal('add-vehicle-modal');
    showMessageModal('Success', `Vehicle ${stockNumber} added successfully!`);
  });
};

window.showStatusUpdateModal = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const modal = $('status-update-modal');
  const content = $('status-update-content');
  if (!modal || !content) return;
  
  const currentStatus = vehicle['Status'];
  
  content.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">Update Status: ${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']} (${stockNum})</h3>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Current Status: <span class="font-semibold">${currentStatus}</span></label>
        <select id="new-status-select" class="w-full px-3 py-2 border border-gray-300 rounded-md">
          ${Object.keys(WORKFLOW_STEPS).map(status => 
            `<option value="${status}" ${status === currentStatus ? 'selected' : ''}>${status}</option>`
          ).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea id="status-notes" rows="3" 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Add notes about this status change..."></textarea>
      </div>
      <div class="flex justify-end space-x-3">
        <button onclick="closeModal('status-update-modal')" 
                class="action-button action-button-secondary">Cancel</button>
        <button onclick="window.updateVehicleStatus('${stockNum}')" 
                class="action-button action-button-primary">Update Status</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
};

window.updateVehicleStatus = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const newStatus = $('new-status-select').value;
  const notes = $('status-notes').value.trim();
  
  vehicle['Status'] = newStatus;
  vehicle['Last Updated'] = new Date().toISOString();
  
  const workflow = getWorkflowStatus(vehicle);
  if (workflow[newStatus]) {
    workflow[newStatus].completed = true;
    workflow[newStatus].date = new Date().toISOString();
    if (notes) {
      workflow[newStatus].notes = notes;
    }
  }
  
  autoSave();
  renderAllTabs();
  closeModal('status-update-modal');
  showMessageModal('Success', `Status updated to "${newStatus}" for vehicle ${stockNum}`);
};

window.exportToCSV = function() {
  if (currentVehicleData.length === 0) {
    showMessageModal('Error', 'No data to export.');
    return;
  }
  
  const headers = ['Stock #', 'Year', 'Make', 'Model', 'Color', 'Status', 'Date In', 'Detailer', 'Notes'];
  const csvContent = [
    headers.join(','),
    ...currentVehicleData.map(vehicle => 
      headers.map(header => {
        const value = vehicle[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showMessageModal('Success', 'Inventory exported to CSV successfully!');
};

window.deleteVehicle = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const confirmed = confirm(`Are you sure you want to delete vehicle ${stockNum} (${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']})?`);
  if (!confirmed) return;
  
  const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
  if (index > -1) {
    currentVehicleData.splice(index, 1);
    autoSave();
    renderAllTabs();
    closeAllModals();
    showMessageModal('Success', `Vehicle ${stockNum} deleted successfully.`);
  }
};

window.handleCsvUpload = function() {
  const fileInput = $('csv-upload');
  const file = fileInput.files[0];
  if (!file) {
    showMessageModal('Error', 'Please select a CSV file to upload.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const vehicles = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const vehicle = {};
          headers.forEach((header, index) => {
            vehicle[header] = values[index] || '';
          });
          
          // Ensure required fields
          if (vehicle['Stock #']) {
            vehicle['Status'] = vehicle['Status'] || 'New Arrival';
            vehicle['Date In'] = vehicle['Date In'] || new Date().toISOString().split('T')[0];
            vehicle['Last Updated'] = new Date().toISOString();
            vehicle.workflow = getWorkflowStatus(vehicle);
            vehicles.push(vehicle);
          }
        }
      }
      
      if (vehicles.length > 0) {
        currentVehicleData = vehicles;
        autoSave();
        renderAllTabs();
        showMessageModal('Success', `Imported ${vehicles.length} vehicles from CSV.`);
      } else {
        showMessageModal('Error', 'No valid vehicle data found in CSV file.');
      }
    } catch (error) {
      showMessageModal('Error', 'Failed to parse CSV file: ' + error.message);
    }
  };
  reader.readAsText(file);
};

window.clearAllData = function() {
  const confirmed = confirm('Are you sure you want to clear ALL vehicle data? This cannot be undone.');
  if (!confirmed) return;
  
  currentVehicleData = [];
  autoSave();
  renderAllTabs();
  showMessageModal('Success', 'All vehicle data has been cleared.');
};

// --- Data Persistence Functions ---

function saveDataToStorage() {
  try {
    localStorage.setItem('vehicleReconData', JSON.stringify(currentVehicleData));
    localStorage.setItem('vehicleReconTimestamp', new Date().toISOString());
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

function loadDataFromStorage() {
  try {
    const stored = localStorage.getItem('vehicleReconData');
    if (stored) {
      const data = JSON.parse(stored);
      // Ensure all vehicles have proper workflow structure
      return data.map(vehicle => {
        if (!vehicle.workflow) {
          vehicle.workflow = getWorkflowStatus(vehicle);
        }
        return vehicle;
      });
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }
  return null;
}

function autoSave() {
  saveDataToStorage();
}
