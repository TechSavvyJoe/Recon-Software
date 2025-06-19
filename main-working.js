// Minimal Working Vehicle Reconditioning Tracker
// This is a simplified version to get the basic functionality working

// Global State
let currentVehicleData = [];
let currentSortField = 'Stock #';
let currentSortDirection = 'asc';

const RECON_STATUSES = [
  'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'
];

// Utility Functions
function $(id) { return document.getElementById(id); }

function showMessageModal(title, text) {
  alert(`${title}: ${text}`);
}

function getStatusColor(status) {
  const colors = {
    'New Arrival': 'bg-blue-100 text-blue-800',
    'Mechanical': 'bg-yellow-100 text-yellow-800',
    'Detailing': 'bg-purple-100 text-purple-800',
    'Photos': 'bg-pink-100 text-pink-800',
    'Title': 'bg-orange-100 text-orange-800',
    'Lot Ready': 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

// Get condition rating display
function getConditionRating(rating) {
  const stars = '★'.repeat(rating || 3) + '☆'.repeat(5 - (rating || 3));
  return `<span class="text-yellow-500">${stars}</span>`;
}

// Data Management
function loadDataFromStorage() {
  try {
    const saved = localStorage.getItem('vehicleReconData');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  return [];
}

function saveDataToStorage(data) {
  try {
    localStorage.setItem('vehicleReconData', JSON.stringify(data));
    console.log('✅ Saved to localStorage');
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);
  }
}

function autoSave() {
  saveDataToStorage(currentVehicleData);
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
      'Date In': '2024-12-15',
      'ExteriorCondition': 4,
      'InteriorCondition': 3,
      'Notes': 'Test vehicle for workflow demo',
      'Last Updated': new Date().toISOString()
    },
    {
      'Stock #': 'T250519B',
      'VIN': '1HGBH41JXMN109186',
      'Year': 2021,
      'Make': 'Honda',
      'Model': 'Civic',
      'Color': 'Blue',
      'Status': 'Detailing',
      'Date In': '2024-12-16',
      'ExteriorCondition': 5,
      'InteriorCondition': 4,
      'Notes': 'Ready for detail work',
      'Last Updated': new Date().toISOString()
    },
    {
      'Stock #': 'T250520C',
      'VIN': '3GNAXUEV5LL123456',
      'Year': 2020,
      'Make': 'Chevrolet',
      'Model': 'Equinox',
      'Color': 'Black',
      'Status': 'Lot Ready',
      'Date In': '2024-12-10',
      'ExteriorCondition': 3,
      'InteriorCondition': 3,
      'Notes': 'Ready for sale',
      'Last Updated': new Date().toISOString()
    }
  ];
}

// Workflow Management
function getWorkflowStatus(vehicle) {
  if (!vehicle.workflow) {
    vehicle.workflow = {
      'New Arrival': { completed: true, date: vehicle['Date In'] },
      'Mechanical': { completed: vehicle['Status'] !== 'New Arrival' },
      'Detailing': { completed: ['Detailing', 'Photos', 'Title', 'Lot Ready'].includes(vehicle['Status']) },
      'Photos': { completed: ['Photos', 'Title', 'Lot Ready'].includes(vehicle['Status']) },
      'Title': { completed: ['Title', 'Lot Ready'].includes(vehicle['Status']), inHouse: true },
      'Lot Ready': { completed: vehicle['Status'] === 'Lot Ready' }
    };
  }
  return vehicle.workflow;
}

