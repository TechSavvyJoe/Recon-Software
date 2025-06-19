// Enhanced Vehicle Reconditioning Tracker with Drag & Drop and Advanced Features
// This file builds upon the working version with all requested enhancements

// Global State
let currentVehicleData = [];
let currentSortField = 'Stock #';
let currentSortDirection = 'asc';
let draggedVehicle = null;

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
    'New Arrival': 'bg-blue-100 text-blue-800 border-blue-200',
    'Mechanical': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Detailing': 'bg-purple-100 text-purple-800 border-purple-200',
    'Photos': 'bg-pink-100 text-pink-800 border-pink-200',
    'Title': 'bg-orange-100 text-orange-800 border-orange-200',
    'Lot Ready': 'bg-green-100 text-green-800 border-green-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function getConditionRating(rating) {
  const stars = '★'.repeat(rating || 3) + '☆'.repeat(5 - (rating || 3));
  return `<span class="text-yellow-500 text-lg">${stars}</span>`;
}

// Enhanced Data Management with Backend Sync
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
    // Try to sync with backend
    syncWithBackend(data);
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);
  }
}

async function syncWithBackend(data) {
  try {
    const response = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (response.ok) {
      console.log('✅ Synced with backend');
    }
  } catch (error) {
    console.log('⚠️ Backend sync failed, using localStorage only');
  }
}

async function loadFromBackend() {
  try {
    const response = await fetch('/api/vehicles');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Loaded from backend');
      return data;
    }
  } catch (error) {
    console.log('⚠️ Backend load failed, using localStorage');
  }
  return loadDataFromStorage();
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
      'DaysInRecon': 5,
      'LastStatusChange': '2024-12-20',
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
      'DaysInRecon': 4,
      'LastStatusChange': '2024-12-20',
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
      'DaysInRecon': 10,
      'LastStatusChange': '2024-12-20',
      'Last Updated': new Date().toISOString()
    },
    {
      'Stock #': 'T250521D',
      'VIN': '5NPF34AF5LH123789',
      'Year': 2021,
      'Make': 'Hyundai',
      'Model': 'Elantra',
      'Color': 'Silver',
      'Status': 'Mechanical',
      'Date In': '2024-12-18',
      'ExteriorCondition': 2,
      'InteriorCondition': 4,
      'Notes': 'Engine work needed',
      'DaysInRecon': 2,
      'LastStatusChange': '2024-12-20',
      'Last Updated': new Date().toISOString()
    }
  ];
}

// Enhanced Workflow Management
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

// Enhanced Bottleneck Analysis
function calculateBottlenecks() {
  const statusCounts = {};
  const statusDurations = {};
  const statusAges = {};
  
  RECON_STATUSES.forEach(status => {
    statusCounts[status] = 0;
    statusDurations[status] = [];
    statusAges[status] = [];
  });
  
  currentVehicleData.forEach(vehicle => {
    const status = vehicle['Status'];
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
      
      // Calculate days in current status
      const dateIn = new Date(vehicle['Date In']);
      const lastChange = new Date(vehicle['LastStatusChange'] || vehicle['Date In']);
      const now = new Date();
      const daysInStatus = Math.max(1, Math.floor((now - lastChange) / (1000 * 60 * 60 * 24)));
      const totalDaysInRecon = Math.max(1, Math.floor((now - dateIn) / (1000 * 60 * 60 * 24)));
      
      statusDurations[status].push(daysInStatus);
      statusAges[status].push(totalDaysInRecon);
    }
  });
  
  // Calculate bottleneck scores
  const bottlenecks = [];
  RECON_STATUSES.forEach(status => {
    const count = statusCounts[status];
    const avgDuration = statusDurations[status].length > 0 
      ? statusDurations[status].reduce((a, b) => a + b, 0) / statusDurations[status].length 
      : 0;
    const avgAge = statusAges[status].length > 0
      ? statusAges[status].reduce((a, b) => a + b, 0) / statusAges[status].length
      : 0;
    
    // Bottleneck score combines count, duration, and age
    const bottleneckScore = (count * 0.4) + (avgDuration * 0.3) + (avgAge * 0.3);
    
    bottlenecks.push({
      status,
      count,
      avgDuration: Math.round(avgDuration * 10) / 10,
      avgAge: Math.round(avgAge * 10) / 10,
      bottleneckScore: Math.round(bottleneckScore * 10) / 10,
      severity: bottleneckScore > 15 ? 'High' : bottleneckScore > 8 ? 'Medium' : 'Low'
    });
  });
  
  return bottlenecks.sort((a, b) => b.bottleneckScore - a.bottleneckScore);
}

// Sorting Functions
function sortInventory(field) {
  if (currentSortField === field) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortField = field;
    currentSortDirection = 'asc';
  }
  
  currentVehicleData.sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    
    // Handle different data types
    if (field === 'Year') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    } else if (field === 'Date In') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = (bVal || '').toLowerCase();
    }
    
    if (currentSortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  renderInventory();
}

// Drag and Drop Functions
function enableDragAndDrop() {
  // Make workflow cards draggable
  document.querySelectorAll('.workflow-vehicle-card').forEach(card => {
    card.setAttribute('draggable', 'true');
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
  });
  
  // Make workflow columns drop targets
  document.querySelectorAll('.workflow-column').forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('drop', handleDrop);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
  });
}

function handleDragStart(e) {
  draggedVehicle = e.target.dataset.stockNumber;
  e.target.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
}

function handleDragEnd(e) {
  e.target.style.opacity = '1';
  draggedVehicle = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  e.target.style.backgroundColor = '#f3f4f6';
}

function handleDragLeave(e) {
  e.target.style.backgroundColor = '';
}

function handleDrop(e) {
  e.preventDefault();
  e.target.style.backgroundColor = '';
  
  if (draggedVehicle) {
    const newStatus = e.target.dataset.status || e.target.closest('.workflow-column').dataset.status;
    updateVehicleStatus(draggedVehicle, newStatus);
  }
}

