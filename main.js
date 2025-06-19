// Vehicle Reconditioning Tracker - Complete Application
// Author: AI Assistant
// Description: Full-featured vehicle reconditioning tracking system

// Global State Management
let vehicles = [];
let detailers = [];
let currentTab = 'dashboard';
let sortField = 'stockNumber';
let sortDirection = 'asc';
let draggedVehicle = null;

// Configuration
const API_BASE_URL = '/api';
const WORKFLOW_STAGES = [
    { id: 'new-arrival', name: 'New Arrival', icon: 'fas fa-car', color: 'blue', description: 'Vehicle arrived at lot' },
    { id: 'mechanical', name: 'Mechanical', icon: 'fas fa-wrench', color: 'yellow', description: 'Mechanical inspection and service' },
    { id: 'detailing', name: 'Detailing', icon: 'fas fa-spray-can', color: 'purple', description: 'Vehicle cleaning and detailing' },
    { id: 'photos', name: 'Photos', icon: 'fas fa-camera', color: 'pink', description: 'Photography for listings' },
    { id: 'title', name: 'Title', icon: 'fas fa-file-contract', color: 'orange', description: 'Title processing and documentation' },
    { id: 'lot-ready', name: 'Lot Ready', icon: 'fas fa-check-circle', color: 'green', description: 'Ready for sale' }
];

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚗 Vehicle Reconditioning Tracker Starting...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Load data
        await loadVehicleData();
        await loadDetailers();
        
        // Setup UI
        setupEventListeners();
        setupDragDrop();
        renderAllTabs();
        showTab('dashboard');
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        showNotification('Failed to initialize application', 'error');
    }
}

// Data Management
async function loadVehicleData() {
    try {
        // First try to load from localStorage
        const savedData = localStorage.getItem('vehicleReconData');
        if (savedData) {
            vehicles = JSON.parse(savedData);
            console.log(`📱 Loaded ${vehicles.length} vehicles from localStorage`);
            return;
        }
        
        // Try to load sample data if no saved data
        await loadSampleData();
    } catch (error) {
        console.error('Failed to load vehicle data:', error);
        vehicles = [];
    }
}

async function loadSampleData() {
    try {
        const response = await fetch('/sample-inventory.csv');
        if (!response.ok) {
            throw new Error('Sample data not found');
        }
        
        const csvText = await response.text();
        const parsedData = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });
        
        vehicles = parsedData.data.map((row, index) => ({
            id: `vehicle_${index + 1}`,
            stockNumber: row['Stock #'] || '',
            year: row['Year'] || '',
            make: row['Make'] || '',
            model: row['Model'] || '',
            vin: row['VIN'] || '',
            status: row['Status'] || 'New Arrival',
            daysInInventory: parseInt(row['Days in Inventory']) || 0,
            estimatedCompletion: row['Estimated Completion'] || '',
            dateAdded: new Date().toISOString(),
            workflowHistory: [],
            notes: '',
            assignedDetailer: null,
            priority: 'normal',
            tags: []
        }));
        
        saveVehicleData();
        console.log(`📊 Loaded ${vehicles.length} vehicles from sample data`);
    } catch (error) {
        console.log('No sample data available, starting with empty dataset');
        vehicles = [];
    }
}

async function loadDetailers() {
    try {
        const response = await fetch('/api/detailers');
        if (response.ok) {
            detailers = await response.json();
        } else {
            // Use default detailers if API fails
            detailers = [
                { id: 'det001', name: 'John Smith', specialty: 'Interior Detail', rating: 4.8, available: true },
                { id: 'det002', name: 'Jane Doe', specialty: 'Exterior Detail', rating: 4.9, available: true },
                { id: 'det003', name: 'Mike Johnson', specialty: 'Full Detail', rating: 4.7, available: false },
                { id: 'det004', name: 'Sarah Williams', specialty: 'Paint Correction', rating: 5.0, available: true },
                { id: 'det005', name: 'Tom Brown', specialty: 'Ceramic Coating', rating: 4.6, available: true }
            ];
        }
        console.log(`👥 Loaded ${detailers.length} detailers`);
    } catch (error) {
        console.error('Failed to load detailers:', error);
        detailers = [];
    }
}

