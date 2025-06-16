let currentDetailers = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    setupEventListeners();
    updateServerTime();
    setInterval(updateServerTime, 1000);
});

function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected tab and content
    event.target.classList.add('active', 'border-blue-500', 'text-blue-600');
    event.target.classList.remove('border-transparent', 'text-gray-500');
    document.getElementById(`${tabName}-content`).classList.add('active');

    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'inventory':
            // Already loaded
            break;
        case 'detailers':
            loadDetailers();
            break;
        case 'history':
            loadUploadHistory();
            break;
    }
}

function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('csv-file-input');
    const uploadZone = document.getElementById('upload-zone');

    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileSelect({ target: fileInput });
        }
    });

    // Add detailer form
    document.getElementById('add-detailer-form').addEventListener('submit', handleAddDetailer);
}

async function loadDashboard() {
    try {
        // Load current inventory info
        const inventoryResponse = await fetch('/api/inventory/current');
        if (inventoryResponse.ok) {
            const inventoryData = await inventoryResponse.json();
            document.getElementById('current-file-name').textContent = inventoryData.filename;
            document.getElementById('last-updated').textContent = new Date(inventoryData.lastModified).toLocaleString();
        } else {
            document.getElementById('current-file-name').textContent = 'No file found';
            document.getElementById('last-updated').textContent = 'N/A';
        }

        // Load detailers count
        const detailersResponse = await fetch('/api/detailers');
        if (detailersResponse.ok) {
            const detailers = await detailersResponse.json();
            const activeCount = detailers.filter(d => d.active !== false).length;
            document.getElementById('detailers-count').textContent = activeCount;
        }

        // Load system info
        const systemResponse = await fetch('/api/system/info');
        if (systemResponse.ok) {
            const systemInfo = await systemResponse.json();
            document.getElementById('system-time').textContent = new Date(systemInfo.serverTime).toLocaleString();
            document.getElementById('system-uptime').textContent = formatUptime(systemInfo.uptime);
            document.getElementById('node-version').textContent = systemInfo.nodeVersion;
            document.getElementById('platform').textContent = systemInfo.platform;
        }

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
        showUploadResult('error', 'Please select a CSV file');
        return;
    }

    uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('inventory', file);

    const progressDiv = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const statusText = document.getElementById('upload-status');

    progressDiv.classList.remove('hidden');
    progressBar.style.width = '0%';
    statusText.textContent = 'Uploading...';

    try {
        const response = await fetch('/api/inventory/upload', {
            method: 'POST',
            body: formData
        });

        progressBar.style.width = '100%';
        statusText.textContent = 'Processing...';

        const result = await response.json();

        if (response.ok) {
            showUploadResult('success', `Successfully uploaded ${result.filename} with ${result.vehicleCount} vehicles`);
            loadDashboard(); // Refresh dashboard
        } else {
            showUploadResult('error', result.error || 'Upload failed');
        }

    } catch (error) {
        showUploadResult('error', 'Upload failed: ' + error.message);
    } finally {
        setTimeout(() => {
            progressDiv.classList.add('hidden');
            document.getElementById('csv-file-input').value = '';
        }, 2000);
    }
}

function showUploadResult(type, message) {
    const resultDiv = document.getElementById('upload-result');
    resultDiv.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
    
    if (type === 'success') {
        resultDiv.classList.add('bg-green-100', 'text-green-800');
        resultDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    } else {
        resultDiv.classList.add('bg-red-100', 'text-red-800');
        resultDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
    }

    setTimeout(() => {
        resultDiv.classList.add('hidden');
    }, 5000);
}

async function loadDetailers() {
    try {
        const response = await fetch('/api/detailers');
        if (!response.ok) throw new Error('Failed to load detailers');
        
        currentDetailers = await response.json();
        renderDetailers();
    } catch (error) {
        console.error('Error loading detailers:', error);
    }
}

function renderDetailers() {
    const container = document.getElementById('detailers-list');
    
    if (currentDetailers.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">No detailers added yet</div>';
        return;
    }

    container.innerHTML = currentDetailers.map(detailer => `
        <div class="p-6 flex items-center justify-between">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-white"></i>
                    </div>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">${detailer.name}</div>
                    <div class="text-sm text-gray-500">
                        ${detailer.email ? `Email: ${detailer.email}` : ''}
                        ${detailer.phone ? `Phone: ${detailer.phone}` : ''}
                    </div>
                    <div class="text-xs text-gray-400">
                        Added: ${new Date(detailer.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 text-xs rounded-full ${detailer.active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${detailer.active !== false ? 'Active' : 'Inactive'}
                </span>
                <button onclick="toggleDetailerStatus('${detailer.id}')" 
                        class="text-blue-600 hover:text-blue-800 text-sm">
                    ${detailer.active !== false ? 'Deactivate' : 'Activate'}
                </button>
                <button onclick="deleteDetailer('${detailer.id}')" 
                        class="text-red-600 hover:text-red-800 text-sm">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

async function handleAddDetailer(event) {
    event.preventDefault();
    
    const name = document.getElementById('detailer-name').value.trim();
    const email = document.getElementById('detailer-email').value.trim();
    const phone = document.getElementById('detailer-phone').value.trim();

    if (!name) {
        alert('Detailer name is required');
        return;
    }

    try {
        const response = await fetch('/api/detailers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById('add-detailer-form').reset();
            loadDetailers();
            alert('Detailer added successfully');
        } else {
            alert(result.error || 'Failed to add detailer');
        }
    } catch (error) {
        alert('Error adding detailer: ' + error.message);
    }
}

async function toggleDetailerStatus(detailerId) {
    const detailer = currentDetailers.find(d => d.id === detailerId);
    if (!detailer) return;

    try {
        const response = await fetch(`/api/detailers/${detailerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active: !detailer.active })
        });

        if (response.ok) {
            loadDetailers();
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to update detailer');
        }
    } catch (error) {
        alert('Error updating detailer: ' + error.message);
    }
}

async function deleteDetailer(detailerId) {
    if (!confirm('Are you sure you want to delete this detailer?')) return;

    try {
        const response = await fetch(`/api/detailers/${detailerId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadDetailers();
            alert('Detailer deleted successfully');
        } else {
            const result = await response.json();
            alert(result.error || 'Failed to delete detailer');
        }
    } catch (error) {
        alert('Error deleting detailer: ' + error.message);
    }
}

async function loadUploadHistory() {
    try {
        const response = await fetch('/api/uploads/history');
        if (!response.ok) throw new Error('Failed to load upload history');
        
        const history = await response.json();
        renderUploadHistory(history);
    } catch (error) {
        console.error('Error loading upload history:', error);
    }
}

function renderUploadHistory(history) {
    const container = document.getElementById('upload-history-list');
    
    if (history.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">No upload history found</div>';
        return;
    }

    container.innerHTML = history.map(upload => `
        <div class="p-6 flex items-center justify-between">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <i class="fas fa-file-csv text-2xl text-green-500"></i>
                </div>
                <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">${upload.filename}</div>
                    <div class="text-sm text-gray-500">
                        Uploaded: ${new Date(upload.uploadedAt).toLocaleString()}
                    </div>
                    <div class="text-xs text-gray-400">
                        Size: ${formatFileSize(upload.size)}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateServerTime() {
    document.getElementById('server-time').textContent = new Date().toLocaleTimeString();
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
