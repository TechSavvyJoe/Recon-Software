// Minimal Working Vehicle Reconditioning Tracker
// This is a simplified version to get the basic functionality working

// Global State
let currentVehicleData = [];
let currentSortField = 'Stock #';
let currentSortDirection = 'asc';

const RECON_STATUSES = [
  'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'
];

const WORKFLOW_STAGES = [
    { id: 'new-arrival', name: 'New Arrival', icon: 'fas fa-car', color: 'blue', description: 'Vehicle arrived at lot' },
    { 
        id: 'mechanical', 
        name: 'Mechanical', 
        icon: 'fas fa-wrench', 
        color: 'yellow', 
        description: 'Mechanical inspection and service',
        subSteps: [
            { id: 'email-service', name: 'Email Service Manager', icon: 'fas fa-envelope', description: 'Send vehicle details to service manager' },
            { id: 'mechanic-pickup', name: 'Mechanic Pickup', icon: 'fas fa-truck', description: 'Vehicle picked up by mechanic' },
            { id: 'mechanic-return', name: 'Mechanic Return', icon: 'fas fa-check', description: 'Vehicle returned from mechanic' }
        ]
    },
    { id: 'detailing', name: 'Detailing', icon: 'fas fa-spray-can', color: 'purple', description: 'Vehicle cleaning and detailing' },
    { id: 'photos', name: 'Photos', icon: 'fas fa-camera', color: 'pink', description: 'Photography for listings' },
    { id: 'title', name: 'Title', icon: 'fas fa-file-contract', color: 'orange', description: 'Title processing and documentation' },
    { id: 'lot-ready', name: 'Lot Ready', icon: 'fas fa-check-circle', color: 'green', description: 'Ready for sale' }
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
      const data = JSON.parse(saved);
      console.log('Loaded data from storage:', data.length, 'vehicles');
      return data;
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error);
  }
  
  // If no data in storage, create sample data
  console.log('No data in storage, creating sample data...');
  const sampleData = createSampleData();
  saveDataToStorage(sampleData);
  return sampleData;
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

// Create sample data for immediate use
function createSampleData() {
  console.log('Creating sample data...');
  return [
    {
      'Stock #': 'T12345',
      'Year': '2023',
      'Make': 'Ford',
      'Model': 'Explorer',
      'VIN': '1FMHK8F84PGA12345',
      'Status': 'New Arrival',
      'Days in Inventory': '3',
      'Estimated Completion': '2025-01-25',
      workflowProgress: initializeWorkflowProgress()
    },
    {
      'Stock #': 'T67890',
      'Year': '2022',
      'Make': 'Chevrolet',
      'Model': 'Equinox',
      'VIN': '2GNAXHEV4N6222222',
      'Status': 'Mechanical',
      'Days in Inventory': '7',
      'Estimated Completion': '2025-01-22',
      workflowProgress: initializeWorkflowProgress()
    },
    {
      'Stock #': 'T11111',
      'Year': '2024',
      'Make': 'Toyota',
      'Model': 'Camry',
      'VIN': '4T1G11AK7NU333333',
      'Status': 'Detailing',
      'Days in Inventory': '2',
      'Estimated Completion': '2025-01-20',
      workflowProgress: initializeWorkflowProgress()
    },
    {
      'Stock #': 'T44444',
      'Year': '2023',
      'Make': 'Honda',
      'Model': 'Accord',
      'VIN': '1HGCV1F46PA444444',
      'Status': 'Photos',
      'Days in Inventory': '5',
      'Estimated Completion': '2025-01-21',
      workflowProgress: initializeWorkflowProgress()
    },
    {
      'Stock #': 'T55555',
      'Year': '2022',
      'Make': 'Nissan',
      'Model': 'Altima',
      'VIN': '1N4BL4CV4NC555555',
      'Status': 'Lot Ready',
      'Days in Inventory': '1',
      'Estimated Completion': '2025-01-18',
      workflowProgress: initializeWorkflowProgress()
    }
  ];
}

