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
  
  // Add missing tabs if they don't exist
  const tabs = $('tabs');
  if (tabs && !tabs.querySelector('[data-tab="inventory"]')) {
    tabs.innerHTML += `
      <button data-tab="inventory" class="tab-button py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Inventory</button>
      <button data-tab="reports" class="tab-button py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Reports</button>
      <button data-tab="upload" class="tab-button py-2 px-4 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition">Upload Data</button>
    `;
  }
  
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
    html += `<div class="dashboard-vehicle-card bg-sky-50 rounded-lg p-4 shadow cursor-pointer hover:bg-sky-100" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <div class="font-bold">${v['Year']} ${v['Make']} ${v['Model']}</div>
      <div class="text-sm text-gray-600">Stock #: ${v['Stock #']}</div>
      <div class="mt-2"><span class="px-2 py-1 rounded ${getStatusColor(v['Status'])}">${v['Status']}</span></div>
    </div>`;
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
               onchange="toggleWorkflowStep('${v['Stock #']}', 'Mechanical')"
               class="form-checkbox h-4 w-4 text-blue-600">
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Detailing'].completed ? 'checked' : ''} 
               onchange="toggleWorkflowStep('${v['Stock #']}', 'Detailing')"
               class="form-checkbox h-4 w-4 text-purple-600">
      </td>
      <td class="px-2 py-2 text-center">
        <input type="checkbox" ${workflow['Photos'].completed ? 'checked' : ''} 
               onchange="toggleWorkflowStep('${v['Stock #']}', 'Photos')"
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