// Rendering Functions
function renderDashboard() {
  const el = $('dashboard-content');
  if (!el) return;
  
  // Count vehicles by status
  const statusCounts = {};
  RECON_STATUSES.forEach(status => statusCounts[status] = 0);
  currentVehicleData.forEach(v => {
    if (statusCounts[v['Status']] !== undefined) {
      statusCounts[v['Status']]++;
    }
  });
  
  let html = '<h2 class="text-2xl font-bold mb-4">Dashboard Overview</h2>';
  
  // Status cards
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">';
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorClass = getStatusColor(status);
    html += `<div class="p-4 rounded-lg text-center ${colorClass}">
      <div class="text-2xl font-bold">${count}</div>
      <div class="text-sm">${status}</div>
    </div>`;
  });
  html += '</div>';
  
  // Recent vehicles
  html += '<h3 class="text-xl font-bold mb-4">Recent Vehicles</h3>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';
  
  currentVehicleData.slice(0, 6).forEach(v => {
    html += `<div class="p-4 border rounded-lg bg-white cursor-pointer hover:shadow-lg" onclick="showVehicleDetailModal('${v['Stock #']}')">
      <div class="font-bold text-lg">${v['Year']} ${v['Make']} ${v['Model']}</div>
      <div class="text-sm text-gray-600">Stock #: ${v['Stock #']}</div>
      <div class="text-sm text-gray-600">Color: ${v['Color'] || 'N/A'}</div>
      <div class="mt-2">
        <div class="text-xs">Exterior: ${getConditionRating(v.ExteriorCondition)}</div>
        <div class="text-xs">Interior: ${getConditionRating(v.InteriorCondition)}</div>
      </div>
      <div class="mt-2">
        <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </div>
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
    
    html += `<div class="border-2 rounded-lg bg-white min-h-[400px]">
      <div class="p-3 text-center bg-gray-50 rounded-t-lg">
        <h3 class="font-bold">${status}</h3>
        <div class="text-sm">(${vehicles.length} vehicles)</div>
      </div>
      <div class="p-3">`;
    
    if (vehicles.length === 0) {
      html += `<div class="text-center text-gray-500 p-4">No vehicles</div>`;
    } else {
      vehicles.forEach(v => {
        html += `<div class="p-3 mb-2 border rounded bg-gray-50 cursor-pointer hover:bg-gray-100" onclick="showVehicleDetailModal('${v['Stock #']}')">
          <div class="font-bold text-sm">${v['Year']} ${v['Make']}</div>
          <div class="text-xs">${v['Model']}</div>
          <div class="text-xs">Stock: ${v['Stock #']}</div>
          <div class="text-xs">In: ${formatDate(v['Date In'])}</div>
        </div>`;
      });
    }
    
    html += '</div></div>';
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  
  let html = `<div class="mb-6 flex justify-between items-center">
    <h2 class="text-2xl font-bold">Inventory Management</h2>
    <div class="space-x-2">
      <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="showAddVehicleModal()">
        Add Vehicle
      </button>
      <button class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" onclick="exportToCSV()">
        Export CSV
      </button>
    </div>
  </div>`;
  
  html += `<div class="overflow-x-auto">
    <table class="min-w-full bg-white border">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left border">Stock #</th>
          <th class="px-4 py-2 text-left border">Vehicle</th>
          <th class="px-4 py-2 text-left border">Status</th>
          <th class="px-4 py-2 text-left border">Condition</th>
          <th class="px-4 py-2 text-left border">Date In</th>
          <th class="px-4 py-2 text-center border">Actions</th>
        </tr>
      </thead>
      <tbody>`;
  
  currentVehicleData.forEach(v => {
    html += `<tr class="hover:bg-gray-50 cursor-pointer" onclick="showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-4 py-2 border font-bold">${v['Stock #']}</td>
      <td class="px-4 py-2 border">
        <div class="font-bold">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-xs text-gray-600">${v['Color'] || 'N/A'}</div>
      </td>
      <td class="px-4 py-2 border">
        <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </td>
      <td class="px-4 py-2 border text-xs">
        <div>Ext: ${getConditionRating(v.ExteriorCondition)}</div>
        <div>Int: ${getConditionRating(v.InteriorCondition)}</div>
      </td>
      <td class="px-4 py-2 border text-sm">${formatDate(v['Date In'])}</td>
      <td class="px-4 py-2 border text-center" onclick="event.stopPropagation()">
        <button onclick="showConditionModal('${v['Stock #']}')" class="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 mr-1">
          Edit
        </button>
        <button onclick="deleteVehicle('${v['Stock #']}')" class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600">
          Delete
        </button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table></div>';
  el.innerHTML = html;
}

function renderReports() {
  const el = $('reports-content');
  if (!el) return;
  
  const totalVehicles = currentVehicleData.length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Calculate average condition
  const avgExterior = currentVehicleData.reduce((sum, v) => sum + (v.ExteriorCondition || 3), 0) / totalVehicles;
  const avgInterior = currentVehicleData.reduce((sum, v) => sum + (v.InteriorCondition || 3), 0) / totalVehicles;
  const avgCondition = ((avgExterior + avgInterior) / 2).toFixed(1);
  
  let html = '<h2 class="text-2xl font-bold mb-6">Reports & Analytics</h2>';
  
  // Key metrics
  html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">';
  html += `<div class="p-6 bg-white rounded-lg shadow text-center">
    <div class="text-3xl font-bold text-blue-600">${totalVehicles}</div>
    <div class="text-sm text-gray-700">Total Vehicles</div>
  </div>`;
  html += `<div class="p-6 bg-white rounded-lg shadow text-center">
    <div class="text-3xl font-bold text-green-600">${lotReadyVehicles}</div>
    <div class="text-sm text-gray-700">Lot Ready</div>
  </div>`;
  html += `<div class="p-6 bg-white rounded-lg shadow text-center">
    <div class="text-3xl font-bold text-orange-600">${avgCondition}</div>
    <div class="text-sm text-gray-700">Avg Condition</div>
  </div>`;
  html += `<div class="p-6 bg-white rounded-lg shadow text-center">
    <div class="text-3xl font-bold text-purple-600">${Math.round((lotReadyVehicles / totalVehicles) * 100)}%</div>
    <div class="text-sm text-gray-700">Completion Rate</div>
  </div>`;
  html += '</div>';
  
  // Status breakdown
  html += '<div class="bg-white p-6 rounded-lg shadow">';
  html += '<h3 class="text-xl font-bold mb-4">Status Breakdown</h3>';
  html += '<div class="overflow-x-auto">';
  html += '<table class="min-w-full border">';
  html += '<thead><tr><th class="border px-4 py-2">Status</th><th class="border px-4 py-2">Count</th><th class="border px-4 py-2">Percentage</th></tr></thead><tbody>';
  
  RECON_STATUSES.forEach(status => {
    const count = currentVehicleData.filter(v => v['Status'] === status).length;
    const percentage = totalVehicles > 0 ? ((count / totalVehicles) * 100).toFixed(1) : 0;
    html += `<tr><td class="border px-4 py-2">${status}</td><td class="border px-4 py-2">${count}</td><td class="border px-4 py-2">${percentage}%</td></tr>`;
  });
  
  html += '</tbody></table></div></div>';
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
  html += '<button onclick="handleCsvUpload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Import CSV</button>';
  html += '</div>';
  html += '<div class="bg-white p-6 rounded-lg shadow">';
  html += '<h3 class="text-lg font-semibold mb-4">Export Data</h3>';
  html += '<button onclick="exportToCSV()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mr-2">Export to CSV</button>';
  html += '<button onclick="clearAllData()" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Clear All Data</button>';
  html += '</div></div>';
  
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-4">Condition Rating System</h2>';
  html += '<div class="bg-white p-6 rounded-lg shadow">';
  html += '<p class="mb-4">This system uses a 1-5 star rating for both exterior and interior condition instead of detailer assignments.</p>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';
  
  // Condition distribution
  const conditionCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  currentVehicleData.forEach(v => {
    const avgCondition = Math.round((v.ExteriorCondition + v.InteriorCondition) / 2);
    conditionCounts[avgCondition]++;
  });
  
  html += '<div class="border rounded-lg p-4">';
  html += '<h3 class="text-lg font-medium mb-4">Condition Distribution</h3>';
  Object.entries(conditionCounts).forEach(([rating, count]) => {
    html += `<div class="flex justify-between items-center py-2 border-b">
      <span>${getConditionRating(parseInt(rating))}</span>
      <span class="font-bold">${count} vehicles</span>
    </div>`;
  });
  html += '</div>';
  
  html += '<div class="border rounded-lg p-4">';
  html += '<h3 class="text-lg font-medium mb-4">Rating Guide</h3>';
  html += '<div class="space-y-2 text-sm">';
  html += '<div><strong>5 Stars:</strong> Excellent condition</div>';
  html += '<div><strong>4 Stars:</strong> Good condition</div>';
  html += '<div><strong>3 Stars:</strong> Average condition</div>';
  html += '<div><strong>2 Stars:</strong> Fair condition</div>';
  html += '<div><strong>1 Star:</strong> Poor condition</div>';
  html += '</div></div>';
  
  html += '</div></div>';
  el.innerHTML = html;
}

function renderAllTabs() {
  renderDashboard();
  renderWorkflow();
  renderInventory();
  renderReports();
  renderUpload();
  renderDetailers();
}

// Tab Management
function switchTab(tabId) {
  // Deactivate all tabs
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Activate selected tab
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = $(tabId + '-content');
  
  if (activeTab) activeTab.classList.add('active');
  if (activeContent) activeContent.classList.add('active');
  
  // Render content
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'workflow') renderWorkflow();
  if (tabId === 'inventory') renderInventory();
  if (tabId === 'reports') renderReports();
  if (tabId === 'upload') renderUpload();
  if (tabId === 'detailers') renderDetailers();
}

