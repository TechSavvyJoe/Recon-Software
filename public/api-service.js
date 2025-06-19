/**
 * API Service for Vehicle Reconditioning Tracker
 * Handles communication with the backend server
 */

const ApiService = {
    async getCurrentInventory() {
        const response = await fetch('/api/inventory/current');
        if (!response.ok) throw new Error('Failed to get current inventory');
        return await response.json();
    },

    async uploadInventoryCSV(file, onProgress) {
        const formData = new FormData();
        formData.append('inventory', file);
        
        const response = await fetch('/api/inventory/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        return await response.json();
    },

    async getDetailers() {
        const response = await fetch('/api/detailers');
        if (!response.ok) throw new Error('Failed to get detailers');
        return await response.json();
    },

    async addDetailer(detailer) {
        const response = await fetch('/api/detailers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(detailer)
        });
        
        if (!response.ok) throw new Error('Failed to add detailer');
        return await response.json();
    }
};

window.ApiService = ApiService;
    /**
     * Upload inventory CSV file
     */
    async uploadInventoryCSV(file, onProgress = null) {
        const formData = new FormData();
        formData.append('inventory', file);

        try {
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Upload failed'));
                });

                xhr.open('POST', `${this.baseUrl}/inventory/upload`);
                xhr.send(formData);
            });
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    }

    /**
     * Get all detailers
     */
    async getDetailers() {
        return this.makeRequest('/detailers');
    }

    /**
     * Add a new detailer
     */
    async addDetailer(detailer) {
        return this.makeRequest('/detailers', {
            method: 'POST',
            body: JSON.stringify(detailer)
        });
    }

    /**
     * Update a detailer
     */
    async updateDetailer(id, detailer) {
        return this.makeRequest(`/detailers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(detailer)
        });
    }

    /**
     * Delete a detailer
     */
    async deleteDetailer(id) {
        return this.makeRequest(`/detailers/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get system information
     */
    async getSystemInfo() {
        return this.makeRequest('/system/info');
    }

    /**
     * Test server connectivity
     */
    async testConnection() {
        try {
            await this.getSystemInfo();
            return true;
        } catch (error) {
            console.error('Server connection test failed:', error);
            return false;
        }
    }
}

// Create global instance
window.apiService = new ApiService();

// Test connection on page load (in a non-blocking way)
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const isConnected = await window.apiService.testConnection();
        if (isConnected) {
            console.log('✅ Backend server connection established');
        } else {
            console.warn('⚠️ Backend server not available - running in offline mode');
        }
    } catch (error) {
        console.warn('⚠️ Backend server connection failed - running in offline mode');
    }
});
