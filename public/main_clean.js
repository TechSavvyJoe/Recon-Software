// Vehicle Reconditioning Tracker - Main Application Logic

// Global variables
let currentVehicleData = [];
let detailerNames = [];
const RECON_STATUSES = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'];

// Tab switching
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeEventListeners();
    loadInitialData();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Update button states
            tabButtons.forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('bg-gray-200');
            });
            button.classList.remove('bg-gray-200');
            button.classList.add('bg-blue-500', 'text-white');
            
            // Update content visibility
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}-content`).classList.add('active');
            
            // Refresh content if needed
            if (targetTab === 'dashboard') renderDashboard();
            if (targetTab === 'workflow') renderWorkflow();
            if (targetTab === 'inventory') renderInventory();
            if (targetTab === 'reports') renderReports();
            if (targetTab === 'detailers') renderDetailers();
        });
    });
}

function initializeEventListeners() {
    // Upload button
    const uploadButton = document.getElementById('upload-csv-button');
    if (uploadButton) {
        uploadButton.addEventListener('click', handleCsvUpload);
    }
    
    // Add vehicle button
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', showAddVehicleModal);
    }
    
    // Add detailer button
    const addDetailerBtn = document.getElementById('add-detailer-btn');
    if (addDetailerBtn) {
        addDetailerBtn.addEventListener('click', addDetailer);
    }
    
    // Modal close
    const closeModal = document.querySelector('.close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('vehicle-modal').style.display = 'none';
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('inventory-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterInventory(e.target.value);
        });
    }
}

// --- Data Loading Functions ---
async function loadInitialData() {
  try {
    // First try to load from localStorage
    const savedData = localStorage.getItem('vehicleData');
    if (savedData) {
      try {
        currentVehicleData = JSON.parse(savedData);
        console.log(`Loaded ${currentVehicleData.length} vehicles from localStorage`);
        
        // Ensure data structure compatibility
        currentVehicleData = currentVehicleData.map(v => {
          if (!v.workflow) {
            v.workflow = getDefaultWorkflow();
          }
          // Ensure compatibility properties exist
          if (!v.stockNumber && v['Stock #']) v.stockNumber = v['Stock #'];
          if (!v.status && v.Status) v.status = v.Status;
          if (!v.rating) v.rating = 0;
          return v;
        });
        
        autoSave();
        renderAllTabs();
        updateCurrentInventoryInfo();
        return;
      } catch (e) {
        console.warn('Could not parse saved data:', e);
      }
    }
    
    // Try multiple possible CSV file names
    const possibleFiles = [
      './Recon -Mission Ford of Dearborn-2025-06-10-0955.csv',
      './Recon-Mission Ford of Dearborn-2025-06-10-0955.csv',
      './inventory.csv'
    ];
    
    let csvText = null;
    let loadedFile = null;
    
    for (const file of possibleFiles) {
      try {
        const res = await fetch(file);
        if (res.ok) {
          csvText = await res.text();
          loadedFile = file;
          break;
        }
      } catch (e) {
        // Continue to next file
      }
    }
    
    if (csvText) {
      currentVehicleData = parseVehicleDataFromCSV(csvText);
      console.log(`Loaded ${currentVehicleData.length} vehicles from ${loadedFile}`);
    }
    
    if (!currentVehicleData || currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessage('Using sample data. No valid CSV file found or file is empty.', 'info');
    }
    
    autoSave();
    renderAllTabs();
    updateCurrentInventoryInfo();
  } catch (e) {
    console.error('Error loading data:', e);
    currentVehicleData = getSampleData();
    showMessage('Using sample data. Error: ' + e.message, 'warning');
    autoSave();
    renderAllTabs();
    updateCurrentInventoryInfo();
  }
}

function parseVehicleDataFromCSV(csvText) {
  const vehicles = [];
  
  try {
    if (typeof window.Papa !== 'undefined') {
      const results = window.Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: function(header) {
          // Clean up header names
          return header.replace(/["\r\n]/g, '').trim();
        }
      });
      
      console.log('Parsed CSV headers:', results.meta.fields);
      console.log('Number of rows:', results.data.length);
      
      results.data.forEach((row, index) => {
        const stockNum = row['Stock #'] || '';
        
        if (stockNum) {
          const vehicle = {
            'Stock #': stockNum,
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
            'Odometer': parseInt(row['Odometer']?.toString().replace(/[,\s]/g, '')) || 0,
            'Original Cost': row['Original Cost'] || '',
            'Unit Cost': row['Unit Cost'] || '',
            'Vehicle Source': row['Vehicle Source'] || '',
            'Photos': parseInt(row['Photos']) || 0,
            'Age': parseInt(row['Age']) || 0,
            'Appraised Value': row['Appraised Value'] || '',
            'Last Updated': new Date().toISOString(),
            'rating': 0
          };
          
          // Duplicate properties for compatibility
          vehicle.stockNumber = stockNum;
          vehicle.vin = vehicle.VIN;
          vehicle.year = vehicle.Year;
          vehicle.make = vehicle.Make;
          vehicle.model = vehicle.Model;
          vehicle.color = vehicle.Color;
          vehicle.status = vehicle.Status;
          vehicle.odometer = vehicle.Odometer;
          vehicle.age = vehicle.Age;
          vehicle.source = vehicle['Vehicle Source'];
          vehicle.cost = vehicle['Unit Cost'];
          vehicle.notes = vehicle.Notes;
          
          // Initialize workflow
          vehicle.workflow = getDefaultWorkflow();
          
          vehicles.push(vehicle);
        }
      });
      
      console.log(`Successfully parsed ${vehicles.length} vehicles`);
    } else {
      console.error('PapaParse not loaded');
    }
  } catch (error) {
    console.error('Error parsing CSV:', error);
  }
  
  return vehicles;
}

// Fix the sample data function
function getSampleData() {
    const sampleVehicles = [
        {
            'Stock #': 'A001',
            'VIN': '1FTFW1ET0DFA12345',
            'Year': 2020,
            'Make': 'Ford',
            'Model': 'F-150',
            'Body': 'Crew Cab',
            'Color': 'Oxford White',
            'Status': 'New Arrival',
            'Detailer': '',
            'Date In': '2025-01-10',
            'Notes': 'Clean trade-in',
            'Odometer': 45000,
            'Original Cost': '$25,000',
            'Unit Cost': '$23,500',
            'Vehicle Source': 'Trade-in',
            'Photos': 0,
            'Age': 6,
            'Appraised Value': '$27,000',
            'Last Updated': new Date().toISOString(),
            'rating': 4
        },
        {
            'Stock #': 'A002', 
            'VIN': '3FA6P0HR0DR123456',
            'Year': 2019,
            'Make': 'Ford',
            'Model': 'Fusion',
            'Body': 'Sedan',
            'Color': 'Magnetic Gray',
            'Status': 'Mechanical',
            'Detailer': '',
            'Date In': '2025-01-08',
            'Notes': 'Needs oil change and inspection',
            'Odometer': 62000,
            'Original Cost': '$18,000',
            'Unit Cost': '$17,200',
            'Vehicle Source': 'Auction',
            'Photos': 0,
            'Age': 8,
            'Appraised Value': '$19,500',
            'Last Updated': new Date().toISOString(),
            'rating': 3
        },
        {
            'Stock #': 'A003',
            'VIN': '1FM5K8D80GGA78901',
            'Year': 2021,
            'Make': 'Ford',
            'Model': 'Explorer',
            'Body': 'SUV',
            'Color': 'Agate Black',
            'Status': 'Detailing',
            'Detailer': 'John Smith',
            'Date In': '2025-01-05',
            'Notes': 'Minor scratch on rear bumper',
            'Odometer': 35000,
            'Original Cost': '$32,000',
            'Unit Cost': '$30,800',
            'Vehicle Source': 'Lease Return',
            'Photos': 0,
            'Age': 11,
            'Appraised Value': '$34,000',
            'Last Updated': new Date().toISOString(),
            'rating': 5
        }
    ];

    // Add compatibility properties and workflows
    return sampleVehicles.map(v => {
        // Duplicate properties for compatibility
        v.stockNumber = v['Stock #'];
        v.vin = v.VIN;
        v.year = v.Year;
        v.make = v.Make;
        v.model = v.Model;
        v.color = v.Color;
        v.status = v.Status;
        v.odometer = v.Odometer;
        v.age = v.Age;
        v.source = v['Vehicle Source'];
        v.cost = v['Unit Cost'];
        v.notes = v.Notes;
        
        // Initialize workflow
        v.workflow = getDefaultWorkflow();
        
        // Set appropriate workflow states based on status
        if (v.Status === 'Mechanical') {
            v.workflow['New Arrival'].completed = true;
        } else if (v.Status === 'Detailing') {
            v.workflow['New Arrival'].completed = true;
            v.workflow['Mechanical'].completed = true;
            v.workflow['Mechanical'].date = '2025-01-09';
        }
        
        return v;
    });
}

async function loadInitialData() {
    try {
        // Load CSV data
        const inventoryInfo = await ApiService.getCurrentInventory();
        if (inventoryInfo && inventoryInfo.url) {
            const response = await fetch(inventoryInfo.url);
            const csvText = await response.text();
            parseCSVData(csvText);
        }
        
        // Update current inventory info
        updateCurrentInventoryInfo();
        
        // Load detailers
        const detailers = await ApiService.getDetailers();
        detailerNames = detailers.map(d => d.name);
        
        // Initial render
        renderDashboard();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage('Error loading data. Please upload a CSV file.', 'error');
    }
}

function parseCSVData(csvText) {
    Papa.parse(csvText, {
        header: true,
        complete: function(results) {
            currentVehicleData = results.data.map(row => ({
                stockNumber: row['Stock #'] || '',
                vin: row['VIN'] || '',
                year: row['Year'] || '',
                make: row['Make'] || '',
                model: row['Model'] || '',
                body: row['Body'] || '',
                color: row['Color'] || '',
                status: row['Status'] || 'New Arrival',
                dateIn: row['Inventory Date'] || row['Created'] || '',
                age: parseInt(row['Age']) || 0,
                source: row['Vehicle Source'] || '',
                photos: parseInt(row['Photos']) || 0,
                odometer: row['Odometer'] || '',
                cost: row['Unit Cost'] || '',
                notes: row['Notes'] || ''
            }));
            
            renderDashboard();
            renderInventory();
        },
        error: function(error) {
            console.error('CSV Parse Error:', error);
            showMessage('Error parsing CSV file', 'error');
        }
    });
}

function renderDashboard() {
    const statsContainer = document.getElementById('dashboard-stats');
    const recentContainer = document.getElementById('recent-vehicles');
    
    if (!statsContainer || !recentContainer) return;
    
    // Calculate stats
    const statusCounts = {};
    RECON_STATUSES.forEach(status => {
        statusCounts[status] = currentVehicleData.filter(v => (v.Status || v.status) === status).length;
    });
    
    const totalVehicles = currentVehicleData.length;
    const avgAge = totalVehicles > 0 
        ? Math.round(currentVehicleData.reduce((sum, v) => sum + (v.Age || v.age || 0), 0) / totalVehicles)
        : 0;
    
    // Render stats
    statsContainer.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">${totalVehicles}</div>
            <div class="text-sm text-gray-600">Total Vehicles</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">${statusCounts['Lot Ready'] || 0}</div>
            <div class="text-sm text-gray-600">Lot Ready</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-yellow-600">${statusCounts['Mechanical'] || 0}</div>
            <div class="text-sm text-gray-600">In Mechanical</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">${avgAge}</div>
            <div class="text-sm text-gray-600">Avg Days</div>
        </div>
    `;
    
    // Render recent vehicles
    const recentVehicles = currentVehicleData.slice(0, 5);
    recentContainer.innerHTML = `
        <h3 class="text-lg font-medium mb-3">Recent Vehicles</h3>
        <div class="space-y-2">
            ${recentVehicles.map(v => {
                const stockNum = v['Stock #'] || v.stockNumber;
                const year = v.Year || v.year;
                const make = v.Make || v.make;
                const model = v.Model || v.model;
                const vin = v.VIN || v.vin;
                const status = v.Status || v.status;
                
                return `
                <div class="border rounded p-3 hover:bg-gray-50 cursor-pointer" onclick="showVehicleDetail('${stockNum}')">
                    <div class="flex justify-between">
                        <div>
                            <strong>${year} ${make} ${model}</strong>
                            <div class="text-sm text-gray-600">Stock: ${stockNum} | VIN: ${vin}</div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full bg-gray-100">${status}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function renderWorkflow() {
    const container = document.getElementById('workflow-board');
    if (!container) return;
    
    container.innerHTML = RECON_STATUSES.map(status => `
        <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-medium mb-3">${status}</h3>
            <div class="space-y-2" id="workflow-${status.replace(/\s+/g, '-')}" ondrop="drop(event, '${status}')" ondragover="allowDrop(event)">
                ${currentVehicleData
                    .filter(v => (v.Status || v.status) === status)
                    .map(v => {
                        const stockNum = v['Stock #'] || v.stockNumber;
                        const year = v.Year || v.year;
                        const make = v.Make || v.make;
                        const model = v.Model || v.model;
                        
                        return `
                        <div class="bg-white p-2 rounded shadow cursor-move" 
                             draggable="true" 
                             ondragstart="drag(event, '${stockNum}')"
                             data-stock="${stockNum}">
                            <div class="font-medium">${stockNum}</div>
                            <div class="text-xs text-gray-600">${year} ${make} ${model}</div>
                        </div>`;
                    }).join('')}
            </div>
        </div>
    `).join('');
}

