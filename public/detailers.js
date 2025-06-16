/**
 * Detailer Management System
 * Handles CRUD operations for detailers
 */

class DetailerManager {
    constructor() {
        this.detailers = [];
        this.initialized = false;
    }

    /**
     * Initialize the detailer manager
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Try to load from server first
            if (window.apiService) {
                const serverDetailers = await window.apiService.getDetailers();
                this.detailers = serverDetailers.detailers || [];
            }
        } catch (error) {
            console.warn('Could not load detailers from server, using local data');
        }

        // Fall back to local storage or default data
        if (this.detailers.length === 0) {
            this.loadFromLocalStorage();
        }

        this.initialized = true;
    }

    /**
     * Load detailers from local storage
     */
    loadFromLocalStorage() {
        const stored = localStorage.getItem('recon_detailers');
        if (stored) {
            try {
                this.detailers = JSON.parse(stored);
            } catch (error) {
                console.error('Error parsing stored detailers:', error);
                this.setDefaultDetailers();
            }
        } else {
            this.setDefaultDetailers();
        }
    }

    /**
     * Set default detailers
     */
    setDefaultDetailers() {
        this.detailers = [
            {
                id: 'detailer_1',
                name: 'Joe Wilson',
                email: 'joe@example.com',
                phone: '(555) 123-4567',
                specialties: ['Interior Cleaning', 'Paint Correction'],
                active: true,
                startDate: '2023-01-15'
            },
            {
                id: 'detailer_2',
                name: 'Mike Davis',
                email: 'mike@example.com',
                phone: '(555) 234-5678',
                specialties: ['Ceramic Coating', 'Paint Protection'],
                active: true,
                startDate: '2023-03-20'
            },
            {
                id: 'detailer_3',
                name: 'Sarah Johnson',
                email: 'sarah@example.com',
                phone: '(555) 345-6789',
                specialties: ['Upholstery Repair', 'Odor Removal'],
                active: true,
                startDate: '2023-06-10'
            }
        ];
        this.saveToLocalStorage();
    }

    /**
     * Save detailers to local storage
     */
    saveToLocalStorage() {
        localStorage.setItem('recon_detailers', JSON.stringify(this.detailers));
    }

    /**
     * Get all detailers
     */
    getAll() {
        return this.detailers;
    }

    /**
     * Get active detailers only
     */
    getActive() {
        return this.detailers.filter(d => d.active);
    }

    /**
     * Get detailer by ID
     */
    getById(id) {
        return this.detailers.find(d => d.id === id);
    }

    /**
     * Get detailer by name
     */
    getByName(name) {
        return this.detailers.find(d => d.name === name);
    }

    /**
     * Add a new detailer
     */
    async add(detailerData) {
        const detailer = {
            id: `detailer_${Date.now()}`,
            name: detailerData.name,
            email: detailerData.email || '',
            phone: detailerData.phone || '',
            specialties: detailerData.specialties || [],
            active: true,
            startDate: detailerData.startDate || new Date().toISOString().split('T')[0]
        };

        this.detailers.push(detailer);
        this.saveToLocalStorage();

        // Try to sync with server
        try {
            if (window.apiService) {
                await window.apiService.addDetailer(detailer);
            }
        } catch (error) {
            console.warn('Could not sync detailer to server:', error);
        }

        return detailer;
    }

    /**
     * Update a detailer
     */
    async update(id, updates) {
        const index = this.detailers.findIndex(d => d.id === id);
        if (index === -1) {
            throw new Error('Detailer not found');
        }

        this.detailers[index] = { ...this.detailers[index], ...updates };
        this.saveToLocalStorage();

        // Try to sync with server
        try {
            if (window.apiService) {
                await window.apiService.updateDetailer(id, this.detailers[index]);
            }
        } catch (error) {
            console.warn('Could not sync detailer update to server:', error);
        }

        return this.detailers[index];
    }

    /**
     * Delete a detailer (soft delete - mark as inactive)
     */
    async delete(id) {
        const index = this.detailers.findIndex(d => d.id === id);
        if (index === -1) {
            throw new Error('Detailer not found');
        }

        this.detailers[index].active = false;
        this.saveToLocalStorage();

        // Try to sync with server
        try {
            if (window.apiService) {
                await window.apiService.deleteDetailer(id);
            }
        } catch (error) {
            console.warn('Could not sync detailer deletion to server:', error);
        }

        return true;
    }

    /**
     * Populate detailer dropdown/select elements
     */
    populateSelect(selectElement, includeUnassigned = true) {
        if (!selectElement) return;

        // Clear existing options
        selectElement.innerHTML = '';

        // Add unassigned option
        if (includeUnassigned) {
            const unassignedOption = document.createElement('option');
            unassignedOption.value = '';
            unassignedOption.textContent = 'Unassigned';
            selectElement.appendChild(unassignedOption);
        }

        // Add detailer options
        this.getActive().forEach(detailer => {
            const option = document.createElement('option');
            option.value = detailer.name;
            option.textContent = detailer.name;
            selectElement.appendChild(option);
        });
    }

    /**
     * Get detailer names for quick access
     */
    getNames() {
        return this.getActive().map(d => d.name);
    }
}

// Create global instance
window.detailerManager = new DetailerManager();

/**
 * Open detailer management modal
 */
window.openDetailerModal = function() {
    // This function will be implemented when the modal is created
    console.log('Detailer management modal not yet implemented');
    
    // For now, show a simple alert with current detailers
    const detailers = window.detailerManager.getActive();
    const names = detailers.map(d => `• ${d.name} (${d.specialties.join(', ')})`).join('\n');
    
    alert(`Current Active Detailers:\n\n${names}\n\nDetailed management interface coming soon!`);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await window.detailerManager.init();
    console.log('✅ Detailer manager initialized');
    
    // Populate any existing detailer select elements
    const selects = document.querySelectorAll('select[id*="detailer"]');
    selects.forEach(select => {
        window.detailerManager.populateSelect(select);
    });
});
