// Vehicle Reconditioning Tracker - Working Version
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

function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
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

function formatDuration(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

// --- Data Management Functions ---
function loadDataFromStorage() {
  try {
    const saved = localStorage.getItem('vehicleReconData');
    if (saved) {
      const data = JSON.parse(saved);
      console.log('✅ Loaded from localStorage:', data.length, 'vehicles');
      return data;
    }
  } catch (error) {
    console.error('❌ Error loading from localStorage:', error);
  }
  return [];
}

function saveDataToStorage(data) {
  try {
    localStorage.setItem('vehicleReconData', JSON.stringify(data));
    console.log('✅ Saved to localStorage:', data.length, 'vehicles');
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);
  }
}

function autoSave() {
  saveDataToStorage(currentVehicleData);
}

function getConditionRating(rating) {
  const stars = '★'.repeat(rating || 3) + '☆'.repeat(5 - (rating || 3));
  return `<span class="text-yellow-500">${stars}</span>`;
}

// --- Sample Data ---
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
      'Date In': '2025-05-19',
      'Notes': 'Test vehicle for workflow demo',
      'Odometer': '45000',
      'Unit Cost': '$18000',
      'ExteriorCondition': 4,
      'InteriorCondition': 3,
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
      'Date In': '2025-05-20',
      'Notes': 'Ready for detail work',
      'Odometer': '32000',
      'Unit Cost': '$22000',
      'ExteriorCondition': 5,
      'InteriorCondition': 4,
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
      'Date In': '2025-05-15',
      'Notes': 'Ready for sale',
      'Odometer': '28000',
      'Unit Cost': '$24000',
      'ExteriorCondition': 5,
      'InteriorCondition': 5,
      'Last Updated': new Date().toISOString()
    }
  ];
}

