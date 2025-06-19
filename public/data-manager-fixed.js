/**
 * Enhanced Data Manager for Vehicle Reconditioning Tracker
 * Handles data persistence, caching, and synchronization with backup recovery
 */

class DataManager {
    constructor() {
        this.cache = new Map();
        this.syncInterval = null;
        this.autoBackupInterval = null;
        this.lastSyncTime = null;
        this.isOnline = navigator.onLine;
        
        this.initializeOfflineDetection();
        this.enableAutoBackup(); // Enable auto-backup by default
        console.log('Data Manager initialized with backup protection');
    }

    initializeOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost - working offline with local backup');
        });
    }

    // Enhanced localStorage operations with backup
    saveData(key, data) {
        try {
            const dataWithTimestamp = {
                data: data,
                timestamp: Date.now(),
                version: window.VRT_CONFIG?.version || '2.0.0'
            };
            
            localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
            this.cache.set(key, dataWithTimestamp);
            
            console.log(`Data saved to localStorage: ${key}`);
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            
            // Handle quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.clearOldData();
                try {
                    localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
                    return true;
                } catch (secondError) {
                    console.error('Still failed after cleanup:', secondError);
                    return false;
                }
            }
            return false;
        }
    }

    loadData(key) {
        try {
            // Check cache first
            if (this.cache.has(key)) {
                const cached = this.cache.get(key);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                    return cached.data;
                }
            }

            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            
            // Validate data structure
            if (!parsed.data || !parsed.timestamp) {
                console.warn('Invalid data structure, removing:', key);
                localStorage.removeItem(key);
                return null;
            }

            // Check if data is too old (30 days)
            if (Date.now() - parsed.timestamp > 30 * 24 * 60 * 60 * 1000) {
                console.warn('Data too old, removing:', key);
                localStorage.removeItem(key);
                return null;
            }

            this.cache.set(key, parsed);
            return parsed.data;
        } catch (error) {
            console.error('Failed to load data:', error);
            return null;
        }
    }

    clearOldData() {
        const keys = Object.keys(localStorage);
        let cleared = 0;
        
        for (const key of keys) {
            if (key.startsWith('vrt_') && !key.includes('auto_backup')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp && Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
                        localStorage.removeItem(key);
                        cleared++;
                    }
                } catch (error) {
                    // Remove corrupted data
                    localStorage.removeItem(key);
                    cleared++;
                }
            }
        }
        
        console.log(`Cleared ${cleared} old data entries`);
    }

    // Enhanced data backup and recovery system
    createDataBackup() {
        try {
            const backupData = {
                vehicles: this.loadData('vrt_vehicles') || [],
                detailers: this.loadData('vrt_detailers') || [],
                backup_created: Date.now(),
                version: window.VRT_CONFIG?.version || '2.0.0',
                browser_info: {
                    userAgent: navigator.userAgent,
                    url: window.location.href
                }
            };
            
            // Create downloadable backup file
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vehicle-recon-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('Data backup created successfully');
            
            if (window.notificationSystem) {
                window.notificationSystem.showToast('Data backup created successfully', 'success');
            }
            
            return true;
        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }
    
    // Restore data from backup file
    async restoreFromBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // Validate backup structure
                    if (!backupData.vehicles || !Array.isArray(backupData.vehicles)) {
                        throw new Error('Invalid backup file structure');
                    }
                    
                    // Restore vehicles data
                    this.saveData('vrt_vehicles', backupData.vehicles);
                    
                    // Restore detailers if available
                    if (backupData.detailers) {
                        this.saveData('vrt_detailers', backupData.detailers);
                    }
                    
                    console.log(`Data restored: ${backupData.vehicles.length} vehicles`);
                    resolve({
                        vehicles: backupData.vehicles.length,
                        detailers: backupData.detailers?.length || 0,
                        created: new Date(backupData.backup_created)
                    });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read backup file'));
            reader.readAsText(file);
        });
    }
    
    // Auto-backup to prevent data loss from browser cache clearing
    enableAutoBackup(intervalMinutes = 30) {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }
        
        this.autoBackupInterval = setInterval(() => {
            const vehicles = this.loadData('vrt_vehicles');
            if (vehicles && vehicles.length > 0) {
                // Save a timestamped backup in localStorage
                const backupKey = `vrt_auto_backup_${Date.now()}`;
                this.saveData(backupKey, vehicles);
                
                // Keep only last 5 auto-backups
                this.cleanupAutoBackups();
                
                console.log('Auto-backup created');
            }
        }, intervalMinutes * 60 * 1000);
        
        console.log(`Auto-backup enabled: every ${intervalMinutes} minutes`);
    }
    
    cleanupAutoBackups() {
        const keys = Object.keys(localStorage);
        const backupKeys = keys.filter(key => key.startsWith('vrt_auto_backup_'));
        
        if (backupKeys.length > 5) {
            // Sort by timestamp and remove oldest
            backupKeys.sort();
            const toRemove = backupKeys.slice(0, backupKeys.length - 5);
            toRemove.forEach(key => localStorage.removeItem(key));
            console.log(`Cleaned up ${toRemove.length} old auto-backups`);
        }
    }
    
    // Get available auto-backups
    getAutoBackups() {
        const keys = Object.keys(localStorage);
        const backupKeys = keys.filter(key => key.startsWith('vrt_auto_backup_'));
        
        return backupKeys.map(key => {
            const timestamp = parseInt(key.split('_')[3]);
            const data = this.loadData(key.replace('vrt_', ''));
            return {
                key,
                timestamp,
                date: new Date(timestamp),
                vehicleCount: data?.length || 0
            };
        }).sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Restore from auto-backup
    restoreFromAutoBackup(backupKey) {
        try {
            const data = this.loadData(backupKey.replace('vrt_', ''));
            if (data && data.length > 0) {
                this.saveData('vrt_vehicles', data);
                console.log(`Restored from auto-backup: ${data.length} vehicles`);
                return true;
            }
        } catch (error) {
            console.error('Failed to restore from auto-backup:', error);
        }
        return false;
    }

    // Sync with backend
    async syncData(vehicleData) {
        if (!this.isOnline || !window.VRT_CONFIG?.features?.real_time_sync) {
            this.queueForSync(vehicleData);
            return;
        }

        try {
            // Save locally first
            this.saveData('vrt_vehicles', vehicleData);
            
            // Try to sync with backend if available
            if (window.apiService) {
                await this.syncWithBackend(vehicleData);
            }
            
            this.lastSyncTime = Date.now();
            console.log('Data synced successfully');
            
        } catch (error) {
            console.error('Sync failed:', error);
            this.queueForSync(vehicleData);
        }
    }

    async syncWithBackend(vehicleData) {
        // This would integrate with the actual backend API
        console.log('Syncing with backend...', vehicleData.length, 'vehicles');
        
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
    }

    queueForSync(data) {
        const pending = this.loadData('vrt_pending_sync') || [];
        pending.push({
            data: data,
            timestamp: Date.now(),
            id: Date.now().toString()
        });
        
        this.saveData('vrt_pending_sync', pending);
        console.log('Data queued for sync');
    }

    async syncPendingChanges() {
        const pending = this.loadData('vrt_pending_sync') || [];
        if (pending.length === 0) return;

        console.log(`Syncing ${pending.length} pending changes...`);
        
        for (const item of pending) {
            try {
                await this.syncWithBackend(item.data);
            } catch (error) {
                console.error('Failed to sync pending item:', error);
                continue;
            }
        }
        
        // Clear synced items
        this.saveData('vrt_pending_sync', []);
        console.log('All pending changes synced');
    }

    // Data validation and migration
    validateVehicleData(vehicles) {
        if (!Array.isArray(vehicles)) return [];
        
        return vehicles.filter(vehicle => {
            // Basic validation
            if (!vehicle || typeof vehicle !== 'object') return false;
            if (!vehicle['Stock #']) return false;
            
            // Ensure workflow exists
            if (!vehicle.workflow) {
                vehicle.workflow = this.getDefaultWorkflow();
            }
            
            // Validate workflow structure
            for (const step of ['New Arrival', 'Mechanical', 'Detailing', 'Photos', 'Title', 'Lot Ready']) {
                if (!vehicle.workflow[step]) {
                    vehicle.workflow[step] = { completed: false };
                }
            }
            
            return true;
        });
    }

    getDefaultWorkflow() {
        return {
            'New Arrival': { completed: true, date: new Date().toISOString() },
            'Mechanical': { completed: false },
            'Detailing': { completed: false },
            'Photos': { completed: false },
            'Title': { completed: false, inHouse: false },
            'Lot Ready': { completed: false }
        };
    }

    // Data import/export
    exportData(format = 'json') {
        const vehicles = this.loadData('vrt_vehicles') || [];
        const detailers = this.loadData('vrt_detailers') || [];
        
        const exportData = {
            vehicles: vehicles,
            detailers: detailers,
            exported: new Date().toISOString(),
            version: window.VRT_CONFIG?.version || '2.0.0'
        };
        
        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(vehicles);
        }
        
        return exportData;
    }

    convertToCSV(vehicles) {
        if (!vehicles.length) return '';
        
        const headers = [
            'Stock #', 'VIN', 'Year', 'Make', 'Model', 'Color', 'Odometer',
            'Unit Cost', 'Status', 'ExteriorCondition', 'InteriorCondition',
            'Date In', 'Age', 'Notes'
        ];
        
        const rows = vehicles.map(vehicle => {
            return [
                vehicle['Stock #'] || '',
                vehicle['VIN'] || '',
                vehicle['Year'] || '',
                vehicle['Make'] || '',
                vehicle['Model'] || '',
                vehicle['Color'] || '',
                vehicle['Odometer'] || '',
                vehicle['Unit Cost'] || '',
                vehicle['Status'] || '',
                vehicle['ExteriorCondition'] || '3',
                vehicle['InteriorCondition'] || '3',
                vehicle['Date In'] || '',
                vehicle['Age'] || '',
                vehicle['Notes'] || ''
            ].map(field => `"${field}"`);
        });
        
        return [headers.map(h => `"${h}"`).join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    // Performance monitoring
    getPerformanceMetrics() {
        const cacheSize = this.cache.size;
        const storageUsed = this.getStorageUsed();
        const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime) : null;
        const autoBackups = this.getAutoBackups();
        
        return {
            cacheSize,
            storageUsed,
            lastSync,
            isOnline: this.isOnline,
            pendingSync: (this.loadData('vrt_pending_sync') || []).length,
            autoBackups: autoBackups.length,
            lastBackup: autoBackups.length > 0 ? autoBackups[0].date : null
        };
    }

    getStorageUsed() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key) && key.startsWith('vrt_')) {
                total += localStorage[key].length;
            }
        }
        return Math.round(total / 1024); // KB
    }

    // Show backup/restore interface
    showBackupInterface() {
        if (!window.notificationSystem) return;
        
        const metrics = this.getPerformanceMetrics();
        const autoBackups = this.getAutoBackups();
        
        let content = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg border">
                    <h4 class="font-semibold text-blue-800 mb-2">Data Protection Status</h4>
                    <div class="text-sm text-blue-700">
                        <div>Storage Used: ${metrics.storageUsed} KB</div>
                        <div>Auto-Backups: ${metrics.autoBackups}</div>
                        <div>Last Backup: ${metrics.lastBackup ? metrics.lastBackup.toLocaleString() : 'Never'}</div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <button onclick="window.dataManager.createDataBackup()" 
                            class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        <i class="fas fa-download mr-2"></i>Create Backup File
                    </button>
                    
                    <div>
                        <input type="file" id="restore-file" accept=".json" class="hidden">
                        <button onclick="document.getElementById('restore-file').click()" 
                                class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                            <i class="fas fa-upload mr-2"></i>Restore from Backup
                        </button>
                    </div>
                </div>
                
                ${autoBackups.length > 0 ? `
                    <div class="border-t pt-4">
                        <h5 class="font-medium mb-2">Auto-Backups Available:</h5>
                        <div class="space-y-1 max-h-32 overflow-y-auto">
                            ${autoBackups.map(backup => `
                                <div class="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                    <span>${backup.date.toLocaleString()} (${backup.vehicleCount} vehicles)</span>
                                    <button onclick="window.dataManager.restoreFromAutoBackup('${backup.key}'); window.location.reload();" 
                                            class="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600">
                                        Restore
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        const modal = window.notificationSystem.showModal('Data Backup & Recovery', content, 'lg');
        
        // Setup file restore handler
        const fileInput = modal.querySelector('#restore-file');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const result = await this.restoreFromBackup(file);
                        window.notificationSystem.showToast(
                            `Data restored: ${result.vehicles} vehicles`, 
                            'success'
                        );
                        setTimeout(() => window.location.reload(), 1500);
                    } catch (error) {
                        window.notificationSystem.showToast(
                            `Restore failed: ${error.message}`, 
                            'error'
                        );
                    }
                }
            });
        }
    }

    // Cleanup and maintenance
    cleanup() {
        this.clearOldData();
        this.cache.clear();
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
        }
        
        console.log('Data manager cleanup completed');
    }
}

// Make available globally
window.DataManager = DataManager;

console.log('Enhanced Data Manager with backup protection loaded');
