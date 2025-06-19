// --- Vehicle Reconditioning Tracker App ---
// Complete functional application with modal, workflow, and data management

// --- Global State ---
let currentVehicleData = [];
let activeVehicleId = null;
let statusToUpdateTo = null;
let stageBeingCompletedForForm = null;
let currentSortField = 'Stock #';
let currentSortDirection = 'asc';
let draggedElement = null;

const RECON_STATUSES = [
  'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'
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
      { id: 'email-sent', label: 'Email to Service Manager', description: 'Service request email sent to service manager' },
      { id: 'vehicle-pickup', label: 'Technician Pickup', description: 'Technician has picked up vehicle from lot' },
      { id: 'vehicle-returned', label: 'Vehicle Returned Complete', description: 'Service work complete, vehicle returned to lot' }
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
  
  // Apply enhanced styles first
  applyEnhancedStyles();
  
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
  
  // First try to load from backend
  const backendLoaded = await loadInventoryFromBackend();
  
  if (!backendLoaded) {
    // Fallback to localStorage
    console.log('📂 Loading from localStorage...');
    const storedData = loadDataFromStorage();
    if (storedData && storedData.length > 0) {
      currentVehicleData = storedData;
      console.log(`✅ Loaded ${storedData.length} vehicles from localStorage`);
    } else {
      console.log('ℹ️ No stored data found - starting with empty inventory');
      currentVehicleData = [];
    }
  }
  
  // Ensure all vehicles have condition ratings
  currentVehicleData.forEach(vehicle => {
    if (!vehicle.ExteriorCondition) vehicle.ExteriorCondition = 3;
    if (!vehicle.InteriorCondition) vehicle.InteriorCondition = 3;
  });
  
  // Render initial views
  renderAllTabs();
  showActiveTab('dashboard');
  
  console.log('✅ App initialization complete');
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
          'vehicle-pickup': { completed: false },
          'vehicle-returned': { completed: false }
        }
      },
      'Detailing': { completed: false },
      'Photos': { completed: false },
      'Title': { completed: false, inHouse: false },
      'Lot Ready': { completed: false }
    };
  }
  return vehicle.workflow;
}

function determineCurrentStatus(vehicle) {
  const workflow = getWorkflowStatus(vehicle);
  
  // Out-of-order completion supported - find highest completed step
  if (workflow['Lot Ready'] && workflow['Lot Ready'].completed) return 'Lot Ready';
  if (workflow['Title'] && workflow['Title'].completed) return 'Title';
  if (workflow['Photos'] && workflow['Photos'].completed) return 'Photos';
  if (workflow['Detailing'] && workflow['Detailing'].completed) return 'Detailing';
  if (workflow['Mechanical'] && workflow['Mechanical'].completed) return 'Mechanical';
  
  // Check if we're in mechanical sub-steps
  if (workflow['Mechanical'] && workflow['Mechanical'].subSteps) {
    const subSteps = workflow['Mechanical'].subSteps;
    if (subSteps['email-sent'] && subSteps['email-sent'].completed ||
        subSteps['vehicle-pickup'] && subSteps['vehicle-pickup'].completed ||
        subSteps['vehicle-returned'] && subSteps['vehicle-returned'].completed) {
      return 'Mechanical';
    }
  }
  
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

// --- Essential Missing Functions ---

// Close all modals function
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
}

// Render all tabs function
function renderAllTabs() {
  try {
    renderDashboard();
    renderWorkflow(); 
    renderInventory();
    renderReports();
    renderUpload();
    renderDetailers();
    console.log('✅ All tabs rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering tabs:', error);
  }
}

// Show active tab function  
function showActiveTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab content
  const activeContent = document.getElementById(tabId + '-content');
  if (activeContent) {
    activeContent.classList.add('active');
  }
  
  // Activate selected tab button
  const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// Calculate average condition function