function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = currentVehicleData.map(v => {
        const stockNum = v['Stock #'] || v.stockNumber;
        const year = v.Year || v.year;
        const make = v.Make || v.make;
        const model = v.Model || v.model;
        const vin = v.VIN || v.vin;
        const status = v.Status || v.status;
        const age = v.Age || v.age;
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${stockNum}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${year} ${make} ${model}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${vin}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full bg-gray-100">${status}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${age} days</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="showVehicleDetail('${stockNum}')" class="text-blue-600 hover:text-blue-800 mr-2">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="deleteVehicle('${stockNum}')" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderReports() {
    const container = document.getElementById('reports-container');
    if (!container) return;
    
    const totalVehicles = currentVehicleData.length;
    const avgAge = totalVehicles > 0 
        ? Math.round(currentVehicleData.reduce((sum, v) => sum + (v.Age || v.age || 0), 0) / totalVehicles)
        : 0;
    
    // Calculate average rating
    const vehiclesWithRating = currentVehicleData.filter(v => v.rating > 0);
    const avgRating = vehiclesWithRating.length > 0
        ? (vehiclesWithRating.reduce((sum, v) => sum + v.rating, 0) / vehiclesWithRating.length).toFixed(1)
        : 0;
    
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="border rounded-lg p-4">
                <h3 class="text-lg font-medium mb-3">Status Distribution</h3>
                <div class="space-y-2">
                    ${RECON_STATUSES.map(status => {
                        const count = currentVehicleData.filter(v => (v.Status || v.status) === status).length;
                        const percentage = totalVehicles > 0 
                            ? Math.round((count / totalVehicles) * 100) 
                            : 0;
                        return `
                            <div>
                                <div class="flex justify-between text-sm">
                                    <span>${status}</span>
                                    <span>${count} (${percentage}%)</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-2">
                                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="border rounded-lg p-4">
                <h3 class="text-lg font-medium mb-3">Key Metrics</h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span>Total Vehicles:</span>
                        <span class="font-medium">${totalVehicles}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Average Age:</span>
                        <span class="font-medium">${avgAge} days</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Average Rating:</span>
                        <span class="font-medium">${avgRating}/5 ⭐</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Completion Rate:</span>
                        <span class="font-medium">${totalVehicles > 0 ? Math.round((currentVehicleData.filter(v => (v.Status || v.status) === 'Lot Ready').length / totalVehicles) * 100) : 0}%</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="mt-6 border rounded-lg p-4">
            <h3 class="text-lg font-medium mb-3">Recent Activity</h3>
            <div class="space-y-2">
                ${currentVehicleData.slice(0, 10).map(v => {
                    const stockNum = v['Stock #'] || v.stockNumber;
                    const year = v.Year || v.year;
                    const make = v.Make || v.make;
                    const model = v.Model || v.model;
                    const status = v.Status || v.status;
                    
                    return `
                    <div class="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                            <span class="font-medium">${stockNum}</span>
                            <span class="text-gray-600 ml-2">${year} ${make} ${model}</span>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full bg-gray-100">${status}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
}
                    <div class="flex justify-between">
                        <span>Total Vehicles:</span>
                        <strong>${currentVehicleData.length}</strong>
                    </div>
                    <div class="flex justify-between">
                        <span>Average Age:</span>
                        <strong>${avgAge} days</strong>
                    </div>
                    <div class="flex justify-between">
                        <span>Ready for Sale:</span>
                        <strong>${currentVehicleData.filter(v => v.status === 'Lot Ready').length}</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function renderDetailers() {
    const container = document.getElementById('detailers-list');
    if (!container) return;
    
    // Load detailers from localStorage
    const savedDetailers = localStorage.getItem('detailers');
    let detailers = [];
    
    try {
        detailers = savedDetailers ? JSON.parse(savedDetailers) : [];
    } catch (e) {
        detailers = [];
    }
    
    if (detailers.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No detailers added yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-2">
            ${detailers.map(d => `
                <div class="border rounded p-3 flex justify-between items-center">
                    <div>
                        <strong>${d.name}</strong>
                        ${d.email ? `<span class="text-sm text-gray-600 ml-2">${d.email}</span>` : ''}
                    </div>
                    <button onclick="deleteDetailer('${d.id}')" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function addDetailer() {
    const nameInput = document.getElementById('new-detailer-name');
    const emailInput = document.getElementById('new-detailer-email');
    
    if (!nameInput || !nameInput.value.trim()) {
        showMessage('Please enter a detailer name', 'error');
        return;
    }
    
    // Load existing detailers
    const savedDetailers = localStorage.getItem('detailers');
    let detailers = [];
    
    try {
        detailers = savedDetailers ? JSON.parse(savedDetailers) : [];
    } catch (e) {
        detailers = [];
    }
    
    // Add new detailer
    const newDetailer = {
        id: Date.now().toString(),
        name: nameInput.value.trim(),
        email: emailInput.value.trim() || ''
    };
    
    detailers.push(newDetailer);
    
    // Save to localStorage
    localStorage.setItem('detailers', JSON.stringify(detailers));
    
    // Clear inputs
    nameInput.value = '';
    emailInput.value = '';
    
    // Refresh display
    renderDetailers();
    showMessage('Detailer added successfully', 'success');
}

function deleteDetailer(detailerId) {
    if (!confirm('Delete this detailer?')) return;
    
    // Load existing detailers
    const savedDetailers = localStorage.getItem('detailers');
    let detailers = [];
    
    try {
        detailers = savedDetailers ? JSON.parse(savedDetailers) : [];
    } catch (e) {
        detailers = [];
    }
    
    // Remove detailer
    detailers = detailers.filter(d => d.id !== detailerId);
    
    // Save to localStorage
    localStorage.setItem('detailers', JSON.stringify(detailers));
    
    // Refresh display
    renderDetailers();
    showMessage('Detailer deleted', 'success');
}

function renderAllTabs() {
    renderDashboard();
    renderWorkflow();
    renderInventory();
    renderReports();
    renderDetailers();
}

// Message/notification system
function showMessage(message, type = 'info') {
    // Create or get notification container
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full opacity-0`;
    
    // Set colors based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-yellow-500 text-black';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-lg">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Helper functions
async function handleCsvUpload() {
    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a file', 'error');
        return;
    }
    
    try {
        showMessage('Processing CSV file...', 'info');
        
        // Read file directly for local operation
        const text = await file.text();
        const newVehicles = parseVehicleDataFromCSV(text);
        
        if (newVehicles && newVehicles.length > 0) {
            currentVehicleData = newVehicles;
            autoSave();
            renderAllTabs();
            showMessage(`Successfully loaded ${newVehicles.length} vehicles`, 'success');
            fileInput.value = '';
        } else {
            showMessage('No valid vehicle data found in CSV', 'warning');
        }
        
        updateCurrentInventoryInfo();
    } catch (error) {
        console.error('CSV upload error:', error);
        showMessage('Upload failed: ' + error.message, 'error');
    }
}

async function updateCurrentInventoryInfo() {
    const container = document.getElementById('current-inventory-info');
    if (!container) return;
    
    // Show local inventory info
    const lastSaved = localStorage.getItem('lastSaved');
    const vehicleCount = currentVehicleData.length;
    
    container.innerHTML = `
        <p><strong>Vehicles Loaded:</strong> ${vehicleCount}</p>
        <p><strong>Data Source:</strong> Local Storage</p>
        ${lastSaved ? `<p><strong>Last Saved:</strong> ${new Date(lastSaved).toLocaleString()}</p>` : ''}
        <div class="mt-2">
            <button onclick="exportToCSV()" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                Export CSV
            </button>
        </div>
    `;
}

function exportToCSV() {
    if (currentVehicleData.length === 0) {
        showMessage('No data to export', 'warning');
        return;
    }
    
    // Convert data to CSV format
    const headers = ['Stock #', 'VIN', 'Year', 'Make', 'Model', 'Body', 'Color', 'Status', 'Detailer', 'Date In', 'Notes', 'Odometer', 'Original Cost', 'Unit Cost', 'Vehicle Source', 'Photos', 'Age', 'Appraised Value', 'Rating'];
    
    const csvContent = [
        headers.join(','),
        ...currentVehicleData.map(vehicle => [
            vehicle['Stock #'] || '',
            vehicle.VIN || '',
            vehicle.Year || '',
            vehicle.Make || '',
            vehicle.Model || '',
            vehicle.Body || '',
            vehicle.Color || '',
            vehicle.Status || '',
            vehicle.Detailer || '',
            vehicle['Date In'] || '',
            `"${(vehicle.Notes || '').replace(/"/g, '""')}"`,
            vehicle.Odometer || '',
            vehicle['Original Cost'] || '',
            vehicle['Unit Cost'] || '',
            vehicle['Vehicle Source'] || '',
            vehicle.Photos || '',
            vehicle.Age || '',
            vehicle['Appraised Value'] || '',
            vehicle.rating || ''
        ].join(','))
    ].join('\n');
    
    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessage('CSV exported successfully', 'success');
}

async function addDetailer() {
    const nameInput = document.getElementById('new-detailer-name');
    const emailInput = document.getElementById('new-detailer-email');
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    
    if (!name) {
        showMessage('Please enter a name', 'error');
        return;
    }
    
    try {
        await ApiService.addDetailer({ name, email });
        showMessage('Detailer added successfully!', 'success');
        
        nameInput.value = '';
        emailInput.value = '';
        
        renderDetailers();
    } catch (error) {
        showMessage('Error adding detailer: ' + error.message, 'error');
    }
}

function showVehicleDetail(stockNumber) {
    const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNumber || v.stockNumber === stockNumber);
    if (!vehicle) return;
    
    const modal = document.getElementById('vehicle-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = `${vehicle.Year || vehicle.year} ${vehicle.Make || vehicle.make} ${vehicle.Model || vehicle.model}`;
    
    // Initialize workflow if not exists
    if (!vehicle.workflow) {
        vehicle.workflow = getDefaultWorkflow();
    }
    
    const stockNum = vehicle['Stock #'] || vehicle.stockNumber;
    const vin = vehicle.VIN || vehicle.vin;
    const color = vehicle.Color || vehicle.color;
    const odometer = vehicle.Odometer || vehicle.odometer;
    const status = vehicle.Status || vehicle.status;
    const age = vehicle.Age || vehicle.age;
    const source = vehicle['Vehicle Source'] || vehicle.source;
    const cost = vehicle['Unit Cost'] || vehicle.cost;
    const notes = vehicle.Notes || vehicle.notes || '';
    
    modalBody.innerHTML = `
        <div class="mb-6">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <strong>Stock Number:</strong> ${stockNum}<br>
                    <strong>VIN:</strong> ${vin}<br>
                    <strong>Color:</strong> ${color}<br>
                    <strong>Odometer:</strong> ${odometer}<br>
                </div>
                <div>
                    <strong>Status:</strong> ${status}<br>
                    <strong>Age:</strong> ${age} days<br>
                    <strong>Source:</strong> ${source}<br>
                    <strong>Cost:</strong> ${cost}<br>
                </div>
            </div>
            
            <!-- Star Rating System -->
            <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 class="font-medium mb-2">Vehicle Condition Rating</h4>
                <div class="flex items-center gap-2">
                    <span class="text-sm">Overall:</span>
                    <div class="star-rating" data-rating="${vehicle.rating || 0}" data-vehicle="${stockNum}">
                        ${generateStarRating(vehicle.rating || 0, stockNum)}
                    </div>
                    <span class="ml-2 text-sm text-gray-600">${vehicle.rating || 0}/5 stars</span>
                </div>
            </div>
            
            <!-- Horizontal Timeline -->
            <div class="mb-6">
                <h4 class="font-medium mb-4">Reconditioning Progress</h4>
                ${createHorizontalTimeline(vehicle)}
            </div>
            
            <!-- Notes Section -->
            <div class="mt-4">
                <strong>Notes:</strong><br>
                <textarea id="vehicle-notes-${stockNum}" class="w-full p-2 border rounded" rows="3">${notes}</textarea>
            </div>
            
            <!-- Action Buttons -->
            <div class="mt-4 flex gap-2">
                <button class="action-button action-button-primary" onclick="saveVehicleNotes('${stockNum}')">
                    Save Notes
                </button>
                <button class="action-button action-button-secondary" onclick="document.getElementById('vehicle-modal').style.display='none'">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function deleteVehicle(stockNumber) {
    if (!confirm(`Delete vehicle ${stockNumber}?`)) return;
    
    currentVehicleData = currentVehicleData.filter(v => (v['Stock #'] || v.stockNumber) !== stockNumber);
    autoSave();
    renderAllTabs();
    showMessage('Vehicle deleted', 'success');
}

function showMessage(message, type = 'info') {
    // Create or get notification container
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `px-4 py-3 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full opacity-0`;
    
    // Set colors based on type
    switch (type) {
        case 'success':
            notification.className += ' bg-green-500 text-white';
            break;
        case 'error':
            notification.className += ' bg-red-500 text-white';
            break;
        case 'warning':
            notification.className += ' bg-yellow-500 text-black';
            break;
        default:
            notification.className += ' bg-blue-500 text-white';
    }
    
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-lg">&times;</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    }, 10);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Drag and drop functions
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev, stockNumber) {
    ev.dataTransfer.setData("stockNumber", stockNumber);
}

function drop(ev, newStatus) {
    ev.preventDefault();
    const stockNumber = ev.dataTransfer.getData("stockNumber");
    
    const vehicle = currentVehicleData.find(v => (v['Stock #'] || v.stockNumber) === stockNumber);
    if (vehicle) {
        vehicle.Status = newStatus;
        vehicle.status = newStatus;
        
        // Update workflow when status changes
        if (vehicle.workflow) {
            // Mark previous stages as completed if moving forward
            const stages = ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready'];
            const currentIndex = stages.indexOf(newStatus);
            
            if (currentIndex >= 0) {
                for (let i = 0; i <= currentIndex; i++) {
                    if (vehicle.workflow[stages[i]]) {
                        vehicle.workflow[stages[i]].completed = true;
                        if (!vehicle.workflow[stages[i]].date) {
                            vehicle.workflow[stages[i]].date = new Date().toISOString().split('T')[0];
                        }
                    }
                }
            }
        }
        
        autoSave();
        renderWorkflow();
        showMessage(`Vehicle ${stockNumber} moved to ${newStatus}`, 'success');
    }
}

// Workflow Timeline Functions
function getDefaultWorkflow() {
    return {
        'New Arrival': { completed: true, date: new Date().toISOString().split('T')[0] },
        'Mechanical': { 
            completed: false, 
            date: null,
            substeps: {
                'Oil Change': { completed: false, date: null },
                'Inspection': { completed: false, date: null },
                'Repairs': { completed: false, date: null }
            }
        },
        'Detailing': { completed: false, date: null },
        'Photos': { completed: false, date: null },
        'Title': { completed: false, date: null },
        'Lot Ready': { completed: false, date: null }
    };
}

function createHorizontalTimeline(vehicle) {
    const workflow = vehicle.workflow || getDefaultWorkflow();
    const stockNum = vehicle['Stock #'] || vehicle.stockNumber;
    
    const stages = [
        { name: 'New Arrival', icon: '📥', color: 'green' },
        { name: 'Mechanical', icon: '🔧', color: 'blue', hasSubsteps: true },
        { name: 'Detailing', icon: '✨', color: 'purple' },
        { name: 'Photos', icon: '📸', color: 'yellow' },
        { name: 'Title', icon: '📄', color: 'orange' },
        { name: 'Lot Ready', icon: '✅', color: 'emerald' }
    ];
    
    let html = '<div class="horizontal-timeline">';
    
    // Progress bar
    const completedStages = stages.filter(stage => workflow[stage.name]?.completed).length;
    const progress = Math.round((completedStages / stages.length) * 100);
    
    html += `
        <div class="mb-4">
            <div class="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>${progress}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
            </div>
        </div>
    `;
    
    // Timeline steps
    html += '<div class="timeline-steps">';
    
    stages.forEach((stage, index) => {
        const stageData = workflow[stage.name] || { completed: false };
        const isCompleted = stageData.completed;
        const canComplete = index === 0 || true; // Allow completing out of order
        
        let stepClass = 'timeline-step';
        if (isCompleted) stepClass += ' completed';
        if (canComplete && !isCompleted) stepClass += ' clickable';
        
        html += `
            <div class="${stepClass}" onclick="${canComplete && !isCompleted ? `completeStage('${stockNum}', '${stage.name}')` : ''}">
                <div class="step-icon ${stage.color}">
                    ${stage.icon}
                </div>
                <div class="step-content">
                    <div class="step-name">${stage.name}</div>
                    ${isCompleted ? `<div class="step-date">${formatDate(stageData.date)}</div>` : ''}
                </div>
                ${index < stages.length - 1 ? '<div class="step-connector"></div>' : ''}
            </div>
        `;
        
        // Add mechanical substeps
        if (stage.name === 'Mechanical' && stageData.substeps) {
            html += '<div class="mechanical-substeps">';
            const substeps = ['Oil Change', 'Inspection', 'Repairs'];
            
            substeps.forEach(substep => {
                const substepData = stageData.substeps[substep] || { completed: false };
                const substepCompleted = substepData.completed;
                
                html += `
                    <div class="substep ${substepCompleted ? 'completed' : ''}" 
                         onclick="toggleSubstep('${stockNum}', '${substep}')">
                        <input type="checkbox" ${substepCompleted ? 'checked' : ''} readonly>
                        <span>${substep}</span>
                        ${substepCompleted ? `<span class="substep-date">${formatDate(substepData.date)}</span>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        }
    });
    
    html += '</div></div>';
    
    return html;
}

function generateStarRating(rating, vehicleId) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= rating;
        html += `
            <span class="star ${filled ? 'filled' : ''}" 
                  onclick="setStarRating('${vehicleId}', ${i})"
                  onmouseover="highlightStars('${vehicleId}', ${i})"
                  onmouseout="resetStarHighlight('${vehicleId}', ${rating})">
                ★
            </span>
        `;
    }
    return html;
}

function setStarRating(vehicleId, rating) {
    const vehicle = currentVehicleData.find(v => (v['Stock #'] || v.stockNumber) === vehicleId);
    if (vehicle) {
        vehicle.rating = rating;
        autoSave();
        // Update the display
        const starContainer = document.querySelector(`[data-vehicle="${vehicleId}"]`);
        if (starContainer) {
            starContainer.innerHTML = generateStarRating(rating, vehicleId);
            starContainer.nextElementSibling.textContent = `${rating}/5 stars`;
        }
        showMessage(`Rating updated to ${rating} stars`, 'success');
    }
}

function highlightStars(vehicleId, rating) {
    const starContainer = document.querySelector(`[data-vehicle="${vehicleId}"]`);
    if (starContainer) {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.classList.toggle('highlight', index < rating);
        });
    }
}

function resetStarHighlight(vehicleId, originalRating) {
    const starContainer = document.querySelector(`[data-vehicle="${vehicleId}"]`);
    if (starContainer) {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.classList.remove('highlight');
            star.classList.toggle('filled', index < originalRating);
        });
    }
}

function completeStage(stockNum, stageName) {
    const vehicle = currentVehicleData.find(v => (v['Stock #'] || v.stockNumber) === stockNum);
    if (!vehicle) return;
    
    if (!vehicle.workflow) {
        vehicle.workflow = getDefaultWorkflow();
    }
    
    // Complete the stage
    vehicle.workflow[stageName].completed = true;
    vehicle.workflow[stageName].date = new Date().toISOString().split('T')[0];
    
    // Update vehicle status
    vehicle.Status = stageName;
    vehicle.status = stageName;
    
    autoSave();
    renderAllTabs();
    
    // Refresh the modal
    showVehicleDetail(stockNum);
    
    showMessage(`${stageName} completed for Stock #${stockNum}`, 'success');
}

function toggleSubstep(stockNum, substepName) {
    const vehicle = currentVehicleData.find(v => (v['Stock #'] || v.stockNumber) === stockNum);
    if (!vehicle || !vehicle.workflow || !vehicle.workflow.Mechanical) return;
    
    const substep = vehicle.workflow.Mechanical.substeps[substepName];
    if (!substep) return;
    
    // Toggle completion
    substep.completed = !substep.completed;
    substep.date = substep.completed ? new Date().toISOString().split('T')[0] : null;
    
    // Check if all mechanical substeps are complete
    const allSubstepsComplete = Object.values(vehicle.workflow.Mechanical.substeps)
        .every(sub => sub.completed);
    
    if (allSubstepsComplete && !vehicle.workflow.Mechanical.completed) {
        // Auto-complete mechanical stage
        vehicle.workflow.Mechanical.completed = true;
        vehicle.workflow.Mechanical.date = new Date().toISOString().split('T')[0];
        vehicle.Status = 'Mechanical';
        vehicle.status = 'Mechanical';
        showMessage('All mechanical work completed!', 'success');
    }
    
    autoSave();
    renderAllTabs();
    
    // Refresh the modal
    showVehicleDetail(stockNum);
}

function saveVehicleNotes(stockNum) {
    const vehicle = currentVehicleData.find(v => (v['Stock #'] || v.stockNumber) === stockNum);
    const notesTextarea = document.getElementById(`vehicle-notes-${stockNum}`);
    
    if (vehicle && notesTextarea) {
        vehicle.Notes = notesTextarea.value;
        vehicle.notes = notesTextarea.value;
        autoSave();
        showMessage('Notes saved', 'success');
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Auto-save function
function autoSave() {
    try {
        localStorage.setItem('vehicleData', JSON.stringify(currentVehicleData));
        localStorage.setItem('lastSaved', new Date().toISOString());
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

// Global function access
window.showVehicleDetail = showVehicleDetail;
window.deleteVehicle = deleteVehicle;
window.completeStage = completeStage;
window.toggleSubstep = toggleSubstep;
window.saveVehicleNotes = saveVehicleNotes;
window.setStarRating = setStarRating;
window.highlightStars = highlightStars;
window.resetStarHighlight = resetStarHighlight;
window.drop = drop;
window.drag = drag;
window.allowDrop = allowDrop;
window.handleCsvUpload = handleCsvUpload;
window.exportToCSV = exportToCSV;
window.addDetailer = addDetailer;
window.deleteDetailer = deleteDetailer;

// Make sure initialization happens when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing app...');
  
  // Initialize search functionality
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchFilter = e.target.value;
      renderCurrentTab();
    });
  }

  // Initialize sort functionality
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCurrentTab();
    });
  }

  // Load initial data
  await loadInitialData();
  
  // Initialize tabs
  initializeTabs();
});