window.showVehicleDetailModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  // Initialize workflow if not exists
  const workflow = getWorkflowStatus(v);
  
  const modal = $('vehicle-detail-modal');
  if (!modal) {
    console.error('Modal not found');
    return;
  }
  const content = $('vehicle-detail-content');
  if (!content) {
    console.error('Modal content not found');
    return;
  }
  
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
      <div class="timeline-item ${statusClass} mb-4 p-3 border rounded">
        <div class="flex items-center">
          <div class="timeline-icon mr-3">
            <i class="${stepInfo.icon} text-${stepInfo.color}-500"></i>
          </div>
          <div class="flex-1">
            <div class="font-semibold">${step}</div>
            ${stepData.date ? `<div class="text-sm text-gray-500">${formatDate(stepData.date)}</div>` : ''}
          </div>
          <div class="text-right">
            ${stepData.completed ? '<span class="text-green-600 text-sm">✓ Complete</span>' : '<span class="text-gray-400 text-sm">Pending</span>'}
          </div>
        </div>
        
        ${step === 'Title' ? `
          <div class="mt-2">
            <label class="flex items-center space-x-2">
              <input type="checkbox" ${stepData.inHouse ? 'checked' : ''} 
                     onchange="window.toggleTitleInHouse('${stockNum}')"
                     class="form-checkbox h-4 w-4 text-blue-600">
              <span class="text-sm ${stepData.inHouse ? 'text-green-600' : 'text-red-600'}">
                Title ${stepData.inHouse ? 'In House' : 'Not In House'}
              </span>
            </label>
          </div>
        ` : ''}
        
        ${step === 'Mechanical' && WORKFLOW_STEPS.Mechanical.subSteps ? `
          <div class="mechanical-substeps mt-2 ml-6">
            ${WORKFLOW_STEPS.Mechanical.subSteps.map(subStep => {
              const subStepData = stepData.subSteps?.[subStep.id];
              const isCompleted = subStepData?.completed;
              return `
                <div class="substep mb-2 flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <i class="fas fa-${isCompleted ? 'check-circle text-green-500' : 'circle text-gray-300'} text-sm"></i>
                    <span class="text-sm ${isCompleted ? 'text-green-600' : 'text-gray-600'}">${subStep.label}</span>
                  </div>
                  ${!isCompleted ? `
                    <button onclick="window.updateMechanicalSubStep('${stockNum}', '${subStep.id}')" 
                            class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                      Complete
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        ${(['Detailing', 'Photos'].includes(step) && !stepData.completed) ? `
          <div class="mt-2 ml-6">
            <button onclick="window.completeWorkflowStep('${stockNum}', '${step}')" 
                    class="px-3 py-1 text-sm bg-${stepInfo.color}-500 text-white rounded hover:bg-${stepInfo.color}-600">
              <i class="${stepInfo.icon} mr-1"></i>Mark Complete
            </button>
          </div>
        ` : ''}
        
        ${stepData.notes ? `<div class="mt-2 ml-6 text-sm text-gray-600 italic">${stepData.notes}</div>` : ''}
      </div>
    `;
  });
  
  timelineHtml += '</div>';
  
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
          <button class="action-button action-button-primary" onclick="window.showStatusUpdateModal('${stockNum}')">
            <i class="fas fa-edit mr-2"></i>Update Status
          </button>
          <button class="action-button action-button-secondary" onclick="window.deleteVehicle('${stockNum}')">
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
            <div class="flex items-center ${workflow['Mechanical'].completed ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${workflow['Mechanical'].completed ? 'fa-check' : 'fa-times'} mr-2"></i>
              Mechanical Complete
            </div>
            <div class="flex items-center ${workflow['Detailing'].completed ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${workflow['Detailing'].completed ? 'fa-check' : 'fa-times'} mr-2"></i>
              Detailing Complete
            </div>
            <div class="flex items-center ${workflow['Photos'].completed ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${workflow['Photos'].completed ? 'fa-check' : 'fa-times'} mr-2"></i>
              Photos Complete
            </div>
            <div class="flex items-center ${workflow['Title'].inHouse ? 'text-green-600' : 'text-red-600'}">
              <i class="fas ${workflow['Title'].inHouse ? 'fa-check' : 'fa-times'} mr-2"></i>
              Title In-House
            </div>
          </div>
          ${canMoveToLotReady(v) ? `
            <button onclick="window.moveToLotReady('${stockNum}')" class="mt-3 w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
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

window.showAddVehicleModal = function() {
  const modal = $('message-modal');
  if (!modal) {
    showMessageModal('Error', 'Add vehicle modal not found');
    return;
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 class="text-xl font-bold mb-4">Add New Vehicle</h2>
      <form id="add-vehicle-form" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Stock #</label>
            <input type="text" id="new-stock" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">VIN</label>
            <input type="text" id="new-vin" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Year</label>
            <input type="text" id="new-year" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Make</label>
            <input type="text" id="new-make" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Model</label>
            <input type="text" id="new-model" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Color</label>
            <input type="text" id="new-color" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Date In</label>
            <input type="date" id="new-date-in" required class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="new-notes" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
          </div>
        </div>
        <div class="mt-4">
          <button type="submit" class="action-button action-button-primary w-full">Add Vehicle</button>
        </div>
      </form>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Handle form submission
  const form = $('add-vehicle-form');
  if (form) {
    form.onsubmit = function(e) {
      e.preventDefault();
      addNewVehicle();
    };
  }
};

function addNewVehicle() {
  const stockNum = $('new-stock').value.trim();
  
  // Check if stock number already exists
  if (currentVehicleData.some(v => v['Stock #'] === stockNum)) {
    showMessageModal('Error', 'A vehicle with this stock number already exists.');
    return;
  }
  
  const newVehicle = {
    'Stock #': stockNum,
    'VIN': $('new-vin').value.trim(),
    'Year': $('new-year').value.trim(),
    'Make': $('new-make').value.trim(),
    'Model': $('new-model').value.trim(),
    'Color': $('new-color').value.trim(),
    'Status': 'New Arrival',
    'Detailer': '',
    'Date In': $('new-date-in').value,
    'Date Out': '',
    'Notes': $('new-notes').value.trim()
  };
  
  // Initialize workflow for new vehicle
  const workflow = {
    'New Arrival': { completed: true, date: new Date().toISOString(), notes: 'Vehicle added to inventory' },
    'Mechanical': { 
      completed: false, 
      subSteps: {
        'email-sent': { completed: false, date: null, notes: null },
        'in-service': { completed: false, date: null, notes: null },
        'completed': { completed: false, date: null, notes: null }
      }
    },
    'Detailing': { completed: false, date: null, notes: null },
    'Photos': { completed: false, date: null, notes: null },
    'Title': { completed: false, inHouse: false, date: null, notes: null },
    'Lot Ready': { completed: false, date: null, notes: null },
    'Sold': { completed: false, date: null, notes: null }
  };
  
  newVehicle.workflow = workflow;
  
  // Add to data array
  currentVehicleData.push(newVehicle);
  
  // Save and refresh
  autoSave();
  renderAllTabs();
  closeAllModals();
  showMessageModal('Success', 'Vehicle added successfully!');
}

window.exportToCSV = function() {
  if (!currentVehicleData || currentVehicleData.length === 0) {
    showMessageModal('Error', 'No data to export');
    return;
  }
  
  // Define the fields to export
  const fields = ['Stock #', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Status', 'Detailer', 'Date In', 'Date Out', 'Notes'];
  
  // Create CSV content
  let csvContent = fields.join(',') + '\n';
  
  currentVehicleData.forEach(vehicle => {
    const row = fields.map(field => {
      // Escape quotes and wrap fields with commas in quotes
      let value = vehicle[field] || '';
      if (value.includes(',') || value.includes('"')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csvContent += row.join(',') + '\n';
  });
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `vehicle_inventory_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.deleteVehicle = function(stockNum) {
  if (confirm(`Are you sure you want to delete vehicle ${stockNum}? This cannot be undone.`)) {
    const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
    if (index !== -1) {
      currentVehicleData.splice(index, 1);
      autoSave();
      renderAllTabs();
      closeAllModals();
      showMessageModal('Success', 'Vehicle deleted successfully');
    } else {
      showMessageModal('Error', 'Vehicle not found');
    }
  }
};

// Fixed function for toggle title in-house
window.toggleTitleInHouse = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow['Title'].inHouse = !workflow['Title'].inHouse;
  
  if (workflow['Title'].inHouse && !workflow['Title'].date) {
    workflow['Title'].date = new Date().toISOString();
    workflow['Title'].completed = true;
    workflow['Title'].notes = 'Title received in-house';
  }
  
  // Update vehicle status based on workflow
  vehicle['Status'] = determineCurrentStatus(vehicle);
  
  autoSave();
  renderAllTabs();
};