function calculateAverageCondition(vehicles) {
  if (!vehicles || vehicles.length === 0) return 'N/A';
  
  const total = vehicles.reduce((sum, v) => {
    const ext = parseInt(v.ExteriorCondition) || 3;
    const int = parseInt(v.InteriorCondition) || 3;
    return sum + ((ext + int) / 2);
  }, 0);
  
  return (total / vehicles.length).toFixed(1);
}

// Calculate vehicle age function
function calculateVehicleAge(dateIn) {
  if (!dateIn) return 'N/A';
  
  const entryDate = new Date(dateIn);
  const today = new Date();
  const diffTime = Math.abs(today - entryDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Update vehicle ages function
function updateVehicleAges() {
  currentVehicleData.forEach(vehicle => {
    vehicle.Age = calculateVehicleAge(vehicle['Date In']);
  });
}

// Complete calculate bottlenecks function
function calculateBottlenecks() {
  const stepTimes = {};
  const stepCounts = {};
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    stepCounts[status] = vehicles.length;
    
    if (vehicles.length > 0) {
      const avgAge = vehicles.reduce((sum, v) => {
        return sum + (calculateVehicleAge(v['Date In']) || 0);
      }, 0) / vehicles.length;
      
      stepTimes[status] = Math.round(avgAge);
    } else {
      stepTimes[status] = 0;
    }
  });
  
  // Find bottleneck (step with most vehicles or longest time)
  let bottleneckStep = 'None';
  let maxVehicles = 0;
  
  Object.entries(stepCounts).forEach(([step, count]) => {
    if (count > maxVehicles) {
      maxVehicles = count;
      bottleneckStep = step;
    }
  });
  
  return {
    stepCounts,
    stepTimes,
    bottleneckStep,
    maxVehicles
  };
}