function updateVehicleStatus(stockNumber, newStatus) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNumber);
  if (vehicle && vehicle['Status'] !== newStatus) {
    vehicle['Status'] = newStatus;
    vehicle['LastStatusChange'] = new Date().toISOString();
    vehicle['Last Updated'] = new Date().toISOString();
    
    autoSave();
    renderAllTabs();
    
    // Show confirmation
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = `${stockNumber} moved to ${newStatus}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Enhanced Rendering Functions
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
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  html += '<h2 class="text-3xl font-bold mb-6 text-gray-800">Dashboard Overview</h2>';
  
  // Status cards with enhanced styling
  html += '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">';
  Object.entries(statusCounts).forEach(([status, count]) => {
    const colorClass = getStatusColor(status);
    html += `<div class="p-6 rounded-xl text-center border-2 hover:shadow-lg transition-all duration-200 ${colorClass}">
      <div class="text-3xl font-bold mb-1">${count}</div>
      <div class="text-sm font-medium">${status}</div>
    </div>`;
  });
  html += '</div>';
  
  // Key metrics
  const totalVehicles = currentVehicleData.length;
  const avgDaysInRecon = totalVehicles > 0 
    ? Math.round(currentVehicleData.reduce((sum, v) => sum + (v.DaysInRecon || 0), 0) / totalVehicles)
    : 0;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  const completionRate = totalVehicles > 0 ? Math.round((lotReadyVehicles / totalVehicles) * 100) : 0;
  
  html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">';
  html += `<div class="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-center">
    <div class="text-3xl font-bold">${totalVehicles}</div>
    <div class="text-sm opacity-90">Total Vehicles</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-center">
    <div class="text-3xl font-bold">${avgDaysInRecon}</div>
    <div class="text-sm opacity-90">Avg Days in Recon</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-center">
    <div class="text-3xl font-bold">${lotReadyVehicles}</div>
    <div class="text-sm opacity-90">Lot Ready</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-center">
    <div class="text-3xl font-bold">${completionRate}%</div>
    <div class="text-sm opacity-90">Completion Rate</div>
  </div>`;
  html += '</div>';
  
  // Recent vehicles with enhanced cards
  html += '<h3 class="text-2xl font-bold mb-6 text-gray-800">Recent Vehicles</h3>';
  html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
  
  currentVehicleData.slice(0, 6).forEach(v => {
    html += `<div class="p-6 border-2 border-gray-200 rounded-xl bg-white cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-200" onclick="showVehicleDetailModal('${v['Stock #']}')">
      <div class="font-bold text-xl mb-2 text-gray-800">${v['Year']} ${v['Make']} ${v['Model']}</div>
      <div class="text-sm text-gray-600 mb-1">Stock #: <span class="font-medium">${v['Stock #']}</span></div>
      <div class="text-sm text-gray-600 mb-3">Color: <span class="font-medium">${v['Color'] || 'N/A'}</span></div>
      <div class="mb-3">
        <div class="text-sm mb-1">Exterior: ${getConditionRating(v.ExteriorCondition)}</div>
        <div class="text-sm">Interior: ${getConditionRating(v.InteriorCondition)}</div>
      </div>
      <div class="flex justify-between items-center">
        <span class="px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(v['Status'])}">${v['Status']}</span>
        <span class="text-xs text-gray-500">${v.DaysInRecon || 0} days</span>
      </div>
    </div>`;
  });
  
  html += '</div></div>';
  el.innerHTML = html;
}

function renderWorkflow() {
  const el = $('workflow-content');
  if (!el) return;
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  html += '<h2 class="text-3xl font-bold mb-6 text-gray-800">Workflow Board - Drag & Drop Enabled</h2>';
  html += '<div class="text-sm text-gray-600 mb-6">💡 Drag vehicles between columns to update their status</div>';
  
  html += '<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    const colorClass = getStatusColor(status);
    
    html += `<div class="workflow-column border-2 border-gray-200 rounded-xl bg-gray-50 min-h-[500px] hover:border-gray-300 transition-colors duration-200" data-status="${status}">
      <div class="p-4 text-center border-b border-gray-200 ${colorClass} rounded-t-xl">
        <h3 class="font-bold text-lg">${status}</h3>
        <div class="text-sm font-medium">(${vehicles.length} vehicles)</div>
      </div>
      <div class="p-3 space-y-3">`;
    
    if (vehicles.length === 0) {
      html += `<div class="text-center text-gray-500 p-6 border-2 border-dashed border-gray-300 rounded-lg">
        <div class="text-2xl mb-2">📋</div>
        <div class="text-sm">Drop vehicles here</div>
      </div>`;
    } else {
      vehicles.forEach(v => {
        const daysInStatus = v.DaysInRecon || 0;
        const urgencyClass = daysInStatus > 7 ? 'border-red-300 bg-red-50' : daysInStatus > 4 ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50';
        
        html += `<div class="workflow-vehicle-card p-4 border-2 rounded-lg cursor-move hover:shadow-lg transition-all duration-200 ${urgencyClass}"
                      draggable="true" 
                      data-stock-number="${v['Stock #']}" 
                      onclick="showVehicleDetailModal('${v['Stock #']}')">
          <div class="font-bold text-sm mb-1">${v['Year']} ${v['Make']}</div>
          <div class="text-xs text-gray-600 mb-1">${v['Model']}</div>
          <div class="text-xs text-gray-600 mb-2">Stock: ${v['Stock #']}</div>
          <div class="text-xs mb-2">
            <div>Ext: ${getConditionRating(v.ExteriorCondition)}</div>
            <div>Int: ${getConditionRating(v.InteriorCondition)}</div>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-500">In: ${formatDate(v['Date In'])}</span>
            <span class="font-medium ${daysInStatus > 7 ? 'text-red-600' : daysInStatus > 4 ? 'text-yellow-600' : 'text-green-600'}">${daysInStatus}d</span>
          </div>
        </div>`;
      });
    }
    
    html += '</div></div>';
  });
  
  html += '</div></div>';
  el.innerHTML = html;
  
  // Enable drag and drop after rendering
  setTimeout(enableDragAndDrop, 100);
}

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  
  html += `<div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
    <h2 class="text-3xl font-bold text-gray-800">Inventory Management</h2>
    <div class="flex flex-wrap gap-2">
      <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 border" onclick="showAddVehicleModal()">
        <i class="fas fa-plus mr-2"></i>Add Vehicle
      </button>
      <button class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 border" onclick="exportToCSV()">
        <i class="fas fa-download mr-2"></i>Export CSV
      </button>
    </div>
  </div>`;
  
  // Sorting controls
  html += `<div class="mb-6 p-4 bg-gray-50 rounded-lg border">
    <div class="text-sm font-medium text-gray-700 mb-3">Sort by:</div>
    <div class="flex flex-wrap gap-2">
      ${['Stock #', 'Make', 'Model', 'Year', 'Status', 'Date In'].map(field => 
        `<button onclick="sortInventory('${field}')" 
                 class="px-3 py-1 text-xs rounded border transition-colors duration-200 ${currentSortField === field ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}">
          ${field} ${currentSortField === field ? (currentSortDirection === 'asc' ? '↑' : '↓') : ''}
        </button>`
      ).join('')}
    </div>
  </div>`;
  
  // Enhanced table with better styling
  html += `<div class="overflow-x-auto border-2 border-gray-200 rounded-xl">
    <table class="min-w-full bg-white">
      <thead class="bg-gray-50 border-b-2 border-gray-200">
        <tr>
          <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Stock #</th>
          <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Vehicle</th>
          <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Status</th>
          <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Condition</th>
          <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Date In</th>
          <th class="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">`;
  
  currentVehicleData.forEach((v, index) => {
    const rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
    html += `<tr class="${rowClass} hover:bg-blue-50 cursor-pointer transition-colors duration-150" onclick="showVehicleDetailModal('${v['Stock #']}')">
      <td class="px-6 py-4 border-r border-gray-200">
        <div class="font-bold text-gray-900">${v['Stock #']}</div>
        <div class="text-xs text-gray-500">${v['VIN']?.substring(0, 8) || 'N/A'}...</div>
      </td>
      <td class="px-6 py-4 border-r border-gray-200">
        <div class="font-bold text-gray-900">${v['Year']} ${v['Make']} ${v['Model']}</div>
        <div class="text-sm text-gray-600">${v['Color'] || 'N/A'}</div>
      </td>
      <td class="px-6 py-4 border-r border-gray-200">
        <span class="px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(v['Status'])}">${v['Status']}</span>
        <div class="text-xs text-gray-500 mt-1">${v.DaysInRecon || 0} days</div>
      </td>
      <td class="px-6 py-4 border-r border-gray-200">
        <div class="text-sm">Ext: ${getConditionRating(v.ExteriorCondition)}</div>
        <div class="text-sm">Int: ${getConditionRating(v.InteriorCondition)}</div>
      </td>
      <td class="px-6 py-4 border-r border-gray-200">
        <div class="text-sm font-medium text-gray-900">${formatDate(v['Date In'])}</div>
        <div class="text-xs text-gray-500">Updated: ${formatDate(v['Last Updated'])}</div>
      </td>
      <td class="px-6 py-4 text-center space-x-2" onclick="event.stopPropagation()">
        <button onclick="showConditionModal('${v['Stock #']}')" class="px-3 py-1 bg-purple-500 text-white text-xs rounded-lg hover:bg-purple-600 transition-colors duration-200 border">
          <i class="fas fa-edit mr-1"></i>Edit
        </button>
        <button onclick="deleteVehicle('${v['Stock #']}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors duration-200 border">
          <i class="fas fa-trash mr-1"></i>Delete
        </button>
      </td>
    </tr>`;
  });
  
  html += '</tbody></table></div></div>';
  el.innerHTML = html;
}

function renderReports() {
  const el = $('reports-content');
  if (!el) return;
  
  const totalVehicles = currentVehicleData.length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Calculate enhanced metrics
  const avgExterior = totalVehicles > 0 ? currentVehicleData.reduce((sum, v) => sum + (v.ExteriorCondition || 3), 0) / totalVehicles : 0;
  const avgInterior = totalVehicles > 0 ? currentVehicleData.reduce((sum, v) => sum + (v.InteriorCondition || 3), 0) / totalVehicles : 0;
  const avgCondition = ((avgExterior + avgInterior) / 2).toFixed(1);
  const avgDaysInRecon = totalVehicles > 0 ? Math.round(currentVehicleData.reduce((sum, v) => sum + (v.DaysInRecon || 0), 0) / totalVehicles) : 0;
  
  // Get bottleneck analysis
  const bottlenecks = calculateBottlenecks();
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  html += '<h2 class="text-3xl font-bold mb-8 text-gray-800">Reports & Analytics</h2>';
  
  // Key metrics with enhanced styling
  html += '<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">';
  html += `<div class="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-center border-2 border-blue-200">
    <div class="text-4xl font-bold mb-2">${totalVehicles}</div>
    <div class="text-sm opacity-90">Total Vehicles</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-center border-2 border-green-200">
    <div class="text-4xl font-bold mb-2">${lotReadyVehicles}</div>
    <div class="text-sm opacity-90">Lot Ready</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-center border-2 border-orange-200">
    <div class="text-4xl font-bold mb-2">${avgCondition}</div>
    <div class="text-sm opacity-90">Avg Condition</div>
  </div>`;
  html += `<div class="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl text-center border-2 border-purple-200">
    <div class="text-4xl font-bold mb-2">${Math.round((lotReadyVehicles / totalVehicles) * 100) || 0}%</div>
    <div class="text-sm opacity-90">Completion Rate</div>
  </div>`;
  html += '</div>';
  
  // Bottleneck Analysis Section
  html += '<div class="mb-8">';
  html += '<h3 class="text-2xl font-bold mb-6 text-gray-800">🚨 Bottleneck Analysis</h3>';
  html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
  
  // Top bottlenecks
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h4 class="text-lg font-bold mb-4 text-gray-800">Current Bottlenecks</h4>';
  html += '<div class="space-y-3">';
  
  bottlenecks.slice(0, 6).forEach(bottleneck => {
    const severityColor = bottleneck.severity === 'High' ? 'bg-red-100 border-red-300 text-red-800' :
                         bottleneck.severity === 'Medium' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                         'bg-green-100 border-green-300 text-green-800';
    
    html += `<div class="p-4 border rounded-lg ${severityColor}">
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold">${bottleneck.status}</span>
        <span class="text-sm font-medium">${bottleneck.severity} Risk</span>
      </div>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div><strong>${bottleneck.count}</strong> vehicles</div>
        <div><strong>${bottleneck.avgDuration}</strong> avg days</div>
        <div><strong>${bottleneck.avgAge}</strong> total days</div>
      </div>
    </div>`;
  });
  
  html += '</div></div>';
  
  // Recommendations
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-blue-50">';
  html += '<h4 class="text-lg font-bold mb-4 text-gray-800">💡 Recommendations</h4>';
  html += '<div class="space-y-3 text-sm">';
  
  if (bottlenecks[0]?.severity === 'High') {
    html += `<div class="p-3 bg-white border border-blue-200 rounded-lg">
      <strong>Priority:</strong> Focus on ${bottlenecks[0].status} - ${bottlenecks[0].count} vehicles need attention
    </div>`;
  }
  
  const oldVehicles = currentVehicleData.filter(v => (v.DaysInRecon || 0) > 10);
  if (oldVehicles.length > 0) {
    html += `<div class="p-3 bg-white border border-blue-200 rounded-lg">
      <strong>Aging Inventory:</strong> ${oldVehicles.length} vehicles have been in recon for over 10 days
    </div>`;
  }
  
  const lowCondition = currentVehicleData.filter(v => 
    (v.ExteriorCondition || 3) <= 2 || (v.InteriorCondition || 3) <= 2
  );
  if (lowCondition.length > 0) {
    html += `<div class="p-3 bg-white border border-blue-200 rounded-lg">
      <strong>Condition Alert:</strong> ${lowCondition.length} vehicles have poor condition ratings
    </div>`;
  }
  
  html += '</div></div>';
  html += '</div></div>';
  
  // Status breakdown with enhanced styling
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-2xl font-bold mb-6 text-gray-800">Status Breakdown</h3>';
  html += '<div class="overflow-x-auto">';
  html += '<table class="min-w-full bg-white border border-gray-200 rounded-lg">';
  html += '<thead class="bg-gray-100"><tr><th class="border border-gray-200 px-6 py-3 text-left font-bold">Status</th><th class="border border-gray-200 px-6 py-3 text-center font-bold">Count</th><th class="border border-gray-200 px-6 py-3 text-center font-bold">Percentage</th><th class="border border-gray-200 px-6 py-3 text-center font-bold">Avg Days</th></tr></thead><tbody>';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    const count = vehicles.length;
    const percentage = totalVehicles > 0 ? ((count / totalVehicles) * 100).toFixed(1) : 0;
    const avgDays = count > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.DaysInRecon || 0), 0) / count) : 0;
    const colorClass = getStatusColor(status);
    
    html += `<tr class="hover:bg-gray-50">
      <td class="border border-gray-200 px-6 py-3">
        <span class="px-3 py-1 rounded-full text-xs font-medium border ${colorClass}">${status}</span>
      </td>
      <td class="border border-gray-200 px-6 py-3 text-center font-bold">${count}</td>
      <td class="border border-gray-200 px-6 py-3 text-center">${percentage}%</td>
      <td class="border border-gray-200 px-6 py-3 text-center">${avgDays} days</td>
    </tr>`;
  });
  
  html += '</tbody></table></div></div></div>';
  el.innerHTML = html;
}

function renderUpload() {
  const el = $('upload-content');
  if (!el) { return; }
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  html += '<h2 class="text-3xl font-bold mb-6 text-gray-800">Data Import/Export</h2>';
  html += '<div class="space-y-6">';
  
  // Import section
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-upload mr-2"></i>Import CSV File</h3>';
  html += '<div class="mb-4">';
  html += '<input type="file" id="csv-upload" accept=".csv" class="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">';
  html += '<div class="text-sm text-gray-600 mb-4">Expected columns: Stock #, VIN, Year, Make, Model, Color, Status, Date In, Exterior Condition, Interior Condition, Notes</div>';
  html += '</div>';
  html += '<button onclick="handleCsvUpload()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 border"><i class="fas fa-file-import mr-2"></i>Import CSV</button>';
  html += '</div>';
  
  // Export section
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-xl font-semibold mb-4 text-gray-800"><i class="fas fa-download mr-2"></i>Export Data</h3>';
  html += '<div class="space-y-3">';
  html += '<button onclick="exportToCSV()" class="w-full sm:w-auto px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 border mr-3"><i class="fas fa-file-csv mr-2"></i>Export to CSV</button>';
  html += '<button onclick="exportToJSON()" class="w-full sm:w-auto px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 border mr-3"><i class="fas fa-file-code mr-2"></i>Export to JSON</button>';
  html += '</div></div>';
  
  // Data management section
  html += '<div class="border-2 border-red-200 rounded-xl p-6 bg-red-50">';
  html += '<h3 class="text-xl font-semibold mb-4 text-red-800"><i class="fas fa-exclamation-triangle mr-2"></i>Data Management</h3>';
  html += '<div class="text-sm text-red-700 mb-4">⚠️ Warning: These actions cannot be undone</div>';
  html += '<div class="space-y-3">';
  html += '<button onclick="resetToSampleData()" class="w-full sm:w-auto px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors duration-200 border mr-3"><i class="fas fa-redo mr-2"></i>Reset to Sample Data</button>';
  html += '<button onclick="clearAllData()" class="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 border"><i class="fas fa-trash mr-2"></i>Clear All Data</button>';
  html += '</div></div>';
  
  html += '</div></div>';
  
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) { return; }
  
  let html = '<div class="bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100">';
  html += '<h2 class="text-3xl font-bold mb-6 text-gray-800">Condition Rating System</h2>';
  
  html += '<div class="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">';
  html += '<p class="text-lg text-blue-800 mb-4">✨ This system uses a 1-5 star rating for both exterior and interior condition instead of detailer assignments.</p>';
  html += '<p class="text-sm text-blue-700">This provides more precise quality tracking and helps identify vehicles that need attention.</p>';
  html += '</div>';
  
  html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">';
  
  // Condition distribution
  const conditionCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const exteriorCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const interiorCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  currentVehicleData.forEach(v => {
    const avgCondition = Math.round((v.ExteriorCondition + v.InteriorCondition) / 2);
    conditionCounts[avgCondition]++;
    exteriorCounts[v.ExteriorCondition || 3]++;
    interiorCounts[v.InteriorCondition || 3]++;
  });
  
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-xl font-bold mb-6 text-gray-800">📊 Overall Condition Distribution</h3>';
  Object.entries(conditionCounts).forEach(([rating, count]) => {
    const percentage = currentVehicleData.length > 0 ? ((count / currentVehicleData.length) * 100).toFixed(1) : 0;
    html += `<div class="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
      <span class="flex items-center">
        ${getConditionRating(parseInt(rating))}
        <span class="ml-3 font-medium">${rating} Star${rating !== '1' ? 's' : ''}</span>
      </span>
      <span class="font-bold text-gray-700">${count} vehicles (${percentage}%)</span>
    </div>`;
  });
  html += '</div>';
  
  html += '<div class="space-y-6">';
  
  // Rating guide
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-xl font-bold mb-6 text-gray-800">⭐ Rating Guide</h3>';
  html += '<div class="space-y-4">';
  
  const ratingGuide = [
    { stars: 5, label: 'Excellent', desc: 'Like new condition, no visible defects', color: 'text-green-600' },
    { stars: 4, label: 'Good', desc: 'Minor wear, very good overall condition', color: 'text-blue-600' },
    { stars: 3, label: 'Average', desc: 'Normal wear, acceptable condition', color: 'text-yellow-600' },
    { stars: 2, label: 'Fair', desc: 'Noticeable wear, needs attention', color: 'text-orange-600' },
    { stars: 1, label: 'Poor', desc: 'Significant damage or wear', color: 'text-red-600' }
  ];
  
  ratingGuide.forEach(guide => {
    html += `<div class="flex items-start space-x-4 p-3 bg-white border border-gray-200 rounded-lg">
      <div>${getConditionRating(guide.stars)}</div>
      <div class="flex-1">
        <div class="font-bold ${guide.color}">${guide.label}</div>
        <div class="text-sm text-gray-600">${guide.desc}</div>
      </div>
    </div>`;
  });
  
  html += '</div></div>';
  
  // Detailed breakdown
  html += '<div class="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">';
  html += '<h3 class="text-xl font-bold mb-6 text-gray-800">🔍 Detailed Breakdown</h3>';
  html += '<div class="grid grid-cols-2 gap-6">';
  
  html += '<div><h4 class="font-bold mb-3 text-gray-700">Exterior Condition</h4>';
  Object.entries(exteriorCounts).forEach(([rating, count]) => {
    html += `<div class="flex justify-between text-sm py-1">
      <span>${getConditionRating(parseInt(rating))}</span>
      <span class="font-medium">${count}</span>
    </div>`;
  });
  html += '</div>';
  
  html += '<div><h4 class="font-bold mb-3 text-gray-700">Interior Condition</h4>';
  Object.entries(interiorCounts).forEach(([rating, count]) => {
    html += `<div class="flex justify-between text-sm py-1">
      <span>${getConditionRating(parseInt(rating))}</span>
      <span class="font-medium">${count}</span>
    </div>`;
  });
  html += '</div>';
  
  html += '</div></div>';
  html += '</div>';
  html += '</div></div>';
  
  el.innerHTML = html;
}

// Enhanced Modal Functions with better styling and notifications
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
    <div style="background-color:#fefefe; margin:2% auto; padding:0; border:none; width:95%; max-width:800px; border-radius:1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 1.5rem 2rem; border-radius: 1rem 1rem 0 0; position: relative;">
        <span onclick="closeModal()" style="position: absolute; top: 1rem; right: 1.5rem; font-size: 24px; cursor: pointer; color: white; opacity: 0.8; transition: opacity 0.2s;">&times;</span>
        <h2 style="font-size: 2rem; font-weight: bold; margin: 0;">${v['Year']} ${v['Make']} ${v['Model']}</h2>
        <div style="font-size: 1.1rem; opacity: 0.9; margin-top: 0.5rem;">Stock #: ${stockNum}</div>
      </div>
      
      <!-- Content -->
      <div style="padding: 2rem;">
        <!-- Vehicle Info Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
          <div><strong style="color: #374151;">VIN:</strong><br><span style="font-family: monospace; color: #6b7280;">${v['VIN'] || 'N/A'}</span></div>
          <div><strong style="color: #374151;">Color:</strong><br><span style="color: #6b7280;">${v['Color'] || 'N/A'}</span></div>
          <div><strong style="color: #374151;">Status:</strong><br><span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; border: 1px solid;" class="${getStatusColor(v['Status'])}">${v['Status']}</span></div>
          <div><strong style="color: #374151;">Date In:</strong><br><span style="color: #6b7280;">${formatDate(v['Date In'])}</span></div>
          <div><strong style="color: #374151;">Days in Recon:</strong><br><span style="color: #6b7280; font-weight: 600;">${v.DaysInRecon || 0} days</span></div>
          <div><strong style="color: #374151;">Last Updated:</strong><br><span style="color: #6b7280; font-size: 0.875rem;">${formatDate(v['Last Updated'])}</span></div>
        </div>
        
        <!-- Condition Ratings -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
          <div style="padding: 1.5rem; background: #fef3c7; border-radius: 0.75rem; border: 1px solid #f59e0b; text-align: center;">
            <strong style="color: #92400e; display: block; margin-bottom: 1rem; font-size: 1.1rem;">Exterior Condition</strong>
            <div style="font-size: 2rem;">${getConditionRating(v.ExteriorCondition)}</div>
            <div style="color: #92400e; font-size: 0.875rem; margin-top: 0.5rem;">${v.ExteriorCondition || 3}/5 Stars</div>
          </div>
          <div style="padding: 1.5rem; background: #ddd6fe; border-radius: 0.75rem; border: 1px solid #8b5cf6; text-align: center;">
            <strong style="color: #5b21b6; display: block; margin-bottom: 1rem; font-size: 1.1rem;">Interior Condition</strong>
            <div style="font-size: 2rem;">${getConditionRating(v.InteriorCondition)}</div>
            <div style="color: #5b21b6; font-size: 0.875rem; margin-top: 0.5rem;">${v.InteriorCondition || 3}/5 Stars</div>
          </div>
        </div>
        
        <!-- Notes Section -->
        <div style="margin-bottom: 2rem;">
          <label style="display: block; font-weight: 600; margin-bottom: 0.75rem; color: #374151; font-size: 1.1rem;">Notes:</label>
          <textarea id="vehicle-notes-${stockNum}" style="width: 100%; padding: 1rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; font-size: 0.95rem; line-height: 1.5; resize: vertical; focus:border-blue-500; focus:outline-none;" rows="4" placeholder="Add notes about this vehicle...">${v['Notes'] || ''}</textarea>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
          <button onclick="showConditionModal('${stockNum}')" style="padding: 0.75rem 1.5rem; background: #8b5cf6; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500; transition: background-color 0.2s;" onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
            <i class="fas fa-star" style="margin-right: 0.5rem;"></i>Update Condition
          </button>
          <div>
            <button onclick="closeModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 0.75rem; margin-right: 0.75rem; cursor: pointer; font-weight: 500; transition: background-color 0.2s;" onmouseover="this.style.background='#4b5563'" onmouseout="this.style.background='#6b7280'">Close</button>
            <button onclick="updateVehicleNotes('${stockNum}')" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500; transition: background-color 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
              <i class="fas fa-save" style="margin-right: 0.5rem;"></i>Save Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

function showConditionModal(stockNum) {
  const v = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!v) { return; }
  
  let modal = $('condition-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'condition-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display:none; position:fixed; z-index:100; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7);';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background-color:#fefefe; margin:5% auto; padding:0; border:none; width:90%; max-width:600px; border-radius:1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 1.5rem 2rem; border-radius: 1rem 1rem 0 0; position: relative;">
        <span onclick="closeModal()" style="position: absolute; top: 1rem; right: 1.5rem; font-size: 24px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
        <h2 style="font-size: 1.75rem; font-weight: bold; margin: 0;">Update Condition</h2>
        <div style="font-size: 1rem; opacity: 0.9; margin-top: 0.5rem;">${stockNum} - ${v['Year']} ${v['Make']} ${v['Model']}</div>
      </div>
      
      <!-- Content -->
      <div style="padding: 2rem;">
        <!-- Exterior Condition -->
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: #fef3c7; border-radius: 0.75rem; border: 1px solid #f59e0b;">
          <label style="display: block; font-weight: 600; margin-bottom: 1rem; color: #92400e; font-size: 1.2rem;">
            <i class="fas fa-car" style="margin-right: 0.5rem;"></i>Exterior Condition
          </label>
          <div style="display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1rem;">
            ${[1,2,3,4,5].map(i => 
              `<button onclick="setCondition('${stockNum}', 'exterior', ${i})" 
                       style="width: 3rem; height: 3rem; border: 2px solid #f59e0b; border-radius: 0.5rem; cursor: pointer; font-weight: bold; font-size: 1.1rem; transition: all 0.2s; ${i <= (v.ExteriorCondition || 3) ? 'background: #f59e0b; color: white;' : 'background: white; color: #f59e0b;'}"
                       onmouseover="this.style.transform='scale(1.1)'" 
                       onmouseout="this.style.transform='scale(1)'">${i}</button>`
            ).join('')}
          </div>
          <div style="text-align: center; color: #92400e; font-size: 0.875rem; margin-top: 0.5rem;">Current: ${getConditionRating(v.ExteriorCondition)} (${v.ExteriorCondition || 3}/5)</div>
        </div>
        
        <!-- Interior Condition -->
        <div style="margin-bottom: 2rem; padding: 1.5rem; background: #ddd6fe; border-radius: 0.75rem; border: 1px solid #8b5cf6;">
          <label style="display: block; font-weight: 600; margin-bottom: 1rem; color: #5b21b6; font-size: 1.2rem;">
            <i class="fas fa-couch" style="margin-right: 0.5rem;"></i>Interior Condition
          </label>
          <div style="display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1rem;">
            ${[1,2,3,4,5].map(i => 
              `<button onclick="setCondition('${stockNum}', 'interior', ${i})" 
                       style="width: 3rem; height: 3rem; border: 2px solid #8b5cf6; border-radius: 0.5rem; cursor: pointer; font-weight: bold; font-size: 1.1rem; transition: all 0.2s; ${i <= (v.InteriorCondition || 3) ? 'background: #8b5cf6; color: white;' : 'background: white; color: #8b5cf6;'}"
                       onmouseover="this.style.transform='scale(1.1)'" 
                       onmouseout="this.style.transform='scale(1)'">${i}</button>`
            ).join('')}
          </div>
          <div style="text-align: center; color: #5b21b6; font-size: 0.875rem; margin-top: 0.5rem;">Current: ${getConditionRating(v.InteriorCondition)} (${v.InteriorCondition || 3}/5)</div>
        </div>
        
        <!-- Rating Guide -->
        <div style="margin-bottom: 2rem; padding: 1rem; background: #f8fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0;">
          <div style="font-weight: 600; margin-bottom: 0.75rem; color: #374151; text-align: center;">Quick Reference</div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; font-size: 0.75rem; text-align: center;">
            <div style="color: #ef4444;">1★ Poor</div>
            <div style="color: #f97316;">2★ Fair</div>
            <div style="color: #eab308;">3★ Average</div>
            <div style="color: #22c55e;">4★ Good</div>
            <div style="color: #16a34a;">5★ Excellent</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; justify-content: space-between; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
          <button onclick="closeModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500;">Cancel</button>
          <button onclick="saveCondition('${stockNum}')" style="padding: 0.75rem 1.5rem; background: #16a34a; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500;">
            <i class="fas fa-check" style="margin-right: 0.5rem;"></i>Save Changes
          </button>
        </div>
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
    <div style="background-color:#fefefe; margin:3% auto; padding:0; border:none; width:90%; max-width:700px; border-radius:1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 1.5rem 2rem; border-radius: 1rem 1rem 0 0; position: relative;">
        <span onclick="closeModal()" style="position: absolute; top: 1rem; right: 1.5rem; font-size: 24px; cursor: pointer; color: white; opacity: 0.8;">&times;</span>
        <h2 style="font-size: 1.75rem; font-weight: bold; margin: 0;">
          <i class="fas fa-plus-circle" style="margin-right: 0.75rem;"></i>Add New Vehicle
        </h2>
        <div style="font-size: 1rem; opacity: 0.9; margin-top: 0.5rem;">Enter vehicle information below</div>
      </div>
      
      <!-- Content -->
      <div style="padding: 2rem;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Stock Number *</label>
            <input type="text" id="new-stock" placeholder="e.g., T250522A" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">VIN</label>
            <input type="text" id="new-vin" placeholder="17-digit VIN" maxlength="17" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; font-family: monospace;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Year *</label>
            <input type="number" id="new-year" placeholder="2024" min="1900" max="2030" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Make *</label>
            <input type="text" id="new-make" placeholder="e.g., Ford" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Model *</label>
            <input type="text" id="new-model" placeholder="e.g., Escape" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Color</label>
            <input type="text" id="new-color" placeholder="e.g., White" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e5e7eb'">
          </div>
        </div>
        
        <div style="padding: 1rem; background: #f8fafc; border-radius: 0.5rem; border: 1px solid #e2e8f0; margin-bottom: 2rem;">
          <div style="color: #6b7280; font-size: 0.875rem;">
            <strong>Note:</strong> Vehicles will be added with "New Arrival" status and default 3-star condition ratings. You can update these after adding.
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; justify-content: space-between; padding-top: 1.5rem; border-top: 1px solid #e5e7eb;">
          <button onclick="closeModal()" style="padding: 0.75rem 1.5rem; background: #6b7280; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500;">Cancel</button>
          <button onclick="addNewVehicle()" style="padding: 0.75rem 1.5rem; background: #16a34a; color: white; border: none; border-radius: 0.75rem; cursor: pointer; font-weight: 500;">
            <i class="fas fa-plus" style="margin-right: 0.5rem;"></i>Add Vehicle
          </button>
        </div>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  // Focus on stock number field
  setTimeout(() => {
    const stockInput = $('new-stock');
    if (stockInput) { stockInput.focus(); }
  }, 100);
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Enhanced Action Functions
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
    if (modal) {
      const buttons = modal.querySelectorAll('button');
      buttons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(type)) {
          const btnRating = parseInt(btn.textContent);
          if (btnRating <= rating) {
            btn.style.background = type === 'exterior' ? '#f59e0b' : '#8b5cf6';
            btn.style.color = 'white';
          } else {
            btn.style.background = 'white';
            btn.style.color = type === 'exterior' ? '#f59e0b' : '#8b5cf6';
          }
        }
      });
    }
  }
}

function saveCondition(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (vehicle) {
    vehicle['Last Updated'] = new Date().toISOString();
  }
  
  autoSave();
  renderAllTabs();
  closeModal();
  
  // Show success notification
  showNotification(`Condition ratings updated for ${stockNum}`, 'success');
}

function updateVehicleNotes(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  const notesTextarea = $(`vehicle-notes-${stockNum}`);
  
  if (vehicle && notesTextarea) {
    vehicle['Notes'] = notesTextarea.value;
    vehicle['Last Updated'] = new Date().toISOString();
    autoSave();
    showNotification(`Notes updated for ${stockNum}`, 'success');
  }
}

function deleteVehicle(stockNum) {
  if (confirm(`Are you sure you want to delete vehicle ${stockNum}?\n\nThis action cannot be undone.`)) {
    const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
    if (index !== -1) {
      currentVehicleData.splice(index, 1);
      autoSave();
      renderAllTabs();
      showNotification(`Vehicle ${stockNum} has been deleted`, 'success');
    }
  }
}

function addNewVehicle() {
  const stockNum = $('new-stock').value.trim();
  const vin = $('new-vin').value.trim();
  const year = $('new-year').value.trim();
  const make = $('new-make').value.trim();
  const model = $('new-model').value.trim();
  const color = $('new-color').value.trim();
  
  // Validation
  if (!stockNum || !make || !model) {
    alert('Please fill in at least Stock Number, Make, and Model.');
    return;
  }
  
  // Check for duplicate
  if (currentVehicleData.find(v => v['Stock #'] === stockNum)) {
    alert('A vehicle with this stock number already exists.');
    return;
  }
  
  // Calculate days in recon (0 for new arrivals)
  const dateIn = new Date().toISOString().split('T')[0];
  
  const newVehicle = {
    'Stock #': stockNum,
    'VIN': vin,
    'Year': parseInt(year) || new Date().getFullYear(),
    'Make': make,
    'Model': model,
    'Color': color,
    'Status': 'New Arrival',
    'Date In': dateIn,
    'ExteriorCondition': 3,
    'InteriorCondition': 3,
    'Notes': '',
    'DaysInRecon': 0,
    'LastStatusChange': new Date().toISOString(),
    'Last Updated': new Date().toISOString()
  };
  
  currentVehicleData.unshift(newVehicle);
  autoSave();
  renderAllTabs();
  closeModal();
  showNotification(`Vehicle ${stockNum} has been added successfully!`, 'success');
}

// Enhanced Export Functions
function exportToCSV() {
  const headers = ['Stock #', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Status', 'Date In', 'Exterior Condition', 'Interior Condition', 'Days in Recon', 'Notes'];
  
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
      v['DaysInRecon'] || 0,
      `"${(v['Notes'] || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\\n';
  });
  
  downloadFile(csvContent, `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  showNotification('CSV export completed!', 'success');
}

function exportToJSON() {
  const jsonContent = JSON.stringify(currentVehicleData, null, 2);
  downloadFile(jsonContent, `vehicle-inventory-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  showNotification('JSON export completed!', 'success');
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

function resetToSampleData() {
  if (confirm('Are you sure you want to reset to sample data?\\n\\nThis will replace all current data and cannot be undone.')) {
    currentVehicleData = getSampleData();
    autoSave();
    renderAllTabs();
    showNotification('Data has been reset to sample data', 'success');
  }
}

function clearAllData() {
  if (confirm('Are you sure you want to clear all data?\\n\\nThis action cannot be undone.')) {
    currentVehicleData = [];
    localStorage.removeItem('vehicleReconData');
    renderAllTabs();
    showNotification('All data has been cleared', 'warning');
  }
}

// Enhanced Notification System
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  const bgColors = {
    'success': 'bg-green-500',
    'error': 'bg-red-500',
    'warning': 'bg-yellow-500',
    'info': 'bg-blue-500'
  };
  
  const icons = {
    'success': 'fas fa-check-circle',
    'error': 'fas fa-exclamation-triangle',
    'warning': 'fas fa-exclamation-circle',
    'info': 'fas fa-info-circle'
  };
  
  notification.className = `fixed top-4 right-4 ${bgColors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full`;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <i class="${icons[type]}"></i>
      <span style="font-weight: 500;">${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// CSV Handling and Data Import
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
          // Simple CSV parsing - for production use a proper CSV parser
          const values = [];
          let currentValue = '';
          let inQuotes = false;
          
          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = '';
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim()); // Add the last value
          
          const vehicle = {};
          headers.forEach((header, index) => {
            vehicle[header] = values[index] || '';
          });
          
          if (vehicle['Stock #']) {
            // Set defaults and calculate derived fields
            vehicle['Status'] = vehicle['Status'] || 'New Arrival';
            vehicle['ExteriorCondition'] = parseInt(vehicle['ExteriorCondition']) || 3;
            vehicle['InteriorCondition'] = parseInt(vehicle['InteriorCondition']) || 3;
            vehicle['Date In'] = vehicle['Date In'] || new Date().toISOString().split('T')[0];
            vehicle['Year'] = parseInt(vehicle['Year']) || new Date().getFullYear();
            
            // Calculate days in recon
            const dateIn = new Date(vehicle['Date In']);
            const now = new Date();
            vehicle['DaysInRecon'] = Math.max(0, Math.floor((now - dateIn) / (1000 * 60 * 60 * 24)));
            
            vehicle['LastStatusChange'] = vehicle['LastStatusChange'] || new Date().toISOString();
            vehicle['Last Updated'] = new Date().toISOString();
            
            newVehicles.push(vehicle);
          }
        }
      }
      
      // Merge with existing data or replace
      const shouldReplace = confirm(`Found ${newVehicles.length} vehicles in the CSV file.\\n\\nClick OK to REPLACE all current data, or Cancel to MERGE with existing data.`);
      
      if (shouldReplace) {
        currentVehicleData = newVehicles;
      } else {
        // Merge - skip duplicates
        let addedCount = 0;
        newVehicles.forEach(newVehicle => {
          if (!currentVehicleData.find(existing => existing['Stock #'] === newVehicle['Stock #'])) {
            currentVehicleData.push(newVehicle);
            addedCount++;
          }
        });
        showNotification(`Added ${addedCount} new vehicles, skipped ${newVehicles.length - addedCount} duplicates`, 'info');
      }
      
      autoSave();
      renderAllTabs();
      
      if (shouldReplace) {
        showNotification(`Successfully imported ${newVehicles.length} vehicles from CSV`, 'success');
      }
      
      // Clear the file input
      fileInput.value = '';
      
    } catch (error) {
      console.error('CSV import error:', error);
      alert('Error reading CSV file: ' + error.message + '\\n\\nPlease check that your CSV file is properly formatted.');
    }
  };
  
  reader.readAsText(file);
}