// Fixed function for completing workflow steps
window.completeWorkflowStep = function(stockNum, step) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow[step].completed = true;
  workflow[step].date = new Date().toISOString();
  workflow[step].notes = `${step} completed via workflow action`;
  
  // Update vehicle status based on workflow
  vehicle['Status'] = determineCurrentStatus(vehicle);
  
  autoSave();
  renderAllTabs();
  closeAllModals();
  
  // Reopen the detail modal to show the changes
  setTimeout(() => window.showVehicleDetailModal(stockNum), 100);
};

// Function to update mechanical sub-steps
window.updateMechanicalSubStep = function(stockNum, subStepId) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  
  if (!workflow['Mechanical'].subSteps) {
    workflow['Mechanical'].subSteps = {};
  }
  
  workflow['Mechanical'].subSteps[subStepId] = {
    completed: true,
    date: new Date().toISOString(),
    notes: `${subStepId.replace(/-/g, ' ')} completed`
  };
  
  // Check if all mechanical sub-steps are complete
  const subSteps = WORKFLOW_STEPS['Mechanical'].subSteps;
  const allComplete = subSteps.every(subStep => 
    workflow['Mechanical'].subSteps[subStep.id]?.completed
  );
  
  if (allComplete) {
    workflow['Mechanical'].completed = true;
    workflow['Mechanical'].date = new Date().toISOString();
    workflow['Mechanical'].notes = 'All mechanical steps completed';
    
    // Update vehicle status
    vehicle['Status'] = determineCurrentStatus(vehicle);
  }
  
  autoSave();
  renderAllTabs();
  closeAllModals();
  
  // Reopen the detail modal to show the changes
  setTimeout(() => window.showVehicleDetailModal(stockNum), 100);
};

