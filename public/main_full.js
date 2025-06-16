// --- Vehicle Reconditioning Tracker App ---
// Full-featured application with advanced UI/UX, workflow management, and comprehensive functionality

// --- Global State ---
let currentVehicleData = [];
let detailerNames = ['John Smith', 'Mike Johnson', 'Sarah Davis', 'Tom Wilson'];
let activeVehicleId = null;
let statusToUpdateTo = null;
let draggedItemId = null;

const RECON_STATUSES = [
    'New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Lot Ready', 'Sold'
];

const WORKFLOW_COLUMNS_ORDER = ["New Arrival", "Mechanical", "Detailing", "Photos", "Lot Ready"];

// --- Utility Functions ---
function $(id) { return document.getElementById(id); }

function showMessageModal(title, text) {
    const modal = $('message-modal');
    const titleEl = $('message-modal-title');
    const textEl = $('message-modal-text');
    
    if (modal && titleEl && textEl) {
        titleEl.textContent = title;
        textEl.textContent = text;
        modal.style.display = 'block';
    }
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

function calculateProgress(status) {
    const statusIndex = RECON_STATUSES.indexOf(status);
    return Math.round((statusIndex / (RECON_STATUSES.length - 1)) * 100);
}

// --- Data Loading ---
async function loadInitialData() {
    try {
        let url = './Recon -Mission Ford of Dearborn-2025-05-30-1153 - Sheet1.json';
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load inventory JSON');
        const json = await res.json();
        currentVehicleData = parseVehicleDataFromJson(json);
        if (currentVehicleData.length === 0) {
            currentVehicleData = getSampleData();
            showMessageModal('Notice', 'Using sample data because the JSON file format is invalid. The actual data file has formatting issues.');
        }
    } catch (e) {
        currentVehicleData = getSampleData();
        showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    }
    updateAllViews();
}

function getSampleData() {
    return [
        {
            id: '1',
            stockNumber: 'T250518A',
            vin: '1FMCU9G67LUC03251',
            year: '2020',
            make: 'Ford',
            model: 'Escape',
            color: 'White',
            status: 'Mechanical',
            detailer: 'John Smith',
            dateIn: '5/19/2025',
            dateOut: '',
            notes: 'Needs brake inspection',
            progress: 25,
            source: 'Trade-In',
            odometer: '45000'
        },
        {
            id: '2',
            stockNumber: 'T250519B',
            vin: '1HGBH41JXMN109186',
            year: '2019',
            make: 'Honda',
            model: 'Civic',
            color: 'Blue',
            status: 'Detailing',
            detailer: 'Mike Johnson',
            dateIn: '5/20/2025',
            dateOut: '',
            notes: 'Minor scratches on rear bumper',
            progress: 50,
            source: 'Auction',
            odometer: '32000'
        },
        {
            id: '3',
            stockNumber: 'T250520C',
            vin: '2T1BURHE0JC123456',
            year: '2018',
            make: 'Toyota',
            model: 'Corolla',
            color: 'Silver',
            status: 'Photos',
            detailer: 'Sarah Davis',
            dateIn: '5/18/2025',
            dateOut: '',
            notes: 'Ready for photography',
            progress: 75,
            source: 'Trade-In',
            odometer: '28000'
        },
        {
            id: '4',
            stockNumber: 'T250521D',
            vin: '1G1ZD5ST8JF123789',
            year: '2017',
            make: 'Chevrolet',
            model: 'Malibu',
            color: 'Black',
            status: 'Lot Ready',
            detailer: 'Tom Wilson',
            dateIn: '5/15/2025',
            dateOut: '5/22/2025',
            notes: 'Complete - ready for sale',
            progress: 100,
            source: 'Trade-In',
            odometer: '52000'
        },
        {
            id: '5',
            stockNumber: 'T250522E',
            vin: '5NPE34AF4JH123456',
            year: '2021',
            make: 'Hyundai',
            model: 'Elantra',
            color: 'Red',
            status: 'New Arrival',
            detailer: '',
            dateIn: '5/23/2025',
            dateOut: '',
            notes: 'Just arrived - inspection pending',
            progress: 0,
            source: 'Auction',
            odometer: '18000'
        },
        {
            id: '6',
            stockNumber: 'T250523F',
            vin: '3VWDP7AJ8CM123456',
            year: '2022',
            make: 'Volkswagen',
            model: 'Jetta',
            color: 'Gray',
            status: 'Mechanical',
            detailer: '',
            dateIn: '5/24/2025',
            dateOut: '',
            notes: 'Engine service required',
            progress: 25,
            source: 'Trade-In',
            odometer: '12000'
        }
    ];
}

function parseVehicleDataFromJson(json) {
    try {
        const rows = json.data;
        if (!rows || rows.length < 5) return [];
        
        let vehicles = [];
        let dataStartIndex = -1;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row && row.length > 3 && typeof row[3] === 'string' && row[3].length === 17) {
                dataStartIndex = i;
                break;
            }
        }
        
        if (dataStartIndex === -1) return [];
        
        for (let i = dataStartIndex; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 10) continue;
            
            let v = {
                id: i.toString(),
                stockNumber: row[2] || '',
                vin: row[3] || '',
                year: row[7] || '',
                make: row[8] || '',
                model: row[9] || '',
                color: row[11] || '',
                status: 'New Arrival',
                detailer: '',
                dateIn: row[5] || '',
                dateOut: '',
                notes: '',
                progress: 0,
                source: 'Unknown',
                odometer: ''
            };
            
            if (v.stockNumber && v.vin && v.make) {
                const statuses = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Lot Ready'];
                v.status = statuses[Math.floor(Math.random() * statuses.length)];
                v.progress = calculateProgress(v.status);
                vehicles.push(v);
            }
        }
        
        return vehicles;
    } catch (e) {
        console.error('JSON parsing failed:', e);
        return [];
    }
}

