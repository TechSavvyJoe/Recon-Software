// Vehicle Reconditioning Tracker - Main Application Logic

// Global state
let vehicles = [];
let workflowStages = [
    'New Arrival',
    'Mechanical',
    'Detailing', 
    'Photos',
    'Title',
    'Lot Ready',
    'Sold'
];

// Detailers list
let detailers = [
    'John Smith',
    'Jane Doe',
    'Mike Johnson',
    'Sarah Williams',
    'Tom Brown'
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    setupEventListeners();
    renderWorkflowStages();
    updateStats();
    renderVehicleTable();
    populateFilterOptions();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('csv-file-input').addEventListener('change', handleFileSelect);
    document.getElementById('search-input').addEventListener('input', filterVehicles);
    document.getElementById('filter-stage').addEventListener('change', filterVehicles);
}

// Load data from localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('vehicleReconData');
    if (savedData) {
        vehicles = JSON.parse(savedData);
    }
}

// Save data to localStorage
function saveToLocalStorage() {
    localStorage.setItem('vehicleReconData', JSON.stringify(vehicles));
}

// Handle CSV file upload
function uploadCSV() {
    document.getElementById('csv-file-input').click();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        complete: function(results) {
            processCSVData(results.data);
            saveToLocalStorage();
            updateStats();
            renderVehicleTable();
            alert('CSV file uploaded successfully!');
        },
        error: function(error) {
            alert('Error parsing CSV file: ' + error.message);
        }
    });
}

// Process CSV data
function processCSVData(csvData) {
    vehicles = csvData.map(row => {
        // Clean up the data
        const cleanValue = (value) => {
            if (!value) return '';
            return value.toString().replace(/[$,]/g, '').trim();
        };

        const vehicle = {
            id: row['Stock #'] || generateId(),
            stockNumber: row['Stock #'] || '',
            vin: row['VIN'] || '',
            year: parseInt(row['Year']) || 0,
            make: row['Make'] || '',
            model: row['Model'] || '',
            body: row['Body'] || '',
            color: row['Color'] || '',
            age: parseInt(row['Age']) || 0,
            tags: row['Tags'] || '',
            photos: parseInt(row['Photos']) || 0,
            created: row['Created'] || new Date().toISOString().split('T')[0],
            inventoryDate: row['Inventory Date'] || row['Created'] || new Date().toISOString().split('T')[0],
            odometer: parseInt(cleanValue(row['Odometer'])) || 0,
            originalCost: cleanValue(row['Original Cost']),
            unitCost: cleanValue(row['Unit Cost']),
            appraisedValue: cleanValue(row['Appraised Value']),
            vehicleSource: row['Vehicle Source'] || '',
            // Workflow data
            currentStage: 'New Arrival',
            detailer: '',
            notes: '',
            stageHistory: {
                'New Arrival': { completed: true, date: row['Inventory Date'] || new Date().toISOString().split('T')[0] }
            }
        };

        // Check for special tags
        if (vehicle.tags) {
            if (vehicle.tags.toLowerCase().includes('no-title') || vehicle.tags.toLowerCase().includes('no title')) {
                vehicle.notes = 'No Title';
                vehicle.needsAttention = true;
            }
        }

        return vehicle;
    }).filter(v => v.stockNumber); // Only include vehicles with stock numbers
}