// Function to check if a vehicle can move to Lot Ready
function canMoveToLotReady(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  return workflow['Mechanical'].completed && 
         workflow['Detailing'].completed && 
         workflow['Photos'].completed && 
         workflow['Title'].inHouse;
}

// Function to move vehicle to Lot Ready
window.moveToLotReady = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  if (!canMoveToLotReady(vehicle)) {
    showMessageModal('Error', 'Cannot move to Lot Ready until all requirements are met');
    return;
  }
  
  const workflow = getWorkflowStatus(vehicle);
  workflow['Lot Ready'].completed = true;
  workflow['Lot Ready'].date = new Date().toISOString();
  workflow['Lot Ready'].notes = 'Vehicle moved to Lot Ready status';
  
  vehicle['Status'] = 'Lot Ready';
  
  autoSave();
  renderAllTabs();
  closeAllModals();
  showMessageModal('Success', 'Vehicle is now Lot Ready!');
};

// Fixed determineCurrentStatus function
function determineCurrentStatus(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  
  if (workflow['Sold'].completed) return 'Sold';
  if (workflow['Lot Ready'].completed) return 'Lot Ready';
  
  // If all prerequisites are done but not formally marked Lot Ready
  if (canMoveToLotReady(vehicle)) return 'Photos'; // Last step before Lot Ready
  
  if (workflow['Photos'].completed) return 'Photos';
  if (workflow['Detailing'].completed) return 'Detailing';
  if (workflow['Mechanical'].completed) return 'Mechanical';
  
  // Check if we're in the middle of mechanical
  if (workflow['Mechanical'].subSteps && Object.values(workflow['Mechanical'].subSteps).some(s => s.completed)) {
    return 'Mechanical';
  }
  
  return 'New Arrival';
}

