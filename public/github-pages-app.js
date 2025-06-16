/**
 * Vehicle Reconditioning Tracker - GitHub Pages Demo Version
 * Static version that works without backend server
 */

// Global state management
const AppState = {
    vehicles: [],
    detailers: [],
    currentTab: 'upload'
};

// Local storage keys
const STORAGE_KEYS = {
    VEHICLES: 'vrt_vehicles',
    DETAILERS: 'vrt_detailers'
};

// Sample data for demo
const SAMPLE_VEHICLES = [
    {
        'Stock#': 'ABC123',
        'VIN': '1HGBH41JXMN109186',
        'Year': '2020',
        'Make': 'Honda',
        'Model': 'Civic',
        'Status': 'Available',
        'Progress': 'Not Started',
        'Notes': 'Clean title, minor scratches',
        'Date_In': '2024-01-15',
        'Source': 'Trade-in',
        'Color': 'Blue',
        'Interior': 'Gray',
        'Odometer': '45000',
        'Detailer': ''
    },
    {
        'Stock#': 'DEF456',
        'VIN': '2T1BURHE0KC123456',
        'Year': '2019',
        'Make': 'Toyota',
        'Model': 'Corolla',
        'Status': 'In Process',
        'Progress': 'In Progress',
        'Notes': 'Interior cleaning in progress',
        'Date_In': '2024-01-10',
        'Source': 'Auction',
        'Color': 'White',
        'Interior': 'Black',
        'Odometer': '32000',
        'Detailer': 'John Smith'
    },
    {
        'Stock#': 'GHI789',
        'VIN': '3FADP4EJ5DM123789',
        'Year': '2021',
        'Make': 'Ford',
        'Model': 'Focus',
        'Status': 'Completed',
        'Progress': 'Completed',
        'Notes': 'Full detail completed, ready for sale',
        'Date_In': '2024-01-05',
        'Source': 'Trade-in',
        'Color': 'Red',
        'Interior': 'Black',
        'Odometer': '28000',
        'Detailer': 'Sarah Johnson'
    }
];

const SAMPLE_DETAILERS = [
    { id: '1', name: 'John Smith', email: 'john@example.com', phone: '555-0101', active: true },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', active: true },
    { id: '3', name: 'Mike Wilson', email: 'mike@example.com', phone: '555-0103', active: true }
];

// Utility functions
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromStorage(key, defaultValue = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

function showMessageModal(title, message) {
    document.getElementById('message-title').textContent = title;
    document.getElementById('message-text').textContent = message;
    document.getElementById('message-modal').classList.remove('hidden');
}

function hideMessageModal() {
    document.getElementById('message-modal').classList.add('hidden');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// CSV Processing
function parseCSV(csvText) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    reject(new Error('CSV parsing errors: ' + results.errors.map(e => e.message).join(', ')));
                } else {
                    resolve(results.data);
                }
            },
            error: function(error) {
                reject(error);
            }
        });
    });
}

function exportToCSV(data, filename) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Tab Management
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-content').classList.add('active');
    
    // Add active class to selected tab button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    AppState.currentTab = tabName;
    
    // Update content when switching tabs
    if (tabName === 'inventory') {
        renderInventoryTable();
    } else if (tabName === 'recon') {
        updateReconDashboard();
    } else if (tabName === 'detailers') {
        renderDetailersList();
    } else if (tabName === 'reports') {
        updateReports();
    }
}

// Vehicle Management
function loadVehicles() {
    AppState.vehicles = loadFromStorage(STORAGE_KEYS.VEHICLES, []);
    updateInventoryStatus();
}

function saveVehicles() {
    saveToStorage(STORAGE_KEYS.VEHICLES, AppState.vehicles);
    updateInventoryStatus();
}

function addVehicles(newVehicles) {
    AppState.vehicles = AppState.vehicles.concat(newVehicles);
    saveVehicles();
    renderInventoryTable();
    updateReconDashboard();
    updateReports();
}

