// --- Vehicle Reconditioning Tracker App ---
// Enhanced version with horizontal timeline UI, CSV integration, and workflow management

// --- Enhanced Global State ---
let currentVehicleData = [];
let detailerNames = [];
let activeVehicleId = null;
let statusToUpdateTo = null;
let stageBeingCompletedForForm = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';
let notificationTimeout = null;

// --- Enhanced UI Utilities ---
class UIUtils {
  static showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type} pointer-events-auto transform translate-x-full`;
    
    const icon = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';
    
    toast.innerHTML = `
      <i class="${icon}"></i>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="ml-2 opacity-70 hover:opacity-100">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-full');
    });
    
    // Auto remove
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);
  }
  
  static showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !show);
    }
  }
  
  static initDarkMode() {
    const toggle = document.getElementById('dark-mode-toggle');
    const html = document.documentElement;
    
    if (isDarkMode) {
      html.classList.add('dark');
    }
    
    if (toggle) {
      toggle.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        html.classList.toggle('dark', isDarkMode);
        localStorage.setItem('darkMode', isDarkMode);
        UIUtils.showToast(`${isDarkMode ? 'Dark' : 'Light'} mode enabled`, 'info');
      });
    }
  }
  
  static createSkeletonLoader(count = 3) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="card-hover bg-white rounded-lg p-6 space-y-4 animate-pulse">
          <div class="skeleton h-4 bg-gray-300 rounded w-3/4"></div>
          <div class="skeleton h-3 bg-gray-300 rounded w-1/2"></div>
          <div class="skeleton h-8 bg-gray-300 rounded w-full"></div>
        </div>
      `;
    }
    return html;
  }
  
  static enhanceFormValidation(formElement) {
    const inputs = formElement.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        UIUtils.validateField(input);
      });
      
      input.addEventListener('input', () => {
        UIUtils.clearFieldError(input);
      });
    });
  }
  
  static validateField(field) {
    const value = field.value.trim();
    const isRequired = field.hasAttribute('required');
    let isValid = true;
    let message = '';
    
    if (isRequired && !value) {
      isValid = false;
      message = 'This field is required';
    } else if (field.type === 'email' && value && !value.includes('@')) {
      isValid = false;
      message = 'Please enter a valid email address';
    } else if (field.type === 'number' && value && isNaN(value)) {
      isValid = false;
      message = 'Please enter a valid number';
    }
    
    if (!isValid) {
      UIUtils.showFieldError(field, message);
    }
    
    return isValid;
  }
  
  static showFieldError(field, message) {
    UIUtils.clearFieldError(field);
    field.classList.add('border-red-500');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-1 field-error';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
  }
  
  static clearFieldError(field) {
    field.classList.remove('border-red-500');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) errorDiv.remove();
  }
}

// --- Enhanced Photo Management System ---
class PhotoManager {
  constructor() {
    this.photos = new Map(); // vehicleId -> photos array
    this.dragCounter = 0;
  }

  // Initialize photo manager for a vehicle
  initializeForVehicle(vehicleId) {
    if (!this.photos.has(vehicleId)) {
      this.photos.set(vehicleId, []);
    }
  }

  // Add photos to a vehicle
  addPhotosToVehicle(vehicleId, files) {
    this.initializeForVehicle(vehicleId);
    const vehiclePhotos = this.photos.get(vehicleId);
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const photoId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const photo = {
          id: photoId,
          file: file,
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          uploadDate: new Date().toISOString()
        };
        vehiclePhotos.push(photo);
      }
    });
    
    this.photos.set(vehicleId, vehiclePhotos);
    UIUtils.showToast(`Added ${files.length} photos`, 'success');
  }

  // Get photos for a vehicle
  getVehiclePhotos(vehicleId) {
    return this.photos.get(vehicleId) || [];
  }

  // Remove a photo
  removePhoto(vehicleId, photoId) {
    const vehiclePhotos = this.photos.get(vehicleId) || [];
    const photoIndex = vehiclePhotos.findIndex(p => p.id === photoId);
    if (photoIndex !== -1) {
      URL.revokeObjectURL(vehiclePhotos[photoIndex].url);
      vehiclePhotos.splice(photoIndex, 1);
      this.photos.set(vehicleId, vehiclePhotos);
      UIUtils.showToast('Photo removed', 'success');
    }
  }

  // Setup drag and drop for photo upload areas
  setupDragAndDrop(element) {
    if (!element) return;

    element.addEventListener('dragenter', (e) => {
      e.preventDefault();
      this.dragCounter++;
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dragCounter--;
      if (this.dragCounter === 0) {
        element.classList.remove('drag-over');
      }
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dragCounter = 0;
      element.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        // Get vehicle ID from context or use current active vehicle
        const vehicleId = activeVehicleId || 'temp';
        this.addPhotosToVehicle(vehicleId, files);
        
        // Update photo preview if available
        this.updatePhotoPreview(files);
      }
    });
  }

  // Update photo preview in forms
  updatePhotoPreview(files) {
    const previewContainer = document.getElementById('photo-preview');
    if (!previewContainer) return;

    previewContainer.classList.remove('hidden');
    previewContainer.innerHTML = '';

    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const previewItem = document.createElement('div');
        previewItem.className = 'photo-preview-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = `Preview ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-photo';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
          previewItem.remove();
          if (previewContainer.children.length === 0) {
            previewContainer.classList.add('hidden');
          }
        };
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeBtn);
        previewContainer.appendChild(previewItem);
      }
    });
  }

  // Download all photos for a vehicle
  downloadAllPhotos(vehicleId) {
    const photos = this.getVehiclePhotos(vehicleId);
    if (photos.length === 0) {
      UIUtils.showToast('No photos to download', 'warning');
      return;
    }

    photos.forEach((photo, index) => {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = `${vehicleId}_photo_${index + 1}_${photo.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    UIUtils.showToast(`Downloading ${photos.length} photos`, 'success');
  }
}

// --- Enhanced Notification System ---
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.unreadCount = 0;
    this.maxNotifications = 50;
  }

  // Add a new notification
  addNotification(title, message, type = 'info', priority = 'normal') {
    const notification = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      priority,
      timestamp: new Date(),
      read: false
    };

    this.notifications.unshift(notification);
    this.unreadCount++;

    // Keep only the most recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.updateNotificationBadge();
    this.showToastNotification(notification);
    
    return notification.id;
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.updateNotificationBadge();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
    this.updateNotificationBadge();
    UIUtils.showToast('All notifications marked as read', 'success');
  }

  // Update notification badge
  updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  // Show toast notification
  showToastNotification(notification) {
    if (notification.priority === 'high') {
      UIUtils.showToast(`${notification.title}: ${notification.message}`, notification.type, 8000);
    }
  }

  // Get all notifications
  getNotifications() {
    return this.notifications;
  }

  // Get unread notifications
  getUnreadNotifications() {
    return this.notifications.filter(n => !n.read);
  }

  // Clear old notifications
  clearOldNotifications(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const originalLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => n.timestamp > cutoffDate);
    
    const removedCount = originalLength - this.notifications.length;
    if (removedCount > 0) {
      UIUtils.showToast(`Cleared ${removedCount} old notifications`, 'info');
    }
  }
}

// --- Enhanced Performance Monitor ---
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      loadTimes: [],
      renderTimes: [],
      errors: [],
      slowOperations: []
    };
    this.startTime = performance.now();
    this.isMonitoring = true;
  }

  // Record page load time
  recordLoadTime(time) {
    this.metrics.loadTimes.push({
      time: time,
      timestamp: new Date()
    });
    
    // Keep only recent measurements
    if (this.metrics.loadTimes.length > 100) {
      this.metrics.loadTimes = this.metrics.loadTimes.slice(-50);
    }
  }

  // Record render time
  recordRenderTime(operation, time) {
    this.metrics.renderTimes.push({
      operation: operation,
      time: time,
      timestamp: new Date()
    });
    
    if (this.metrics.renderTimes.length > 100) {
      this.metrics.renderTimes = this.metrics.renderTimes.slice(-50);
    }
  }

  // Record error
  recordError(error, context) {
    this.metrics.errors.push({
      error: error.toString(),
      context: context,
      timestamp: new Date(),
      stack: error.stack
    });
    
    if (this.metrics.errors.length > 50) {
      this.metrics.errors = this.metrics.errors.slice(-25);
    }
  }

  // Record slow operation
  recordSlowOperation(operation, time) {
    if (time > 1000) { // Only record operations slower than 1 second
      this.metrics.slowOperations.push({
        operation: operation,
        time: time,
        timestamp: new Date()
      });
      
      if (this.metrics.slowOperations.length > 50) {
        this.metrics.slowOperations = this.metrics.slowOperations.slice(-25);
      }
    }
  }

  // Get average load time
  getAverageLoadTime() {
    if (this.metrics.loadTimes.length === 0) return 0;
    const total = this.metrics.loadTimes.reduce((sum, item) => sum + item.time, 0);
    return Math.round(total / this.metrics.loadTimes.length);
  }

  // Get average render time
  getAverageRenderTime() {
    if (this.metrics.renderTimes.length === 0) return 0;
    const total = this.metrics.renderTimes.reduce((sum, item) => sum + item.time, 0);
    return Math.round(total / this.metrics.renderTimes.length);
  }

  // Get recent errors
  getRecentErrors(hours = 1) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.metrics.errors.filter(error => error.timestamp > cutoffTime);
  }

  // Get recent slow operations
  getRecentSlowOperations(hours = 1) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hours);
    
    return this.metrics.slowOperations.filter(op => op.timestamp > cutoffTime);
  }

  // Export metrics
  exportMetrics() {
    const data = {
      summary: {
        averageLoadTime: this.getAverageLoadTime(),
        averageRenderTime: this.getAverageRenderTime(),
        recentErrors: this.getRecentErrors().length,
        recentSlowOps: this.getRecentSlowOperations().length
      },
      detailed: this.metrics,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    UIUtils.showToast('Performance metrics exported', 'success');
  }

  // Start monitoring
  startMonitoring() {
    this.isMonitoring = true;
    this.startTime = performance.now();
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
  }
}

// Initialize global instances
let photoManager, notificationManager, performanceMonitor;

// --- Enhanced Data Management ---
class DataManager {
  static cache = new Map();
  static debounceTimers = new Map();
  
  static debounce(key, func, delay = 300) {
    clearTimeout(this.debounceTimers.get(key));
    this.debounceTimers.set(key, setTimeout(func, delay));
  }
  
  static async fetchWithCache(url, cacheKey, maxAge = 5 * 60 * 1000) {
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < maxAge) {
      return cached.data;
    }
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      this.cache.set(cacheKey, {
        data,
        timestamp: now
      });
      
      return data;
    } catch (error) {
      console.error('Fetch error:', error);
      UIUtils.showToast('Failed to fetch data', 'error');
      return cached?.data || null;
    }
  }
  
  static validateVehicleData(vehicle) {
    const required = ['Stock #', 'Year', 'Make', 'Model'];
    const missing = required.filter(field => !vehicle[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (vehicle.Year && (vehicle.Year < 1900 || vehicle.Year > new Date().getFullYear() + 2)) {
      throw new Error('Invalid year');
    }
    
    return true;
  }
  
  static sanitizeInput(input) {
    return String(input)
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
  
  static exportToJSON(data, filename = 'vehicle-data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  static importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

// --- Analytics and Reporting ---
class Analytics {
  static calculateKPIs(vehicles) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter(v => v.Status !== 'Sold').length,
      completedThisMonth: vehicles.filter(v => {
        const completedDate = v.workflow?.['Lot Ready']?.date;
        return completedDate && new Date(completedDate) > thirtyDaysAgo;
      }).length,
      averageCompletionTime: this.calculateAverageCompletionTime(vehicles),
      statusDistribution: this.getStatusDistribution(vehicles),
      bottlenecks: this.identifyBottlenecks(vehicles)
    };
  }
  
  static calculateAverageCompletionTime(vehicles) {
    const completed = vehicles.filter(v => v.workflow?.['Lot Ready']?.completed);
    if (completed.length === 0) return 0;
    
    const times = completed.map(v => {
      const start = new Date(v.workflow['New Arrival']?.date || v['Inventory Date']);
      const end = new Date(v.workflow['Lot Ready'].date);
      return end - start;
    });
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    return Math.round(average / (1000 * 60 * 60 * 24)); // Convert to days
  }
  
  static getStatusDistribution(vehicles) {
    const distribution = {};
    RECON_STATUSES.forEach(status => {
      distribution[status] = vehicles.filter(v => v.Status === status).length;
    });
    return distribution;
  }
  
  static identifyBottlenecks(vehicles) {
    const stepTimes = {};
    
    vehicles.forEach(vehicle => {
      if (!vehicle.workflow) return;
      
      const steps = Object.keys(vehicle.workflow);
      for (let i = 0; i < steps.length - 1; i++) {
        const currentStep = steps[i];
        const nextStep = steps[i + 1];
        
        const currentTime = vehicle.workflow[currentStep]?.date;
        const nextTime = vehicle.workflow[nextStep]?.date;
        
        if (currentTime && nextTime) {
          const duration = new Date(nextTime) - new Date(currentTime);
          if (!stepTimes[currentStep]) stepTimes[currentStep] = [];
          stepTimes[currentStep].push(duration);
        }
      }
    });
    
    const averages = {};
    Object.keys(stepTimes).forEach(step => {
      const times = stepTimes[step];
      averages[step] = times.reduce((sum, time) => sum + time, 0) / times.length;
    });
    
    return Object.entries(averages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([step, time]) => ({
        step,
        averageDays: Math.round(time / (1000 * 60 * 60 * 24))
      }));
  }
}

// --- Missing Utility Functions ---

// Calculate days in process for a vehicle
function calculateDaysInProcess(vehicle) {
  const dateIn = new Date(vehicle['Date In'] || new Date());
  const now = new Date();
  const diffTime = Math.abs(now - dateIn);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate vehicle progress percentage
function calculateVehicleProgress(workflow) {
  if (!workflow) return 0;
  
  const steps = ['Mechanical', 'Detailing', 'Photos', 'Title'];
  let completed = 0;
  
  steps.forEach(step => {
    if (step === 'Photos') {
      // Special handling for photos - check both workflow and CSV data
      const vehicle = currentVehicleData.find(v => v.workflow === workflow);
      if (hasPhotosInCSV(vehicle) || workflow[step]?.completed) {
        completed++;
      }
    } else if (step === 'Title') {
      if (workflow[step]?.inHouse) {
        completed++;
      }
    } else {
      if (workflow[step]?.completed) {
        completed++;
      }
    }
  });
  
  return (completed / steps.length) * 100;
}

// Check if vehicle has photos in CSV data
function hasPhotosInCSV(vehicle) {
  if (!vehicle) return false;
  
  // Method 1: Check Photo Count field
  if (vehicle['Photo Count'] && parseInt(vehicle['Photo Count']) >= 2) {
    return true;
  }
  
  // Method 2: Check Photos field
  if (vehicle['Photos'] && vehicle['Photos'].toLowerCase() === 'yes') {
    return true;
  }
  
  // Method 3: Check for photo URLs or indicators
  const photoFields = ['Photo 1', 'Photo 2', 'Image URLs', 'Photos URL'];
  for (const field of photoFields) {
    if (vehicle[field] && vehicle[field].toString().length > 10) {
      return true;
    }
  }
  
  // Method 4: Check Has Photos field
  if (vehicle['Has Photos'] && vehicle['Has Photos'].toLowerCase() === 'yes') {
    return true;
  }
  
  return false;
}

// Auto-save function
function autoSave() {
  try {
    const dataToSave = {
      vehicles: currentVehicleData,
      detailers: detailerNames,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('vehicleReconData', JSON.stringify(dataToSave));
    localStorage.setItem('lastSaved', new Date().toISOString());
    
    console.log('Data auto-saved successfully');
  } catch (error) {
    console.error('Auto-save failed:', error);
    UIUtils.showToast('Auto-save failed', 'warning');
  }
}

// Load saved data
function loadSavedData() {
  try {
    const saved = localStorage.getItem('vehicleReconData');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.vehicles && Array.isArray(data.vehicles)) {
        currentVehicleData = data.vehicles;
      }
      if (data.detailers && Array.isArray(data.detailers)) {
        detailerNames = data.detailers;
      }
      
      console.log('Loaded saved data:', currentVehicleData.length, 'vehicles');
      return true;
    }
  } catch (error) {
    console.error('Failed to load saved data:', error);
  }
  return false;
}

// Filter dashboard based on search term
function filterDashboard(searchTerm) {
  const vehicleList = document.getElementById('dashboard-vehicle-list');
  if (!vehicleList) return;
  
  let filtered = currentVehicleData;
  
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    filtered = currentVehicleData.filter(v => 
      v['Stock #']?.toLowerCase().includes(term) ||
      v.VIN?.toLowerCase().includes(term) ||
      v.Make?.toLowerCase().includes(term) ||
      v.Model?.toLowerCase().includes(term) ||
      v.Year?.toString().includes(term)
    );
  }
  
  // Re-render vehicle cards with filtered data
  const tempData = currentVehicleData;
  currentVehicleData = filtered;
  updateDashboardCounts();
  currentVehicleData = tempData;
}

// Filter inventory table
function filterInventory(searchTerm) {
  const tableBody = document.getElementById('inventory-table-body');
  if (!tableBody) return;
  
  let filtered = currentVehicleData;
  
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase();
    filtered = currentVehicleData.filter(v => 
      v['Stock #']?.toLowerCase().includes(term) ||
      v.VIN?.toLowerCase().includes(term) ||
      v.Make?.toLowerCase().includes(term) ||
      v.Model?.toLowerCase().includes(term) ||
      v.Year?.toString().includes(term) ||
      v['Status']?.toLowerCase().includes(term)
    );
  }
  
  // Re-render inventory with filtered data
  const tempData = currentVehicleData;
  currentVehicleData = filtered;
  renderInventory();
  currentVehicleData = tempData;
}

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');
  
  // Initialize manager classes
  try {
    console.log('Initializing manager classes...');
    window.photoManager = new PhotoManager();
    window.notificationManager = new NotificationManager();
    window.performanceMonitor = new PerformanceMonitor();
    console.log('Manager classes initialized successfully');
  } catch (error) {
    console.error('Error initializing manager classes:', error);
  }
  
  // Initialize enhanced features
  UIUtils.initDarkMode();
  UIUtils.showToast('Welcome to Vehicle Reconditioning Tracker!', 'info');
  
  // Show loading while initializing
  UIUtils.showLoading(true);
  
  // Enhanced search functionality with debouncing
  const dashboardSearch = document.getElementById('dashboard-search');
  if (dashboardSearch) {
    dashboardSearch.addEventListener('input', (e) => {
      DataManager.debounce('dashboard-search', () => {
        filterDashboard(e.target.value);
      });
    });
  }
  
  const inventorySearch = document.getElementById('inventory-search');
  if (inventorySearch) {
    inventorySearch.addEventListener('input', (e) => {
      DataManager.debounce('inventory-search', () => {
        filterInventory(e.target.value);
      });
    });
  }
  
  // Enhanced form validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => UIUtils.enhanceFormValidation(form));
  
  // Tab switching event listeners with enhanced animation
  document.querySelectorAll('.tab-button').forEach(tab => {
    tab.onclick = (e) => {
      e.preventDefault();
      const tabId = tab.getAttribute('data-tab');
      console.log('Switching to tab:', tabId);
      
      // Add loading animation
      const content = document.getElementById(tabId + '-content');
      if (content) {
        content.innerHTML = UIUtils.createSkeletonLoader();
        setTimeout(() => switchTab(tabId), 100);
      } else {
        switchTab(tabId);
      }
    };
  });
  
  // Admin button event listener
  const adminButton = document.getElementById('admin-button');
  if (adminButton) {
    adminButton.onclick = (e) => {
      e.preventDefault();
      console.log('Opening admin panel...');
      UIUtils.showToast('Opening admin panel...', 'info');
      window.open('/admin', '_blank');
    };
  }
  
  // Modal close logic
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-modal')) {
      closeAllModals();
    }
    if (e.target.classList.contains('modal') && e.target.style.display === 'block') {
      closeAllModals();
    }
  });
  
  // Auto-save interval
  setInterval(() => {
    autoSave();
  }, 30000); // Auto-save every 30 seconds
  
  // Initialize form handlers and enhanced features
  try {
    console.log('Initializing form handlers...');
    initializeFormHandlers();
    
    console.log('Initializing VIN scanner...');
    initializeVinScanner();
    
    console.log('Setting up notification system...');
    if (window.notificationManager) {
      // Set up notification bell click handler
      const notificationBell = document.getElementById('notification-bell');
      if (notificationBell) {
        notificationBell.addEventListener('click', () => {
          // Toggle notification panel (implement as needed)
          UIUtils.showToast('Notification system active', 'info');
        });
      }
    }
    
    console.log('Setting up performance monitoring...');
    if (window.performanceMonitor) {
      const perfButton = document.getElementById('performance-metrics');
      if (perfButton) {
        perfButton.addEventListener('click', () => {
          // Show performance metrics modal (implement as needed)
          UIUtils.showToast('Performance monitoring active', 'info');
        });
      }
    }
    
  } catch (error) {
    console.error('Error during enhanced initialization:', error);
    UIUtils.showToast('Some features may not work properly', 'warning');
  }
  
  // Load initial data with error handling
  try {
    console.log('Loading initial data...');
    await loadInitialData();
    console.log('Data loaded:', currentVehicleData.length, 'vehicles');
    UIUtils.showToast(`Loaded ${currentVehicleData.length} vehicles successfully`, 'success');
  } catch (error) {
    console.error('Failed to initialize:', error);
    UIUtils.showToast('Failed to load data, using sample data', 'warning');
  } finally {
    UIUtils.showLoading(false);
  }
  
  // Start with dashboard tab
  switchTab('dashboard');
  console.log('App initialized successfully');
});

function switchTab(tabId) {
  // Deactivate all tabs and content
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('bg-sky-500', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Activate selected tab and content
  const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(tabId + '-content');
  
  if (activeTab) {
    activeTab.classList.add('bg-sky-500', 'text-white');
    activeTab.classList.remove('bg-gray-200', 'text-gray-700');
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
    // Use the backend API to get current inventory info
    console.log('Loading inventory from backend...');
    const inventoryResponse = await fetch('/api/inventory/current');
    if (!inventoryResponse.ok) {
      throw new Error(`Failed to fetch inventory info: ${inventoryResponse.status}`);
    }
    
    const inventoryInfo = await inventoryResponse.json();
    console.log('Inventory info:', inventoryInfo);
    
    // Fetch the actual CSV file
    const csvResponse = await fetch(inventoryInfo.url);
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV file: ${csvResponse.status}`);
    }
    
    const csvText = await csvResponse.text();
    console.log('CSV loaded, length:', csvText.length);
    
    // Parse CSV data
    currentVehicleData = parseVehicleDataFromCSV(csvText);
    console.log('Parsed vehicles:', currentVehicleData.length);
    
    // Load detailers from backend
    await loadDetailersFromBackend();
    
    if (currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because no valid CSV data was found.');
    }
    
    autoSave();
    renderAllTabs();
  } catch (error) {
    console.error('Failed to load data from backend:', error);
    // Fallback to sample data
    currentVehicleData = getSampleData();
    detailerNames = ['John Smith', 'Mike Johnson', 'Sarah Davis'];
    showMessageModal('Notice', `Using sample data. Error: ${error.message}`);
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
    detailerNames = ['John Smith', 'Mike Johnson', 'Sarah Davis'];
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

function determineCurrentStatus(vehicle) {
  if (!vehicle) return 'New Arrival';
  
  const workflow = getWorkflowStatus(vehicle);
  if (!workflow) return 'New Arrival';
  
  // Check if sold
  if (workflow['Sold'] && workflow['Sold'].completed) {
    return 'Sold';
  }
  
  // Check if lot ready
  if (workflow['Lot Ready'] && workflow['Lot Ready'].completed) {
    return 'Lot Ready';
  }
  
  // Check title status - if all other steps are done but title not in house
  const mechanicalDone = workflow['Mechanical'] && workflow['Mechanical'].completed;
  const detailingDone = workflow['Detailing'] && workflow['Detailing'].completed;
  const photosDone = workflow['Photos'] && workflow['Photos'].completed;
  const titleInHouse = workflow['Title'] && workflow['Title'].inHouse;
  
  if (mechanicalDone && detailingDone && photosDone && !titleInHouse) {
    return 'Title';
  }
  
  // Check photos status
  if (mechanicalDone && detailingDone && !photosDone) {
    return 'Photos';
  }
  
  // Check detailing status
  if (mechanicalDone && !detailingDone) {
    return 'Detailing';
  }
  
  // Check mechanical status
  if (!mechanicalDone) {
    return 'Mechanical';
  }
  
  // Default fallback
  return 'New Arrival';
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
  console.log('Rendering dashboard with', currentVehicleData.length, 'vehicles');
  
  // Update the existing HTML elements instead of replacing everything
  updateDashboardCounts();
  
  console.log('Dashboard rendered successfully');
}

function updateDashboardCounts() {
  // Calculate counts for the existing KPI cards
  const activeVehicles = currentVehicleData.filter(v => v['Status'] !== 'Lot Ready' && v['Status'] !== 'Sold').length;
  const mechanicalCount = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow && workflow['Mechanical'].completed === false && workflow['Detailing'].completed === false;
  }).length;
  const detailingCount = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow && workflow['Mechanical'].completed === true && workflow['Detailing'].completed === false;
  }).length;
  const lotReadyCount = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Update the count elements
  const totalActiveEl = document.getElementById('total-active-count');
  const mechanicalEl = document.getElementById('mechanical-count');
  const detailingEl = document.getElementById('detailing-count');
  const lotReadyEl = document.getElementById('lot-ready-count');
  
  if (totalActiveEl) totalActiveEl.textContent = activeVehicles;
  if (mechanicalEl) mechanicalEl.textContent = mechanicalCount;
  if (detailingEl) detailingEl.textContent = detailingCount;
  if (lotReadyEl) lotReadyEl.textContent = lotReadyCount;
}
  