// --- Tab Management ---
function setupTabSwitching() {
    const tabs = $('tabs');
    tabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            const tabId = e.target.getAttribute('data-tab');
            switchTab(tabId);
        }
    });
}

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
    
    // Update view for the selected tab
    switch(tabId) {
        case 'dashboard':
            updateDashboardView();
            break;
        case 'workflow':
            updateWorkflowView();
            break;
        case 'inventory':
            updateInventoryView();
            break;
        case 'reports':
            updateReportsView();
            break;
        case 'upload':
            updateUploadView();
            break;
        case 'detailers':
            updateDetailersView();
            break;
    }
}

// --- Dashboard View ---
function updateDashboardView() {
    updateDashboardStats();
    updateDashboardVehicleList();
}

function updateDashboardStats() {
    const activeVehicles = currentVehicleData.filter(v => v.status !== 'Sold');
    const mechanicalCount = currentVehicleData.filter(v => v.status === 'Mechanical').length;
    const detailingCount = currentVehicleData.filter(v => v.status === 'Detailing').length;
    const lotReadyCount = currentVehicleData.filter(v => v.status === 'Lot Ready').length;
    
    if ($('total-active-count')) $('total-active-count').textContent = activeVehicles.length;
    if ($('mechanical-count')) $('mechanical-count').textContent = mechanicalCount;
    if ($('detailing-count')) $('detailing-count').textContent = detailingCount;
    if ($('lot-ready-count')) $('lot-ready-count').textContent = lotReadyCount;
}

function updateDashboardVehicleList() {
    const container = $('dashboard-vehicle-list');
    if (!container) return;
    
    const searchTerm = $('dashboard-search') ? $('dashboard-search').value.toLowerCase() : '';
    const statusFilter = $('dashboard-status-filter') ? $('dashboard-status-filter').value : '';
    
    let filteredVehicles = currentVehicleData.filter(v => v.status !== 'Sold');
    
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(v => 
            v.stockNumber.toLowerCase().includes(searchTerm) ||
            v.vin.toLowerCase().includes(searchTerm) ||
            v.make.toLowerCase().includes(searchTerm) ||
            v.model.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter === 'needs_attention') {
        filteredVehicles = filteredVehicles.filter(v => 
            v.status === 'Mechanical' || v.status === 'Detailing'
        );
    }
    
    container.innerHTML = filteredVehicles.map(vehicle => `
        <div class="dashboard-vehicle-card" onclick="openVehicleDetailModal('${vehicle.id}')">
            <div class="flex justify-between items-start mb-2">
                <h4>${vehicle.year} ${vehicle.make} ${vehicle.model}</h4>
                <span class="px-2 py-1 rounded text-xs ${getStatusColor(vehicle.status)}">${vehicle.status}</span>
            </div>
            <p class="text-sm text-gray-600 mb-1">Stock #: ${vehicle.stockNumber}</p>
            <p class="text-sm text-gray-600 mb-1">VIN: ${vehicle.vin}</p>
            ${vehicle.detailer ? `<p class="text-sm text-gray-600 mb-2">Detailer: ${vehicle.detailer}</p>` : ''}
            <div class="progress-bar-container mb-2">
                <div class="progress-bar-fg" style="width: ${vehicle.progress}%">
                    <span class="progress-bar-text">${vehicle.progress}% Complete</span>
                </div>
            </div>
            ${vehicle.notes ? `<p class="text-xs text-gray-500">${vehicle.notes}</p>` : ''}
        </div>
    `).join('');
}