// Generate unique ID
function generateId() {
    return 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update dashboard statistics
function updateStats() {
    document.getElementById('total-vehicles').textContent = vehicles.length;
    
    const inProgress = vehicles.filter(v => 
        v.currentStage !== 'New Arrival' && v.currentStage !== 'Sold'
    ).length;
    document.getElementById('in-progress').textContent = inProgress;
    
    const completed = vehicles.filter(v => v.currentStage === 'Lot Ready' || v.currentStage === 'Sold').length;
    document.getElementById('completed').textContent = completed;
    
    const needsAttention = vehicles.filter(v => v.needsAttention || v.age > 30).length;
    document.getElementById('needs-attention').textContent = needsAttention;
}

// Render workflow stages
function renderWorkflowStages() {
    const container = document.getElementById('workflow-stages');
    container.innerHTML = workflowStages.map(stage => {
        const count = vehicles.filter(v => v.currentStage === stage).length;
        return `
            <div class="workflow-stage px-4 py-2 rounded-lg border cursor-pointer stage-pending" 
                 onclick="filterByStage('${stage}')">
                <div class="text-sm font-medium">${stage}</div>
                <div class="text-xs">${count} vehicles</div>
            </div>
        `;
    }).join('');
}

// Render vehicle table
function renderVehicleTable() {
    const tbody = document.getElementById('vehicle-table-body');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const stageFilter = document.getElementById('filter-stage').value;

    let filteredVehicles = vehicles;

    // Apply search filter
    if (searchTerm) {
        filteredVehicles = filteredVehicles.filter(v => 
            v.stockNumber.toLowerCase().includes(searchTerm) ||
            v.vin.toLowerCase().includes(searchTerm) ||
            `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm)
        );
    }

    // Apply stage filter
    if (stageFilter) {
        filteredVehicles = filteredVehicles.filter(v => v.currentStage === stageFilter);
    }

    // Sort by age (newest first)
    filteredVehicles.sort((a, b) => a.age - b.age);

    tbody.innerHTML = filteredVehicles.map(vehicle => {
        const ageClass = vehicle.age > 30 ? 'text-red-600 font-semibold' : 
                        vehicle.age > 20 ? 'text-yellow-600' : '';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${vehicle.stockNumber}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${vehicle.year} ${vehicle.make} ${vehicle.model}
                    <div class="text-xs text-gray-400">${vehicle.color}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${ageClass}">
                    ${vehicle.age} days
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${getStageClass(vehicle.currentStage)}">
                        ${vehicle.currentStage}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${vehicle.detailer || '-'}
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${vehicle.notes || vehicle.tags || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="openVehicleModal('${vehicle.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="advanceStage('${vehicle.id}')" 
                            class="text-green-600 hover:text-green-900">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    renderWorkflowStages(); // Update stage counts
}

// Get stage styling class
function getStageClass(stage) {
    switch(stage) {
        case 'New Arrival':
            return 'bg-gray-100 text-gray-800';
        case 'Mechanical':
        case 'Detailing':
        case 'Photos':
        case 'Title':
            return 'bg-blue-100 text-blue-800';
        case 'Lot Ready':
            return 'bg-green-100 text-green-800';
        case 'Sold':
            return 'bg-purple-100 text-purple-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Open vehicle detail modal
function openVehicleModal(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    document.getElementById('modal-title').textContent = 
        `${vehicle.year} ${vehicle.make} ${vehicle.model} - ${vehicle.stockNumber}`;

    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
        <div class="space-y-6">
            <!-- Vehicle Information -->
            <div>
                <h4 class="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm font-medium text-gray-500">Stock Number</p>
                        <p class="mt-1">${vehicle.stockNumber}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">VIN</p>
                        <p class="mt-1 text-xs">${vehicle.vin}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Color</p>
                        <p class="mt-1">${vehicle.color}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Odometer</p>
                        <p class="mt-1">${vehicle.odometer.toLocaleString()} miles</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Source</p>
                        <p class="mt-1">${vehicle.vehicleSource}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500">Age</p>
                        <p class="mt-1">${vehicle.age} days</p>
                    </div>
                </div>
            </div>

            <!-- Workflow Progress -->
            <div>
                <h4 class="text-lg font-medium text-gray-900 mb-3">Workflow Progress</h4>
                <div class="space-y-2">
                    ${workflowStages.map((stage, index) => {
                        const currentIndex = workflowStages.indexOf(vehicle.currentStage);
                        const isCompleted = index < currentIndex;
                        const isCurrent = index === currentIndex;
                        const isPending = index > currentIndex;
                        
                        let stageClass = 'border-gray-300 bg-white text-gray-700';
                        if (isCompleted) stageClass = 'border-green-500 bg-green-50 text-green-700';
                        if (isCurrent) stageClass = 'border-blue-500 bg-blue-50 text-blue-700';
                        
                        return `
                            <div class="flex items-center p-3 border rounded-lg ${stageClass}">
                                <div class="flex-1">
                                    <p class="font-medium">${stage}</p>
                                    ${vehicle.stageHistory[stage] ? 
                                        `<p class="text-xs">Completed: ${vehicle.stageHistory[stage].date}</p>` : 
                                        ''}
                                </div>
                                ${isCurrent ? `
                                    <button onclick="completeCurrentStage('${vehicle.id}')" 
                                            class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                                        Complete
                                    </button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Detailer Assignment -->
            <div>
                <h4 class="text-lg font-medium text-gray-900 mb-3">Detailer Assignment</h4>
                <div class="flex items-center space-x-3">
                    <select id="detailer-select" class="flex-1 px-3 py-2 border border-gray-300 rounded-md">
                        <option value="">Select Detailer</option>
                        ${detailers.map(d => `
                            <option value="${d}" ${vehicle.detailer === d ? 'selected' : ''}>${d}</option>
                        `).join('')}
                    </select>
                    <button onclick="assignDetailer('${vehicle.id}')" 
                            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Assign
                    </button>
                </div>
            </div>

            <!-- Notes -->
            <div>
                <h4 class="text-lg font-medium text-gray-900 mb-3">Notes</h4>
                <textarea id="vehicle-notes" rows="3" 
                          class="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Add notes about this vehicle...">${vehicle.notes || ''}</textarea>
                <button onclick="saveNotes('${vehicle.id}')" 
                        class="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Save Notes
                </button>
            </div>
        </div>
    `;

    document.getElementById('vehicle-modal').classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('vehicle-modal').classList.add('hidden');
}

// Advance to next stage
function advanceStage(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const currentIndex = workflowStages.indexOf(vehicle.currentStage);
    if (currentIndex < workflowStages.length - 1) {
        const nextStage = workflowStages[currentIndex + 1];
        vehicle.currentStage = nextStage;
        vehicle.stageHistory[nextStage] = {
            completed: true,
            date: new Date().toISOString().split('T')[0]
        };
        
        saveToLocalStorage();
        updateStats();
        renderVehicleTable();
    }
}

// Complete current stage
function completeCurrentStage(vehicleId) {
    advanceStage(vehicleId);
    closeModal();
}

// Assign detailer
function assignDetailer(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const detailerSelect = document.getElementById('detailer-select');
    vehicle.detailer = detailerSelect.value;
    
    saveToLocalStorage();
    renderVehicleTable();
    alert('Detailer assigned successfully!');
}

// Save notes
function saveNotes(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const notesTextarea = document.getElementById('vehicle-notes');
    vehicle.notes = notesTextarea.value;
    
    saveToLocalStorage();
    renderVehicleTable();
    alert('Notes saved successfully!');
}

// Filter vehicles
function filterVehicles() {
    renderVehicleTable();
}

// Filter by stage
function filterByStage(stage) {
    document.getElementById('filter-stage').value = stage;
    renderVehicleTable();
}

// Populate filter options
function populateFilterOptions() {
    const filterSelect = document.getElementById('filter-stage');
    filterSelect.innerHTML = '<option value="">All Stages</option>' +
        workflowStages.map(stage => `<option value="${stage}">${stage}</option>`).join('');
}

// Export data
function exportData() {
    const exportData = vehicles.map(v => ({
        'Stock #': v.stockNumber,
        'VIN': v.vin,
        'Year': v.year,
        'Make': v.make,
        'Model': v.model,
        'Body': v.body,
        'Color': v.color,
        'Current Stage': v.currentStage,
        'Detailer': v.detailer,
        'Age': v.age,
        'Notes': v.notes,
        'Inventory Date': v.inventoryDate,
        'Odometer': v.odometer,
        'Vehicle Source': v.vehicleSource
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-recon-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('vehicle-modal');
    if (event.target === modal) {
        closeModal();
    }
}