// Modal Functions
function showVehicleDetailModal(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) {
    alert('Vehicle not found');
    return;
  }
  
  let modal = $('vehicle-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'vehicle-detail-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display:none; position:fixed; z-index:100; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7);';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background-color:#fefefe; margin:5% auto; padding:2rem; border:none; width:90%; max-width:700px; border-radius:1rem;">
      <span onclick="closeModal()" style="float:right; font-size:24px; cursor:pointer;">&times;</span>
      <h2 style="font-size:24px; font-weight:bold; margin-bottom:16px;">${v['Year']} ${v['Make']} ${v['Model']} - ${stockNum}</h2>
      
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:24px;">
        <div><strong>VIN:</strong> ${v['VIN'] || 'N/A'}</div>
        <div><strong>Color:</strong> ${v['Color'] || 'N/A'}</div>
        <div><strong>Status:</strong> <span style="padding:4px 8px; border-radius:4px;" class="${getStatusColor(v['Status'])}">${v['Status']}</span></div>
        <div><strong>Date In:</strong> ${formatDate(v['Date In'])}</div>
      </div>
      
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:24px;">
        <div>
          <strong>Exterior Condition:</strong><br>
          ${getConditionRating(v.ExteriorCondition)}
        </div>
        <div>
          <strong>Interior Condition:</strong><br>
          ${getConditionRating(v.InteriorCondition)}
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <strong>Notes:</strong><br>
        <textarea id="vehicle-notes-${stockNum}" style="width:100%; margin-top:8px; padding:8px; border:1px solid #ccc; border-radius:4px;" rows="3">${v['Notes'] || ''}</textarea>
      </div>
      
      <div style="text-align:right;">
        <button onclick="closeModal()" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:4px; margin-right:8px; cursor:pointer;">Close</button>
        <button onclick="updateVehicleNotes('${stockNum}')" style="padding:8px 16px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save Notes</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