// --- Workflow Management ---
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

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 App initializing...');
  
  try {
    // Initialize global systems
    if (window.DataManager) {
      window.dataManager = new window.DataManager();
      console.log('✅ Data Manager initialized');
    } else {
      console.warn('⚠️ Data Manager not available');
    }
    
    if (window.NotificationSystem) {
      window.notificationSystem = new window.NotificationSystem();
      console.log('✅ Notification System initialized');
    } else {
      console.warn('⚠️ Notification System not available');
    }
    
    // Set up tab switching event listeners
    const tabButtons = document.querySelectorAll('.tab-button');
    console.log(`Found ${tabButtons.length} tab buttons`);
    
    tabButtons.forEach(tab => {
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
    console.log('📂 Loading initial data...');
    
    try {
      // Try to load from localStorage first
      const storedData = loadDataFromStorage();
      if (storedData && storedData.length > 0) {
        currentVehicleData = storedData;
        console.log(`✅ Loaded ${storedData.length} vehicles from localStorage`);
      } else {
        console.log('ℹ️ No stored data found - using sample data');
        currentVehicleData = getSampleData();
        autoSave();
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      currentVehicleData = getSampleData();
      autoSave();
    }
    
    // Ensure all vehicles have condition ratings and age
    console.log('🔧 Processing vehicle data...');
    currentVehicleData.forEach(vehicle => {
      if (!vehicle.ExteriorCondition) vehicle.ExteriorCondition = 3;
      if (!vehicle.InteriorCondition) vehicle.InteriorCondition = 3;
      if (!vehicle['Age']) {
        const dateIn = new Date(vehicle['Date In'] || new Date());
        const now = new Date();
        vehicle['Age'] = Math.floor((now - dateIn) / (1000 * 60 * 60 * 24));
      }
    });
    
    console.log(`📊 Processing complete. ${currentVehicleData.length} vehicles ready`);
    
    // Render initial views
    console.log('🎨 Rendering initial views...');
    renderAllTabs();
    
    // Show dashboard by default
    console.log('📱 Showing dashboard tab...');
    switchTab('dashboard');
    
    console.log('✅ App initialization complete');
    
  } catch (error) {
    console.error('❌ Critical initialization error:', error);
    
    // Show error message to user
    document.body.innerHTML = `
      <div class="container mx-auto p-4">
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong class="font-bold">Application Error:</strong>
          <span class="block sm:inline"> ${error.message}</span>
        </div>
        <button onclick="location.reload()" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Reload Application
        </button>
      </div>
    `;
  }
});

function switchTab(tabId) {
  console.log(`Switching to tab: ${tabId}`);
  
  try {
    // Deactivate all tabs and content
    const allTabButtons = document.querySelectorAll('.tab-button');
    const allTabContent = document.querySelectorAll('.tab-content');
    
    console.log(`Found ${allTabButtons.length} tab buttons and ${allTabContent.length} tab content areas`);
    
    // Reset all tab buttons
    allTabButtons.forEach(btn => {
      btn.classList.remove('bg-sky-500', 'text-white');
      btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    // Reset all tab content
    allTabContent.forEach(content => {
      content.classList.remove('active');
    });
    
    // Activate selected tab button
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.remove('bg-gray-200', 'text-gray-700');
      activeTab.classList.add('bg-sky-500', 'text-white');
      console.log(`✅ Activated tab button: ${tabId}`);
    } else {
      console.error(`❌ Tab button not found: ${tabId}`);
    }
    
    // Activate selected tab content
    const activeContent = $(tabId + '-content');
    if (activeContent) {
      activeContent.classList.add('active');
      console.log(`✅ Activated tab content: ${tabId}`);
    } else {
      console.error(`❌ Tab content not found: ${tabId}-content`);
    }
    
    // Render content based on tab
    console.log(`🎨 Rendering content for: ${tabId}`);
    switch (tabId) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'workflow':
        renderWorkflow();
        break;
      case 'inventory':
        renderInventory();
        break;
      case 'reports':
        renderReports();
        break;
      case 'upload':
        renderUpload();
        break;
      case 'detailers':
        renderDetailers();
        break;
      default:
        console.warn(`Unknown tab: ${tabId}`);
    }
    
  } catch (error) {
    console.error(`❌ Error switching to tab ${tabId}:`, error);
  }
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
  
  let html = '<h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Dashboard Overview</h2>';
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">';
  
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorClass = getStatusColor(status);
    html += `<div class="bg-white p-4 rounded-lg shadow border-2 border-gray-200 text-center ${colorClass}">
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
    
    html += `<div class="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-300 hover:border-blue-500 cursor-pointer transition-all duration-300" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
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
        <div class="p-2 border border-gray-200 rounded text-center">
          <span class="text-xs text-gray-500">Exterior:</span>
          <div>${exteriorRating}</div>
        </div>
        <div class="p-2 border border-gray-200 rounded text-center">
          <span class="text-xs text-gray-500">Interior:</span>
          <div>${interiorRating}</div>
        </div>
      </div>
      
      <div class="flex justify-between items-center">
        <span class="px-2 py-1 rounded text-xs font-medium ${getStatusColor(v['Status'])}">${v['Status']}</span>
        <div class="text-xs text-gray-500">
          <div>In: ${formatDate(v['Date In'])}</div>
          <div>Age: ${v['Age'] || 'N/A'} days</div>
        </div>
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
    
    html += `<div class="bg-white rounded-lg shadow-lg border-2 border-gray-300 min-h-96" data-status="${status}">
      <div class="bg-${stepInfo.color}-500 text-white p-3 rounded-t-lg text-center">
        <i class="${stepInfo.icon} mr-2"></i>
        <h3 class="font-bold">${status}</h3>
        <div class="text-sm opacity-90">(${vehicles.length} vehicles)</div>
      </div>
      <div class="p-3">`;
    
    if (vehicles.length === 0) {
      html += `<div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 min-h-32">
        <i class="fas fa-plus-circle text-2xl mb-2"></i>
        <div>Drop vehicles here</div>
      </div>`;
    } else {
      vehicles.forEach(v => {
        const exteriorRating = getConditionRating(v.ExteriorCondition || 3);
        const interiorRating = getConditionRating(v.InteriorCondition || 3);
        
        html += `<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 hover:shadow-md cursor-pointer transition-all duration-200" 
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
            <div>
              <span class="text-gray-500">Ext:</span>
              <div class="text-xs">${exteriorRating}</div>
            </div>
            <div>
              <span class="text-gray-500">Int:</span>
              <div class="text-xs">${interiorRating}</div>
            </div>
          </div>
          
          <div class="flex justify-between items-center">
            <div class="text-xs text-gray-500">In: ${formatDate(v['Date In'])}</div>
            <i class="fas fa-grip-lines text-gray-400"></i>
          </div>
        </div>`;
      });
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
    <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-blue-500 pb-2">Inventory Management</h2>
    <div class="space-x-2">
      <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors border-2 border-blue-600" onclick="window.showAddVehicleModal()">
        <i class="fas fa-plus mr-2"></i>Add Vehicle
      </button>
      <button class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors border-2 border-gray-600" onclick="window.exportToCSV()">
        <i class="fas fa-download mr-2"></i>Export CSV
      </button>
    </div>
  </div>`;
  
  html += `<div class="bg-white rounded-lg shadow-lg border-2 border-gray-300 overflow-hidden">
    <table class="min-w-full text-sm">
      <thead class="bg-gray-50 border-b-2 border-gray-200">
        <tr>
          <th class="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100" onclick="sortInventory('Stock #')">Stock #</th>
          <th class="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100" onclick="sortInventory('Year')">Vehicle</th>
          <th class="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100" onclick="sortInventory('Status')">Status</th>
          <th class="px-4 py-3 text-center font-medium text-gray-700 border-r border-gray-200">Condition</th>
          <th class="px-4 py-3 text-center font-medium text-gray-700 border-r border-gray-200">Age/Details</th>
          <th class="px-4 py-3 text-center font-medium text-gray-700">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">`;
  
  currentVehicleData.forEach(v => {
    const exteriorRating = getConditionRating(v.ExteriorCondition || 3);
    const interiorRating = getConditionRating(v.InteriorCondition || 3);
    
    html += `<tr class="hover:bg-blue-50 cursor-pointer transition-colors duration-200 border-b border-gray-200" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-4 py-3 font-bold text-gray-900 border-r border-gray-200">${v['Stock #']}</td>
      <td class="px-4 py-3 border-r border-gray-200">
        <div class="font-bold text-sm text-gray-900">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-xs text-gray-600">${v['Color'] || 'N/A'} • ${v['Odometer'] ? parseInt(v['Odometer']).toLocaleString() + ' mi' : 'N/A'}</div>
        <div class="text-xs text-gray-500">VIN: ${v['VIN'] ? v['VIN'].substring(0, 8) + '...' : 'N/A'}</div>
      </td>
      <td class="px-4 py-3 border-r border-gray-200">
        <span class="px-2 py-1 rounded text-xs font-medium ${getStatusColor(v['Status'])}">${v['Status']}</span>
      </td>
      <td class="px-4 py-3 border-r border-gray-200">
        <div class="space-y-1 text-center">
          <div><span class="text-xs font-medium">Ext:</span> ${exteriorRating}</div>
          <div><span class="text-xs font-medium">Int:</span> ${interiorRating}</div>
        </div>
      </td>
      <td class="px-4 py-3 border-r border-gray-200">
        <div class="text-xs text-center">
          <div class="font-medium text-gray-900">${v['Age'] || 'N/A'} days</div>
          <div class="text-gray-600">In: ${formatDate(v['Date In'])}</div>
          <div class="text-gray-500">Cost: ${v['Unit Cost'] || 'N/A'}</div>
        </div>
      </td>
      <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
        <div class="flex justify-center space-x-1">
          <button onclick="window.showVehicleDetailModal('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors border border-blue-600" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="window.showConditionModal('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors border border-purple-600" title="Update Condition">
            <i class="fas fa-star"></i>
          </button>
          <button onclick="window.deleteVehicle('${v['Stock #']}')" 
                  class="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors border border-red-600" title="Delete Vehicle">
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
  
  // Calculate comprehensive metrics
  const totalVehicles = currentVehicleData.length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Calculate average condition
  const avgExterior = currentVehicleData.reduce((sum, v) => sum + (v.ExteriorCondition || 3), 0) / totalVehicles;
  const avgInterior = currentVehicleData.reduce((sum, v) => sum + (v.InteriorCondition || 3), 0) / totalVehicles;
  const avgCondition = ((avgExterior + avgInterior) / 2).toFixed(1);
  
  let html = '<h2 class="text-2xl font-bold mb-6 text-gray-800 border-b-2 border-blue-500 pb-2">Comprehensive Analytics Dashboard</h2>';
  
  // Key Metrics Section
  html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">';
  html += `<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 text-center">
    <div class="text-3xl font-bold text-blue-600">${totalVehicles}</div>
    <div class="text-sm font-semibold text-gray-700">Total Vehicles</div>
  </div>`;
  html += `<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 text-center">
    <div class="text-3xl font-bold text-green-600">${lotReadyVehicles}</div>
    <div class="text-sm font-semibold text-gray-700">Lot Ready</div>
  </div>`;
  html += `<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 text-center">
    <div class="text-3xl font-bold text-orange-600">${avgCondition}</div>
    <div class="text-sm font-semibold text-gray-700">Avg Condition</div>
  </div>`;
  html += `<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 text-center">
    <div class="text-3xl font-bold text-purple-600">${Math.round((lotReadyVehicles / totalVehicles) * 100)}%</div>
    <div class="text-sm font-semibold text-gray-700">Completion Rate</div>
  </div>`;
  html += '</div>';
  
  // Status Breakdown
  html += '<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300 mb-6">';
  html += '<h3 class="text-xl font-bold mb-4 text-gray-800">Status Breakdown</h3>';
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const count = currentVehicleData.filter(v => v['Status'] === status).length;
    const percentage = totalVehicles > 0 ? Math.round((count / totalVehicles) * 100) : 0;
    
    html += `<div class="text-center p-3 border border-gray-200 rounded">
      <div class="text-xl font-bold ${getStatusColor(status).replace('bg-', 'text-').replace('-100', '-600')}">${count}</div>
      <div class="text-sm font-medium text-gray-700">${status}</div>
      <div class="text-xs text-gray-500">${percentage}%</div>
    </div>`;
  });
  
  html += '</div></div>';
  
  el.innerHTML = html;
}

function renderUpload() {
  const el = $('upload-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Data Import/Export & Backup</h2>';
  html += '<div class="space-y-6">';
  
  // Data Protection Section
  html += '<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">';
  html += '<h3 class="text-lg font-semibold mb-4 flex items-center">';
  html += '<i class="fas fa-shield-alt text-blue-600 mr-2"></i>Data Protection';
  html += '</h3>';
  html += '<p class="text-gray-600 mb-4">Protect your data from browser cache clearing and accidental loss with our backup system.</p>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
  html += '<button onclick="window.showBackupModal()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors border-2 border-blue-600">';
  html += '<i class="fas fa-download mr-2"></i>Backup & Recovery Center';
  html += '</button>';
  html += '<div class="text-sm text-gray-600">';
  html += '<div><strong>Auto-backup:</strong> Every 30 minutes</div>';
  html += '<div><strong>Protection:</strong> Browser cache clearing</div>';
  html += '<div><strong>Recovery:</strong> Instant restore options</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';
  
  // Import Section
  html += '<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">';
  html += '<h3 class="text-lg font-semibold mb-4 flex items-center">';
  html += '<i class="fas fa-file-import text-green-600 mr-2"></i>Import CSV File';
  html += '</h3>';
  html += '<input type="file" id="csv-upload" accept=".csv" class="mb-4 border-2 border-gray-300 rounded p-2 w-full">';
  html += '<button onclick="window.handleCsvUpload()" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors border-2 border-green-600">';
  html += '<i class="fas fa-upload mr-2"></i>Import CSV';
  html += '</button>';
  html += '</div>';
  
  // Export Section
  html += '<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">';
  html += '<h3 class="text-lg font-semibold mb-4 flex items-center">';
  html += '<i class="fas fa-file-export text-purple-600 mr-2"></i>Export Data';
  html += '</h3>';
  html += '<div class="space-x-2">';
  html += '<button onclick="window.exportToCSV()" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors border-2 border-purple-600">';
  html += '<i class="fas fa-download mr-2"></i>Export to CSV';
  html += '</button>';
  html += '<button onclick="window.clearAllData()" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors border-2 border-red-600">';
  html += '<i class="fas fa-trash mr-2"></i>Clear All Data';
  html += '</button>';
  html += '</div>';
  html += '</div>';
  
  html += '</div>';
  
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-blue-500 pb-2">Vehicle Condition Management</h2>';
  html += '<div class="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-300">';
  html += '<p class="text-gray-600 mb-4">This section now manages vehicle condition ratings instead of detailer assignments.</p>';
  html += '<p class="text-gray-600">Use the condition rating system (1-5 stars) for both exterior and interior condition assessments.</p>';
  html += '</div>';
  
  el.innerHTML = html;
}

// --- Helper Functions ---
function enableDragAndDrop() {
  const draggableElements = document.querySelectorAll('[draggable="true"]');
  const dropZones = document.querySelectorAll('[data-status]');
  
  draggableElements.forEach(element => {
    element.addEventListener('dragstart', (e) => {
      draggedElement = e.target;
      e.target.style.opacity = '0.5';
    });
    
    element.addEventListener('dragend', (e) => {
      e.target.style.opacity = '1';
      draggedElement = null;
    });
  });
  
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('border-blue-500');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('border-blue-500');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('border-blue-500');
      
      if (draggedElement) {
        const stockNum = draggedElement.getAttribute('data-stock');
        const newStatus = zone.getAttribute('data-status');
        
        if (stockNum && newStatus) {
          updateVehicleStatus(stockNum, newStatus);
        }
      }
    });
  });
}

function updateVehicleStatus(stockNum, newStatus) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (vehicle) {
    vehicle['Status'] = newStatus;
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    renderAllTabs();
    
    if (window.notificationSystem) {
      window.notificationSystem.showToast(`Vehicle ${stockNum} moved to ${newStatus}`, 'success');
    } else {
      showMessageModal('Success', `Vehicle ${stockNum} moved to ${newStatus}`);
    }
  }
}

function sortInventory(field) {
  if (currentSortField === field) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortField = field;
    currentSortDirection = 'asc';
  }
  
  currentVehicleData.sort((a, b) => {
    let aVal = a[field] || '';
    let bVal = b[field] || '';
    
    // Handle numeric fields
    if (['Year', 'Age', 'ExteriorCondition', 'InteriorCondition'].includes(field)) {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }
    
    if (currentSortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  renderInventory();
}

// --- Modal Functions ---
window.showVehicleDetailModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) {
    showMessageModal('Error', 'Vehicle not found');
    return;
  }
  
  const modal = $('vehicle-detail-modal') || createVehicleDetailModal();
  
  modal.innerHTML = `
    <div class="modal-content max-w-4xl">
      <span class="close-modal float-right text-2xl cursor-pointer text-gray-500 hover:text-gray-700">&times;</span>
      <h2 class="text-2xl font-bold mb-4">${v['Year']} ${v['Make']} ${v['Model']} - ${v['Stock #']}</h2>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="text-center p-3 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">VIN</div>
          <div class="font-medium">${v['VIN'] ? v['VIN'].substring(0, 8) + '...' : 'N/A'}</div>
        </div>
        <div class="text-center p-3 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">Color</div>
          <div class="font-medium">${v['Color'] || 'N/A'}</div>
        </div>
        <div class="text-center p-3 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">Odometer</div>
          <div class="font-medium">${v['Odometer'] || 'N/A'}</div>
        </div>
        <div class="text-center p-3 border border-gray-200 rounded">
          <div class="text-xs text-gray-500 uppercase">Age</div>
          <div class="font-medium">${v['Age'] || 'N/A'} days</div>
        </div>
      </div>
      
      <div class="mb-6">
        <div class="text-center p-4 border border-gray-200 rounded">
          <div class="text-lg font-semibold mb-2">Current Status</div>
          <span class="px-3 py-2 rounded text-lg font-medium ${getStatusColor(v['Status'])}">${v['Status']}</span>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button onclick="closeAllModals()" class="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors">Close</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
};

function createVehicleDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'vehicle-detail-modal';
  modal.className = 'modal';
  document.body.appendChild(modal);
  return modal;
}

window.showConditionModal = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const modal = $('message-modal');
  modal.innerHTML = `
    <div class="modal-content max-w-md">
      <span class="close-modal float-right text-2xl cursor-pointer">&times;</span>
      <h2 class="text-xl font-bold mb-4">Update Condition - ${v['Stock #']}</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Exterior Condition (1-5 stars)</label>
          <select id="exterior-condition" class="w-full p-2 border border-gray-300 rounded">
            <option value="1" ${v.ExteriorCondition === 1 ? 'selected' : ''}>1 Star - Poor</option>
            <option value="2" ${v.ExteriorCondition === 2 ? 'selected' : ''}>2 Stars - Fair</option>
            <option value="3" ${v.ExteriorCondition === 3 ? 'selected' : ''}>3 Stars - Good</option>
            <option value="4" ${v.ExteriorCondition === 4 ? 'selected' : ''}>4 Stars - Very Good</option>
            <option value="5" ${v.ExteriorCondition === 5 ? 'selected' : ''}>5 Stars - Excellent</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Interior Condition (1-5 stars)</label>
          <select id="interior-condition" class="w-full p-2 border border-gray-300 rounded">
            <option value="1" ${v.InteriorCondition === 1 ? 'selected' : ''}>1 Star - Poor</option>
            <option value="2" ${v.InteriorCondition === 2 ? 'selected' : ''}>2 Stars - Fair</option>
            <option value="3" ${v.InteriorCondition === 3 ? 'selected' : ''}>3 Stars - Good</option>
            <option value="4" ${v.InteriorCondition === 4 ? 'selected' : ''}>4 Stars - Very Good</option>
            <option value="5" ${v.InteriorCondition === 5 ? 'selected' : ''}>5 Stars - Excellent</option>
          </select>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3 mt-6">
        <button onclick="closeAllModals()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button onclick="window.saveCondition('${stockNum}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
};

window.saveCondition = function(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) return;
  
  const exteriorCondition = parseInt($('exterior-condition').value);
  const interiorCondition = parseInt($('interior-condition').value);
  
  v.ExteriorCondition = exteriorCondition;
  v.InteriorCondition = interiorCondition;
  v['Last Updated'] = new Date().toISOString();
  
  autoSave();
  renderAllTabs();
  closeAllModals();
  
  showMessageModal('Success', `Condition updated for vehicle ${stockNum}`);
};

window.deleteVehicle = function(stockNum) {
  if (confirm(`Are you sure you want to delete vehicle ${stockNum}?`)) {
    const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
    if (index !== -1) {
      currentVehicleData.splice(index, 1);
      autoSave();
      renderAllTabs();
      showMessageModal('Success', `Vehicle ${stockNum} deleted successfully`);
    }
  }
};

window.exportToCSV = function() {
  if (currentVehicleData.length === 0) {
    showMessageModal('Error', 'No data to export');
    return;
  }
  
  const headers = ['Stock #', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Status', 'Odometer', 'Unit Cost', 'Date In', 'Age', 'ExteriorCondition', 'InteriorCondition', 'Notes'];
  const csvContent = [
    headers.join(','),
    ...currentVehicleData.map(v => headers.map(h => `"${v[h] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showMessageModal('Success', 'Data exported successfully');
};

window.clearAllData = function() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    currentVehicleData = [];
    localStorage.removeItem('vehicleReconData');
    renderAllTabs();
    showMessageModal('Success', 'All data cleared successfully');
  }
};