// Enhanced Data Calculation Functions
function updateDaysInRecon() {
  const now = new Date();
  currentVehicleData.forEach(vehicle => {
    const dateIn = new Date(vehicle['Date In']);
    vehicle['DaysInRecon'] = Math.max(0, Math.floor((now - dateIn) / (1000 * 60 * 60 * 24)));
  });
}

function calculateCompletionMetrics() {
  const total = currentVehicleData.length;
  const completed = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  const inProgress = total - completed;
  
  const avgDaysToComplete = currentVehicleData
    .filter(v => v['Status'] === 'Lot Ready')
    .reduce((sum, v) => sum + (v['DaysInRecon'] || 0), 0) / (completed || 1);
  
  return {
    total,
    completed,
    inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    avgDaysToComplete: Math.round(avgDaysToComplete || 0)
  };
}

// Enhanced Auto-save with Error Handling
function autoSaveWithRetry(retries = 3) {
  try {
    saveDataToStorage(currentVehicleData);
  } catch (error) {
    console.error('Auto-save failed:', error);
    if (retries > 0) {
      setTimeout(() => autoSaveWithRetry(retries - 1), 1000);
    } else {
      showNotification('Auto-save failed. Please manually export your data.', 'error');
    }
  }
}

// Enhanced Search and Filter Functions
function searchVehicles(query) {
  if (!query) { return currentVehicleData; }
  
  const searchTerms = query.toLowerCase().split(' ');
  return currentVehicleData.filter(vehicle => {
    const searchableText = [
      vehicle['Stock #'],
      vehicle['VIN'],
      vehicle['Make'],
      vehicle['Model'],
      vehicle['Color'],
      vehicle['Status'],
      vehicle['Notes']
    ].join(' ').toLowerCase();
    
    return searchTerms.every(term => searchableText.includes(term));
  });
}

