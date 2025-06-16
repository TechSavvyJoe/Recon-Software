// --- Vehicle Reconditioning Tracker App ---
// Fixed version that works with the current HTML structure

// --- Global State ---
let currentVehicleData = [];
let detailerNames = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Joe Wilson'];
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
  
  // Initialize event handlers
  initializeEventHandlers();
  
  // Start with dashboard tab
  switchTab('dashboard');
  console.log('App initialized successfully');
});

function switchTab(tabId) {
  // Deactivate all tabs and content
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
    btn.classList.remove('bg-sky-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  // Activate selected tab and content
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = $(tabId + '-content');
  
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.classList.remove('bg-gray-200', 'text-gray-700');
    activeTab.classList.add('bg-sky-500', 'text-white');
  }
  if (activeContent) {
    activeContent.classList.add('active');
    activeContent.style.display = 'block';
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
    let url = './Recon -Mission Ford of Dearborn-2025-05-30-1153 - Sheet1.json';
    if (!url.startsWith('./')) url = './' + url;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inventory JSON');
    const json = await res.json();
    currentVehicleData = parseVehicleDataFromJson(json);
    if (currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because the JSON file format is invalid.');
    }
    autoSave();
  } catch (e) {
    currentVehicleData = getSampleData();
    showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    autoSave();
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
      'Date In': '2025-05-19',
      'Notes': 'Needs front brake pads',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { 
          completed: true, 
          date: '2025-05-19T10:00:00.000Z', 
          notes: 'Vehicle received at lot' 
        },
        'Mechanical': { 
          completed: false,
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-19T11:00:00.000Z', notes: 'Service request sent' },
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
    },
    {
      'Stock #': 'F250520B',
      'VIN': '1FMCU9G67LUC03252',
      'Year': '2021',
      'Make': 'Ford',
      'Model': 'Explorer',
      'Color': 'Black',
      'Status': 'Photos',
      'Detailer': 'Sarah Johnson',
      'Date In': '2025-05-20',
      'Notes': 'Ready for photos',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { 
          completed: true, 
          date: '2025-05-20T09:00:00.000Z', 
          notes: 'Vehicle received' 
        },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-21T15:00:00.000Z', 
          notes: 'All mechanical work completed',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-20T10:00:00.000Z', notes: 'Service request sent' },
            'in-service': { completed: true, date: '2025-05-21T08:00:00.000Z', notes: 'Vehicle in service' },
            'completed': { completed: true, date: '2025-05-21T15:00:00.000Z', notes: 'Service completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-22T16:00:00.000Z', notes: 'Full detail completed' },
        'Photos': { completed: false },
        'Title': { completed: false, inHouse: true },
        'Lot Ready': { completed: false },
        'Sold': { completed: false }
      }
    },
    {
      'Stock #': 'M250515C',
      'VIN': '1FMCU9G67LUC03253',
      'Year': '2019',
      'Make': 'Ford',
      'Model': 'F-150',
      'Color': 'Blue',
      'Status': 'Lot Ready',
      'Detailer': 'Mike Davis',
      'Date In': '2025-05-15',
      'Notes': 'Ready for sale',
      'Last Updated': new Date().toISOString(),
      'workflow': {
        'New Arrival': { completed: true, date: '2025-05-15T08:00:00.000Z', notes: 'Vehicle received' },
        'Mechanical': { 
          completed: true, 
          date: '2025-05-16T14:00:00.000Z', 
          notes: 'Minor service completed',
          subSteps: {
            'email-sent': { completed: true, date: '2025-05-15T09:00:00.000Z', notes: 'Service request sent' },
            'in-service': { completed: true, date: '2025-05-16T08:00:00.000Z', notes: 'Vehicle in service' },
            'completed': { completed: true, date: '2025-05-16T14:00:00.000Z', notes: 'Service completed' }
          }
        },
        'Detailing': { completed: true, date: '2025-05-17T16:00:00.000Z', notes: 'Full detail completed' },
        'Photos': { completed: true, date: '2025-05-18T10:00:00.000Z', notes: 'Photography completed' },
        'Title': { completed: true, inHouse: true, date: '2025-05-18T12:00:00.000Z', notes: 'Title processed' },
        'Lot Ready': { completed: true, date: '2025-05-18T14:00:00.000Z', notes: 'Ready for sale' },
        'Sold': { completed: false }
      }
    }
  ];
}