function saveVehicleData() {
    try {
        localStorage.setItem('vehicleReconData', JSON.stringify(vehicles));
        console.log('💾 Vehicle data saved to localStorage');
    } catch (error) {
        console.error('Failed to save vehicle data:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.target.closest('.tab-button').dataset.tab;
            if (tab) showTab(tab);
        });
    });
    
    // Search and filter
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterVehicles, 300));
    }
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterVehicles);
    }
    
    // File upload drag and drop
    const uploadModal = document.getElementById('upload-modal');
    if (uploadModal) {
        uploadModal.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        uploadModal.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'text/csv') {
                handleFileSelect({ target: { files: [files[0]] } });
            }
        });
    }
}

// Drag and Drop Setup
function setupDragDrop() {
    // This will be called when workflow is rendered
    console.log('🔄 Drag and drop setup complete');
}

function makeVehicleCardDraggable(card, vehicle) {
    card.draggable = true;
    
    card.addEventListener('dragstart', (e) => {
        draggedVehicle = vehicle;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', '');
    });
    
    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        draggedVehicle = null;
    });
}

function makeStageDroppable(stageElement, stageName) {
    stageElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        stageElement.classList.add('drag-over');
    });
    
    stageElement.addEventListener('dragleave', (e) => {
        if (!stageElement.contains(e.relatedTarget)) {
            stageElement.classList.remove('drag-over');
        }
    });
    
    stageElement.addEventListener('drop', (e) => {
        e.preventDefault();
        stageElement.classList.remove('drag-over');
        
        if (draggedVehicle) {
            updateVehicleStatus(draggedVehicle.id, stageName);
        }
    });
}

// Tab Management
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
        if (button.dataset.tab === tabName) {
            button.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        currentTab = tabName;
        
        // Render content for the active tab
        switch (tabName) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'workflow':
                renderWorkflow();
                break;
            case 'vehicles':
                renderVehicleTable();
                break;
            case 'reports':
                renderReports();
                break;
        }
    }
}

// Dashboard Rendering
function renderDashboard() {
    updateStats();
    renderCharts();
}

function updateStats() {
    const totalVehicles = vehicles.length;
    const inProgress = vehicles.filter(v => !['New Arrival', 'Lot Ready'].includes(v.status)).length;
    const lotReady = vehicles.filter(v => v.status === 'Lot Ready').length;
    const overdue = vehicles.filter(v => v.daysInInventory > 14).length;
    
    document.getElementById('total-vehicles').textContent = totalVehicles;
    document.getElementById('in-progress').textContent = inProgress;
    document.getElementById('lot-ready').textContent = lotReady;
    document.getElementById('overdue').textContent = overdue;
}

function renderCharts() {
    renderStatusChart();
    renderDaysChart();
}

function renderStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    
    const statusCounts = {};
    WORKFLOW_STAGES.forEach(stage => {
        statusCounts[stage.name] = vehicles.filter(v => v.status === stage.name).length;
    });
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#3B82F6', '#EAB308', '#8B5CF6', 
                    '#EC4899', '#F97316', '#10B981'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderDaysChart() {
    const ctx = document.getElementById('daysChart');
    if (!ctx) return;
    
    const avgDays = {};
    WORKFLOW_STAGES.forEach(stage => {
        const stageVehicles = vehicles.filter(v => v.status === stage.name);
        if (stageVehicles.length > 0) {
            avgDays[stage.name] = stageVehicles.reduce((sum, v) => sum + v.daysInInventory, 0) / stageVehicles.length;
        } else {
            avgDays[stage.name] = 0;
        }
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(avgDays),
            datasets: [{
                label: 'Average Days',
                data: Object.values(avgDays),
                backgroundColor: '#3B82F6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Workflow Rendering
function renderWorkflow() {
    const container = document.getElementById('workflow-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    WORKFLOW_STAGES.forEach(stage => {
        const stageVehicles = vehicles.filter(v => v.status === stage.name);
        
        const stageElement = document.createElement('div');
        stageElement.className = `workflow-stage bg-white rounded-lg shadow-md p-4 border-t-4 border-${stage.color}-500`;
        stageElement.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                    <i class="${stage.icon} text-${stage.color}-600 mr-2"></i>
                    <h3 class="font-semibold text-gray-900">${stage.name}</h3>
                </div>
                <span class="bg-${stage.color}-100 text-${stage.color}-800 text-xs font-medium px-2 py-1 rounded-full">
                    ${stageVehicles.length}
                </span>
            </div>
            <p class="text-sm text-gray-600 mb-4">${stage.description}</p>
            <div class="space-y-2 min-h-24" data-stage="${stage.name}">
                ${stageVehicles.map(vehicle => createVehicleCard(vehicle)).join('')}
            </div>
        `;
        
        container.appendChild(stageElement);
        makeStageDroppable(stageElement, stage.name);
        
        // Make vehicle cards draggable
        stageVehicles.forEach(vehicle => {
            const card = stageElement.querySelector(`[data-vehicle-id="${vehicle.id}"]`);
            if (card) {
                makeVehicleCardDraggable(card, vehicle);
            }
        });
    });
}

function createVehicleCard(vehicle) {
    const urgencyClass = vehicle.daysInInventory > 14 ? 'border-red-500 bg-red-50' : 
                        vehicle.daysInInventory > 7 ? 'border-yellow-500 bg-yellow-50' : 
                        'border-gray-200 bg-white';
    
    return `
        <div class="vehicle-card p-3 border-2 ${urgencyClass} rounded-md cursor-pointer hover:shadow-md transition-all"
             data-vehicle-id="${vehicle.id}" onclick="showVehicleDetails('${vehicle.id}')">
            <div class="flex justify-between items-start mb-2">
                <div class="font-medium text-sm">${vehicle.stockNumber}</div>
                <div class="text-xs text-gray-500">${vehicle.daysInInventory}d</div>
            </div>
            <div class="text-sm text-gray-900">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            ${vehicle.assignedDetailer ? `
                <div class="text-xs text-blue-600 mt-1">
                    <i class="fas fa-user mr-1"></i>${vehicle.assignedDetailer}
                </div>
            ` : ''}
            ${vehicle.priority === 'high' ? `
                <div class="text-xs text-red-600 mt-1">
                    <i class="fas fa-exclamation-circle mr-1"></i>High Priority
                </div>
            ` : ''}
        </div>
    `;
}

// Vehicle Table Rendering
function renderVehicleTable() {
    populateStatusFilter();
    
    const tbody = document.getElementById('vehicle-table-body');
    if (!tbody) return;
    
    const filteredVehicles = getFilteredVehicles();
    const sortedVehicles = sortVehicles(filteredVehicles);
    
    tbody.innerHTML = sortedVehicles.map(vehicle => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${vehicle.stockNumber}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.year}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.make}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.model}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(vehicle.status)}">
                    ${vehicle.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.daysInInventory}
                ${vehicle.daysInInventory > 14 ? '<i class="fas fa-exclamation-triangle text-red-500 ml-1"></i>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showVehicleDetails('${vehicle.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="showStatusUpdateModal('${vehicle.id}')" 
                        class="text-green-600 hover:text-green-900 mr-3">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteVehicle('${vehicle.id}')" 
                        class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(status) {
    const classes = {
        'New Arrival': 'bg-blue-100 text-blue-800',
        'Mechanical': 'bg-yellow-100 text-yellow-800',
        'Detailing': 'bg-purple-100 text-purple-800',
        'Photos': 'bg-pink-100 text-pink-800',
        'Title': 'bg-orange-100 text-orange-800',
        'Lot Ready': 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
}

function populateStatusFilter() {
    const filter = document.getElementById('status-filter');
    if (!filter) return;
    
    const currentValue = filter.value;
    filter.innerHTML = '<option value="">All Statuses</option>';
    
    WORKFLOW_STAGES.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage.name;
        option.textContent = stage.name;
        filter.appendChild(option);
    });
    
    filter.value = currentValue;
}

// Filtering and Sorting
function getFilteredVehicles() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    
    return vehicles.filter(vehicle => {
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || vehicle.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
}

function sortVehicles(vehicleList) {
    return [...vehicleList].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        // Handle numeric fields
        if (sortField === 'year' || sortField === 'daysInInventory') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        }
        
        // Handle string fields
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
}

function filterVehicles() {
    if (currentTab === 'vehicles') {
        renderVehicleTable();
    } else if (currentTab === 'workflow') {
        renderWorkflow();
    }
}

// Reports Rendering
function renderReports() {
    renderBottleneckAnalysis();
    renderCompletionTimes();
    renderDetailedReport();
}

function renderBottleneckAnalysis() {
    const container = document.getElementById('bottleneck-analysis');
    if (!container) return;
    
    const stageCounts = {};
    const stageAvgDays = {};
    
    WORKFLOW_STAGES.forEach(stage => {
        const stageVehicles = vehicles.filter(v => v.status === stage.name);
        stageCounts[stage.name] = stageVehicles.length;
        
        if (stageVehicles.length > 0) {
            stageAvgDays[stage.name] = stageVehicles.reduce((sum, v) => sum + v.daysInInventory, 0) / stageVehicles.length;
        } else {
            stageAvgDays[stage.name] = 0;
        }
    });
    
    const bottlenecks = Object.entries(stageCounts)
        .filter(([stage, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    container.innerHTML = bottlenecks.map(([stage, count]) => `
        <div class="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-md">
            <div>
                <span class="font-medium text-red-900">${stage}</span>
                <p class="text-sm text-red-600">${count} vehicles, avg ${stageAvgDays[stage].toFixed(1)} days</p>
            </div>
            <i class="fas fa-exclamation-triangle text-red-500"></i>
        </div>
    `).join('');
}

function renderCompletionTimes() {
    const container = document.getElementById('completion-times');
    if (!container) return;
    
    const completedVehicles = vehicles.filter(v => v.status === 'Lot Ready');
    const avgCompletionTime = completedVehicles.length > 0 
        ? completedVehicles.reduce((sum, v) => sum + v.daysInInventory, 0) / completedVehicles.length 
        : 0;
    
    const fastestCompletion = completedVehicles.length > 0 
        ? Math.min(...completedVehicles.map(v => v.daysInInventory)) 
        : 0;
    
    const slowestCompletion = completedVehicles.length > 0 
        ? Math.max(...completedVehicles.map(v => v.daysInInventory)) 
        : 0;
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-md">
                <span class="font-medium text-green-900">Average Completion</span>
                <span class="text-green-600">${avgCompletionTime.toFixed(1)} days</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
                <span class="font-medium text-blue-900">Fastest Completion</span>
                <span class="text-blue-600">${fastestCompletion} days</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-orange-50 border border-orange-200 rounded-md">
                <span class="font-medium text-orange-900">Slowest Completion</span>
                <span class="text-orange-600">${slowestCompletion} days</span>
            </div>
        </div>
    `;
}

function renderDetailedReport() {
    const tbody = document.getElementById('detailed-report-body');
    if (!tbody) return;
    
    tbody.innerHTML = vehicles.map(vehicle => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${vehicle.stockNumber}</div>
                <div class="text-sm text-gray-500">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(vehicle.status)}">
                    ${vehicle.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.daysInInventory} days
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.daysInInventory} days
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${vehicle.estimatedCompletion || 'Not set'}
            </td>
        </tr>
    `).join('');
}

// Modal Management
function showUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function showVehicleDetails(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const modal = document.getElementById('vehicle-modal');
    const title = document.getElementById('vehicle-modal-title');
    const body = document.getElementById('vehicle-modal-body');
    
    if (!modal || !title || !body) return;
    
    title.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.stockNumber})`;
    
    body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h3>
                <dl class="space-y-2">
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Stock Number:</dt>
                        <dd class="text-sm text-gray-900">${vehicle.stockNumber}</dd>
                    </div>
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">VIN:</dt>
                        <dd class="text-sm text-gray-900">${vehicle.vin}</dd>
                    </div>
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Status:</dt>
                        <dd class="text-sm">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(vehicle.status)}">
                                ${vehicle.status}
                            </span>
                        </dd>
                    </div>
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Days in Inventory:</dt>
                        <dd class="text-sm text-gray-900">${vehicle.daysInInventory}</dd>
                    </div>
                    <div class="flex justify-between">
                        <dt class="text-sm font-medium text-gray-500">Assigned Detailer:</dt>
                        <dd class="text-sm text-gray-900">${vehicle.assignedDetailer || 'None'}</dd>
                    </div>
                </dl>
            </div>
            
            <div>
                <h3 class="text-lg font-medium text-gray-900 mb-3">Workflow Progress</h3>
                <div class="space-y-2">
                    ${WORKFLOW_STAGES.map(stage => {
                        const isCompleted = getStageIndex(vehicle.status) >= getStageIndex(stage.name);
                        const isCurrent = vehicle.status === stage.name;
                        return `
                            <div class="flex items-center ${isCurrent ? 'font-medium' : ''}">
                                <i class="fas ${isCompleted ? 'fa-check-circle text-green-500' : isCurrent ? 'fa-clock text-yellow-500' : 'fa-circle text-gray-300'} mr-2"></i>
                                <span class="${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}">${stage.name}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h3 class="text-lg font-medium text-gray-900 mb-3">Notes</h3>
            <textarea class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" 
                      rows="3" placeholder="Add notes about this vehicle..."
                      onchange="updateVehicleNotes('${vehicle.id}', this.value)">${vehicle.notes || ''}</textarea>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
            <button onclick="closeVehicleModal()" 
                    class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300">
                Close
            </button>
            <button onclick="showStatusUpdateModal('${vehicle.id}')" 
                    class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Update Status
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function showStatusUpdateModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const modal = document.getElementById('status-modal');
    const body = document.getElementById('status-modal-body');
    
    if (!modal || !body) return;
    
    body.innerHTML = `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Update Status for ${vehicle.stockNumber}
                </label>
                <select id="new-status-select" class="w-full border border-gray-300 rounded-md px-3 py-2">
                    ${WORKFLOW_STAGES.map(stage => `
                        <option value="${stage.name}" ${vehicle.status === stage.name ? 'selected' : ''}>
                            ${stage.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Assign Detailer (optional)
                </label>
                <select id="detailer-select" class="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">No detailer assigned</option>
                    ${detailers.filter(d => d.available).map(detailer => `
                        <option value="${detailer.name}" ${vehicle.assignedDetailer === detailer.name ? 'selected' : ''}>
                            ${detailer.name} - ${detailer.specialty} (${detailer.rating}⭐)
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Priority Level
                </label>
                <select id="priority-select" class="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="normal" ${vehicle.priority === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="high" ${vehicle.priority === 'high' ? 'selected' : ''}>High Priority</option>
                    <option value="low" ${vehicle.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                    Update Notes
                </label>
                <textarea id="update-notes" class="w-full border border-gray-300 rounded-md px-3 py-2" 
                          rows="3" placeholder="Add a note about this status change..."></textarea>
            </div>
        </div>
        
        <div class="mt-6 flex justify-end space-x-3">
            <button onclick="closeStatusModal()" 
                    class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300">
                Cancel
            </button>
            <button onclick="confirmStatusUpdate('${vehicle.id}')" 
                    class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Update Status
            </button>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeStatusModal() {
    const modal = document.getElementById('status-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function confirmStatusUpdate(vehicleId) {
    const newStatus = document.getElementById('new-status-select')?.value;
    const newDetailer = document.getElementById('detailer-select')?.value;
    const newPriority = document.getElementById('priority-select')?.value;
    const updateNotes = document.getElementById('update-notes')?.value;
    
    if (newStatus) {
        updateVehicleStatus(vehicleId, newStatus, {
            detailer: newDetailer,
            priority: newPriority,
            notes: updateNotes
        });
        closeStatusModal();
        closeVehicleModal();
    }
}

// Vehicle Operations
function updateVehicleStatus(vehicleId, newStatus, options = {}) {
    const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;
    
    const vehicle = vehicles[vehicleIndex];
    const oldStatus = vehicle.status;
    
    // Update vehicle properties
    vehicle.status = newStatus;
    if (options.detailer !== undefined) {
        vehicle.assignedDetailer = options.detailer || null;
    }
    if (options.priority !== undefined) {
        vehicle.priority = options.priority;
    }
    
    // Add to workflow history
    if (!vehicle.workflowHistory) {
        vehicle.workflowHistory = [];
    }
    
    vehicle.workflowHistory.push({
        timestamp: new Date().toISOString(),
        fromStatus: oldStatus,
        toStatus: newStatus,
        notes: options.notes || '',
        user: 'System'
    });
    
    // Update notes if provided
    if (options.notes) {
        const timestamp = new Date().toLocaleString();
        vehicle.notes = vehicle.notes ? 
            `${vehicle.notes}\n\n[${timestamp}] ${options.notes}` : 
            `[${timestamp}] ${options.notes}`;
    }
    
    saveVehicleData();
    renderAllTabs();
    
    showNotification(`${vehicle.stockNumber} moved to ${newStatus}`, 'success');
}

function updateVehicleNotes(vehicleId, notes) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        vehicle.notes = notes;
        saveVehicleData();
    }
}

function deleteVehicle(vehicleId) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        const vehicleIndex = vehicles.findIndex(v => v.id === vehicleId);
        if (vehicleIndex !== -1) {
            const vehicle = vehicles[vehicleIndex];
            vehicles.splice(vehicleIndex, 1);
            saveVehicleData();
            renderAllTabs();
            showNotification(`${vehicle.stockNumber} deleted`, 'success');
        }
    }
}

// CSV Upload and Export
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.type !== 'text/csv') {
        showNotification('Please select a CSV file', 'error');
        return;
    }
    
    showUploadProgress(true);
    
    try {
        const text = await file.text();
        const result = Papa.parse(text, {
            header: true,
            skipEmptyLines: true
        });
        
        if (result.errors.length > 0) {
            console.warn('CSV parsing warnings:', result.errors);
        }
        
        const newVehicles = result.data.map((row, index) => ({
            id: `imported_${Date.now()}_${index}`,
            stockNumber: row['Stock #'] || row.stockNumber || '',
            year: row['Year'] || row.year || '',
            make: row['Make'] || row.make || '',
            model: row['Model'] || row.model || '',
            vin: row['VIN'] || row.vin || '',
            status: row['Status'] || row.status || 'New Arrival',
            daysInInventory: parseInt(row['Days in Inventory'] || row.daysInInventory) || 0,
            estimatedCompletion: row['Estimated Completion'] || row.estimatedCompletion || '',
            dateAdded: new Date().toISOString(),
            workflowHistory: [],
            notes: '',
            assignedDetailer: null,
            priority: 'normal',
            tags: []
        })).filter(vehicle => vehicle.stockNumber); // Filter out empty rows
        
        if (newVehicles.length === 0) {
            throw new Error('No valid vehicle data found in CSV');
        }
        
        // Ask user if they want to replace or append
        const replace = confirm(`Found ${newVehicles.length} vehicles in CSV. Click OK to replace current data, or Cancel to append to existing data.`);
        
        if (replace) {
            vehicles = newVehicles;
        } else {
            // Remove duplicates based on stock number
            const existingStockNumbers = new Set(vehicles.map(v => v.stockNumber));
            const uniqueNewVehicles = newVehicles.filter(v => !existingStockNumbers.has(v.stockNumber));
            vehicles.push(...uniqueNewVehicles);
            
            if (uniqueNewVehicles.length < newVehicles.length) {
                showNotification(`${uniqueNewVehicles.length} new vehicles added (${newVehicles.length - uniqueNewVehicles.length} duplicates skipped)`, 'info');
            }
        }
        
        saveVehicleData();
        renderAllTabs();
        closeUploadModal();
        
        showNotification(`Successfully imported ${newVehicles.length} vehicles`, 'success');
        
    } catch (error) {
        console.error('Import error:', error);
        showNotification(`Import failed: ${error.message}`, 'error');
    } finally {
        showUploadProgress(false);
    }
}

function showUploadProgress(show) {
    const progress = document.getElementById('upload-progress');
    if (progress) {
        progress.style.display = show ? 'block' : 'none';
    }
}

function exportData() {
    try {
        const csvData = Papa.unparse(vehicles.map(vehicle => ({
            'Stock #': vehicle.stockNumber,
            'Year': vehicle.year,
            'Make': vehicle.make,
            'Model': vehicle.model,
            'VIN': vehicle.vin,
            'Status': vehicle.status,
            'Days in Inventory': vehicle.daysInInventory,
            'Estimated Completion': vehicle.estimatedCompletion,
            'Assigned Detailer': vehicle.assignedDetailer || '',
            'Priority': vehicle.priority,
            'Notes': vehicle.notes || ''
        })));
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Data exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed', 'error');
    }
}

// Utility Functions
function getStageIndex(stageName) {
    return WORKFLOW_STAGES.findIndex(stage => stage.name === stageName);
}

function renderAllTabs() {
    updateStats();
    if (currentTab === 'dashboard') renderDashboard();
    if (currentTab === 'workflow') renderWorkflow();
    if (currentTab === 'vehicles') renderVehicleTable();
    if (currentTab === 'reports') renderReports();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg text-white transition-all duration-300 transform translate-x-full`;
    
    // Set color based on type
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    notification.classList.add(colors[type] || colors.info);
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global functions for onclick handlers
window.showTab = showTab;
window.showUploadModal = showUploadModal;
window.closeUploadModal = closeUploadModal;
window.showVehicleDetails = showVehicleDetails;
window.closeVehicleModal = closeVehicleModal;
window.showStatusUpdateModal = showStatusUpdateModal;
window.closeStatusModal = closeStatusModal;
window.confirmStatusUpdate = confirmStatusUpdate;
window.handleFileSelect = handleFileSelect;
window.exportData = exportData;
window.updateVehicleNotes = updateVehicleNotes;
window.deleteVehicle = deleteVehicle;
window.filterVehicles = filterVehicles;
window.sortVehicles = (field) => {
    if (sortField === field) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDirection = 'asc';
    }
    renderVehicleTable();
};

console.log('🚗 Vehicle Reconditioning Tracker loaded successfully');