function filterVehiclesByStatus(status) {
  if (!status || status === 'all') { return currentVehicleData; }
  return currentVehicleData.filter(v => v['Status'] === status);
}

function filterVehiclesByCondition(minCondition) {
  return currentVehicleData.filter(v => {
    const avgCondition = ((v.ExteriorCondition || 3) + (v.InteriorCondition || 3)) / 2;
    return avgCondition >= minCondition;
  });
}

// Performance Monitoring
function getPerformanceMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - (30 * 24 * 60 * 60 * 1000));
  
  const recentVehicles = currentVehicleData.filter(v => new Date(v['Date In']) >= thirtyDaysAgo);
  const avgThroughput = recentVehicles.length / 30;
  
  const bottlenecks = calculateBottlenecks();
  const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'High').length;
  
  return {
    avgDailyThroughput: Math.round(avgThroughput * 10) / 10,
    criticalBottlenecks,
    totalInProgress: currentVehicleData.filter(v => v['Status'] !== 'Lot Ready').length,
    avgConditionScore: currentVehicleData.length > 0 
      ? Math.round(currentVehicleData.reduce((sum, v) => sum + ((v.ExteriorCondition + v.InteriorCondition) / 2), 0) / currentVehicleData.length * 10) / 10
      : 0
  };
}