function updateDashboardCounts() {
  // Calculate counts for the existing KPI cards
  const activeVehicles = currentVehicleData.filter(v => v['Status'] !== 'Lot Ready' && v['Status'] !== 'Sold').length;
  const mechanicalCount = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow && workflow['Mechanical'].completed === false && workflow['Detailing'].completed === false;
  }).length;
  const detailingCount = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    return workflow && workflow['Mechanical'].completed === true && workflow['Detailing'].completed === false;
  }).length;
  const lotReadyCount = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Update the count elements
  const totalActiveEl = document.getElementById('total-active-count');
  const mechanicalEl = document.getElementById('mechanical-count');
  const detailingEl = document.getElementById('detailing-count');
  const lotReadyEl = document.getElementById('lot-ready-count');
  
  if (totalActiveEl) totalActiveEl.textContent = activeVehicles;
  if (mechanicalEl) mechanicalEl.textContent = mechanicalCount;
  if (detailingEl) detailingEl.textContent = detailingCount;
  if (lotReadyEl) lotReadyEl.textContent = lotReadyCount;
}

function refreshDashboard() {
  console.log('Refreshing dashboard...');
  renderDashboard();
  UIUtils.showToast('Dashboard refreshed', 'success');
}

function exportDashboardData() {
  console.log('Exporting dashboard data...');
  window.exportToCSV();
}
// --- Enhanced Dashboard Support Functions ---
function generateRecentActivity() {
  const recentVehicles = currentVehicleData
    .filter(v => v.workflow)
    .map(v => {
      const lastUpdate = Object.entries(v.workflow)
        .filter(([, data]) => data.completed && data.date)
        .sort(([,a], [,b]) => new Date(b.date) - new Date(a.date))[0];
      
      return {
        vehicle: v,
        lastStep: lastUpdate?.[0],
        lastDate: lastUpdate?.[1]?.date
      };
    })
    .filter(item => item.lastDate)
    .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
    .slice(0, 5);
  
  if (recentVehicles.length === 0) {
    return '<p class="text-gray-500 text-sm">No recent activity</p>';
  }
  
  return recentVehicles.map(item => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <div class="flex items-center space-x-3">
        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
        <div>
          <p class="font-medium text-sm">${item.vehicle.Year} ${item.vehicle.Make} ${item.vehicle.Model}</p>
          <p class="text-xs text-gray-500">Completed ${item.lastStep}</p>
        </div>
      </div>
      <span class="text-xs text-gray-400">${formatDate(item.lastDate)}</span>
    </div>
  `).join('');
}

function generateVehicleCards() {
  if (currentVehicleData.length === 0) {
    return '<p class="col-span-full text-center text-gray-500 py-8">No vehicles found</p>';
  }
  
  return currentVehicleData.slice(0, 12).map(v => {
    const workflow = getWorkflowStatus(v);
    const progress = calculateVehicleProgress(workflow);
    const statusColor = getStatusColor(v.Status);
    
    return `
      <div class="card-hover bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300" 
           onclick="window.showVehicleDetailModal('${v['Stock #']}')">
        <div class="p-6">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h4 class="font-bold text-lg text-gray-900 dark:text-white">${v.Year} ${v.Make}</h4>
              <p class="text-gray-600 dark:text-gray-300">${v.Model}</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
              ${v.Status}
            </span>
          </div>
          
          <div class="space-y-2 mb-4">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Stock #:</span>
              <span class="font-medium">${v['Stock #']}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">VIN:</span>
              <span class="font-mono text-xs">${v.VIN ? v.VIN.slice(-8) : 'N/A'}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Days in process:</span>
              <span class="font-medium">${calculateDaysInProcess(v)}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Progress:</span>
              <span class="font-medium">${Math.round(progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500" 
                   style="width: ${progress}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initializeStatusChart(statusCounts) {
  const canvas = document.getElementById('status-chart');
  if (!canvas || !window.Chart) return;
  
  const ctx = canvas.getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
          '#8B5CF6', '#06B6D4', '#6B7280'
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        }
      }
    }
  });
}