function renderWorkflow() {
  const el = $('workflow-content');
  if (!el) return;
  
  let html = `
    <h2 class="text-xl font-bold mb-4">Workflow Overview</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
  `;
  
  // Create columns for each workflow stage
  Object.keys(WORKFLOW_STEPS).forEach(stage => {
    const stageInfo = WORKFLOW_STEPS[stage];
    const vehicles = currentVehicleData.filter(v => v['Status'] === stage);
    
    html += `
      <div class="workflow-column">
        <div class="bg-${stageInfo.color}-100 p-3 rounded-t-lg flex justify-between items-center">
          <h3 class="font-bold text-${stageInfo.color}-700">
            <i class="${stageInfo.icon} mr-1"></i> ${stage}
          </h3>
          <span class="bg-${stageInfo.color}-200 text-${stageInfo.color}-800 rounded-full px-2 py-1 text-xs font-bold">
            ${vehicles.length}
          </span>
        </div>
        <div class="bg-white rounded-b-lg shadow-md p-2 min-h-[200px]">
    `;
    
    if (vehicles.length === 0) {
      html += `<p class="text-gray-400 text-center p-4 text-sm">No vehicles</p>`;
    } else {
      vehicles.forEach(v => {
        html += `
          <div class="vehicle-card bg-gray-50 rounded p-2 mb-2 cursor-pointer hover:bg-gray-100" 
               onclick="window.showVehicleDetailModal('${v['Stock #']}')">
            <div class="font-medium">${v['Year']} ${v['Make']} ${v['Model']}</div>
            <div class="text-xs text-gray-500">Stock #: ${v['Stock #']}</div>
            <div class="text-xs text-gray-500">In: ${formatDate(v['Date In'])}</div>
          </div>
        `;
      });
    }
    
    html += `</div></div>`;
  });
  
  html += `</div>`;
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) return;
  
  // Get unique detailers and their vehicle counts
  const detailerMap = {};
  currentVehicleData.forEach(v => {
    const detailer = v['Detailer'] || 'Unassigned';
    if (!detailerMap[detailer]) {
      detailerMap[detailer] = {
        name: detailer,
        count: 0,
        vehicles: []
      };
    }
    detailerMap[detailer].count++;
    detailerMap[detailer].vehicles.push(v);
  });
  
  const detailers = Object.values(detailerMap);
  
  let html = `
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-xl font-bold">Detailers</h2>
      <button class="action-button action-button-primary" onclick="window.showAddDetailerModal()">Add Detailer</button>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
  `;
  
  detailers.forEach(detailer => {
    html += `
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold text-lg">${detailer.name}</h3>
          <span class="bg-purple-100 text-purple-800 rounded-full px-2 py-1 text-xs font-bold">
            ${detailer.count} vehicle${detailer.count !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="text-sm max-h-[200px] overflow-y-auto">
    `;
    
    if (detailer.vehicles.length === 0) {
      html += `<p class="text-gray-400">No vehicles assigned</p>`;
    } else {
      detailer.vehicles.forEach(v => {
        html += `
          <div class="border-b py-1 hover:bg-gray-50 cursor-pointer" 
               onclick="window.showVehicleDetailModal('${v['Stock #']}')">
            ${v['Year']} ${v['Make']} ${v['Model']} - ${v['Status']}
          </div>
        `;
      });
    }
    
    html += `
        </div>
        <div class="mt-3 flex space-x-2">
          <button onclick="window.assignVehicles('${detailer.name}')" 
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
            Assign Vehicles
          </button>
          ${detailer.name !== 'Unassigned' ? `
            <button onclick="window.editDetailer('${detailer.name}')" 
                    class="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">
              Edit
            </button>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  el.innerHTML = html;
}

window.showAddDetailerModal = function() {
  const modal = $('message-modal');
  if (!modal) return;
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 class="text-xl font-bold mb-4">Add New Detailer</h2>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">Detailer Name</label>
        <input type="text" id="new-detailer-name" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
      </div>
      <button id="add-detailer-button" class="action-button action-button-primary">Add Detailer</button>
    </div>
  `;
  
  modal.style.display = 'block';
  
  $('add-detailer-button').onclick = function() {
    const name = $('new-detailer-name').value.trim();
    if (!name) {
      alert('Please enter a detailer name');
      return;
    }
    
    // Add to detailer names list if it doesn't exist
    if (!detailerNames.includes(name)) {
      detailerNames.push(name);
    }
    
    closeAllModals();
    renderDetailers();
  };
};

window.assignVehicles = function(detailerName) {
  const modal = $('message-modal');
  if (!modal) return;
  
  // Get unassigned vehicles or vehicles with different detailers
  const availableVehicles = currentVehicleData.filter(v => 
    v['Detailer'] !== detailerName && v['Status'] !== 'Sold' && v['Status'] !== 'Lot Ready'
  );
  
  let vehiclesHtml = '';
  if (availableVehicles.length === 0) {
    vehiclesHtml = '<p class="text-gray-400">No vehicles available for assignment</p>';
  } else {
    vehiclesHtml = `
      <div class="max-h-[300px] overflow-y-auto">
        ${availableVehicles.map(v => `
          <div class="flex items-center space-x-2 p-1 border-b">
            <input type="checkbox" value="${v['Stock #']}" class="vehicle-assign-checkbox">
            <span>${v['Year']} ${v['Make']} ${v['Model']} - ${v['Status']}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 class="text-xl font-bold mb-4">Assign Vehicles to ${detailerName}</h2>
      <div class="mb-4">
        ${vehiclesHtml}
      </div>
      <button id="assign-vehicles-button" class="action-button action-button-primary">
        Assign Selected Vehicles
      </button>
    </div>
  `;
  
  modal.style.display = 'block';
  
  $('assign-vehicles-button').onclick = function() {
    const checkboxes = document.querySelectorAll('.vehicle-assign-checkbox:checked');
    if (checkboxes.length === 0) {
      alert('Please select at least one vehicle');
      return;
    }
    
    checkboxes.forEach(checkbox => {
      const stockNum = checkbox.value;
      const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
      if (vehicle) {
        vehicle['Detailer'] = detailerName;
      }
    });
    
    autoSave();
    closeAllModals();
    renderAllTabs();
  };
};

window.editDetailer = function(detailerName) {
  const modal = $('message-modal');
  if (!modal) return;
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 class="text-xl font-bold mb-4">Edit Detailer</h2>
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700">Detailer Name</label>
        <input type="text" id="edit-detailer-name" value="${detailerName}" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
      </div>
      <div class="flex space-x-2">
        <button id="update-detailer-button" class="action-button action-button-primary">Update Name</button>
        <button id="delete-detailer-button" class="action-button action-button-danger">Delete Detailer</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  $('update-detailer-button').onclick = function() {
    const newName = $('edit-detailer-name').value.trim();
    if (!newName) {
      alert('Please enter a detailer name');
      return;
    }
    
    // Update the name in all vehicles
    currentVehicleData.forEach(v => {
      if (v['Detailer'] === detailerName) {
        v['Detailer'] = newName;
      }
    });
    
    // Update in detailer names list
    const index = detailerNames.indexOf(detailerName);
    if (index !== -1) {
      detailerNames[index] = newName;
    } else {
      detailerNames.push(newName);
    }
    
    autoSave();
    closeAllModals();
    renderAllTabs();
  };
  
  $('delete-detailer-button').onclick = function() {
    if (confirm(`Are you sure you want to delete detailer ${detailerName}? Their vehicles will be marked as unassigned.`)) {
      // Set all vehicles to unassigned
      currentVehicleData.forEach(v => {
        if (v['Detailer'] === detailerName) {
          v['Detailer'] = '';
        }
      });
      
      // Remove from detailer names list
      const index = detailerNames.indexOf(detailerName);
      if (index !== -1) {
        detailerNames.splice(index, 1);
      }
      
      autoSave();
      closeAllModals();
      renderAllTabs();
    }
  };
};

window.showStatusUpdateModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  const modal = $('message-modal');
  let options = RECON_STATUSES.map(s => `<option value="${s}"${s === v['Status'] ? ' selected' : ''}>${s}</option>`).join('');
  modal.innerHTML = `
    <div class="modal-content">
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
    </div>
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

// --- Enhanced Workflow Functions ---

function getWorkflowStatus(vehicle) {
  if (!vehicle.workflow) {
    vehicle.workflow = {
      'New Arrival': { completed: false, date: null, notes: null },
      'Mechanical': { 
        completed: false, 
        subSteps: {
          'email-sent': { completed: false, date: null, notes: null },
          'in-service': { completed: false, date: null, notes: null },
          'completed': { completed: false, date: null, notes: null }
        }
      },
      'Detailing': { completed: false, date: null, notes: null },
      'Photos': { completed: false, date: null, notes: null },
      'Title': { completed: false, inHouse: false, date: null },
      'Lot Ready': { completed: false, date: null, notes: null },
      'Sold': { completed: false, date: null, notes: null }
    };
  }
  return vehicle.workflow;
}

function updateWorkflowStep(vehicle, step, subStep = null, data = {}) {
  const workflow = getWorkflowStatus(vehicle);
  const now = new Date().toISOString();
  
  if (subStep && workflow[step] && workflow[step].subSteps) {
    workflow[step].subSteps[subStep] = {
      completed: true,
      date: now,
      notes: data.notes || null,
      ...data
    };
    
    // Check if all mechanical sub-steps are complete
    if (step === 'Mechanical') {
      const allSubStepsComplete = Object.values(workflow[step].subSteps)
        .every(subStep => subStep.completed);
      if (allSubStepsComplete) {
        workflow[step].completed = true;
        workflow[step].date = now;
      }
    }
  } else {
    workflow[step] = {
      completed: true,
      date: now,
      notes: data.notes || null,
      ...data
    };
  }
  
  return workflow;
}

function completeWorkflowStep(stockNum, step, subStep = null, data = {}) {
  const vehicle = currentVehicleData.find(v => v.stockNumber === stockNum || v.vin === stockNum);
  if (!vehicle) return;
  
  vehicle.workflow = updateWorkflowStep(vehicle, step, subStep, data);
  
  // Update current status based on workflow progress
  vehicle.currentReconStatus = determineCurrentStatus(vehicle);
  
  // Save to storage/database here
  saveVehicleData(vehicle);
  
  // Refresh UI
  updateAllViews();
}

function toggleTitleInHouse(stockNum) {
  const vehicle = currentVehicleData.find(v => v.stockNumber === stockNum || v.vin === stockNum);
  if (!vehicle) return;
  
  const workflow = getWorkflowStatus(vehicle);
  workflow.Title.inHouse = !workflow.Title.inHouse;
  
  if (workflow.Title.inHouse && !workflow.Title.completed) {
    workflow.Title.completed = true;
    workflow.Title.date = new Date().toISOString();
  }
  
  vehicle.currentReconStatus = determineCurrentStatus(vehicle);
  saveVehicleData(vehicle);
  updateAllViews();
}

function updateMechanicalSubStep(stockNum, subStepId) {
  const vehicle = currentVehicleData.find(v => v.stockNumber === stockNum || v.vin === stockNum);
  if (!vehicle) return;
  
  completeWorkflowStep(stockNum, 'Mechanical', subStepId, {
    notes: `${subStepId.replace('-', ' ')} completed`
  });
}

function canBeLotReady(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  return workflow.Mechanical.completed && 
         workflow.Detailing.completed && 
         workflow.Photos.completed && 
         workflow.Title.inHouse;
}

function determineCurrentStatus(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  
  if (workflow.Sold.completed) return 'Sold';
  if (canBeLotReady(vehicle) && workflow['Lot Ready'].completed) return 'Lot Ready';
  if (workflow.Photos.completed && workflow.Title.inHouse && workflow.Mechanical.completed && workflow.Detailing.completed) return 'Lot Ready';
  if (workflow.Photos.completed) return 'Photos';
  if (workflow.Detailing.completed) return 'Detailing';
  if (workflow.Mechanical.completed) return 'Mechanical';
  if (workflow['New Arrival'].completed) return 'New Arrival';
  
  // Check which step is in progress
  if (workflow.Mechanical.subSteps['email-sent'].completed) return 'Mechanical';
  if (workflow.Detailing.date && !workflow.Detailing.completed) return 'Detailing';
  if (workflow.Photos.date && !workflow.Photos.completed) return 'Photos';
  
  return 'New Arrival';
}

function getStepProgress(vehicle, step) {
  const workflow = getWorkflowStatus(vehicle);
  
  if (step === 'Mechanical' && workflow.Mechanical.subSteps) {
    const completedSubSteps = Object.values(workflow.Mechanical.subSteps)
      .filter(subStep => subStep.completed).length;
    return Math.round((completedSubSteps / 3) * 100);
  }
  
  return workflow[step]?.completed ? 100 : 0;
}

function formatTimeDuration(startDate, endDate = null) {
  if (!startDate) return 'N/A';
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const diff = end - start;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

// Auto-save function - call this whenever data changes
function autoSave() {
  saveDataToStorage();
}