function parseVehicleDataFromJson(json) {
  const vehicles = [];
  
  if (Array.isArray(json)) {
    json.forEach(item => {
      const vehicle = {
        'Stock #': item['Stock #'] || item.stock || '',
        'VIN': item['VIN'] || item.vin || '',
        'Year': item['Year'] || item.year || '',
        'Make': item['Make'] || item.make || '',
        'Model': item['Model'] || item.model || '',
        'Color': item['Color'] || item.color || '',
        'Status': item['Status'] || item.status || 'New Arrival',
        'Detailer': item['Detailer'] || item.detailer || '',
        'Date In': item['Date In'] || item.dateIn || new Date().toISOString().split('T')[0],
        'Notes': item['Notes'] || item.notes || '',
        'Last Updated': new Date().toISOString()
      };
      
      // Add workflow if not present
      if (!vehicle.workflow) {
        vehicle.workflow = getWorkflowStatus(vehicle);
      }
      
      vehicles.push(vehicle);
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
function renderDashboard() {
  const el = $('dashboard-content');
  if (!el) return;
  
  // Update status counts
  const statusCounts = {};
  RECON_STATUSES.forEach(status => statusCounts[status] = 0);
  currentVehicleData.forEach(v => {
    if (statusCounts[v['Status']] !== undefined) {
      statusCounts[v['Status']]++;
    }
  });
  
  // Update dashboard counters
  const totalActiveEl = $('total-active-count');
  const mechanicalEl = $('mechanical-count');
  const detailingEl = $('detailing-count');
  const lotReadyEl = $('lot-ready-count');
  
  if (totalActiveEl) totalActiveEl.textContent = currentVehicleData.filter(v => v['Status'] !== 'Sold').length;
  if (mechanicalEl) mechanicalEl.textContent = statusCounts['Mechanical'] || 0;
  if (detailingEl) detailingEl.textContent = statusCounts['Detailing'] || 0;
  if (lotReadyEl) lotReadyEl.textContent = statusCounts['Lot Ready'] || 0;
  
  // Render vehicle list
  const vehicleListEl = $('dashboard-vehicle-list');
  if (vehicleListEl) {
    let html = '';
    currentVehicleData.filter(v => v['Status'] !== 'Sold').slice(0, 6).forEach(v => {
      const workflow = getWorkflowStatus(v);
      const completedSteps = Object.values(workflow).filter(step => step.completed).length;
      const totalSteps = Object.keys(workflow).length;
      const progressPercent = Math.round((completedSteps / totalSteps) * 100);
      
      html += `
        <div class="bg-white rounded-lg p-4 shadow cursor-pointer hover:bg-gray-50" onclick="showVehicleDetailModal('${v['Stock #']}')">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-bold text-lg">${v['Year']} ${v['Make']} ${v['Model']}</h3>
              <p class="text-gray-600 text-sm">Stock #: ${v['Stock #']}</p>
              <p class="text-gray-600 text-sm">Detailer: ${v['Detailer'] || 'Unassigned'}</p>
            </div>
            <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fg" style="width: ${progressPercent}%">
              <span class="progress-bar-text">${progressPercent}% Complete</span>
            </div>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            Date In: ${formatDate(v['Date In'])}
          </div>
        </div>
      `;
    });
    vehicleListEl.innerHTML = html;
  }
}

function renderWorkflow() {
  const el = $('workflow-board');
  if (!el) return;
  
  let html = '<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    html += `
      <div class="bg-gray-100 rounded-lg p-4">
        <h3 class="font-bold mb-3 text-center ${getStatusColor(status)} px-2 py-1 rounded">${status} (${vehicles.length})</h3>
        <div class="space-y-2">
    `;
    
    vehicles.forEach(v => {
      html += `
        <div class="bg-white rounded p-3 shadow-sm cursor-pointer hover:bg-gray-50" onclick="showVehicleDetailModal('${v['Stock #']}')">
          <div class="font-medium text-sm">${v['Year']} ${v['Make']}</div>
          <div class="text-xs text-gray-600">${v['Model']}</div>
          <div class="text-xs text-gray-500">Stock: ${v['Stock #']}</div>
        </div>
      `;
    });
    
    html += '</div></div>';
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderInventory() {
  const el = $('inventory-table-body');
  if (!el) return;
  
  let html = '';
  currentVehicleData.forEach(v => {
    const workflow = getWorkflowStatus(v);
    const completedSteps = Object.values(workflow).filter(step => step.completed).length;
    const totalSteps = Object.keys(workflow).length;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);
    
    html += `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="showVehicleDetailModal('${v['Stock #']}')">
        <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${v['Stock #']}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-900">${v['Year']}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-900">${v['Make']}</td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-900">${v['Model']}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 py-1 rounded text-xs ${getStatusColor(v['Status'])}">${v['Status']}</span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="progress-bar-container">
            <div class="progress-bar-fg" style="width: ${progressPercent}%">
              <span class="progress-bar-text">${progressPercent}%</span>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onclick="event.stopPropagation()">
          <button onclick="showStatusUpdateModal('${v['Stock #']}')" 
                  class="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button>
          <button onclick="deleteVehicle('${v['Stock #']}')" 
                  class="text-red-600 hover:text-red-900">Delete</button>
        </td>
      </tr>
    `;
  });
  
  el.innerHTML = html;
}

function renderReports() {
  const el = $('reports-content');
  if (!el) return;
  
  // Calculate metrics
  const totalVehicles = currentVehicleData.length;
  const vehiclesInProcess = currentVehicleData.filter(v => v['Status'] !== 'Sold' && v['Status'] !== 'Lot Ready').length;
  const completedThisMonth = currentVehicleData.filter(v => {
    if (v['Status'] === 'Lot Ready' || v['Status'] === 'Sold') {
      const workflow = getWorkflowStatus(v);
      const lotReadyDate = workflow['Lot Ready']?.date;
      if (lotReadyDate) {
        const date = new Date(lotReadyDate);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
    }
    return false;
  }).length;
  
  // Calculate average recon time
  const completedVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready' || v['Status'] === 'Sold');
  let avgReconTime = 'N/A';
  if (completedVehicles.length > 0) {
    const totalDays = completedVehicles.reduce((sum, v) => {
      const workflow = getWorkflowStatus(v);
      const startDate = new Date(workflow['New Arrival']?.date || v['Date In']);
      const endDate = new Date(workflow['Lot Ready']?.date || new Date());
      const days = Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    avgReconTime = Math.round(totalDays / completedVehicles.length) + ' days';
  }
  
  // Update metrics
  const avgTimeEl = $('avgTotalReconTime');
  const inProcessEl = $('vehiclesInProcess');
  const completedEl = $('completedThisMonth');
  
  if (avgTimeEl) avgTimeEl.textContent = avgReconTime;
  if (inProcessEl) inProcessEl.textContent = vehiclesInProcess;
  if (completedEl) completedEl.textContent = completedThisMonth;
}

function renderUpload() {
  // Upload functionality is handled by event listeners
  console.log('Upload tab rendered');
}

function renderDetailers() {
  const el = $('detailer-list');
  if (!el) return;
  
  let html = '';
  detailerNames.forEach(detailer => {
    const assignedVehicles = currentVehicleData.filter(v => v['Detailer'] === detailer);
    const completedCount = assignedVehicles.filter(v => {
      const workflow = getWorkflowStatus(v);
      return workflow['Detailing'].completed;
    }).length;
    
    html += `
      <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
        <div>
          <span class="font-medium">${detailer}</span>
          <span class="text-sm text-gray-500 ml-2">(${assignedVehicles.length} assigned, ${completedCount} completed)</span>
        </div>
        <button onclick="removeDetailer('${detailer}')" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });
  
  el.innerHTML = html;
}

// --- Event Handlers ---
function initializeEventHandlers() {
  // Add vehicle button
  const addVehicleBtn = $('add-vehicle-btn');
  if (addVehicleBtn) {
    addVehicleBtn.onclick = () => showAddVehicleModal();
  }
  
  // Export CSV button
  const exportBtn = $('export-csv-button');
  if (exportBtn) {
    exportBtn.onclick = () => exportToCSV();
  }
  
  // CSV upload
  const csvBtn = $('upload-csv-button');
  if (csvBtn) {
    csvBtn.onclick = () => handleCsvUpload();
  }
  
  // Add detailer button
  const addDetailerBtn = $('add-detailer-button');
  if (addDetailerBtn) {
    addDetailerBtn.onclick = () => addDetailer();
  }
  
  // Search functionality
  const dashboardSearch = $('dashboard-search');
  if (dashboardSearch) {
    dashboardSearch.oninput = () => filterDashboard();
  }
}

// --- Modal Functions ---
function showVehicleDetailModal(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const modal = $('vehicle-timeline-modal') || $('vehicle-detail-modal');
  if (!modal) return;
  
  const workflow = getWorkflowStatus(vehicle);
  
  // Create modal content
  let content = `
    <h3 class="text-xl font-semibold mb-4">${vehicle['Year']} ${vehicle['Make']} ${vehicle['Model']} - ${stockNum}</h3>
    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
      <div><strong>VIN:</strong> ${vehicle['VIN'] || 'N/A'}</div>
      <div><strong>Color:</strong> ${vehicle['Color'] || 'N/A'}</div>
      <div><strong>Date In:</strong> ${formatDate(vehicle['Date In'])}</div>
      <div><strong>Detailer:</strong> ${vehicle['Detailer'] || 'Unassigned'}</div>
    </div>
    
    <h4 class="font-semibold mb-2">Workflow Progress:</h4>
    <div class="space-y-2 mb-4">
  `;
  
  Object.entries(WORKFLOW_STEPS).forEach(([stepName, stepConfig]) => {
    const stepData = workflow[stepName];
    const isCompleted = stepData?.completed;
    const statusClass = isCompleted ? 'text-green-600' : 'text-gray-400';
    const icon = isCompleted ? 'fas fa-check-circle' : 'fas fa-circle';
    
    content += `
      <div class="flex items-center">
        <i class="${icon} ${statusClass} mr-2"></i>
        <span class="${isCompleted ? 'font-medium' : ''}">${stepName}</span>
        ${isCompleted && stepData.date ? `<span class="ml-2 text-xs text-gray-500">(${formatDate(stepData.date)})</span>` : ''}
      </div>
    `;
  });
  
  content += `
    </div>
    <div class="mt-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
      <textarea id="vehicle-notes-${stockNum}" rows="3" 
                class="w-full p-2 border rounded-md">${vehicle['Notes'] || ''}</textarea>
      <button onclick="updateVehicleNotes('${stockNum}')" 
              class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">
        Save Notes
      </button>
    </div>
    <div class="flex justify-end space-x-3 mt-4">
      <button onclick="closeAllModals()" 
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Close</button>
      <button onclick="showStatusUpdateModal('${stockNum}')" 
              class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Update Status</button>
    </div>
  `;
  
  const modalContent = modal.querySelector('.modal-content') || modal.querySelector('#vehicle-detail-content');
  if (modalContent) {
    modalContent.innerHTML = content;
  }
  
  modal.style.display = 'block';
}

function showAddVehicleModal() {
  const modal = $('add-vehicle-modal');
  if (!modal) {
    // Create a simple add vehicle modal if it doesn't exist
    showMessageModal('Add Vehicle', 'Add vehicle functionality is being loaded...');
    return;
  }
  modal.style.display = 'block';
}

function showStatusUpdateModal(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const modal = $('status-update-modal');
  if (!modal) return;
  
  const content = modal.querySelector('#status-update-content') || modal.querySelector('.modal-content');
  if (!content) return;
  
  content.innerHTML = `
    <h3 class="text-xl font-semibold mb-4">Update Status - ${stockNum}</h3>
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">New Status:</label>
      <select id="new-status" class="w-full p-2 border rounded-md">
        ${RECON_STATUSES.map(status => 
          `<option value="${status}" ${status === vehicle['Status'] ? 'selected' : ''}>${status}</option>`
        ).join('')}
      </select>
    </div>
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Notes:</label>
      <textarea id="status-notes" rows="3" class="w-full p-2 border rounded-md" 
                placeholder="Add notes about this status change..."></textarea>
    </div>
    <div class="flex justify-end space-x-3">
      <button onclick="closeAllModals()" 
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
      <button onclick="updateVehicleStatus('${stockNum}')" 
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Update</button>
    </div>
  `;
  
  modal.style.display = 'block';
}

// --- Action Functions ---
function updateVehicleNotes(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const notesEl = $(`vehicle-notes-${stockNum}`);
  if (notesEl) {
    vehicle['Notes'] = notesEl.value;
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    showMessageModal('Success', 'Notes updated successfully!');
  }
}

function updateVehicleStatus(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) return;
  
  const newStatusEl = $('new-status');
  const notesEl = $('status-notes');
  
  if (newStatusEl) {
    const newStatus = newStatusEl.value;
    const notes = notesEl ? notesEl.value : '';
    
    vehicle['Status'] = newStatus;
    vehicle['Last Updated'] = new Date().toISOString();
    
    // Update workflow
    const workflow = getWorkflowStatus(vehicle);
    if (workflow[newStatus]) {
      workflow[newStatus].completed = true;
      workflow[newStatus].date = new Date().toISOString();
      if (notes) {
        workflow[newStatus].notes = notes;
      }
    }
    
    autoSave();
    closeAllModals();
    renderDashboard();
    renderWorkflow();
    renderInventory();
    showMessageModal('Success', `Status updated to "${newStatus}" for vehicle ${stockNum}`);
  }
}

function deleteVehicle(stockNum) {
  if (!confirm(`Are you sure you want to delete vehicle ${stockNum}?`)) return;
  
  const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
  if (index > -1) {
    currentVehicleData.splice(index, 1);
    autoSave();
    renderDashboard();
    renderWorkflow();
    renderInventory();
    showMessageModal('Success', `Vehicle ${stockNum} deleted successfully.`);
  }
}

function exportToCSV() {
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
}

function handleCsvUpload() {
  const fileInput = $('csv-file-input');
  if (!fileInput || !fileInput.files[0]) {
    showMessageModal('Error', 'Please select a CSV file to upload.');
    return;
  }
  
  const file = fileInput.files[0];
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
        renderDashboard();
        renderWorkflow();
        renderInventory();
        showMessageModal('Success', `Imported ${vehicles.length} vehicles from CSV.`);
      } else {
        showMessageModal('Error', 'No valid vehicle data found in CSV file.');
      }
    } catch (error) {
      showMessageModal('Error', 'Failed to parse CSV file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
}

function addDetailer() {
  const nameEl = $('new-detailer-name');
  if (!nameEl) return;
  
  const name = nameEl.value.trim();
  if (!name) {
    showMessageModal('Error', 'Please enter a detailer name.');
    return;
  }
  
  if (detailerNames.includes(name)) {
    showMessageModal('Error', 'Detailer already exists.');
    return;
  }
  
  detailerNames.push(name);
  nameEl.value = '';
  renderDetailers();
  showMessageModal('Success', `Detailer "${name}" added successfully.`);
}

function removeDetailer(name) {
  if (!confirm(`Remove detailer "${name}"?`)) return;
  
  const index = detailerNames.indexOf(name);
  if (index > -1) {
    detailerNames.splice(index, 1);
    renderDetailers();
    showMessageModal('Success', `Detailer "${name}" removed.`);
  }
}

function filterDashboard() {
  // Simple filter implementation
  renderDashboard();
}

// --- Data Persistence ---
function saveDataToStorage() {
  try {
    localStorage.setItem('vehicleReconData', JSON.stringify(currentVehicleData));
    localStorage.setItem('vehicleReconDetailers', JSON.stringify(detailerNames));
    localStorage.setItem('vehicleReconTimestamp', new Date().toISOString());
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
}

function loadDataFromStorage() {
  try {
    const stored = localStorage.getItem('vehicleReconData');
    const storedDetailers = localStorage.getItem('vehicleReconDetailers');
    
    if (storedDetailers) {
      detailerNames = JSON.parse(storedDetailers);
    }
    
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

// Make key functions globally available
window.showVehicleDetailModal = showVehicleDetailModal;
window.showAddVehicleModal = showAddVehicleModal;
window.showStatusUpdateModal = showStatusUpdateModal;
window.updateVehicleNotes = updateVehicleNotes;
window.updateVehicleStatus = updateVehicleStatus;
window.deleteVehicle = deleteVehicle;
window.exportToCSV = exportToCSV;
window.handleCsvUpload = handleCsvUpload;
window.addDetailer = addDetailer;
window.removeDetailer = removeDetailer;