function setupDashboardFilters() {
  const searchInput = document.getElementById('dashboard-search');
  const filterSelect = document.getElementById('dashboard-filter');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      DataManager.debounce('dashboard-filter', () => {
        filterDashboardVehicles(e.target.value, filterSelect?.value || '');
      });
    });
  }
  
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      filterDashboardVehicles(searchInput?.value || '', e.target.value);
    });
  }
}

function filterDashboardVehicles(searchTerm, statusFilter) {
  let filtered = currentVehicleData;
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(v => 
      v['Stock #']?.toLowerCase().includes(term) ||
      v.VIN?.toLowerCase().includes(term) ||
      v.Make?.toLowerCase().includes(term) ||
      v.Model?.toLowerCase().includes(term) ||
      v.Year?.toString().includes(term)
    );
  }
  
  if (statusFilter) {
    filtered = filtered.filter(v => v.Status === statusFilter);
  }
  
  const listContainer = document.getElementById('dashboard-vehicle-list');
  if (listContainer) {
    if (filtered.length === 0) {
      listContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No vehicles match your criteria</p>';
    } else {
      listContainer.innerHTML = filtered.slice(0, 12).map(v => {
        const workflow = getWorkflowStatus(v);
        const progress = calculateVehicleProgress(workflow);
        const statusColor = getStatusColor(v.Status);
        
        return `
          <div class="card-hover bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-300" 
               onclick="window.showVehicleDetailModal('${v['Stock #']}')">
            <div class="p-6">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h4 class="font-bold text-lg text-gray-900 dark:text-white">${v.Year} ${v.Make}</h4>
                  <p class="text-gray-600 dark:text-gray-300">${v.Model}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
                  ${v.Status}
                </span>
              </div>
              
              <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Stock #:</span>
                  <span class="font-medium">${v['Stock #']}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">VIN:</span>
                  <span class="font-mono text-xs">${v.VIN ? v.VIN.slice(-8) : 'N/A'}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Days in process:</span>
                  <span class="font-medium">${calculateDaysInProcess(v)}</span>
                </div>
              </div>
              
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-500">Progress:</span>
                  <span class="font-medium">${Math.round(progress)}%</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500" 
                       style="width: ${progress}%"></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function renderWorkflow() {
  const el = $('workflow-content');
  if (!el) return;
  
  let html = '<h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Workflow Board</h2>';
  html += '<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">';
  
  RECON_STATUSES.forEach(status => {
    const vehicles = currentVehicleData.filter(v => v['Status'] === status);
    const statusColor = getStatusColorClass(status);
    
    html += `
      <div class="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md">
        <div class="p-4 ${statusColor} rounded-t-lg">
          <h3 class="font-bold text-center text-white flex items-center justify-between">
            <span>${status}</span>
            <span class="bg-white bg-opacity-20 rounded-full px-2 py-1 text-xs">
              ${vehicles.length}
            </span>
          </h3>
        </div>
        <div class="p-4 space-y-3 min-h-[300px]">
    `;
    
    if (vehicles.length === 0) {
      html += '<p class="text-gray-400 text-center text-sm py-8">No vehicles</p>';
    } else {
      vehicles.forEach(v => {
        const daysInProcess = calculateDaysInProcess(v);
        html += `
          <div class="card-hover bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm cursor-pointer border-l-4 border-blue-500" 
               onclick="window.showVehicleDetailModal('${v['Stock #']}')">
            <div class="font-medium text-sm">${v['Year']} ${v['Make']}</div>
            <div class="text-xs text-gray-600 dark:text-gray-300">${v['Model']}</div>
            <div class="text-xs text-gray-500 mt-1">Stock: ${v['Stock #']}</div>
            <div class="text-xs text-gray-500">${daysInProcess} days</div>
          </div>
        `;
      });
    }
    
    html += '</div></div>';
  });
  
  html += '</div>';
  el.innerHTML = html;
}

function renderInventory() {
  const el = $('inventory-content');
  if (!el) return;
  
  let html = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Inventory</h2>
      <div class="flex gap-3">
        <button onclick="window.showAddVehicleModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          <i class="fas fa-plus mr-2"></i>Add Vehicle
        </button>
        <button onclick="window.exportToCSV()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
          <i class="fas fa-download mr-2"></i>Export CSV
        </button>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vehicle</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mechanical</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detailing</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Photos</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detailer</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date In</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
  `;
  
  currentVehicleData.forEach(v => {
    const workflow = getWorkflowStatus(v);
    const statusColor = getStatusColor(v['Status']);
    const photosComplete = hasPhotosInCSV(v) || workflow['Photos'].completed;
    
    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
        <td class="px-4 py-3">
          <div class="font-medium text-gray-900 dark:text-white">${v['Year']} ${v['Make']}</div>
          <div class="text-sm text-gray-500">${v['Model']} - Stock #${v['Stock #']}</div>
        </td>
        <td class="px-4 py-3">
          <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColor}">${v['Status']}</span>
        </td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <input type="checkbox" ${workflow['Mechanical'].completed ? 'checked' : ''} 
                 onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Mechanical')"
                 class="form-checkbox h-4 w-4 text-blue-600">
        </td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <input type="checkbox" ${workflow['Detailing'].completed ? 'checked' : ''} 
                 onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Detailing')"
                 class="form-checkbox h-4 w-4 text-blue-600">
        </td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <input type="checkbox" ${photosComplete ? 'checked' : ''} 
                 onchange="window.toggleWorkflowStep('${v['Stock #']}', 'Photos')"
                 class="form-checkbox h-4 w-4 text-blue-600">
        </td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <input type="checkbox" ${workflow['Title'].inHouse ? 'checked' : ''} 
                 onchange="window.toggleTitleInHouse('${v['Stock #']}')"
                 class="form-checkbox h-4 w-4 text-blue-600">
        </td>
        <td class="px-4 py-3">
          <span class="text-sm">${v['Detailer'] || 'Unassigned'}</span>
        </td>
        <td class="px-4 py-3">
          <span class="text-sm">${formatDate(v['Date In'])}</span>
        </td>
        <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
          <button onclick="window.showVehicleDetailModal('${v['Stock #']}')" 
                  class="text-blue-600 hover:text-blue-900 text-sm">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="window.deleteVehicle('${v['Stock #']}')" 
                  class="text-red-600 hover:text-red-900 text-sm ml-2">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  el.innerHTML = html;
}

function renderReports() {
  const el = $('reports-content');
  if (!el) return;
  
  // Calculate enhanced metrics
  const totalVehicles = currentVehicleData.length;
  const activeVehicles = currentVehicleData.filter(v => v['Status'] !== 'Sold').length;
  const soldVehicles = currentVehicleData.filter(v => v['Status'] === 'Sold').length;
  const lotReadyVehicles = currentVehicleData.filter(v => v['Status'] === 'Lot Ready').length;
  
  // Calculate vehicles needing photos (Enhanced logic)
  const vehiclesNeedingPhotos = currentVehicleData.filter(v => {
    const workflow = getWorkflowStatus(v);
    const hasPhotos = hasPhotosInCSV(v) || workflow['Photos'].completed;
    const detailingComplete = workflow['Detailing'].completed;
    
    return (
      !hasPhotos && 
      detailingComplete && 
      v['Status'] !== 'Sold' && 
      v['Status'] !== 'Lot Ready'
    );
  });
  
  // Vehicles with photos (from CSV or local)
  const vehiclesWithPhotos = currentVehicleData.filter(v => hasPhotosInCSV(v));
  
  // Calculate average completion time
  const completedVehicles = currentVehicleData.filter(v => 
    v['Status'] === 'Lot Ready' || v['Status'] === 'Sold'
  );
  
  let avgCompletionTime = 'N/A';
  if (completedVehicles.length > 0) {
    const totalDays = completedVehicles.reduce((sum, v) => {
      const workflow = getWorkflowStatus(v);
      const startDate = new Date(v['Date In']);
      const endDate = new Date(workflow['Lot Ready']?.date || new Date());
      return sum + Math.max(1, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
    }, 0);
    avgCompletionTime = Math.round(totalDays / completedVehicles.length) + ' days';
  }
  
  let html = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
      <div class="flex gap-2">
        <button onclick="refreshReports()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>Refresh
        </button>
        <button onclick="exportReportsData()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
          <i class="fas fa-download mr-2"></i>Export
        </button>
      </div>
    </div>
    
    <!-- Enhanced KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-100 text-sm">Total Vehicles</p>
            <p class="text-3xl font-bold">${totalVehicles}</p>
          </div>
          <i class="fas fa-car text-4xl opacity-20"></i>
        </div>
        <div class="mt-4 text-sm text-blue-100">
          <span class="font-medium">${activeVehicles}</span> active in process
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-green-100 text-sm">Completed</p>
            <p class="text-3xl font-bold">${lotReadyVehicles + soldVehicles}</p>
          </div>
          <i class="fas fa-check-circle text-4xl opacity-20"></i>
        </div>
        <div class="mt-4 text-sm text-green-100">
          ${soldVehicles} sold, ${lotReadyVehicles} lot ready
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-purple-100 text-sm">Avg Completion</p>
            <p class="text-2xl font-bold">${avgCompletionTime}</p>
          </div>
          <i class="fas fa-clock text-4xl opacity-20"></i>
        </div>
        <div class="mt-4 text-sm text-purple-100">
          Time to lot ready
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-orange-100 text-sm">Need Photos</p>
            <p class="text-3xl font-bold">${vehiclesNeedingPhotos.length}</p>
          </div>
          <i class="fas fa-camera text-4xl opacity-20"></i>
        </div>
        <div class="mt-4 text-sm text-orange-100">
          Ready for photos
        </div>
      </div>
    </div>
    
    <!-- Vehicles Needing Photos Report -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
      <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
        <i class="fas fa-camera mr-3 text-orange-500"></i>
        Vehicles Needing Photos (${vehiclesNeedingPhotos.length})
      </h3>
      
      <div class="overflow-x-auto">
        ${vehiclesNeedingPhotos.length === 0 ? 
          '<p class="text-gray-500 text-center py-8">All detailed vehicles have photos completed! 🎉</p>' : 
          `<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Stock #</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vehicle</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Since Detail</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Detailer</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              ${vehiclesNeedingPhotos.map(v => {
                const workflow = getWorkflowStatus(v);
                const detailDate = workflow['Detailing'].date;
                const daysSinceDetail = detailDate ? 
                  Math.floor((new Date() - new Date(detailDate)) / (1000 * 60 * 60 * 24)) : 'N/A';
                
                return `
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="window.showVehicleDetailModal('${v['Stock #']}')">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${v['Stock #']}</td>
                    <td class="px-4 py-3">
                      <div class="font-medium">${v['Year']} ${v['Make']} ${v['Model']}</div>
                      <div class="text-sm text-gray-500">${v['VIN']?.slice(-8) || 'N/A'}</div>
                    </td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(v['Status'])}">${v['Status']}</span>
                    </td>
                    <td class="px-4 py-3 text-sm">${daysSinceDetail} days</td>
                    <td class="px-4 py-3 text-sm">${v['Detailer'] || 'Unassigned'}</td>
                    <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
                      <button onclick="markPhotosComplete('${v['Stock #']}')" 
                              class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors">
                        Mark Complete
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>`
        }
      </div>
    </div>
    
    <!-- Photo Status Overview -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Photo Status Distribution</h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span class="font-medium text-green-800 dark:text-green-200">Photos Complete</span>
            <span class="text-2xl font-bold text-green-600">${vehiclesWithPhotos.length}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <span class="font-medium text-orange-800 dark:text-orange-200">Needs Photos</span>
            <span class="text-2xl font-bold text-orange-600">${vehiclesNeedingPhotos.length}</span>
          </div>
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="font-medium text-gray-800 dark:text-gray-200">Not Ready for Photos</span>
            <span class="text-2xl font-bold text-gray-600">${activeVehicles - vehiclesWithPhotos.length - vehiclesNeedingPhotos.length}</span>
          </div>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Status Breakdown</h3>
        <div class="space-y-3">
          ${RECON_STATUSES.map(status => {
            const count = currentVehicleData.filter(v => v['Status'] === status).length;
            const percentage = totalVehicles > 0 ? ((count / totalVehicles) * 100).toFixed(1) : '0';
            const statusColor = getStatusColorClass(status);
            
            return `
              <div class="flex justify-between items-center p-3 rounded-lg ${statusColor.replace('bg-', 'bg-').replace('-500', '-50')} dark:bg-opacity-20">
                <span class="font-medium">${status}</span>
                <div class="text-right">
                  <span class="text-xl font-bold">${count}</span>
                  <span class="text-sm text-gray-600 dark:text-gray-400 ml-2">(${percentage}%)</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  
  el.innerHTML = html;
}

function renderUpload() {
  const el = $('upload-content');
  if (!el) return;
  
  let html = `
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Data Import & Export</h2>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CSV Import -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
            <i class="fas fa-upload mr-3 text-blue-500"></i>
            Import Vehicle Data
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            Upload a CSV file to import vehicle data. Supports standard inventory formats.
          </p>
          
          <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
            <p class="text-gray-600 dark:text-gray-300 mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input type="file" 
                   id="csv-upload" 
                   accept=".csv" 
                   class="hidden" 
                   onchange="handleCsvUpload(event)">
            <button onclick="document.getElementById('csv-upload').click()" 
                    class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
              Choose File
            </button>
          </div>
          
          <div id="upload-status" class="mt-4 hidden">
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div class="flex items-center">
                <i class="fas fa-spinner fa-spin text-blue-500 mr-3"></i>
                <span class="text-blue-800 dark:text-blue-200">Processing CSV file...</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Data Export -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
            <i class="fas fa-download mr-3 text-green-500"></i>
            Export Vehicle Data
          </h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">
            Export current vehicle data to CSV format for backup or external use.
          </p>
          
          <div class="space-y-3">
            <button onclick="window.exportToCSV()" 
                    class="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center">
              <i class="fas fa-file-csv mr-2"></i>
              Export All Vehicles to CSV
            </button>
            
            <button onclick="exportPhotosReport()" 
                    class="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center">
              <i class="fas fa-camera mr-2"></i>
              Export Photos Report
            </button>
            
            <button onclick="exportWorkflowReport()" 
                    class="w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center">
              <i class="fas fa-tasks mr-2"></i>
              Export Workflow Report
            </button>
          </div>
        </div>
      </div>
      
      <!-- Data Management -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mt-6">
        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
          <i class="fas fa-database mr-3 text-red-500"></i>
          Data Management
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <i class="fas fa-sync-alt text-2xl text-blue-500 mb-2"></i>
            <h4 class="font-bold mb-2">Auto-Save</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Data automatically saved every 30 seconds
            </p>
            <span class="text-xs text-green-600">✓ Active</span>
          </div>
          
          <div class="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <i class="fas fa-shield-alt text-2xl text-green-500 mb-2"></i>
            <h4 class="font-bold mb-2">Data Backup</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Local storage backup maintained
            </p>
            <button onclick="createBackup()" class="text-xs text-blue-600 hover:underline">
              Create Backup
            </button>
          </div>
          
          <div class="text-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <i class="fas fa-trash-alt text-2xl text-red-500 mb-2"></i>
            <h4 class="font-bold mb-2">Clear Data</h4>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Remove all vehicle data
            </p>
            <button onclick="confirmClearData()" class="text-xs text-red-600 hover:underline">
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  el.innerHTML = html;
}

function renderDetailers() {
  const el = $('detailers-content');
  if (!el) return;
  
  // Group vehicles by detailer
  const detailerGroups = {};
  detailerNames.forEach(name => {
    detailerGroups[name] = currentVehicleData.filter(v => v['Detailer'] === name);
  });
  
  // Add unassigned vehicles
  const unassigned = currentVehicleData.filter(v => !v['Detailer'] || v['Detailer'] === '');
  if (unassigned.length > 0) {
    detailerGroups['Unassigned'] = unassigned;
  }
  
  let html = `
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Detailers Management</h2>
      <div class="flex gap-3">
        <button onclick="window.showAddDetailerModal()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          <i class="fas fa-plus mr-2"></i>Add Detailer
        </button>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  `;
  
  Object.entries(detailerGroups).forEach(([detailerName, vehicles]) => {
    const activeVehicles = vehicles.filter(v => v['Status'] !== 'Sold');
    const completedVehicles = vehicles.filter(v => {
      const workflow = getWorkflowStatus(v);
      return workflow['Detailing'].completed;
    });
    
    const completionRate = activeVehicles.length > 0 ? 
      Math.round((completedVehicles.length / activeVehicles.length) * 100) : 0;
    
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-white">${detailerName}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              ${activeVehicles.length} active vehicle${activeVehicles.length !== 1 ? 's' : ''}
            </p>
          </div>
          ${detailerName !== 'Unassigned' ? `
            <div class="flex gap-2">
              <button onclick="window.assignVehicles('${detailerName}')" 
                      class="text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-plus"></i>
              </button>
              <button onclick="window.editDetailer('${detailerName}')" 
                      class="text-gray-600 hover:text-gray-800 text-sm">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          ` : ''}
        </div>
        
        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span>Completion Rate</span>
            <span>${completionRate}%</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                 style="width: ${completionRate}%"></div>
          </div>
        </div>
        
        <!-- Vehicle List -->
        <div class="space-y-2 max-h-60 overflow-y-auto">
          ${activeVehicles.length === 0 ? 
            '<p class="text-gray-500 text-sm text-center py-4">No vehicles assigned</p>' :
            activeVehicles.map(v => {
              const workflow = getWorkflowStatus(v);
              const isDetailComplete = workflow['Detailing'].completed;
              
              return `
                <div class="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                     onclick="window.showVehicleDetailModal('${v['Stock #']}')">
                  <div>
                    <div class="font-medium text-sm">${v['Year']} ${v['Make']} ${v['Model']}</div>
                    <div class="text-xs text-gray-500">Stock #${v['Stock #']} • ${v['Status']}</div>
                  </div>
                  <div class="flex items-center">
                    ${isDetailComplete ? 
                      '<i class="fas fa-check-circle text-green-500"></i>' : 
                      '<i class="fas fa-clock text-orange-500"></i>'
                    }
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
        
        <!-- Summary Stats -->
        <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div class="grid grid-cols-2 gap-4 text-center">
            <div>
              <div class="text-lg font-bold text-green-600">${completedVehicles.length}</div>
              <div class="text-xs text-gray-500">Completed</div>
            </div>
            <div>
              <div class="text-lg font-bold text-orange-600">${activeVehicles.length - completedVehicles.length}</div>
              <div class="text-xs text-gray-500">In Progress</div>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  el.innerHTML = html;
}

// --- VIN Scanner Functions ---

// Check if device is mobile
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (window.innerWidth <= 768);
}

// Start VIN scanner
function startVinScanner() {
  const modal = document.getElementById('vinScannerModal');
  if (!modal) return;
  
  modal.classList.remove('hidden');
  
  // Check for camera availability
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      } 
    })
    .then(stream => {
      const video = document.getElementById('vinScannerVideo');
      const cameraView = document.getElementById('cameraView');
      const noCameraMessage = document.getElementById('noCameraMessage');
      
      if (video && cameraView && noCameraMessage) {
        video.srcObject = stream;
        cameraView.classList.remove('hidden');
        noCameraMessage.classList.add('hidden');
        
        // Store stream reference for cleanup
        window.currentVideoStream = stream;
      }
    })
    .catch(error => {
      console.log('Camera access denied or not available:', error);
      showNoCameraMessage();
    });
  } else {
    showNoCameraMessage();
  }
}

// Show no camera message
function showNoCameraMessage() {
  const cameraView = document.getElementById('cameraView');
  const noCameraMessage = document.getElementById('noCameraMessage');
  
  if (cameraView && noCameraMessage) {
    cameraView.classList.add('hidden');
    noCameraMessage.classList.remove('hidden');
  }
}

// Capture VIN from camera (simplified implementation)
function captureVin() {
  // Simplified VIN detection - in a real implementation you'd use OCR
  // For demo purposes, we'll simulate VIN detection
  
  // Generate a mock VIN for demonstration
  const mockVin = generateMockVin();
  
  const detectedVinSection = document.getElementById('detectedVinSection');
  const detectedVin = document.getElementById('detectedVin');
  
  if (detectedVinSection && detectedVin) {
    detectedVin.textContent = mockVin;
    detectedVinSection.classList.remove('hidden');
  }
  
  UIUtils.showToast('VIN detected! Verify the result below.', 'success');
}

// Generate mock VIN for demonstration
function generateMockVin() {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ1234567890';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

// Use detected VIN
function useDetectedVin() {
  const detectedVin = document.getElementById('detectedVin');
  if (detectedVin) {
    const vin = detectedVin.textContent;
    insertVinIntoForm(vin);
    closeVinScanner();
    UIUtils.showToast('VIN inserted into form', 'success');
  }
}

// Use manual VIN
function useManualVin() {
  const manualInput = document.getElementById('manualVinInput');
  if (manualInput && manualInput.value.trim()) {
    const vin = manualInput.value.trim().toUpperCase();
    if (vin.length === 17) {
      insertVinIntoForm(vin);
      closeVinScanner();
      UIUtils.showToast('VIN inserted into form', 'success');
    } else {
      UIUtils.showToast('VIN must be exactly 17 characters', 'error');
    }
  }
}

// Insert VIN into active form
function insertVinIntoForm(vin) {
  // Look for VIN input fields in the current modal or form
  const vinInputs = document.querySelectorAll('input[placeholder*="VIN"], input[name="vin"], input[id*="vin"]');
  
  if (vinInputs.length > 0) {
    // Find the visible input field
    for (const input of vinInputs) {
      const modal = input.closest('.modal');
      if (modal && !modal.classList.contains('hidden') && modal.style.display !== 'none') {
        input.value = vin;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }
  }
}

// Retry VIN scan
function retryVinScan() {
  const detectedVinSection = document.getElementById('detectedVinSection');
  const cameraView = document.getElementById('cameraView');
  
  if (detectedVinSection && cameraView) {
    detectedVinSection.classList.add('hidden');
    cameraView.classList.remove('hidden');
  }
}

// Close VIN scanner
function closeVinScanner() {
  const modal = document.getElementById('vinScannerModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  
  // Clean up video stream
  if (window.currentVideoStream) {
    window.currentVideoStream.getTracks().forEach(track => track.stop());
    window.currentVideoStream = null;
  }
  
  // Reset scanner UI
  const detectedVinSection = document.getElementById('detectedVinSection');
  const cameraView = document.getElementById('cameraView');
  const manualInput = document.getElementById('manualVinInput');
  
  if (detectedVinSection) detectedVinSection.classList.add('hidden');
  if (cameraView) cameraView.classList.add('hidden');
  if (manualInput) manualInput.value = '';
}

// Photo navigation functions for full-screen viewer
function navigatePhoto(direction) {
  if (window.photoManager && typeof window.photoManager.navigatePhoto === 'function') {
    window.photoManager.navigatePhoto(direction);
  }
}

// Download all photos function
function downloadAllPhotos() {
  if (window.photoManager && typeof window.photoManager.downloadAllPhotos === 'function') {
    window.photoManager.downloadAllPhotos();
  }
}

// --- Global Window Functions ---
// These functions are attached to the window object for HTML onclick handlers

window.showMessageModal = function(title, message) {
  const modal = document.getElementById('message-modal');
  const titleElement = document.getElementById('message-modal-title');
  const textElement = document.getElementById('message-modal-text');
  
  if (modal && titleElement && textElement) {
    titleElement.textContent = title;
    textElement.textContent = message;
    modal.style.display = 'block';
  } else {
    // Fallback to alert if modal elements aren't found
    alert(`${title}: ${message}`);
  }
};

window.hideMessageModal = function() {
  const modal = document.getElementById('message-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
};

window.closeAllModals = function() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.style.display = 'none';
  });
};

window.showVehicleDetailModal = function(stockNum) {
  const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNum);
  if (!vehicle) {
    showMessageModal('Error', 'Vehicle not found');
    return;
  }
  
  const modal = document.getElementById('vehicle-detail-modal');
  const content = document.getElementById('vehicle-detail-content');
  
  if (modal && content) {
    content.innerHTML = `
      <h3 class="text-xl font-semibold mb-4">${vehicle.Year} ${vehicle.Make} ${vehicle.Model}</h3>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><strong>Stock #:</strong> ${vehicle['Stock #']}</div>
        <div><strong>VIN:</strong> ${vehicle.VIN || 'N/A'}</div>
        <div><strong>Color:</strong> ${vehicle.Color || 'N/A'}</div>
        <div><strong>Status:</strong> ${vehicle.Status || 'N/A'}</div>
      </div>
      <div class="mb-4">
        <strong>Notes:</strong> ${vehicle.Notes || 'No notes available'}
      </div>
    `;
    modal.style.display = 'block';
  }
};

window.showAddVehicleModal = function() {
  const modal = document.getElementById('add-vehicle-modal');
  if (modal) {
    modal.style.display = 'block';
  }
};

window.deleteVehicle = function(stockNum) {
  if (confirm('Are you sure you want to delete this vehicle?')) {
    const index = currentVehicleData.findIndex(v => v['Stock #'] === stockNum);
    if (index !== -1) {
      currentVehicleData.splice(index, 1);
      autoSave();
      renderAllTabs();
      showMessageModal('Success', 'Vehicle deleted successfully');
    }
  }
};

window.exportToCSV = function() {
  if (typeof Papa !== 'undefined' && currentVehicleData.length > 0) {
    const csv = Papa.unparse(currentVehicleData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vehicle-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMessageModal('Success', 'Inventory exported successfully!');
  } else {
    showMessageModal('Error', 'No data to export or CSV library not loaded');
  }
};

window.downloadAllPhotos = function(vehicleId) {
  if (window.photoManager) {
    window.photoManager.downloadAllPhotos(vehicleId);
  } else {
    showMessageModal('Error', 'Photo manager not available');
  }
};

window.navigatePhoto = function(direction) {
  // Photo navigation functionality - placeholder
  console.log('Navigate photo:', direction);
};

// VIN Scanner functions
window.startVinScanner = function() {
  const modal = document.getElementById('vinScannerModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'block';
  }
};

window.closeVinScanner = function() {
  const modal = document.getElementById('vinScannerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
};

window.captureVin = function() {
  // Simulate VIN detection for demo
  const detectedVin = '1FMCU9G67LUC03251'; // Sample VIN
  document.getElementById('detectedVin').textContent = detectedVin;
  document.getElementById('detectedVinSection').classList.remove('hidden');
};

window.useDetectedVin = function() {
  const vin = document.getElementById('detectedVin').textContent;
  const vinInput = document.getElementById('add-vin');
  if (vinInput) {
    vinInput.value = vin;
  }
  closeVinScanner();
  showMessageModal('Success', 'VIN added to form');
};

window.retryVinScan = function() {
  document.getElementById('detectedVinSection').classList.add('hidden');
};

window.useManualVin = function() {
  const manualVin = document.getElementById('manualVinInput').value.trim();
  if (manualVin.length === 17) {
    const vinInput = document.getElementById('add-vin');
    if (vinInput) {
      vinInput.value = manualVin;
    }
    closeVinScanner();
    showMessageModal('Success', 'VIN added to form');
  } else {
    showMessageModal('Error', 'Please enter a valid 17-character VIN');
  }
};

console.log('Window functions initialized successfully');
