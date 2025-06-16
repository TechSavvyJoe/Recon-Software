// --- Vehicle Reconditioning Tracker App ---
// Enhanced version with horizontal timeline UI, CSV integration, and workflow management

// --- Global State ---
let currentVehicleData = [];
let detailerNames = [];
let activeVehicleId = null;
let statusToUpdateTo = null;
let stageBeingCompletedForForm = null;

const RECON_STATUSES = [
  'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready', 'Sold'
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
      { id: 'email-sent', label: 'Email Sent', description: 'Service request sent' },
      { id: 'in-service', label: 'In Service', description: 'Vehicle in service bay' },
      { id: 'completed', label: 'Completed', description: 'Service work finished' }
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
  if (modal) modal.style.display = 'none';
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
  
  // Admin button event listener
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.onclick = (e) => {
      e.preventDefault();
      console.log('Opening admin panel...');
      window.open('/admin', '_blank');
    };
  }
  
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
  
  // Activate selected tab and content
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = $(tabId + '-content');
  
  if (activeTab) {
    activeTab.classList.add('bg-sky-500', 'text-white');
    activeTab.classList.remove('bg-gray-200', 'text-gray-700');
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
    // Use the backend API to get current inventory info
    console.log('Loading inventory from backend...');
    const inventoryResponse = await fetch('/api/inventory/current');
    if (!inventoryResponse.ok) {
      throw new Error(`Failed to fetch inventory info: ${inventoryResponse.status}`);
    }
    
    const inventoryInfo = await inventoryResponse.json();
    console.log('Inventory info:', inventoryInfo);
    
    // Fetch the actual CSV file
    const csvResponse = await fetch(inventoryInfo.url);
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV file: ${csvResponse.status}`);
    }
    
    const csvText = await csvResponse.text();
    console.log('CSV loaded, length:', csvText.length);
    
    // Parse CSV data
    currentVehicleData = parseVehicleDataFromCSV(csvText);
    console.log('Parsed vehicles:', currentVehicleData.length);
    
    // Load detailers from backend
    await loadDetailersFromBackend();
    
    if (currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because no valid CSV data was found.');
    }
    
    autoSave();
    renderAllTabs();
  } catch (error) {
    console.error('Failed to load data from backend:', error);
    // Fallback to sample data
    currentVehicleData = getSampleData();
    detailerNames = ['John Smith', 'Mike Johnson', 'Sarah Davis'];
    showMessageModal('Notice', `Using sample data. Error: ${error.message}`);
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
    detailerNames = ['John Smith', 'Mike Johnson', 'Sarah Davis'];
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

function getSampleData() {
  return [
    {
      'Stock #': 'T250518A',
      'VIN': '1FMCU9G67LUC03251',
      'Year': 2020,
      'Make': 'Ford',
      'Model': 'Escape',
      'Color': 'White',
      'Status': 'Mechanical',
      'Detailer': 'John Smith',
      'Date In': '2025-05-19',
      'Notes': 'Test vehicle for workflow demo',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { completed: true, date: '2025-05-19', notes: 'Vehicle received' },
        'Mechanical': { completed: false, subSteps: { 'email-sent': {completed: true}, 'in-service': {completed: false}, 'completed': {completed: false} } },
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
      'Year': 2021,
      'Make': 'Honda',
      'Model': 'Civic',
      'Color': 'Blue',
      'Status': 'Detailing',
      'Detailer': 'Mike Johnson',
      'Date In': '2025-05-20',
      'Notes': 'Ready for detail work',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { completed: true, date: '2025-05-20', notes: 'Vehicle received' },
        'Mechanical': { completed: true, date: '2025-05-21', notes: 'Service completed' },
        'Detailing': { completed: false },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: true },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'T250520C',
      'VIN': '3GNAXUEV5LL123456',
      'Year': 2020,
      'Make': 'Chevrolet',
      'Model': 'Equinox',
      'Color': 'Black',
      'Status': 'Lot Ready',
      'Detailer': 'Sarah Davis',
      'Date In': '2025-05-15',
      'Notes': 'Ready for sale',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { completed: true, date: '2025-05-15', notes: 'Vehicle received' },
        'Mechanical': { completed: true, date: '2025-05-16', notes: 'Service completed' },
        'Detailing': { completed: true, date: '2025-05-17', notes: 'Detail completed' },
        'Photos': { completed: true, date: '2025-05-18', notes: 'Photos taken' },
        'Title': { completed: true, inHouse: true, date: '2025-05-18', notes: 'Title in-house' },
        'Lot Ready': { completed: true, date: '2025-05-19', notes: 'Moved to lot' },
        'Sold': { completed: false }
      }
    }
  ];
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
  
  let html = '<h2 class="text-2xl font-bold mb-4">Workflow Board</h2>';
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
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Date In</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Detailer</th>
          <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">`;
  
  currentVehicleData.forEach(v => {
    html += `<tr class="hover:bg-gray-50 cursor-pointer" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-2 py-2 font-medium text-gray-900">${v['Stock #']}</td>
      <td class="px-2 py-2">
        <div class="font-medium">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-gray-500">${v['Color'] || 'N/A'}</div>
      </td>
      <td class="px-2 py-2">
        <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </td>
      <td class="px-2 py-2 text-gray-900">${formatDate(v['Date In'])}</td>
      <td class="px-2 py-2 text-gray-900">${v['Detailer'] || 'Unassigned'}</td>
      <td class="px-2 py-2" onclick="event.stopPropagation()">
        <div class="flex space-x-1">
          <button onclick="window.showVehicleDetailModal('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600" title="View Details">
            <i class="fas fa-eye"></i>
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
  html += '</div>';
  
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

// --- HORIZONTAL TIMELINE MODAL ---

window.showVehicleDetailModal = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const modal = $('vehicle-timeline-modal');
  if (!modal) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const lotReadyStatus = canBeLotReady(vehicle);
  
  // Update modal header
  $('timeline-vehicle-title').innerHTML = `${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']} - Stock #${vehicle['Stock #']}`;
  $('timeline-vehicle-details').innerHTML = `
    <div class="grid grid-cols-4 gap-2 text-xs mb-4">
      <div><strong>VIN:</strong> ${vehicle['VIN'] || 'N/A'}</div>
      <div><strong>Color:</strong> ${vehicle['Color'] || 'N/A'}</div>
      <div><strong>Date In:</strong> ${formatDate(vehicle['Date In'])}</div>
      <div><strong>Detailer:</strong> ${vehicle['Detailer'] || 'Unassigned'}</div>
    </div>
  `;
  
  // Calculate progress
  const allSteps = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'];
  const completedSteps = allSteps.filter(step => workflow[step]?.completed).length;
  const progressPercent = (completedSteps / allSteps.length) * 100;
  
  // Update progress bar (horizontal)
  $('timeline-overall-progress').innerHTML = `
    <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
      <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
    </div>
    <div class="text-center text-sm text-gray-600">${Math.round(progressPercent)}% Complete (${completedSteps}/${allSteps.length} steps)</div>
  `;
  
  // Create horizontal timeline - each step is a large button
  let timelineHtml = `
    <div class="horizontal-timeline-container">
      <style>
        .timeline-steps-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-bottom: 20px;
        }
        .timeline-step-button {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .timeline-step-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .timeline-step-button.completed {
          background: #dcfce7;
          border-color: #22c55e;
        }
        .timeline-step-button.in-progress {
          background: #dbeafe;
          border-color: #3b82f6;
          animation: pulse 2s infinite;
        }
        .timeline-step-button.pending {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .step-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .step-name {
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 4px;
        }
        .step-status {
          font-size: 10px;
          color: #6b7280;
        }
        .step-date {
          font-size: 9px;
          color: #9ca3af;
          margin-top: 4px;
        }
        .step-checkbox {
          margin-top: 8px;
          font-size: 10px;
        }
        .step-substeps {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .substep-item {
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      </style>
      <div class="timeline-steps-grid">
  `;
  
  allSteps.forEach((stepName, index) => {
    const stepConfig = WORKFLOW_STEPS[stepName] || { icon: 'fas fa-circle', color: 'gray', description: stepName };
    const stepData = workflow[stepName];
    const isCompleted = stepData?.completed;
    const isInProgress = !isCompleted && stepName === vehicle['Status'];
    
    let buttonClass = 'timeline-step-button pending';
    let iconClass = 'text-gray-400';
    let statusText = 'Pending';
    
    if (isCompleted) {
      buttonClass = 'timeline-step-button completed';
      iconClass = 'text-green-500';
      statusText = 'Completed';
    } else if (isInProgress) {
      buttonClass = 'timeline-step-button in-progress';
      iconClass = 'text-blue-500';
      statusText = 'In Progress';
    }
    
    timelineHtml += `
      <div class="timeline-step-container">
        <button onclick="handleStepClick('${stockNum}', '${stepName}')" 
                class="${buttonClass}">
          <div class="step-icon">
            <i class="${stepConfig.icon} ${iconClass}"></i>
          </div>
          <div class="step-name">${stepName}</div>
          <div class="step-status">${statusText}</div>
          ${isCompleted && stepData?.date ? `<div class="step-date">${formatDate(stepData.date)}</div>` : ''}
          
          <!-- Special controls for each step -->
          ${stepName === 'Title' ? `
            <label class="step-checkbox" onclick="event.stopPropagation()">
              <input type="checkbox" ${stepData?.inHouse ? 'checked' : ''} 
                     onchange="window.toggleTitleInHouse('${stockNum}')"
                     class="mr-1">
              <span class="text-xs">In-House</span>
            </label>
          ` : ''}
          
          ${stepName === 'Mechanical' && stepData?.subSteps ? `
            <div class="step-substeps" onclick="event.stopPropagation()">
              ${Object.entries(stepData.subSteps).map(([subId, subData]) => `
                <label class="substep-item">
                  <input type="checkbox" ${subData?.completed ? 'checked' : ''} 
                         onchange="window.updateMechanicalSubStep('${stockNum}', '${subId}')"
                         class="mr-1">
                  <span class="text-xs">${subId.replace('-', ' ').toUpperCase()}</span>
                </label>
              `).join('')}
            </div>
          ` : ''}
        </button>
      </div>
    `;
  });
  
  timelineHtml += '</div>'; // Close timeline-steps-grid
  
  // Add notes section below timeline
  timelineHtml += `
    <div class="timeline-notes-section bg-gray-50 p-4 rounded-lg">
      <h4 class="text-lg font-semibold mb-2">Vehicle Notes</h4>
      <textarea id="vehicle-notes-${stockNum}" 
                class="w-full p-3 border rounded-md resize-none" 
                rows="3" 
                placeholder="Add notes about this vehicle...">${vehicle['Notes'] || ''}</textarea>
      <div class="flex justify-between items-center mt-3">
        <button onclick="window.updateVehicleNotes('${stockNum}')" 
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Save Notes
        </button>
        <div class="space-x-2">
          <button onclick="window.showStatusUpdateModal('${stockNum}')" 
                  class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
            Update Status
          </button>
          <button onclick="window.deleteVehicle('${stockNum}')" 
                  class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
            Delete Vehicle
          </button>
          ${lotReadyStatus.eligible ? `
            <button onclick="moveToLotReady('${stockNum}')" 
                    class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600">
              Move to Lot Ready
            </button>
          ` : `
            <div class="text-xs text-red-500">Missing: ${lotReadyStatus.missing.join(', ')}</div>
          `}
        </div>
      </div>
    </div>
  `;
  
  timelineHtml += '</div>'; // Close horizontal-timeline-container
  
  $('timeline-container').innerHTML = timelineHtml;
  modal.style.display = 'block';
};

// --- STEP INTERACTION HANDLERS ---

window.handleStepClick = function(stockNum, stepName) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  const stepData = workflow[stepName];
  const isCompleted = stepData?.completed;
  
  if (stepName === 'New Arrival') {
    showMessageModal('Info', 'New Arrival step is automatically completed when vehicle is added.');
    return;
  }
  
  // Toggle the step completion
  if (isCompleted) {
    // Mark as incomplete
    stepData.completed = false;
    stepData.date = null;
    stepData.notes = null;
    
    // If this is mechanical, reset substeps
    if (stepName === 'Mechanical' && stepData.subSteps) {
      Object.keys(stepData.subSteps).forEach(subId => {
        stepData.subSteps[subId].completed = false;
        stepData.subSteps[subId].date = null;
      });
    }
    
    showMessageModal('Updated', `${stepName} marked as incomplete for Stock #${stockNum}`);
  } else {
    // Mark as complete
    stepData.completed = true;
    stepData.date = new Date().toISOString();
    stepData.notes = `${stepName} completed`;
    
    // If this is mechanical, complete all substeps
    if (stepName === 'Mechanical' && stepData.subSteps) {
      Object.keys(stepData.subSteps).forEach(subId => {
        stepData.subSteps[subId].completed = true;
        stepData.subSteps[subId].date = new Date().toISOString();
      });
    }
    
    showMessageModal('Updated', `${stepName} completed for Stock #${stockNum}`);
  }
  
  // Update vehicle status based on highest completed step
  vehicle['Status'] = determineCurrentStatus(vehicle);
  vehicle['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
  
  // Refresh the modal
  window.showVehicleDetailModal(stockNum);
};

function determineCurrentStatus(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  
  // Check from highest to lowest
  if (workflow['Sold'] && workflow['Sold'].completed) return 'Sold';
  if (workflow['Lot Ready'] && workflow['Lot Ready'].completed) return 'Lot Ready';
  if (workflow['Title'] && workflow['Title'].completed) return 'Title';
  if (workflow['Photos'] && workflow['Photos'].completed) return 'Photos';
  if (workflow['Detailing'] && workflow['Detailing'].completed) return 'Detailing';
  if (workflow['Mechanical'] && workflow['Mechanical'].completed) return 'Mechanical';
  
  return 'New Arrival';
}

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
  window.showVehicleDetailModal(stockNum);
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
    
    // Check if all substeps are complete
    const allSubStepsComplete = Object.values(mechanicalStep.subSteps).every(s => s.completed);
    if (allSubStepsComplete && !mechanicalStep.completed) {
      mechanicalStep.completed = true;
      mechanicalStep.date = new Date().toISOString();
      mechanicalStep.notes = 'All mechanical work completed';
    } else if (!allSubStepsComplete && mechanicalStep.completed) {
      mechanicalStep.completed = false;
      mechanicalStep.date = null;
    }
    
    vehicle['Status'] = determineCurrentStatus(vehicle);
    vehicle['Last Updated'] = new Date().toISOString();
    
    autoSave();
    renderAllTabs();
    window.showVehicleDetailModal(stockNum);
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

window.showStatusUpdateModal = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const currentStatus = vehicle['Status'];
  
  const modalContent = `
    <div class="modal">
      <div class="modal-content">
        <span class="close-modal float-right text-2xl cursor-pointer" onclick="closeAllModals()">&times;</span>
        <h3 class="text-xl font-semibold mb-4">Update Status: ${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']} (${stockNum})</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Current Status: <span class="font-semibold">${currentStatus}</span></label>
            <select id="new-status-select" class="w-full px-3 py-2 border border-gray-300 rounded-md">
              ${RECON_STATUSES.map(status => 
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
            <button onclick="closeAllModals()" 
                    class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
            <button onclick="window.updateVehicleStatus('${stockNum}')" 
                    class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update Status</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalContent);
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
  closeAllModals();
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
      const csvText = e.target.result;
      const vehicles = parseVehicleDataFromCSV(csvText);
      
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
