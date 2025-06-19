/**
 * Enhanced Data Manager for Vehicle Reconditioning Tracker
 * Handles data persistence, caching, and synchronization
 */

class DataManager {
    constructor() {
        this.cache = new Map();
        this.syncInterval = null;
        this.lastSyncTime = null;
        this.isOnline = navigator.onLine;
        
        this.initializeOfflineDetection();
        console.log('Data Manager initialized');
    }

    initializeOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Connection restored');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Connection lost - working offline');
        });
    }

    // Enhanced localStorage operations
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
            if (key.startsWith('vrt_')) {
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
        // For now, just log the sync attempt
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
                // Keep in queue for retry
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
            'Unit Cost', 'Status', 'New Arrival', 'Mechanical', 'Detailing',
            'Photos', 'Title', 'Lot Ready', 'Notes'
        ];
        
        const rows = vehicles.map(vehicle => {
            const workflow = vehicle.workflow || {};
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
                workflow['New Arrival']?.completed ? 'Complete' : 'Pending',
                workflow['Mechanical']?.completed ? 'Complete' : 'Pending',
                workflow['Detailing']?.completed ? 'Complete' : 'Pending',
                workflow['Photos']?.completed ? 'Complete' : 'Pending',
                workflow['Title']?.completed ? 'Complete' : 'Pending',
                workflow['Lot Ready']?.completed ? 'Complete' : 'Pending',
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
        
        return {
            cacheSize,
            storageUsed,
            lastSync,
            isOnline: this.isOnline,
            pendingSync: (this.loadData('vrt_pending_sync') || []).length
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

    // Cleanup and maintenance
    cleanup() {
        this.clearOldData();
        this.cache.clear();
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        console.log('Data manager cleanup completed');
    }

    // Enhanced data backup and recovery system
    createDataBackup() {
        try {
            const backupData = {
                vehicles: this.loadData('vrt_vehicles') || [],
                detailers: this.loadData('vrt_detailers') || [],
                backup_created: Date.now(),
                version: window.VRT_CONFIG?.version || '2.0.0'
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
    
    // Auto-backup to prevent data loss
    enableAutoBackup(intervalMinutes = 30) {
        if