function updateVehicle(index, updates) {
    if (index >= 0 && index < AppState.vehicles.length) {
        AppState.vehicles[index] = { ...AppState.vehicles[index], ...updates };
        saveVehicles();
        renderInventoryTable();
        updateReconDashboard();
        updateReports();
    }
}

function deleteVehicle(index) {
    if (index >= 0 && index < AppState.vehicles.length) {
        AppState.vehicles.splice(index, 1);
        saveVehicles();
        renderInventoryTable();
        updateReconDashboard();
        updateReports();
    }
}

function clearAllVehicles() {
    if (confirm('Are you sure you want to clear all vehicle data? This cannot be undone.')) {
        AppState.vehicles = [];
        saveVehicles();
        renderInventoryTable();
        updateInventoryStatus();
        updateReconDashboard();
        updateReports();
        showMessageModal('Success', 'All vehicle data has been cleared.');
    }
}

function loadSampleData() {
    if (AppState.vehicles.length > 0) {
        if (!confirm('This will replace your current data. Continue?')) {
            return;
        }
    }
    
    AppState.vehicles = [...SAMPLE_VEHICLES];
    saveVehicles();
    renderInventoryTable();
    updateReconDashboard();
    updateReports();
    showMessageModal('Success', 'Sample data loaded successfully!');
}

// Detailer Management
function loadDetailers() {
    AppState.detailers = loadFromStorage(STORAGE_KEYS.DETAILERS, SAMPLE_DETAILERS);
    updateDetailerSelects();
}

function saveDetailers() {
    saveToStorage(STORAGE_KEYS.DETAILERS, AppState.detailers);
    updateDetailerSelects();
}

function addDetailer(name, email, phone) {
    const newDetailer = {
        id: generateId(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        active: true
    };
    
    AppState.detailers.push(newDetailer);
    saveDetailers();
    renderDetailersList();
    showMessageModal('Success', `Detailer "${name}" added successfully!`);
}

function updateDetailerSelects() {
    const selects = document.querySelectorAll('#edit-detailer');
    const activeDetailers = AppState.detailers.filter(d => d.active);
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Not Assigned</option>' +
            activeDetailers.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
        
        // Restore selection if still valid
        if (currentValue && activeDetailers.some(d => d.name === currentValue)) {
            select.value = currentValue;
        }
    });
}

