/**
 * API Service for Vehicle Reconditioning Tracker
 * Handles communication with the backend server
 */

class ApiService {
    constructor() {
        // Use different ports for local development vs production
        this.baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3002/api' 
            : '/api';
    }

    /**
     * Make HTTP request with error handling
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    /**
     * Get current inventory information
     */
    async getCurrentInventory() {
        return this.makeRequest('/inventory/current');
    }

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