function initializeWorkflowProgress() {
  const progress = {};
  WORKFLOW_STAGES.forEach(stage => {
    if (stage.subSteps) {
      progress[stage.id] = {
        status: 'pending',
        subSteps: {}
      };
      stage.subSteps.forEach(subStep => {
        progress[stage.id].subSteps[subStep.id] = {
          status: 'pending',
          completedAt: null,
          completedBy: null,
          notes: ''
        };
      });
    } else {
      progress[stage.id] = {
        status: 'pending',
        completedAt: null,
        completedBy: null,
        notes: ''
      };
    }
  });
  return progress;
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
  
  // Initialize workflow progress if it doesn't exist
  if (!v.workflowProgress) {
    v.workflowProgress = initializeWorkflowProgress();
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
    <div style="background-color:#fefefe; margin:2% auto; padding:2rem; border:none; width:95%; max-width:1000px; border-radius:1rem; max-height:90vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="font-size:24px; font-weight:bold;">${v['Year']} ${v['Make']} ${v['Model']} - ${stockNum}</h2>
        <span onclick="closeModal()" style="font-size:24px; cursor:pointer;">&times;</span>
      </div>
      
      <!-- Vehicle Info Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px; padding:16px; background:#f9fafb; border-radius:8px;">
        <div><strong>VIN:</strong> ${v['VIN'] || 'N/A'}</div>
        <div><strong>Color:</strong> ${v['Color'] || 'N/A'}</div>
        <div><strong>Status:</strong> <span style="padding:4px 8px; border-radius:4px;" class="${getStatusColor(v['Status'])}">${v['Status']}</span></div>
        <div><strong>Days:</strong> ${v['Days in Inventory'] || '0'}</div>
        <div><strong>Date In:</strong> ${formatDate(v['Date In'])}</div>
        <div><strong>Est. Completion:</strong> ${v['Estimated Completion'] || 'TBD'}</div>
      </div>
      
      <!-- Horizontal Timeline -->
      <div style="margin-bottom:24px;">
        <h3 style="font-size:18px; font-weight:bold; margin-bottom:16px;">Workflow Progress</h3>
        <div style="position:relative; padding:20px 0;">
          <!-- Progress Line -->
          <div style="position:absolute; top:24px; left:0; right:0; height:2px; background:#e5e7eb;"></div>
          <div style="position:absolute; top:24px; left:0; height:2px; background:#3b82f6; width:${calculateWorkflowProgress(v)}%; transition:width 0.3s ease;"></div>
          
          <!-- Timeline Steps -->
          <div style="display:flex; justify-content:space-between; position:relative;">
            ${WORKFLOW_STAGES.map((stage, index) => {
              const stageProgress = v.workflowProgress[stage.id];
              const isCompleted = stageProgress.status === 'completed';
              const isInProgress = stageProgress.status === 'in-progress';
              const canStart = canStartStage(v, stage.id);
              
              return `
                <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
                  <!-- Stage Circle -->
                  <div onclick="${canStart || isCompleted ? `toggleStageStatus('${stockNum}', '${stage.id}')` : ''}" 
                       style="width:48px; height:48px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; cursor:${canStart || isCompleted ? 'pointer' : 'default'}; transition:all 0.2s; ${
                         isCompleted 
                           ? 'background:#10b981; border-color:#10b981; color:white;' 
                           : isInProgress 
                             ? 'background:#3b82f6; border-color:#3b82f6; color:white;' 
                             : canStart 
                               ? 'background:white; border-color:#d1d5db; color:#6b7280;' 
                               : 'background:#f3f4f6; border-color:#e5e7eb; color:#9ca3af;'
                       }">
                    <i class="${stage.icon}" style="font-size:16px;"></i>
                  </div>
                  
                  <!-- Stage Label -->
                  <span style="margin-top:8px; font-size:12px; font-weight:500; text-align:center; color:${isCompleted ? '#059669' : isInProgress ? '#2563eb' : '#6b7280'};">${stage.name}</span>
                  
                  <!-- Completion Date -->
                  ${isCompleted && stageProgress.completedAt ? `
                    <span style="font-size:10px; color:#9ca3af; margin-top:4px;">${new Date(stageProgress.completedAt).toLocaleDateString()}</span>
                  ` : ''}
                  
                  <!-- Sub-steps for Mechanical -->
                  ${stage.subSteps && (isInProgress || isCompleted) ? `
                    <div style="position:absolute; top:60px; left:50%; transform:translateX(-50%); background:white; border:1px solid #e5e7eb; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); padding:12px; width:240px; z-index:10;">
                      <h4 style="font-weight:500; font-size:14px; margin-bottom:8px;">${stage.name} Steps</h4>
                      <div style="display:flex; flex-direction:column; gap:8px;">
                        ${stage.subSteps.map(subStep => {
                          const subStepProgress = stageProgress.subSteps[subStep.id];
                          const subCompleted = subStepProgress.status === 'completed';
                          const subCanStart = canStartSubStep(v, stage.id, subStep.id);
                          
                          return `
                            <div onclick="${subCanStart || subCompleted ? `toggleSubStepStatus('${stockNum}', '${stage.id}', '${subStep.id}')` : ''}" 
                                 style="display:flex; align-items:center; padding:8px; border-radius:6px; cursor:${subCanStart || subCompleted ? 'pointer' : 'default'}; background:${subCompleted ? '#ecfdf5' : '#f9fafb'};">
                              <div style="width:20px; height:20px; border-radius:50%; border:1px solid; display:flex; align-items:center; justify-content:center; margin-right:8px; ${
                                subCompleted 
                                  ? 'background:#10b981; border-color:#10b981; color:white;' 
                                  : subCanStart 
                                    ? 'background:white; border-color:#d1d5db;' 
                                    : 'background:#f3f4f6; border-color:#e5e7eb;'
                              }">
                                ${subCompleted ? '<i class="fas fa-check" style="font-size:10px;"></i>' : `<i class="${subStep.icon}" style="font-size:10px;"></i>`}
                              </div>
                              <span style="font-size:12px; color:${subCompleted ? '#059669' : '#374151'}; ${subCompleted ? 'text-decoration:line-through;' : ''}">${subStep.name}</span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
      
      <!-- Conditions -->
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
      
      <!-- Notes -->
      <div style="margin-bottom:16px;">
        <strong>Notes:</strong><br>
        <textarea id="vehicle-notes-${stockNum}" style="width:100%; margin-top:8px; padding:8px; border:1px solid #ccc; border-radius:4px;" rows="3">${v['Notes'] || ''}</textarea>
      </div>
      
      <!-- Action Buttons -->
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

// ===== TIMELINE FUNCTIONS =====

function calculateWorkflowProgress(vehicle) {
  if (!vehicle.workflowProgress) return 0;
  
  let totalStages = WORKFLOW_STAGES.length;
  let completedStages = 0;
  
  WORKFLOW_STAGES.forEach(stage => {
    if (vehicle.workflowProgress[stage.id] && vehicle.workflowProgress[stage.id].status === 'completed') {
      completedStages++;
    }
  });
  
  return (completedStages / totalStages) * 100;
}

function canStartStage(vehicle, stageId) {
  if (!vehicle.workflowProgress) return false;
  
  // New arrival can always be started
  if (stageId === 'new-arrival') return true;
  
  // Allow detailing and photos to be completed out of order (don't need mechanical to be done)
  if (stageId === 'detailing' || stageId === 'photos') {
    return vehicle.workflowProgress['new-arrival']?.status === 'completed';
  }
  
  // For other stages, require previous stage to be completed
  const stageIndex = WORKFLOW_STAGES.findIndex(s => s.id === stageId);
  if (stageIndex === 0) return true;
  
  const previousStage = WORKFLOW_STAGES[stageIndex - 1];
  return vehicle.workflowProgress[previousStage.id]?.status === 'completed';
}

function canStartSubStep(vehicle, stageId, subStepId) {
  if (!vehicle.workflowProgress || !vehicle.workflowProgress[stageId]) return false;
  
  const stage = WORKFLOW_STAGES.find(s => s.id === stageId);
  if (!stage || !stage.subSteps) return false;
  
  const subStepIndex = stage.subSteps.findIndex(s => s.id === subStepId);
  if (subStepIndex === -1) return false;
  
  // First sub-step can be started if stage is in progress
  if (subStepIndex === 0) {
    return vehicle.workflowProgress[stageId].status === 'in-progress';
  }
  
  // Other sub-steps require previous sub-step to be completed
  const previousSubStep = stage.subSteps[subStepIndex - 1];
  return vehicle.workflowProgress[stageId].subSteps[previousSubStep.id]?.status === 'completed';
}

function toggleStageStatus(stockNum, stageId) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle || !vehicle.workflowProgress) return;
  
  const currentStatus = vehicle.workflowProgress[stageId].status;
  const stage = WORKFLOW_STAGES.find(s => s.id === stageId);
  
  if (currentStatus === 'pending' && canStartStage(vehicle, stageId)) {
    // Start the stage
    vehicle.workflowProgress[stageId].status = 'in-progress';
    vehicle.workflowProgress[stageId].startedAt = new Date().toISOString();
    
    // If this stage has sub-steps, don't complete it immediately
    if (!stage.subSteps) {
      vehicle.workflowProgress[stageId].status = 'completed';
      vehicle.workflowProgress[stageId].completedAt = new Date().toISOString();
      vehicle.workflowProgress[stageId].completedBy = 'User';
    }
    
    showNotification(`Started ${stage.name} for ${stockNum}`, 'success');
  } else if (currentStatus === 'in-progress') {
    // Complete the stage (if all sub-steps are done or no sub-steps)
    if (!stage.subSteps || allSubStepsCompleted(vehicle, stageId)) {
      vehicle.workflowProgress[stageId].status = 'completed';
      vehicle.workflowProgress[stageId].completedAt = new Date().toISOString();
      vehicle.workflowProgress[stageId].completedBy = 'User';
      
      showNotification(`Completed ${stage.name} for ${stockNum}`, 'success');
    } else {
      showNotification(`Complete all sub-steps first for ${stage.name}`, 'warning');
      return;
    }
  } else if (currentStatus === 'completed') {
    // Reset the stage
    vehicle.workflowProgress[stageId].status = 'pending';
    vehicle.workflowProgress[stageId].completedAt = null;
    vehicle.workflowProgress[stageId].completedBy = null;
    
    // Reset sub-steps if they exist
    if (stage.subSteps) {
      stage.subSteps.forEach(subStep => {
        vehicle.workflowProgress[stageId].subSteps[subStep.id] = {
          status: 'pending',
          completedAt: null,
          completedBy: null,
          notes: ''
        };
      });
    }
    
    showNotification(`Reset ${stage.name} for ${stockNum}`, 'info');
  }
  
  // Update vehicle's overall status
  updateVehicleOverallStatus(vehicle);
  
  autoSave();
  showVehicleDetailModal(stockNum); // Refresh the modal
  renderAllTabs(); // Refresh all displays
}

function toggleSubStepStatus(stockNum, stageId, subStepId) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle || !vehicle.workflowProgress || !vehicle.workflowProgress[stageId]) return;
  
  const currentStatus = vehicle.workflowProgress[stageId].subSteps[subStepId].status;
  const stage = WORKFLOW_STAGES.find(s => s.id === stageId);
  const subStep = stage.subSteps.find(s => s.id === subStepId);
  
  if (currentStatus === 'pending' && canStartSubStep(vehicle, stageId, subStepId)) {
    // Complete the sub-step
    vehicle.workflowProgress[stageId].subSteps[subStepId].status = 'completed';
    vehicle.workflowProgress[stageId].subSteps[subStepId].completedAt = new Date().toISOString();
    vehicle.workflowProgress[stageId].subSteps[subStepId].completedBy = 'User';
    
    // Handle special actions for specific sub-steps
    if (subStepId === 'email-service') {
      showNotification(`Email sent to service manager for ${stockNum}`, 'success');
    }
    
    showNotification(`Completed ${subStep.name} for ${stockNum}`, 'success');
    
    // Check if all sub-steps are completed to auto-complete the main stage
    if (allSubStepsCompleted(vehicle, stageId)) {
      vehicle.workflowProgress[stageId].status = 'completed';
      vehicle.workflowProgress[stageId].completedAt = new Date().toISOString();
      vehicle.workflowProgress[stageId].completedBy = 'User';
      
      showNotification(`All ${stage.name} steps completed for ${stockNum}`, 'success');
    }
    
  } else if (currentStatus === 'completed') {
    // Reset the sub-step
    vehicle.workflowProgress[stageId].subSteps[subStepId].status = 'pending';
    vehicle.workflowProgress[stageId].subSteps[subStepId].completedAt = null;
    vehicle.workflowProgress[stageId].subSteps[subStepId].completedBy = null;
    
    // If main stage was completed, set it back to in-progress
    if (vehicle.workflowProgress[stageId].status === 'completed') {
      vehicle.workflowProgress[stageId].status = 'in-progress';
      vehicle.workflowProgress[stageId].completedAt = null;
    }
    
    showNotification(`Reset ${subStep.name} for ${stockNum}`, 'info');
  }
  
  // Update vehicle's overall status
  updateVehicleOverallStatus(vehicle);
  
  autoSave();
  showVehicleDetailModal(stockNum); // Refresh the modal
  renderAllTabs(); // Refresh all displays
}

function allSubStepsCompleted(vehicle, stageId) {
  const stage = WORKFLOW_STAGES.find(s => s.id === stageId);
  if (!stage || !stage.subSteps) return true;
  
  return stage.subSteps.every(subStep => 
    vehicle.workflowProgress[stageId].subSteps[subStep.id]?.status === 'completed'
  );
}

function updateVehicleOverallStatus(vehicle) {
  // Determine the vehicle's overall status based on workflow progress
  const completedStages = [];
  const inProgressStages = [];
  
  WORKFLOW_STAGES.forEach(stage => {
    const stageProgress = vehicle.workflowProgress[stage.id];
    if (stageProgress.status === 'completed') {
      completedStages.push(stage.name);
    } else if (stageProgress.status === 'in-progress') {
      inProgressStages.push(stage.name);
    }
  });
  
  // Update status based on progress
  if (completedStages.includes('Lot Ready')) {
    vehicle['Status'] = 'Lot Ready';
  } else if (inProgressStages.length > 0) {
    vehicle['Status'] = inProgressStages[0]; // Use the first in-progress stage
  } else if (completedStages.length > 0) {
    // Find the last completed stage
    for (let i = WORKFLOW_STAGES.length - 1; i >= 0; i--) {
      if (completedStages.includes(WORKFLOW_STAGES[i].name)) {
        vehicle['Status'] = WORKFLOW_STAGES[i].name;
        break;
      }
    }
  } else {
    vehicle['Status'] = 'New Arrival';
  }
}

function showNotification(message, type = 'info') {
  // Simple notification system
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    max-width: 400px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  
  // Set color based on type
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-left: 16px; color: white; background: none; border: none; cursor: pointer;">
        ×
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Expose timeline functions globally
window.toggleStageStatus = toggleStageStatus;
window.toggleSubStepStatus = toggleSubStepStatus;
window.showNotification = showNotification;

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Vehicle Reconditioning Tracker Starting...');
  
  // Load data
  const storedData = loadDataFromStorage();
  if (storedData && storedData.length > 0) {
    currentVehicleData = storedData;
    console.log(`✅ Loaded ${storedData.length} vehicles from localStorage`);
  } else {
    currentVehicleData = createSampleData();
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