// --- Backup and Recovery Functions ---
window.showBackupModal = function() {
  if (window.dataManager) {
    window.dataManager.showBackupInterface();
  } else {
    showMessageModal('Error', 'Data manager not available');
  }
};

window.handleCsvUpload = function() {
  const fileInput = $('csv-upload');
  if (!fileInput || !fileInput.files.length) {
    showMessageModal('Error', 'Please select a CSV file');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const csvText = e.target.result;
      const newVehicleData = parseVehicleDataFromCSV(csvText);
      
      if (newVehicleData.length > 0) {
        currentVehicleData = newVehicleData;
        
        // Ensure all vehicles have condition ratings
        currentVehicleData.forEach(vehicle => {
          if (!vehicle.ExteriorCondition) vehicle.ExteriorCondition = 3;
          if (!vehicle.InteriorCondition) vehicle.InteriorCondition = 3;
          if (!vehicle['Age']) {
            const dateIn = new Date(vehicle['Date In'] || new Date());
            const now = new Date();
            vehicle['Age'] = Math.floor((now - dateIn) / (1000 * 60 * 60 * 24));
          }
        });
        
        autoSave();
        renderAllTabs();
        showMessageModal('Success', `Imported ${newVehicleData.length} vehicles from CSV`);
      } else {
        showMessageModal('Error', 'No valid vehicle data found in CSV file');
      }
    } catch (error) {
      showMessageModal('Error', 'Failed to parse CSV file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
};

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
          'Status': row['Status'] || 'New Arrival',
          'Date In': row['Inventory Date'] || row['Date In'] || row['Created'] || new Date().toISOString().split('T')[0],
          'Notes': row['Notes'] || row['Tags'] ? `Tags: ${row['Tags']}` : '',
          'Odometer': row['Odometer'] ? parseInt(row['Odometer'].toString().replace(/[,\s]/g, '')) : 0,
          'Unit Cost': row['Unit Cost'] || row['Original Cost'] || '',
          'ExteriorCondition': parseInt(row['ExteriorCondition']) || 3,
          'InteriorCondition': parseInt(row['InteriorCondition']) || 3,
          'Photos': parseInt(row['Photos']) || 0,
          'Last Updated': new Date().toISOString()
        };
        
        // Calculate age
        const dateIn = new Date(vehicle['Date In']);
        const now = new Date();
        vehicle['Age'] = Math.floor((now - dateIn) / (1000 * 60 * 60 * 24));
        
        vehicles.push(vehicle);
      }
    });
  }
  
  return vehicles;
}