// UI Rendering Functions
function updateInventoryStatus() {
    const statusDiv = document.getElementById('inventory-status');
    const statsDiv = document.getElementById('inventory-stats');
    
    if (AppState.vehicles.length === 0) {
        statusDiv.textContent = 'No inventory loaded';
        statsDiv.textContent = '';
    } else {
        statusDiv.textContent = `${AppState.vehicles.length} vehicles loaded`;
        
        const statusCounts = {};
        AppState.vehicles.forEach(vehicle => {
            const status = vehicle.Status || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        const statsText = Object.entries(statusCounts)
            .map(([status, count]) => `${status}: ${count}`)
            .join(' | ');
        statsDiv.textContent = statsText;
    }
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    
    if (AppState.vehicles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No vehicles loaded</td></tr>';
        return;
    }
    
    // Apply filters
    let filteredVehicles = [...AppState.vehicles];
    
    const statusFilter = document.getElementById('status-filter').value;
    const progressFilter = document.getElementById('progress-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    
    if (statusFilter) {
        filteredVehicles = filteredVehicles.filter(v => v.Status === statusFilter);
    }
    
    if (progressFilter) {
        filteredVehicles = filteredVehicles.filter(v => v.Progress === progressFilter);
    }
    
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(v => 
            Object.values(v).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            )
        );
    }
    
    tbody.innerHTML = filteredVehicles.map((vehicle, index) => {
        const originalIndex = AppState.vehicles.indexOf(vehicle);
        const statusColor = getStatusColor(vehicle.Status);
        const progressColor = getProgressColor(vehicle.Progress);
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${vehicle['Stock#'] || ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div class="font-medium">${vehicle.Year || ''} ${vehicle.Make || ''} ${vehicle.Model || ''}</div>
                    <div class="text-gray-500">${vehicle.VIN || ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                        ${vehicle.Status || 'Unknown'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${progressColor}">
                        ${vehicle.Progress || 'Unknown'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${vehicle.Detailer || 'Not Assigned'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="editVehicle(${originalIndex})" class="text-blue-600 hover:text-blue-900 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteVehicle(${originalIndex})" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusColor(status) {
    const colors = {
        'Available': 'bg-green-100 text-green-800',
        'In Process': 'bg-yellow-100 text-yellow-800',
        'Completed': 'bg-blue-100 text-blue-800',
        'Hold': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getProgressColor(progress) {
    const colors = {
        'Not Started': 'bg-gray-100 text-gray-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        'Completed': 'bg-green-100 text-green-800'
    };
    return colors[progress] || 'bg-gray-100 text-gray-800';
}

function renderDetailersList() {
    const container = document.getElementById('detailers-list');
    
    if (AppState.detailers.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-gray-500">No detailers added yet.</div>';
        return;
    }
    
    // Count assignments
    const assignments = {};
    AppState.vehicles.forEach(vehicle => {
        const detailer = vehicle.Detailer;
        if (detailer) {
            assignments[detailer] = (assignments[detailer] || 0) + 1;
        }
    });
    
    container.innerHTML = AppState.detailers.map(detailer => {
        const assignedCount = assignments[detailer.name] || 0;
        const statusBadge = detailer.active 
            ? '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>'
            : '<span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>';
        
        return `
            <div class="p-4 border-b border-gray-200">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-lg font-medium">${detailer.name}</h3>
                        <div class="text-sm text-gray-600">
                            ${detailer.email ? `<div>Email: ${detailer.email}</div>` : ''}
                            ${detailer.phone ? `<div>Phone: ${detailer.phone}</div>` : ''}
                            <div>Assigned vehicles: ${assignedCount}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${statusBadge}
                        <button onclick="toggleDetailer('${detailer.id}')" 
                                class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">
                            ${detailer.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onclick="deleteDetailer('${detailer.id}')" 
                                class="px-2 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateReconDashboard() {
    const total = AppState.vehicles.length;
    const inProgress = AppState.vehicles.filter(v => v.Status === 'In Process').length;
    const completed = AppState.vehicles.filter(v => v.Status === 'Completed').length;
    
    document.getElementById('total-vehicles').textContent = total;
    document.getElementById('in-progress-vehicles').textContent = inProgress;
    document.getElementById('completed-vehicles').textContent = completed;
    
    // Status breakdown
    const statusCounts = {};
    AppState.vehicles.forEach(vehicle => {
        const status = vehicle.Status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const statusBreakdown = document.getElementById('status-breakdown');
    statusBreakdown.innerHTML = Object.entries(statusCounts).map(([status, count]) => {
        const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
        const color = getStatusColor(status).includes('green') ? 'bg-green-500' :
                     getStatusColor(status).includes('yellow') ? 'bg-yellow-500' :
                     getStatusColor(status).includes('blue') ? 'bg-blue-500' : 'bg-gray-500';
        
        return `
            <div class="flex items-center">
                <div class="w-24 text-sm">${status}</div>
                <div class="flex-1 bg-gray-200 rounded-full h-4 mx-2">
                    <div class="${color} h-4 rounded-full" style="width: ${percentage}%"></div>
                </div>
                <div class="w-16 text-sm text-right">${count} (${percentage}%)</div>
            </div>
        `;
    }).join('');
}

function updateReports() {
    // Workflow summary
    const statusCounts = {
        'Available': 0,
        'In Process': 0,
        'Completed': 0,
        'Hold': 0
    };
    
    AppState.vehicles.forEach(vehicle => {
        const status = vehicle.Status || 'Unknown';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
    });
    
    document.getElementById('report-total').textContent = AppState.vehicles.length;
    document.getElementById('report-available').textContent = statusCounts['Available'];
    document.getElementById('report-in-process').textContent = statusCounts['In Process'];
    document.getElementById('report-completed').textContent = statusCounts['Completed'];
    document.getElementById('report-hold').textContent = statusCounts['Hold'];
    
    // Detailer workload
    const workload = {};
    AppState.vehicles.forEach(vehicle => {
        const detailer = vehicle.Detailer;
        if (detailer) {
            if (!workload[detailer]) {
                workload[detailer] = { total: 0, inProgress: 0, completed: 0 };
            }
            workload[detailer].total++;
            if (vehicle.Status === 'In Process') workload[detailer].inProgress++;
            if (vehicle.Status === 'Completed') workload[detailer].completed++;
        }
    });
    
    const workloadDiv = document.getElementById('detailer-workload');
    if (Object.keys(workload).length === 0) {
        workloadDiv.innerHTML = '<div class="text-gray-500">No assignments yet</div>';
    } else {
        workloadDiv.innerHTML = Object.entries(workload).map(([detailer, stats]) => 
            `<div>${detailer}: ${stats.total} total (${stats.inProgress} in progress, ${stats.completed} completed)</div>`
        ).join('');
    }
}

// Modal Functions
function editVehicle(index) {
    const vehicle = AppState.vehicles[index];
    if (!vehicle) return;
    
    document.getElementById('edit-vehicle-index').value = index;
    document.getElementById('edit-status').value = vehicle.Status || '';
    document.getElementById('edit-progress').value = vehicle.Progress || '';
    document.getElementById('edit-detailer').value = vehicle.Detailer || '';
    document.getElementById('edit-notes').value = vehicle.Notes || '';
    
    document.getElementById('edit-vehicle-modal').classList.remove('hidden');
}

function hideEditModal() {
    document.getElementById('edit-vehicle-modal').classList.add('hidden');
}

function toggleDetailer(id) {
    const detailer = AppState.detailers.find(d => d.id === id);
    if (detailer) {
        detailer.active = !detailer.active;
        saveDetailers();
        renderDetailersList();
        showMessageModal('Success', `Detailer "${detailer.name}" ${detailer.active ? 'activated' : 'deactivated'} successfully!`);
    }
}

function deleteDetailer(id) {
    const detailer = AppState.detailers.find(d => d.id === id);
    if (detailer && confirm(`Are you sure you want to delete detailer "${detailer.name}"?`)) {
        AppState.detailers = AppState.detailers.filter(d => d.id !== id);
        
        // Remove detailer assignments
        AppState.vehicles.forEach(vehicle => {
            if (vehicle.Detailer === detailer.name) {
                vehicle.Detailer = '';
            }
        });
        
        saveDetailers();
        saveVehicles();
        renderDetailersList();
        renderInventoryTable();
        showMessageModal('Success', `Detailer "${detailer.name}" deleted successfully!`);
    }
}

// Event Handlers
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
        });
    });
    
    // CSV upload
    document.getElementById('upload-csv-button').addEventListener('click', async () => {
        const fileInput = document.getElementById('csv-file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            showMessageModal('Error', 'Please select a CSV file to upload.');
            return;
        }
        
        try {
            const csvText = await file.text();
            const vehicles = await parseCSV(csvText);
            
            if (vehicles.length === 0) {
                showMessageModal('Error', 'No valid vehicle data found in CSV file.');
                return;
            }
            
            addVehicles(vehicles);
            showMessageModal('Success', `Successfully imported ${vehicles.length} vehicles!`);
            fileInput.value = '';
        } catch (error) {
            showMessageModal('Error', 'Failed to parse CSV file: ' + error.message);
        }
    });
    
    // Sample data and actions
    document.getElementById('load-sample-data-button').addEventListener('click', loadSampleData);
    document.getElementById('clear-data-button').addEventListener('click', clearAllVehicles);
    
    // Download sample CSV
    document.getElementById('download-sample-csv').addEventListener('click', (e) => {
        e.preventDefault();
        const sampleCSV = Papa.unparse(SAMPLE_VEHICLES);
        const blob = new Blob([sampleCSV], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'sample-inventory.csv';
        link.click();
        URL.revokeObjectURL(url);
    });
    
    // Inventory filters and actions
    document.getElementById('status-filter').addEventListener('change', renderInventoryTable);
    document.getElementById('progress-filter').addEventListener('change', renderInventoryTable);
    document.getElementById('search-input').addEventListener('input', renderInventoryTable);
    document.getElementById('clear-filters-button').addEventListener('click', () => {
        document.getElementById('status-filter').value = '';
        document.getElementById('progress-filter').value = '';
        document.getElementById('search-input').value = '';
        renderInventoryTable();
    });
    
    document.getElementById('refresh-inventory-button').addEventListener('click', () => {
        renderInventoryTable();
        showMessageModal('Success', 'Inventory refreshed.');
    });
    
    document.getElementById('export-csv-button').addEventListener('click', () => {
        if (AppState.vehicles.length === 0) {
            showMessageModal('Error', 'No vehicles to export.');
            return;
        }
        
        const filename = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
        exportToCSV(AppState.vehicles, filename);
        showMessageModal('Success', 'Inventory exported successfully!');
    });
    
    // Detailer form
    document.getElementById('add-detailer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('new-detailer-name').value.trim();
        const email = document.getElementById('new-detailer-email').value.trim();
        const phone = document.getElementById('new-detailer-phone').value.trim();
        
        if (!name) {
            showMessageModal('Error', 'Detailer name is required.');
            return;
        }
        
        // Check for duplicate name
        if (AppState.detailers.some(d => d.name.toLowerCase() === name.toLowerCase())) {
            showMessageModal('Error', 'A detailer with this name already exists.');
            return;
        }
        
        addDetailer(name, email, phone);
        
        // Reset form
        document.getElementById('new-detailer-name').value = '';
        document.getElementById('new-detailer-email').value = '';
        document.getElementById('new-detailer-phone').value = '';
    });
    
    // Edit vehicle modal
    document.getElementById('close-edit-modal').addEventListener('click', hideEditModal);
    document.getElementById('cancel-edit').addEventListener('click', hideEditModal);
    document.getElementById('edit-vehicle-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const index = parseInt(document.getElementById('edit-vehicle-index').value);
        const updates = {
            Status: document.getElementById('edit-status').value,
            Progress: document.getElementById('edit-progress').value,
            Detailer: document.getElementById('edit-detailer').value,
            Notes: document.getElementById('edit-notes').value
        };
        
        updateVehicle(index, updates);
        hideEditModal();
        showMessageModal('Success', 'Vehicle updated successfully!');
    });
    
    // Message modal
    document.getElementById('close-message-modal').addEventListener('click', hideMessageModal);
    document.getElementById('message-ok-button').addEventListener('click', hideMessageModal);
    
    // Report actions
    document.getElementById('export-report-button').addEventListener('click', () => {
        const reportData = {
            summary: {
                total: AppState.vehicles.length,
                available: AppState.vehicles.filter(v => v.Status === 'Available').length,
                inProcess: AppState.vehicles.filter(v => v.Status === 'In Process').length,
                completed: AppState.vehicles.filter(v => v.Status === 'Completed').length,
                hold: AppState.vehicles.filter(v => v.Status === 'Hold').length
            },
            detailers: AppState.detailers.length,
            generated: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `vehicle-recon-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('print-report-button').addEventListener('click', () => {
        window.print();
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });
}

// Initialize application
function initApp() {
    console.log('Initializing Vehicle Reconditioning Tracker Demo...');
    
    // Load data from localStorage
    loadVehicles();
    loadDetailers();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI
    updateInventoryStatus();
    updateDetailerSelects();
    
    console.log('Application initialized successfully!');
    
    // Show welcome message for first-time users
    if (AppState.vehicles.length === 0 && AppState.detailers.length === SAMPLE_DETAILERS.length) {
        setTimeout(() => {
            showMessageModal('Welcome', 'Welcome to the Vehicle Reconditioning Tracker demo! Try loading sample data or uploading your own CSV file to get started.');
        }, 1000);
    }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Export functions globally for inline event handlers
window.editVehicle = editVehicle;
window.deleteVehicle = (index) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
        deleteVehicle(index);
        showMessageModal('Success', 'Vehicle deleted successfully!');
    }
};
window.toggleDetailer = toggleDetailer;
window.deleteDetailer = deleteDetailer;