// Enhanced Keyboard Shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 's':
          e.preventDefault();
          autoSave();
          showNotification('Data saved manually', 'info');
          break;
        case 'n':
          e.preventDefault();
          showAddVehicleModal();
          break;
        case 'e':
          e.preventDefault();
          exportToCSV();
          break;
      }
    }
    
    // Escape key closes modals
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// Initialize Enhanced App
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Enhanced Vehicle Reconditioning Tracker Starting...');
  
  try {
    // Load data with backend fallback
    const backendData = await loadFromBackend();
    if (backendData && backendData.length > 0) {
      currentVehicleData = backendData;
      console.log(`✅ Loaded ${backendData.length} vehicles from backend`);
    } else {
      const storedData = loadDataFromStorage();
      if (storedData && storedData.length > 0) {
        currentVehicleData = storedData;
        console.log(`✅ Loaded ${storedData.length} vehicles from localStorage`);
      } else {
        currentVehicleData = getSampleData();
        autoSave();
        console.log('📝 Using sample data');
      }
    }
    
    // Ensure all vehicles have required fields
    currentVehicleData.forEach(vehicle => {
      if (!vehicle.ExteriorCondition) { vehicle.ExteriorCondition = 3; }
      if (!vehicle.InteriorCondition) { vehicle.InteriorCondition = 3; }
      if (!vehicle.DaysInRecon) {
        const dateIn = new Date(vehicle['Date In'] || new Date());
        const now = new Date();
        vehicle.DaysInRecon = Math.max(0, Math.floor((now - dateIn) / (1000 * 60 * 60 * 24)));
      }
      if (!vehicle.LastStatusChange) { vehicle.LastStatusChange = vehicle['Last Updated'] || new Date().toISOString(); }
    });
    
    // Set up tab listeners with enhanced functionality
    document.querySelectorAll('.tab-button').forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        const tabId = this.getAttribute('data-tab');
        switchTab(tabId);
        
        // Update URL hash for bookmarking
        window.location.hash = tabId;
      });
    });
    
    // Set up periodic auto-save
    setInterval(() => {
      updateDaysInRecon();
      autoSaveWithRetry();
    }, 60000); // Every minute
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Handle URL hash for direct navigation
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['dashboard', 'workflow', 'inventory', 'reports', 'upload', 'detailers'];
    const initialTab = validTabs.includes(hash) ? hash : 'dashboard';
    
    // Render all tabs
    renderAllTabs();
    
    // Show initial tab
    switchTab(initialTab);
    
    // Show welcome message for first-time users
    if (!localStorage.getItem('vehicleReconWelcome')) {
      setTimeout(() => {
        showNotification('Welcome to the Enhanced Vehicle Reconditioning Tracker! 🚗✨', 'info');
        localStorage.setItem('vehicleReconWelcome', 'true');
      }, 1000);
    }
    
    console.log('✅ Enhanced app initialization complete');
    
  } catch (error) {
    console.error('❌ App initialization error:', error);
    showNotification('App initialization failed. Using offline mode.', 'error');
    
    // Fallback to basic functionality
    currentVehicleData = getSampleData();
    renderAllTabs();
    switchTab('dashboard');
  }
});

// Expose enhanced functions globally for debugging and API access
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
window.exportToJSON = exportToJSON;
window.clearAllData = clearAllData;
window.resetToSampleData = resetToSampleData;
window.handleCsvUpload = handleCsvUpload;
window.closeModal = closeModal;
window.sortInventory = sortInventory;
window.updateVehicleStatus = updateVehicleStatus;
window.calculateBottlenecks = calculateBottlenecks;
window.searchVehicles = searchVehicles;
window.filterVehiclesByStatus = filterVehiclesByStatus;
window.filterVehiclesByCondition = filterVehiclesByCondition;
window.getPerformanceMetrics = getPerformanceMetrics;

console.log('✅ Enhanced Vehicle Reconditioning Tracker Loaded Successfully');
console.log('🎯 New Features: Drag & Drop, Advanced Analytics, Enhanced UI, Better Data Management');
console.log('⌨️ Keyboard Shortcuts: Ctrl+S (Save), Ctrl+N (New Vehicle), Ctrl+E (Export), Esc (Close Modal)');