// --- Enhanced Backup Integration ---

// Essential Helper Functions
function $(id) {
  return document.getElementById(id);
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

function showMessageModal(title, message) {
  const modal = $('message-modal');
  if (!modal) {
    // Create modal if it doesn't exist
    const modalHtml = `
      <div id="message-modal" class="modal">
        <div class="modal-content max-w-md">
          <span class="close-modal float-right text-2xl cursor-pointer text-gray-500 hover:text-gray-700">&times;</span>
          <div class="p-4">
            <h3 id="message-modal-title" class="text-lg font-semibold mb-2"></h3>
            <div id="message-modal-text" class="mb-4"></div>
            <button id="message-modal-ok-button" onclick="closeAllModals()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">OK</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  $('message-modal-title').textContent = title;
  $('message-modal-text').textContent = message;
  $('message-modal').style.display = 'block';
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (modal) modal.style.display = 'none';
}

window.showAddVehicleModal = function() {
  const modal = $('add-vehicle-modal');
  if (modal) {
    modal.style.display = 'block';
  }
};

// Add Vehicle Form Handler
document.addEventListener('DOMContentLoaded', () => {
  const addVehicleForm = $('add-vehicle-form');
  if (addVehicleForm) {
    addVehicleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newVehicle = {
        'Stock #': $('add-stock-number').value,
        'Year': parseInt($('add-year').value),
        'Make': $('add-make').value,
        'Model': $('add-model').value,
        'Color': $('add-color').value,
        'Status': 'New Arrival',
        'Date In': new Date().toISOString().split('T')[0],
        'Notes': $('add-notes').value,
        'VIN': '',
        'Odometer': '',
        'Unit Cost': '',
        'ExteriorCondition': 3,
        'InteriorCondition': 3,
        'Age': 0,
        'Last Updated': new Date().toISOString()
      };
      
      // Check for duplicate stock number
      if (currentVehicleData.find(v => v['Stock #'] === newVehicle['Stock #'])) {
        showMessageModal('Error', 'A vehicle with this stock number already exists');
        return;
      }
      
      currentVehicleData.push(newVehicle);
      autoSave();
      renderAllTabs();
      closeModal('add-vehicle-modal');
      showMessageModal('Success', `Vehicle ${newVehicle['Stock #']} added successfully`);
      
      // Reset form
      addVehicleForm.reset();
    });
  }
});

// Performance Metrics Handler
document.addEventListener('DOMContentLoaded', () => {
  const perfButton = $('performance-metrics');
  if (perfButton) {
    perfButton.addEventListener('click', () => {
      if (window.dataManager) {
        window.dataManager.showPerformanceMetrics();
      } else {
        showMessageModal('Performance Metrics', `
          Total Vehicles: ${currentVehicleData.length}
          Lot Ready: ${currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length}
          In Process: ${currentVehicleData.filter(v => v['Status'] !== 'Lot Ready' && v['Status'] !== 'Sold').length}
          Data Storage: ${(JSON.stringify(currentVehicleData).length / 1024).toFixed(2)} KB
        `);
      }
    });
  }
});

// Global function exports for HTML onclick handlers
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.showMessageModal = showMessageModal;