function showConditionModal(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  let modal = $('condition-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'condition-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display:none; position:fixed; z-index:100; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7);';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background-color:#fefefe; margin:5% auto; padding:2rem; border:none; width:90%; max-width:500px; border-radius:1rem;">
      <span onclick="closeModal()" style="float:right; font-size:24px; cursor:pointer;">&times;</span>
      <h2 style="font-size:20px; font-weight:bold; margin-bottom:16px;">Update Condition - ${stockNum}</h2>
      
      <div style="margin-bottom:16px;">
        <label style="display:block; font-weight:500; margin-bottom:8px;">Exterior Condition:</label>
        <div style="display:flex; gap:8px;">
          ${[1,2,3,4,5].map(i => 
            `<button onclick="setCondition('${stockNum}', 'exterior', ${i})" 
                     style="width:32px; height:32px; border:1px solid #ccc; border-radius:4px; cursor:pointer; ${i <= (v.ExteriorCondition || 3) ? 'background:#fbbf24; color:white;' : 'background:#f3f4f6;'}">${i}</button>`
          ).join('')}
        </div>
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block; font-weight:500; margin-bottom:8px;">Interior Condition:</label>
        <div style="display:flex; gap:8px;">
          ${[1,2,3,4,5].map(i => 
            `<button onclick="setCondition('${stockNum}', 'interior', ${i})" 
                     style="width:32px; height:32px; border:1px solid #ccc; border-radius:4px; cursor:pointer; ${i <= (v.InteriorCondition || 3) ? 'background:#fbbf24; color:white;' : 'background:#f3f4f6;'}">${i}</button>`
          ).join('')}
        </div>
      </div>
      
      <div style="text-align:right;">
        <button onclick="closeModal()" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:4px; margin-right:8px; cursor:pointer;">Close</button>
        <button onclick="saveCondition('${stockNum}')" style="padding:8px 16px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Save</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

function showAddVehicleModal() {
  let modal = $('add-vehicle-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'add-vehicle-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display:none; position:fixed; z-index:100; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7);';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background-color:#fefefe; margin:5% auto; padding:2rem; border:none; width:90%; max-width:600px; border-radius:1rem;">
      <span onclick="closeModal()" style="float:right; font-size:24px; cursor:pointer;">&times;</span>
      <h2 style="font-size:20px; font-weight:bold; margin-bottom:16px;">Add New Vehicle</h2>
      
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:16px;">
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Stock Number:</label>
          <input type="text" id="new-stock" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">VIN:</label>
          <input type="text" id="new-vin" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Year:</label>
          <input type="number" id="new-year" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Make:</label>
          <input type="text" id="new-make" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Model:</label>
          <input type="text" id="new-model" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Color:</label>
          <input type="text" id="new-color" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
        </div>
      </div>
      
      <div style="text-align:right;">
        <button onclick="closeModal()" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:4px; margin-right:8px; cursor:pointer;">Cancel</button>
        <button onclick="addNewVehicle()" style="padding:8px 16px; background:#3b82f6; color:white; border:none; border-radius:4px; cursor:pointer;">Add Vehicle</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Action Functions
function setCondition(stockNum, type, rating) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (vehicle) {
    if (type === 'exterior') {
      vehicle.ExteriorCondition = rating;
    } else {
      vehicle.InteriorCondition = rating;
    }
    
    // Update visual feedback in modal
    const modal = $('condition-modal');
    const buttons = modal.querySelectorAll('button');
    buttons.forEach(btn => {
      if (btn.onclick && btn.onclick.toString().includes(type)) {
        const btnRating = parseInt(btn.textContent);
        if (btnRating <= rating) {
          btn.style.background = '#fbbf24';
          btn.style.color = 'white';
        } else {
          btn.style.background = '#f3f4f6';
          btn.style.color = 'black';
        }
      }
    });
  }
}

function saveCondition(stockNum) {
  autoSave();
  renderAllTabs();
  closeModal();
  alert('Condition ratings updated successfully!');
}

function updateVehicleNotes(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  const notesTextarea = $(`vehicle-notes-${stockNum}`);
  
  if (vehicle && notesTextarea) {
    vehicle['Notes'] = notesTextarea.value;
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    alert('Notes updated successfully!');
  }
}

function deleteVehicle(stockNum) {
  if (confirm(`Are you sure you want to delete vehicle ${stockNum}?`)) {
    const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
    if (index !== -1) {
      currentVehicleData.splice(index, 1);
      autoSave();
      renderAllTabs();
      alert(`Vehicle ${stockNum} has been deleted.`);
    }
  }
}

function addNewVehicle() {
  const stockNum = $('new-stock').value;
  const vin = $('new-vin').value;
  const year = $('new-year').value;
  const make = $('new-make').value;
  const model = $('new-model').value;
  const color = $('new-color').value;
  
  if (!stockNum || !make || !model) {
    alert('Please fill in at least Stock Number, Make, and Model.');
    return;
  }
  
  // Check for duplicate
  if (currentVehicleData.find(v => v['Stock #'] === stockNum)) {
    alert('A vehicle with this stock number already exists.');
    return;
  }
  
  const newVehicle = {
    'Stock #': stockNum,
    'VIN': vin,
    'Year': parseInt(year) || new Date().getFullYear(),
    'Make': make,
    'Model': model,
    'Color': color,
    'Status': 'New Arrival',
    'Date In': new Date().toISOString().split('T')[0],
    'ExteriorCondition': 3,
    'InteriorCondition': 3,
    'Notes': '',
    'Last Updated': new Date().toISOString()
  };
  
  currentVehicleData.unshift(newVehicle);
  autoSave();
  renderAllTabs();
  closeModal();
  alert(`Vehicle ${stockNum} has been added successfully!`);
}

function exportToCSV() {
  const headers = ['Stock #', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Status', 'Date In', 'Exterior Condition', 'Interior Condition', 'Notes'];
  
  let csvContent = headers.join(',') + '\\n';
  
  currentVehicleData.forEach(v => {
    const row = [
      `"${v['Stock #'] || ''}"`,
      `"${v['VIN'] || ''}"`,
      v['Year'] || '',
      `"${v['Make'] || ''}"`,
      `"${v['Model'] || ''}"`,
      `"${v['Color'] || ''}"`,
      `"${v['Status'] || ''}"`,
      `"${v['Date In'] || ''}"`,
      v['ExteriorCondition'] || 3,
      v['InteriorCondition'] || 3,
      `"${(v['Notes'] || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\\n';
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  alert('CSV export completed!');
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    currentVehicleData = [];
    localStorage.removeItem('vehicleReconData');
    renderAllTabs();
    alert('All data has been cleared.');
  }
}

function handleCsvUpload() {
  const fileInput = $('csv-upload');
  if (!fileInput.files.length) {
    alert('Please select a CSV file first.');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      const lines = csvText.split('\\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const newVehicles = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          const vehicle = {};
          headers.forEach((header, index) => {
            vehicle[header] = values[index] || '';
          });
          
          if (vehicle['Stock #']) {
            // Set defaults
            vehicle['Status'] = vehicle['Status'] || 'New Arrival';
            vehicle['ExteriorCondition'] = parseInt(vehicle['ExteriorCondition']) || 3;
            vehicle['InteriorCondition'] = parseInt(vehicle['InteriorCondition']) || 3;
            vehicle['Date In'] = vehicle['Date In'] || new Date().toISOString().split('T')[0];
            vehicle['Last Updated'] = new Date().toISOString();
            
            newVehicles.push(vehicle);
          }
        }
      }
      
      currentVehicleData = newVehicles;
      autoSave();
      renderAllTabs();
      alert(`Successfully imported ${newVehicles.length} vehicles from CSV.`);
      
    } catch (error) {
      alert('Error reading CSV file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Vehicle Reconditioning Tracker Starting...');
  
  // Load data
  const storedData = loadDataFromStorage();
  if (storedData && storedData.length > 0) {
    currentVehicleData = storedData;
    console.log(`✅ Loaded ${storedData.length} vehicles from localStorage`);
  } else {
    currentVehicleData = getSampleData();
    autoSave();
    console.log('📝 Using sample data');
  }
  
  // Ensure all vehicles have condition ratings
  currentVehicleData.forEach(vehicle => {
    if (!vehicle.ExteriorCondition) vehicle.ExteriorCondition = 3;
    if (!vehicle.InteriorCondition) vehicle.InteriorCondition = 3;
  });
  
  // Set up tab listeners
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      const tabId = this.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
  
  // Render all tabs
  renderAllTabs();
  
  // Show dashboard by default
  switchTab('dashboard');
  
  console.log('✅ App initialization complete');
});

// Expose functions globally for debugging
window.currentVehicleData = currentVehicleData;
window.renderAllTabs = renderAllTabs;
window.showVehicleDetailModal = showVehicleDetailModal;
window.showConditionModal = showConditionModal;
window.showAddVehicleModal = showAddVehicleModal;
window.setCondition = setCondition;
window.saveCondition = saveCondition;
window.updateVehicleNotes = updateVehicleNotes;
window.deleteVehicle = deleteVehicle;
window.addNewVehicle = addNewVehicle;
window.exportToCSV = exportToCSV;
window.clearAllData = clearAllData;
window.handleCsvUpload = handleCsvUpload;
window.closeModal = closeModal;

console.log('✅ Vehicle Reconditioning Tracker Loaded Successfully');