// --- Rendering Functions ---

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
  
  let html = '<h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Dashboard Overview</h2>';
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">';
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorClass = getStatusColor(status);
    html += `<div class="metrics-card text-center ${colorClass}">
      <div class="text-2xl font-bold">${count}</div>
      <div class="text-sm font-semibold">${status}</div>
    </div>`;
  });
  
  html += '</div>';
  
  // Enhanced Recent vehicles with more details
  html += '<h3 class="text-xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Recent Vehicles</h3>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
  
  currentVehicleData.slice(0, 6).forEach(v => {
    const exteriorRating = getConditionRating(v.ExteriorCondition || 3);
    const interiorRating = getConditionRating(v.InteriorCondition || 3);
    const workflow = getWorkflowStatus(v);
    const completedSteps = Object.values(workflow).filter(step => step.completed).length;
    const totalSteps = Object.keys(workflow).length;
    const progressPercent = (completedSteps / totalSteps) * 100;
    
    html += `<div class="vehicle-card cursor-pointer" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <div class="mb-3">
        <div class="font-bold text-lg text-gray-800">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-sm text-gray-600 font-medium">Stock #: ${v['Stock #']}</div>
        <div class="text-sm text-gray-600">VIN: ${v['VIN'] ? v['VIN'].substring(0, 8) + '...' : 'N/A'}</div>
      </div>
      
      <div class="grid grid-cols-2 gap-3 mb-3">
        <div class="text-center p-2 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">Color</div>
          <div class="text-sm font-medium">${v['Color'] || 'N/A'}</div>
        </div>
        <div class="text-center p-2 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">Odometer</div>
          <div class="text-sm font-medium">${v['Odometer'] ? parseInt(v['Odometer']).toLocaleString() : 'N/A'}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-2 mb-3">
        <div class="condition-rating p-2 border border-gray-200 rounded text-center">
          <span class="text-xs text-gray-500">Exterior:</span>
          <div>${exteriorRating}</div>
        </div>
        <div class="condition-rating p-2 border border-gray-200 rounded text-center">
          <span class="text-xs text-gray-500">Interior:</span>
          <div>${interiorRating}</div>
        </div>
      </div>
      
      <div class="mb-3">
        <div class="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>${completedSteps}/${totalSteps} (${Math.round(progressPercent)}%)</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      
      <div class="flex justify-between items-center">
        <span class="status-badge ${getStatusColor(v['Status'])}">${v['Status']}</span>
        <div class="text-xs text-gray-500">${formatDate(v['Date In'])}</div>
      </div>
    </div>`;
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderWorkflow() {
  const el = $('workflow-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Workflow Board <span class="text-sm font-normal text-gray-600">(Drag & Drop to Move Vehicles)</span></h2>';
  html += '<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    const stepInfo = WORKFLOW_STEPS[status] || { icon: 'fas fa-circle', color: 'blue' };
    
    html += `<div class="workflow-column" data-status="${status}">
      <div class="workflow-header p-3 text-center border-b-2 border-${stepInfo.color}-500">
        <i class="${stepInfo.icon} mr-2 text-${stepInfo.color}-600"></i>
        <h3 class="font-bold text-${stepInfo.color}-800">${status}</h3>
        <div class="text-sm opacity-90">(${vehicles.length} vehicles)</div>
      </div>
      <div class="p-3 min-h-[400px]">`;
    
    if (vehicles.length === 0) {
      html += `<div class="drop-zone" data-status="${status}">
        <i class="fas fa-plus-circle text-2xl mb-2 text-gray-400"></i>
        <div class="text-gray-500">Drop vehicles here</div>
      </div>`;
    } else {
      vehicles.forEach(v => {
        const exteriorRating = getConditionRating(v.ExteriorCondition || 3);
        const interiorRating = getConditionRating(v.InteriorCondition || 3);
        const workflow = getWorkflowStatus(v);
        const completedSteps = Object.values(workflow).filter(step => step.completed).length;
        const totalSteps = Object.keys(workflow).length;
        const progressPercent = (completedSteps / totalSteps) * 100;
        
        html += `<div class="draggable-vehicle" 
                     draggable="true" 
                     data-stock="${v['Stock #']}" 
                     onclick="window.showVehicleDetailModal('${v['Stock #']}')">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold text-sm text-gray-800">${v['Year']} ${v['Make']}</div>
              <div class="text-xs text-gray-600">${v['Model']}</div>
              <div class="text-xs text-gray-500 font-medium">Stock: ${v['Stock #']}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Age: ${v['Age'] || 'N/A'}d</div>
              <div class="text-xs text-gray-600">${v['Color'] || 'N/A'}</div>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-1 mb-2 text-xs">
            <div class="condition-rating">
              <span class="text-gray-500">Ext:</span>
              <div class="rating-stars scale-75">
                ${[1,2,3,4,5].map(i => 
                  `<span class="rating-star ${i <= (v.ExteriorCondition || 3) ? 'active' : ''}">★</span>`
                ).join('')}
              </div>
            </div>
            <div class="condition-rating">
              <span class="text-gray-500">Int:</span>
              <div class="rating-stars scale-75">
                ${[1,2,3,4,5].map(i => 
                  `<span class="rating-star ${i <= (v.InteriorCondition || 3) ? 'active' : ''}">★</span>`
                ).join('')}
              </div>
            </div>
          </div>
          
          <div class="mb-2">
            <div class="flex justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span>${Math.round(progressPercent)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          
          <div class="flex justify-between items-center">
            <div class="text-xs text-gray-500">In: ${formatDate(v['Date In'])}</div>
            <i class="fas fa-grip-lines text-gray-400 cursor-move"></i>
          </div>
        </div>`;
      });
      
      // Add drop zone at the bottom of each column
      html += `<div class="drop-zone mt-2" data-status="${status}">
        <i class="fas fa-plus text-gray-400"></i>
        <div class="text-xs text-gray-500">Drop here</div>
      </div>`;
    }
    
    html += '</div></div>';
  });
  
  html += '</div>';
  el.innerHTML = html;
  
  // Enable drag and drop after rendering
  setTimeout(() => enableDragAndDrop(), 100);
}

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  
  let html = `<div class="mb-6 flex justify-between items-center">
    <h2 class="text-2xl font-bold text-gray-800">Inventory Management</h2>
    <div class="space-x-2">
      <button class="button-enhanced action-button action-button-primary" onclick="window.showAddVehicleModal()">
        <i class="fas fa-plus mr-2"></i>Add Vehicle
      </button>
      <button class="button-enhanced action-button action-button-secondary" onclick="window.exportToCSV()">
        <i class="fas fa-download mr-2"></i>Export CSV
      </button>
    </div>
  </div>`;
  
  html += `<div class="inventory-table overflow-x-auto">
    <table class="min-w-full bg-white text-xs">
      <thead>
        <tr>
          <th class="px-3 py-3 text-left font-medium text-gray-700 uppercase tracking-wider sort-header ${currentSortField === 'Stock #' ? 'sort-' + currentSortDirection : ''}" onclick="sortInventory('Stock #')">Stock #</th>
          <th class="px-3 py-3 text-left font-medium text-gray-700 uppercase tracking-wider sort-header ${currentSortField === 'Year' ? 'sort-' + currentSortDirection : ''}" onclick="sortInventory('Year')">Vehicle</th>
          <th class="px-3 py-3 text-left font-medium text-gray-700 uppercase tracking-wider sort-header ${currentSortField === 'Status' ? 'sort-' + currentSortDirection : ''}" onclick="sortInventory('Status')">Status</th>
          <th class="px-3 py-3 text-center font-medium text-gray-700 uppercase tracking-wider">Mech</th>
          <th class="px-3 py-3 text-center font-medium text-gray-700 uppercase tracking-wider">Detail</th>
          <th class="px-3 py-3 text-center font-medium text-gray-700 uppercase tracking-wider">Photos</th>
          <th class="px-3 py-3 text-center font-medium text-gray-700 uppercase tracking-wider">Title</th>
          <th class="px-3 py-3 text-left font-medium text-gray-700 uppercase tracking-wider sort-header ${currentSortField === 'ExteriorCondition' ? 'sort-' + currentSortDirection : ''}" onclick="sortInventory('ExteriorCondition')">Condition</th>
          <th class="px-3 py-3 text-left font-medium text-gray-700 uppercase tracking-wider sort-header ${currentSortField === 'Age' ? 'sort-' + currentSortDirection : ''}" onclick="sortInventory('Age')">Age/Details</th>
          <th class="px-3 py-3 text-center font-medium text-gray-700 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">`;
  
  currentVehicleData.forEach(v => {
    const workflow = getWorkflowStatus(v);
    const exteriorRating = getConditionRating(v.ExteriorCondition || 3);
    const interiorRating = getConditionRating(v.InteriorCondition || 3);
    const completedSteps = Object.values(workflow).filter(step => step.completed).length;
    const totalSteps = Object.keys(workflow).length;
    const progressPercent = (completedSteps / totalSteps) * 100;
    
    html += `<tr class="hover:bg-blue-50 cursor-pointer transition-colors duration-200" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-3 py-3 font-bold text-gray-900 text-sm">${v['Stock #']}</td>
      <td class="px-3 py-3">
        <div class="font-bold text-sm text-gray-900">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-xs text-gray-600 font-medium">${v['Color'] || 'N/A'} • ${v['Odometer'] ? parseInt(v['Odometer']).toLocaleString() + ' mi' : 'N/A'}</div>
        <div class="text-xs text-gray-500">VIN: ${v['VIN'] ? v['VIN'].substring(0, 8) + '...' : 'N/A'}</div>
      </td>
      <td class="px-3 py-3">
        <div class="mb-1">
          <span class="status-badge px-2 py-1 rounded text-xs font-medium ${getStatusColor(v['Status'])}">${v['Status']}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-1">
          <div class="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full" style="width: ${progressPercent}%"></div>
        </div>
        <div class="text-xs text-gray-500 mt-1">${Math.round(progressPercent)}% Complete</div>
      </td>
      <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Mechanical'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Mechanical')"
               class="form-checkbox h-4 w-4 text-blue-600 enhanced-border">
      </td>
      <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Detailing'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Detailing')"
               class="form-checkbox h-4 w-4 text-purple-600 enhanced-border">
      </td>
      <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Photos'].completed ? 'checked' : ''} 
               onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Photos')"
               class="form-checkbox h-4 w-4 text-pink-600 enhanced-border">
      </td>
      <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
        <input type="checkbox" ${workflow['Title'].inHouse ? 'checked' : ''} 
               onchange="window.toggleTitleInHouse('${v['Stock #']}')"
               class="form-checkbox h-4 w-4 text-orange-600 enhanced-border"
               title="Title In House">
      </td>
      <td class="px-3 py-3">
        <div class="space-y-1">
          <div class="condition-rating">
            <span class="text-xs font-medium">Ext:</span> ${exteriorRating}
          </div>
          <div class="condition-rating">
            <span class="text-xs font-medium">Int:</span> ${interiorRating}
          </div>
        </div>
      </td>
      <td class="px-3 py-3">
        <div class="text-xs">
          <div class="font-medium text-gray-900">${v['Age'] || 'N/A'} days</div>
          <div class="text-gray-600">In: ${formatDate(v['Date In'])}</div>
          <div class="text-gray-500">Cost: ${v['Unit Cost'] || 'N/A'}</div>
        </div>
      </td>
      <td class="px-3 py-3 text-center" onclick="event.stopPropagation()">
        <div class="flex justify-center space-x-1">
          <button onclick="window.showVehicleDetailModal('${v['Stock #']}')" 
                  class="button-enhanced px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="window.showConditionModal('${v['Stock #']}')" 
                  class="button-enhanced px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors" title="Update Condition">
            <i class="fas fa-star"></i>
          </button>
          <button onclick="window.deleteVehicle('${v['Stock #']}')" 
                  class="button-enhanced px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors" title="Delete Vehicle">
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
  
  // Update vehicle ages first
  updateVehicleAges();
  
  // Calculate comprehensive metrics
  const totalVehicles = currentVehicleData.length;
  const soldVehicles = currentVehicleData.filter(v => v['Status'] === 'Sold').length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Calculate bottleneck analysis
  const bottlenecks = calculateBottlenecks();
  
  // Calculate average condition
  const avgCondition = calculateAverageCondition(currentVehicleData);
  
  // Calculate photo-related metrics
  const vehiclesWithPhotos = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow['Photos'].completed;
  }).length;
  
  const vehiclesNeedingPhotos = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow['Detailing'].completed && !workflow['Photos'].completed && v['Status'] !== 'Lot Ready';
  });
  
  let html = '<h2 class="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-2">Comprehensive Analytics Dashboard</h2>';
  
  // Key Metrics Section
  html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">';
  html += `<div class="metrics-card bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-blue-500">
    <div class="text-3xl font-bold text-blue-600">${totalVehicles}</div>
    <div class="text-sm font-semibold text-gray-700">Total Vehicles</div>
  </div>`;
  html += `<div class="metrics-card bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-green-500">
    <div class="text-3xl font-bold text-green-600">${lotReadyVehicles}</div>
    <div class="text-sm font-semibold text-gray-700">Lot Ready</div>
  </div>`;
  html += `<div class="metrics-card bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-orange-500">
    <div class="text-3xl font-bold text-orange-600">${avgCondition}</div>
    <div class="text-sm font-semibold text-gray-700">Avg Condition</div>
  </div>`;
  html += `<div class="metrics-card bg-white p-6 rounded-lg shadow-lg text-center border-l-4 border-purple-500">
    <div class="text-3xl font-bold text-purple-600">${vehiclesNeedingPhotos.length}</div>
    <div class="text-sm font-semibold text-gray-700">Need Photos</div>
  </div>`;
  html += '</div>';
  
  // Bottleneck Analysis
  html += '<div class="bg-white p-6 rounded-lg shadow-lg mb-8">';
  html += '<h3 class="text-xl font-bold mb-4 text-gray-800">🚨 Bottleneck Analysis</h3>';
  
  if (bottlenecks.maxVehicles > 0) {
    html += `<div class="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <h4 class="font-bold text-red-800">Current Bottleneck: ${bottlenecks.bottleneckStep}</h4>
      <p class="text-red-700">${bottlenecks.maxVehicles} vehicles are waiting in this stage</p>
    </div>`;
  } else {
    html += '<div class="bg-green-50 border-l-4 border-green-500 p-4 mb-4"><p class="text-green-700">No significant bottlenecks detected!</p></div>';
  }
  
  // Step breakdown
  html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
  Object.entries(bottlenecks.stepCounts).forEach(([step, count]) => {
    const isBottleneck = step === bottlenecks.bottleneckStep;
    html += `<div class="p-3 rounded ${isBottleneck ? 'bg-red-100 border-red-300' : 'bg-gray-100'} border">
      <div class="font-bold">${step}</div>
      <div class="text-sm">${count} vehicles</div>
      <div class="text-xs text-gray-600">Avg: ${bottlenecks.stepTimes[step]} days</div>
    </div>`;
  });
  html += '</div></div>';
  
  // Status Distribution Chart
  html += '<div class="bg-white p-6 rounded-lg shadow-lg mb-8">';
  html += '<h3 class="text-xl font-bold mb-4 text-gray-800">📊 Status Distribution</h3>';
  html += '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const count = currentVehicleData.filter(v => v['Status'] === status).length;
    const percentage = totalVehicles > 0 ? ((count / totalVehicles) * 100).toFixed(1) : 0;
    const stepInfo = WORKFLOW_STEPS[status] || { icon: 'fas fa-circle', color: 'blue' };
    
    html += `<div class="text-center p-4 bg-${stepInfo.color}-50 rounded-lg">
      <i class="${stepInfo.icon} text-2xl text-${stepInfo.color}-600 mb-2"></i>
      <div class="text-2xl font-bold text-${stepInfo.color}-800">${count}</div>
      <div class="text-sm text-${stepInfo.color}-700">${status}</div>
      <div class="text-xs text-${stepInfo.color}-600">${percentage}%</div>
    </div>`;
  });
  
  html += '</div>';
  html += '</div>';
  
  el.innerHTML = html;
}

// --- Application Initialization ---
function initializeApp() {
  console.log('🚀 Initializing Vehicle Reconditioning Tracker...');
  
  // Load sample data if no data exists
  if (currentVehicleData.length === 0) {
    loadSampleData();
  } else {
    renderAllTabs();
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize first tab
  showActiveTab('dashboard');
  
  console.log('✅ Application initialized successfully');
}

function loadSampleData() {
  console.log('📂 Loading sample data...');
  
  fetch('./sample-inventory.csv')
    .then(response => response.text())
    .then(csvText => {
      const parsedData = parseCSV(csvText);
      if (parsedData && parsedData.length > 0) {
        currentVehicleData = parsedData;
        updateVehicleAges();
        renderAllTabs();
        console.log(`✅ Loaded ${parsedData.length} sample vehicles`);
        
        // Show welcome message
        setTimeout(() => {
          showMessageModal(
            'Welcome to Vehicle Reconditioning Tracker', 
            `Sample data loaded with ${parsedData.length} vehicles. You can upload your own CSV file from the Upload tab.`
          );
        }, 1000);
      } else {
        console.log('⚠️ No sample data found, starting with empty inventory');
        renderAllTabs();
      }
    })
    .catch(error => {
      console.error('❌ Error loading sample data:', error);
      renderAllTabs();
    });
}

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      showActiveTab(tabId);
    });
  });
  
  // Modal close handlers
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
  
  // Escape key to close modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);