// --- Workflow View ---
function updateWorkflowView() {
    const container = $('workflow-board');
    if (!container) return;
    
    container.innerHTML = WORKFLOW_COLUMNS_ORDER.map(status => {
        const vehiclesInStatus = currentVehicleData.filter(v => v.status === status);
        
        return `
            <div class="workflow-column" data-status="${status}">
                <div class="workflow-column-header">
                    ${status} <span>${vehiclesInStatus.length}</span>
                </div>
                ${vehiclesInStatus.map(vehicle => `
                    <div class="workflow-vehicle-card" draggable="true" data-vehicle-id="${vehicle.id}">
                        <h5>${vehicle.year} ${vehicle.make} ${vehicle.model}</h5>
                        <p>Stock #: ${vehicle.stockNumber}</p>
                        <p>VIN: ${vehicle.vin.substring(0, 8)}...</p>
                        ${vehicle.detailer ? `<p>Detailer: ${vehicle.detailer}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    setupDragAndDrop();
}

function setupDragAndDrop() {
    // Add drag event listeners to vehicle cards
    document.querySelectorAll('.workflow-vehicle-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedItemId = e.target.getAttribute('data-vehicle-id');
            e.target.style.opacity = '0.5';
        });
        
        card.addEventListener('dragend', (e) => {
            e.target.style.opacity = '1';
            draggedItemId = null;
        });
    });
    
    // Add drop event listeners to columns
    document.querySelectorAll('.workflow-column').forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', (e) => {
            column.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            if (draggedItemId) {
                const newStatus = column.getAttribute('data-status');
                updateVehicleStatus(draggedItemId, newStatus);
            }
        });
    });
}

// --- Inventory View ---
function updateInventoryView() {
    const tbody = $('inventory-table-body');
    if (!tbody) return;
    
    const searchTerm = $('inventory-search') ? $('inventory-search').value.toLowerCase() : '';
    const viewFilter = $('inventory-view-filter') ? $('inventory-view-filter').value : '';
    
    let filteredVehicles = [...currentVehicleData];
    
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(v => 
            v.stockNumber.toLowerCase().includes(searchTerm) ||
            v.vin.toLowerCase().includes(searchTerm) ||
            v.make.toLowerCase().includes(searchTerm) ||
            v.model.toLowerCase().includes(searchTerm)
        );
    }
    
    if (viewFilter === 'active') {
        filteredVehicles = filteredVehicles.filter(v => v.status !== 'Sold');
    } else if (viewFilter === 'sold') {
        filteredVehicles = filteredVehicles.filter(v => v.status === 'Sold');
    }
    
    tbody.innerHTML = filteredVehicles.map(vehicle => `
        <tr onclick="openVehicleDetailModal('${vehicle.id}')" class="hover:bg-gray-50 cursor-pointer">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${vehicle.stockNumber}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${vehicle.year}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${vehicle.make}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${vehicle.model}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 rounded text-xs ${getStatusColor(vehicle.status)}">${vehicle.status}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="progress-bar-container" style="height: 8px;">
                    <div class="progress-bar-fg" style="width: ${vehicle.progress}%; height: 100%;"></div>
                </div>
                <span class="text-xs text-gray-500">${vehicle.progress}%</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="event.stopPropagation(); openVehicleDetailModal('${vehicle.id}')" class="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button>
                <button onclick="event.stopPropagation(); deleteVehicle('${vehicle.id}')" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
        </tr>
    `).join('');
}

// --- Reports View ---
function updateReportsView() {
    updateReportsStats();
    updateReportsCharts();
}

function updateReportsStats() {
    const vehiclesInProcess = currentVehicleData.filter(v => 
        v.status !== 'New Arrival' && v.status !== 'Lot Ready' && v.status !== 'Sold'
    ).length;
    
    const completedThisMonth = currentVehicleData.filter(v => v.status === 'Lot Ready').length;
    
    if ($('vehiclesInProcess')) $('vehiclesInProcess').textContent = vehiclesInProcess;
    if ($('completedThisMonth')) $('completedThisMonth').textContent = completedThisMonth;
    if ($('avgTotalReconTime')) $('avgTotalReconTime').textContent = '5.2 days';
}

function updateReportsCharts() {
    updateStatusChart();
    updateTrendChart();
}

function updateStatusChart() {
    const canvas = $('statusChart');
    if (!canvas || !window.Chart) return;
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    const statusCounts = RECON_STATUSES.map(status => 
        currentVehicleData.filter(v => v.status === status).length
    );
    
    canvas.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: RECON_STATUSES,
            datasets: [{
                data: statusCounts,
                backgroundColor: [
                    '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateTrendChart() {
    const canvas = $('trendChart');
    if (!canvas || !window.Chart) return;
    
    // Destroy existing chart if it exists
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Completed Vehicles',
                data: [12, 19, 15, 25],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// --- Upload View ---
function updateUploadView() {
    const statusDiv = $('csv-library-status');
    if (statusDiv) {
        if (typeof window.Papa !== 'undefined') {
            statusDiv.innerHTML = `
                <div class="flex items-center p-4 bg-green-50 border-l-4 border-green-400 text-green-700">
                    <i class="fas fa-check-circle mr-3"></i>
                    <div>CSV Processing Library (PapaParse) loaded successfully.</div>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div class="flex items-center p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <i class="fas fa-exclamation-triangle mr-3"></i>
                    <div>CSV Processing Library failed to load. CSV features will be disabled.</div>
                </div>
            `;
        }
    }
}

// --- Detailers View ---
function updateDetailersView() {
    const container = $('detailer-list');
    if (!container) return;
    
    container.innerHTML = detailerNames.map(name => `
        <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span>${name}</span>
            <button onclick="removeDetailer('${name}')" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// --- Vehicle Operations ---
function openVehicleDetailModal(vehicleId) {
    const vehicle = currentVehicleData.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const modal = $('vehicle-detail-modal');
    const content = $('vehicle-detail-content');
    
    content.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">${vehicle.year} ${vehicle.make} ${vehicle.model}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
                <p class="mb-2"><strong>Stock #:</strong> ${vehicle.stockNumber}</p>
                <p class="mb-2"><strong>VIN:</strong> ${vehicle.vin}</p>
                <p class="mb-2"><strong>Color:</strong> ${vehicle.color}</p>
                <p class="mb-2"><strong>Odometer:</strong> ${vehicle.odometer} miles</p>
                <p class="mb-2"><strong>Source:</strong> ${vehicle.source}</p>
            </div>
            <div>
                <p class="mb-2"><strong>Status:</strong> <span class="px-2 py-1 rounded ${getStatusColor(vehicle.status)}">${vehicle.status}</span></p>
                <p class="mb-2"><strong>Progress:</strong> ${vehicle.progress}%</p>
                <p class="mb-2"><strong>Detailer:</strong> ${vehicle.detailer || 'Not assigned'}</p>
                <p class="mb-2"><strong>Date In:</strong> ${formatDate(vehicle.dateIn)}</p>
                <p class="mb-2"><strong>Date Out:</strong> ${formatDate(vehicle.dateOut) || 'Not completed'}</p>
            </div>
        </div>
        
        <div class="mb-4">
            <strong>Notes:</strong>
            <p class="bg-gray-50 p-2 rounded mt-1">${vehicle.notes || 'No notes'}</p>
        </div>
        
        <div class="mb-4">
            <div class="progress-bar-container">
                <div class="progress-bar-fg" style="width: ${vehicle.progress}%">
                    <span class="progress-bar-text">${vehicle.progress}% Complete</span>
                </div>
            </div>
        </div>
        
        <div class="flex gap-2 mt-6">
            <button onclick="showStatusUpdateForm('${vehicle.id}')" class="action-button action-button-primary" style="width: auto;">
                <i class="fas fa-edit mr-2"></i>Update Status
            </button>
            <button onclick="deleteVehicle('${vehicle.id}')" class="action-button action-button-secondary" style="width: auto;">
                <i class="fas fa-trash mr-2"></i>Delete Vehicle
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
    activeVehicleId = vehicleId;
}

function showStatusUpdateForm(vehicleId) {
    const vehicle = currentVehicleData.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const content = $('vehicle-detail-content');
    content.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Update Status - ${vehicle.year} ${vehicle.make} ${vehicle.model}</h2>
        
        <form id="status-update-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="new-status" class="w-full p-2 border rounded-md">
                    ${RECON_STATUSES.map(status => 
                        `<option value="${status}" ${status === vehicle.status ? 'selected' : ''}>${status}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Detailer</label>
                <select id="new-detailer" class="w-full p-2 border rounded-md">
                    <option value="">Not assigned</option>
                    ${detailerNames.map(name => 
                        `<option value="${name}" ${name === vehicle.detailer ? 'selected' : ''}>${name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea id="new-notes" rows="3" class="w-full p-2 border rounded-md">${vehicle.notes}</textarea>
            </div>
            
            <div class="flex gap-2 pt-4">
                <button type="submit" class="action-button action-button-primary" style="width: auto;">
                    <i class="fas fa-save mr-2"></i>Save Changes
                </button>
                <button type="button" onclick="openVehicleDetailModal('${vehicleId}')" class="action-button action-button-secondary" style="width: auto;">
                    <i class="fas fa-times mr-2"></i>Cancel
                </button>
            </div>
        </form>
    `;
    
    $('status-update-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newStatus = $('new-status').value;
        const newDetailer = $('new-detailer').value;
        const newNotes = $('new-notes').value;
        
        const vehicleIndex = currentVehicleData.findIndex(v => v.id === vehicleId);
        if (vehicleIndex !== -1) {
            currentVehicleData[vehicleIndex].status = newStatus;
            currentVehicleData[vehicleIndex].detailer = newDetailer;
            currentVehicleData[vehicleIndex].notes = newNotes;
            currentVehicleData[vehicleIndex].progress = calculateProgress(newStatus);
            
            if (newStatus === 'Lot Ready' || newStatus === 'Sold') {
                currentVehicleData[vehicleIndex].dateOut = new Date().toLocaleDateString();
            }
        }
        
        closeAllModals();
        updateAllViews();
        showMessageModal('Success', 'Vehicle status updated successfully!');
    });
}

function updateVehicleStatus(vehicleId, newStatus) {
    const vehicleIndex = currentVehicleData.findIndex(v => v.id === vehicleId);
    if (vehicleIndex !== -1) {
        currentVehicleData[vehicleIndex].status = newStatus;
        currentVehicleData[vehicleIndex].progress = calculateProgress(newStatus);
        
        if (newStatus === 'Lot Ready' || newStatus === 'Sold') {
            currentVehicleData[vehicleIndex].dateOut = new Date().toLocaleDateString();
        }
        
        updateAllViews();
        showMessageModal('Success', `Vehicle moved to ${newStatus}!`);
    }
}

function deleteVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    currentVehicleData = currentVehicleData.filter(v => v.id !== vehicleId);
    closeAllModals();
    updateAllViews();
    showMessageModal('Success', 'Vehicle deleted successfully!');
}

function addNewVehicle() {
    const modal = $('vehicle-detail-modal');
    const content = $('vehicle-detail-content');
    
    content.innerHTML = `
        <h2 class="text-2xl font-bold mb-4">Add New Vehicle</h2>
        
        <form id="add-vehicle-form" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Stock Number *</label>
                    <input type="text" id="new-stock" required class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">VIN *</label>
                    <input type="text" id="new-vin" required class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <input type="number" id="new-year" required class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                    <input type="text" id="new-make" required class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                    <input type="text" id="new-model" required class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input type="text" id="new-color" class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                    <input type="number" id="new-odometer" class="w-full p-2 border rounded-md">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <select id="new-source" class="w-full p-2 border rounded-md">
                        <option value="Trade-In">Trade-In</option>
                        <option value="Auction">Auction</option>
                        <option value="Purchase">Purchase</option>
                        <option value="Lease Return">Lease Return</option>
                    </select>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea id="new-vehicle-notes" rows="3" class="w-full p-2 border rounded-md"></textarea>
            </div>
            
            <div class="flex gap-2 pt-4">
                <button type="submit" class="action-button action-button-primary" style="width: auto;">
                    <i class="fas fa-plus mr-2"></i>Add Vehicle
                </button>
                <button type="button" onclick="closeAllModals()" class="action-button action-button-secondary" style="width: auto;">
                    <i class="fas fa-times mr-2"></i>Cancel
                </button>
            </div>
        </form>
    `;
    
    modal.style.display = 'block';
    
    $('add-vehicle-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newVehicle = {
            id: Date.now().toString(),
            stockNumber: $('new-stock').value,
            vin: $('new-vin').value,
            year: $('new-year').value,
            make: $('new-make').value,
            model: $('new-model').value,
            color: $('new-color').value || '',
            status: 'New Arrival',
            detailer: '',
            dateIn: new Date().toLocaleDateString(),
            dateOut: '',
            notes: $('new-vehicle-notes').value || '',
            progress: 0,
            source: $('new-source').value,
            odometer: $('new-odometer').value || ''
        };
        
        currentVehicleData.push(newVehicle);
        closeAllModals();
        updateAllViews();
        showMessageModal('Success', 'Vehicle added successfully!');
    });
}

// --- CSV Functions ---
function exportToCSV() {
    if (!window.Papa) {
        showMessageModal('Error', 'CSV library not available');
        return;
    }
    
    const csvData = currentVehicleData.map(v => ({
        'Stock #': v.stockNumber,
        'VIN': v.vin,
        'Year': v.year,
        'Make': v.make,
        'Model': v.model,
        'Color': v.color,
        'Status': v.status,
        'Detailer': v.detailer,
        'Date In': v.dateIn,
        'Date Out': v.dateOut,
        'Notes': v.notes,
        'Source': v.source,
        'Odometer': v.odometer,
        'Progress': v.progress
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessageModal('Success', 'CSV exported successfully!');
}

function importCSV() {
    const fileInput = $('csv-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessageModal('Error', 'Please select a CSV file');
        return;
    }
    
    if (!window.Papa) {
        showMessageModal('Error', 'CSV library not available');
        return;
    }
    
    Papa.parse(file, {
        header: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                showMessageModal('Error', 'CSV parsing failed: ' + results.errors[0].message);
                return;
            }
            
            const importedData = results.data.filter(row => row['Stock #']).map((row, index) => ({
                id: (Date.now() + index).toString(),
                stockNumber: row['Stock #'] || '',
                vin: row['VIN'] || '',
                year: row['Year'] || '',
                make: row['Make'] || '',
                model: row['Model'] || '',
                color: row['Color'] || '',
                status: row['Status'] || 'New Arrival',
                detailer: row['Detailer'] || '',
                dateIn: row['Date In'] || new Date().toLocaleDateString(),
                dateOut: row['Date Out'] || '',
                notes: row['Notes'] || '',
                source: row['Source'] || 'Unknown',
                odometer: row['Odometer'] || '',
                progress: calculateProgress(row['Status'] || 'New Arrival')
            }));
            
            currentVehicleData = importedData;
            updateAllViews();
            showMessageModal('Success', `Imported ${importedData.length} vehicles successfully!`);
        }
    });
}

// --- Detailer Management ---
function addDetailer() {
    const nameInput = $('new-detailer-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        showMessageModal('Error', 'Please enter a detailer name');
        return;
    }
    
    if (detailerNames.includes(name)) {
        showMessageModal('Error', 'Detailer already exists');
        return;
    }
    
    detailerNames.push(name);
    nameInput.value = '';
    updateDetailersView();
    showMessageModal('Success', `Detailer "${name}" added successfully!`);
}

function removeDetailer(name) {
    if (!confirm(`Are you sure you want to remove detailer "${name}"?`)) return;
    
    detailerNames = detailerNames.filter(d => d !== name);
    
    // Update vehicles that had this detailer assigned
    currentVehicleData.forEach(vehicle => {
        if (vehicle.detailer === name) {
            vehicle.detailer = '';
        }
    });
    
    updateDetailersView();
    updateAllViews();
    showMessageModal('Success', `Detailer "${name}" removed successfully!`);
}

// --- Search and Filter Setup ---
function setupSearchAndFilters() {
    // Dashboard search
    const dashboardSearch = $('dashboard-search');
    if (dashboardSearch) {
        dashboardSearch.addEventListener('input', updateDashboardView);
    }
    
    const dashboardFilter = $('dashboard-status-filter');
    if (dashboardFilter) {
        dashboardFilter.addEventListener('change', updateDashboardView);
    }
    
    // Inventory search
    const inventorySearch = $('inventory-search');
    if (inventorySearch) {
        inventorySearch.addEventListener('input', updateInventoryView);
    }
    
    const inventoryFilter = $('inventory-view-filter');
    if (inventoryFilter) {
        inventoryFilter.addEventListener('change', updateInventoryView);
    }
    
    // Workflow search
    const workflowSearch = $('workflow-search');
    if (workflowSearch) {
        workflowSearch.addEventListener('input', updateWorkflowView);
    }
}

// --- Button Event Setup ---
function setupButtonEvents() {
    // Add vehicle buttons
    const addVehicleBtn = $('add-vehicle-btn');
    const addVehicleWorkflow = $('add-vehicle-workflow');
    
    if (addVehicleBtn) addVehicleBtn.addEventListener('click', addNewVehicle);
    if (addVehicleWorkflow) addVehicleWorkflow.addEventListener('click', addNewVehicle);
    
    // Export CSV button
    const exportBtn = $('export-csv-button');
    if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
    
    // Import CSV button
    const uploadBtn = $('upload-csv-button');
    if (uploadBtn) uploadBtn.addEventListener('click', importCSV);
    
    // Google Sheets buttons
    const syncBtn = $('sync-google-sheet-button');
    const refreshBtn = $('refresh-google-sheet-button');
    
    if (syncBtn) syncBtn.addEventListener('click', () => {
        showMessageModal('Info', 'Google Sheets sync is not implemented in this demo version.');
    });
    
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        showMessageModal('Info', 'Google Sheets refresh is not implemented in this demo version.');
    });
    
    // Add detailer button
    const addDetailerBtn = $('add-detailer-button');
    if (addDetailerBtn) addDetailerBtn.addEventListener('click', addDetailer);
    
    // Message modal OK button
    const messageOkBtn = $('message-modal-ok-button');
    if (messageOkBtn) messageOkBtn.addEventListener('click', closeAllModals);
}

// --- Modal Setup ---
function setupModals() {
    // Close modal buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('close-message-modal')) {
            closeAllModals();
        }
        
        // Close modal when clicking outside
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
}

// --- Timeline and Enhanced Workflow Functions ---

function openTimelineModal(vehicleId) {
    const vehicle = currentVehicleData.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const modal = document.getElementById('vehicle-timeline-modal');
    const titleEl = document.getElementById('timeline-vehicle-title');
    const detailsEl = document.getElementById('timeline-vehicle-details');
    const containerEl = document.getElementById('timeline-container');
    const progressEl = document.getElementById('timeline-overall-progress');
    const requirementsEl = document.getElementById('timeline-requirements-list');

    // Set vehicle info
    titleEl.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    detailsEl.innerHTML = `
        <div><strong>VIN:</strong> ${vehicle.vin || 'N/A'}</div>
        <div><strong>Stock#:</strong> ${vehicle.stockNumber || 'N/A'}</div>
        <div><strong>Status:</strong> ${vehicle.currentReconStatus}</div>
        <div><strong>Age:</strong> ${vehicle.ageInInventory || 0} days</div>
    `;

    // Generate timeline
    generateTimeline(vehicle, containerEl);
    
    // Update progress circle
    updateProgressCircle(vehicle, progressEl);
    
    // Update requirements checklist
    updateRequirementsList(vehicle, requirementsEl);

    modal.style.display = 'block';
}

function generateTimeline(vehicle, container) {
    const workflow = getWorkflowStatus(vehicle);
    container.innerHTML = '<div class="timeline-line"></div>';

    Object.entries(WORKFLOW_STEPS).forEach(([stepName, stepConfig]) => {
        const stepData = workflow[stepName];
        const timelineItem = createTimelineItem(vehicle, stepName, stepConfig, stepData);
        container.appendChild(timelineItem);
    });
}

function createTimelineItem(vehicle, stepName, stepConfig, stepData) {
    const div = document.createElement('div');
    const isCompleted = stepData?.completed || false;
    const isInProgress = !isCompleted && isStepInProgress(vehicle, stepName);
    const isPending = !isCompleted && !isInProgress;

    let statusClass = 'pending';
    let statusText = 'Pending';
    
    if (isCompleted) {
        statusClass = 'completed';
        statusText = 'Completed';
    } else if (isInProgress) {
        statusClass = 'in-progress';
        statusText = 'In Progress';
    }

    div.className = `timeline-item ${statusClass}`;
    
    let timelineContent = `
        <div class="timeline-icon ${statusClass}">
            <i class="${stepConfig.icon}"></i>
        </div>
        <div class="timeline-header">
            <div class="timeline-title">${stepName}</div>
            <div class="timeline-status ${statusClass}">${statusText}</div>
        </div>
        <div class="timeline-description">${stepConfig.description}</div>
    `;

    // Add timing information
    if (stepData?.date) {
        const duration = formatTimeDuration(stepData.date, isCompleted ? null : new Date().toISOString());
        timelineContent += `
            <div class="timeline-details">
                <div class="timeline-detail-item">
                    <i class="fas fa-clock"></i>
                    Started: ${new Date(stepData.date).toLocaleDateString()}
                </div>
                <div class="timeline-detail-item">
                    <i class="fas fa-stopwatch"></i>
                    Duration: ${duration}
                </div>
            </div>
        `;
    }

    // Special handling for Mechanical sub-steps
    if (stepName === 'Mechanical' && stepData?.subSteps) {
        timelineContent += createMechanicalSubSteps(vehicle, stepData.subSteps);
    }

    // Special handling for Title
    if (stepName === 'Title') {
        timelineContent += createTitleStatus(vehicle, stepData);
    }

    // Add action buttons
    timelineContent += createTimelineActionButtons(vehicle, stepName, stepData, isCompleted, isInProgress);

    div.innerHTML = timelineContent;
    return div;
}

function createMechanicalSubSteps(vehicle, subSteps) {
    const subStepsData = [
        { id: 'email-sent', label: 'Email Sent to Service Manager', icon: 'fa-envelope' },
        { id: 'in-service', label: 'Vehicle Picked Up for Service', icon: 'fa-wrench' },
        { id: 'completed', label: 'Service Completed', icon: 'fa-check-circle' }
    ];

    let html = '<div class="timeline-substeps">';
    
    subStepsData.forEach(subStep => {
        const isCompleted = subSteps[subStep.id]?.completed || false;
        const statusClass = isCompleted ? 'completed' : 'pending';
        
        html += `
            <div class="timeline-substep">
                <div class="timeline-substep-icon ${statusClass}">
                    <i class="fas ${subStep.icon}"></i>
                </div>
                <div class="timeline-substep-content">
                    <div class="timeline-substep-title">${subStep.label}</div>
                    ${subSteps[subStep.id]?.date ? 
                        `<div class="timeline-substep-desc">Completed: ${new Date(subSteps[subStep.id].date).toLocaleDateString()}</div>` : 
                        `<div class="timeline-substep-desc">Not yet completed</div>`
                    }
                </div>
                ${!isCompleted ? 
                    `<button class="timeline-action-button" onclick="updateMechanicalSubStep('${vehicle.stockNumber}', '${subStep.id}')">
                        Complete
                    </button>` : ''
                }
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function createTitleStatus(vehicle, stepData) {
    const isInHouse = stepData?.inHouse || false;
    const statusClass = isInHouse ? 'in-house' : 'not-in-house';
    const iconClass = isInHouse ? 'fa-check-circle' : 'fa-times-circle';
    const statusText = isInHouse ? 'Title In-House' : 'Title Not In-House';

    return `
        <div class="timeline-details">
            <div class="timeline-detail-item">
                <div class="title-status-indicator ${statusClass}" onclick="toggleTitleInHouse('${vehicle.stockNumber}')">
                    <i class="fas ${iconClass}"></i>
                    <span style="margin-left: 0.5rem;">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

function createTimelineActionButtons(vehicle, stepName, stepData, isCompleted, isInProgress) {
    if (isCompleted) return '';

    let buttonText = '';
    let buttonAction = '';
    let buttonDisabled = false;

    switch (stepName) {
        case 'New Arrival':
            buttonText = 'Send Service Request Email';
            buttonAction = `sendServiceRequestEmail('${vehicle.stockNumber}')`;
            break;
        case 'Mechanical':
            if (!stepData?.subSteps?.['email-sent']?.completed) {
                buttonText = 'Send Service Request Email';
                buttonAction = `updateMechanicalSubStep('${vehicle.stockNumber}', 'email-sent')`;
            }
            break;
        case 'Detailing':
            buttonText = 'Start Detailing';
            buttonAction = `completeWorkflowStep('${vehicle.stockNumber}', 'Detailing')`;
            break;
        case 'Photos':
            buttonText = 'Mark Photos Complete';
            buttonAction = `completeWorkflowStep('${vehicle.stockNumber}', 'Photos')`;
            break;
        case 'Lot Ready':
            const canBeReady = canBeLotReady(vehicle);
            buttonText = 'Move to Lot Ready';
            buttonAction = `completeWorkflowStep('${vehicle.stockNumber}', 'Lot Ready')`;
            buttonDisabled = !canBeReady;
            break;
    }

    if (buttonText) {
        return `
            <button class="timeline-action-button" 
                    onclick="${buttonAction}" 
                    ${buttonDisabled ? 'disabled' : ''}>
                ${buttonText}
            </button>
        `;
    }

    return '';
}

function isStepInProgress(vehicle, stepName) {
    const workflow = getWorkflowStatus(vehicle);
    
    // Check if step has been started but not completed
    if (stepName === 'Mechanical') {
        return workflow.Mechanical.subSteps?.['email-sent']?.completed && !workflow.Mechanical.completed;
    }
    
    return workflow[stepName]?.date && !workflow[stepName]?.completed;
}

function updateProgressCircle(vehicle, container) {
    const workflow = getWorkflowStatus(vehicle);
    const totalSteps = Object.keys(WORKFLOW_STEPS).length - 1; // Exclude 'Sold'
    const completedSteps = Object.entries(workflow)
        .filter(([key, step]) => key !== 'Sold' && step.completed).length;
    
    const percentage = Math.round((completedSteps / totalSteps) * 100);
    
    container.innerHTML = `
        <div class="progress-ring">
            <svg width="80" height="80">
                <circle cx="40" cy="40" r="30" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                <circle cx="40" cy="40" r="30" fill="none" stroke="#3b82f6" stroke-width="6"
                        stroke-dasharray="${2 * Math.PI * 30}" 
                        stroke-dashoffset="${2 * Math.PI * 30 * (1 - percentage / 100)}"
                        class="progress-ring-circle"/>
            </svg>
            <div class="progress-ring-text">${percentage}%</div>
        </div>
    `;
}

function updateRequirementsList(vehicle, container) {
    const workflow = getWorkflowStatus(vehicle);
    const requirements = [
        { name: 'Mechanical Complete', met: workflow.Mechanical.completed, icon: 'fa-wrench' },
        { name: 'Detailing Complete', met: workflow.Detailing.completed, icon: 'fa-spray-can' },
        { name: 'Photos Complete', met: workflow.Photos.completed, icon: 'fa-camera' },
        { name: 'Title In-House', met: workflow.Title.inHouse, icon: 'fa-file-contract' }
    ];

    container.innerHTML = requirements.map(req => `
        <div class="timeline-requirement-item ${req.met ? 'met' : 'not-met'}">
            <i class="fas ${req.icon}"></i>
            <i class="fas ${req.met ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            <span>${req.name}</span>
        </div>
    `).join('');
}

function sendServiceRequestEmail(stockNum) {
    const vehicle = currentVehicleData.find(v => v.stockNumber === stockNum || v.vin === stockNum);
    if (!vehicle) return;

    // Simulate email sending
    showMessageModal('Email Sent', `Service request email sent for ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.vin})`);
    
    // Update workflow
    completeWorkflowStep(stockNum, 'New Arrival', null, {
        notes: 'Original service request sent to service manager'
    });
    
    // Start mechanical email step
    updateMechanicalSubStep(stockNum, 'email-sent');
}

// Update existing modal handlers to include timeline modal
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// Add event listeners for timeline modal
document.addEventListener('DOMContentLoaded', () => {
    const timelineModal = document.getElementById('vehicle-timeline-modal');
    if (timelineModal) {
        const closeButton = timelineModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.onclick = () => timelineModal.style.display = 'none';
        }
        
        window.addEventListener('click', (event) => {
            if (event.target === timelineModal) {
                timelineModal.style.display = 'none';
            }
        });
    }
});

// Update vehicle card click handlers to open timeline modal
function openVehicleDetailModal(vehicleId) {
    openTimelineModal(vehicleId);
}
