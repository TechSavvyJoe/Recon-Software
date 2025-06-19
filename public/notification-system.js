/**
 * Enhanced Notification System for Vehicle Reconditioning Tracker
 * Provides toast notifications, progress indicators, and user feedback
 */

class NotificationSystem {
    constructor() {
        this.toastContainer = this.createToastContainer();
        this.notifications = [];
        console.log('Notification System initialized');
    }

    createToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 space-y-2 pointer-events-none';
            document.body.appendChild(container);
        }
        return container;
    }

    showToast(message, type = 'info', duration = 4000) {
        const toast = this.createToast(message, type);
        this.toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 100);
        
        // Auto-remove
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        return toast;
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `transform translate-x-full opacity-0 transition-all duration-300 pointer-events-auto`;
        
        const typeStyles = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white'
        };
        
        const typeIcons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="flex items-center p-4 rounded-lg shadow-lg ${typeStyles[type] || typeStyles.info}">
                <i class="${typeIcons[type] || typeIcons.info} mr-3"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        return toast;
    }

    removeToast(toast) {
        toast.style.transform = 'translateX(full)';
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    showProgress(message, percentage = 0) {
        const progressToast = document.createElement('div');
        progressToast.className = 'transform translate-x-full opacity-0 transition-all duration-300 pointer-events-auto';
        
        progressToast.innerHTML = `
            <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-lg">
                <div class="flex items-center mb-2">
                    <i class="fas fa-spinner fa-spin text-blue-500 mr-3"></i>
                    <span class="flex-1 font-medium">${message}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
                </div>
                <div class="text-sm text-gray-500 mt-1">${percentage}% complete</div>
            </div>
        `;
        
        this.toastContainer.appendChild(progressToast);
        
        setTimeout(() => {
            progressToast.style.transform = 'translateX(0)';
            progressToast.style.opacity = '1';
        }, 100);
        
        return {
            element: progressToast,
            updateProgress: (newPercentage, newMessage) => {
                const progressBar = progressToast.querySelector('.bg-blue-500');
                const messageEl = progressToast.querySelector('.font-medium');
                const percentEl = progressToast.querySelector('.text-gray-500');
                
                if (progressBar) progressBar.style.width = `${newPercentage}%`;
                if (messageEl && newMessage) messageEl.textContent = newMessage;
                if (percentEl) percentEl.textContent = `${newPercentage}% complete`;
            },
            complete: (successMessage) => {
                const icon = progressToast.querySelector('.fa-spinner');
                const message = progressToast.querySelector('.font-medium');
                const progressBar = progressToast.querySelector('.bg-blue-500');
                
                if (icon) {
                    icon.className = 'fas fa-check-circle text-green-500 mr-3';
                }
                if (message) {
                    message.textContent = successMessage || 'Complete!';
                }
                if (progressBar) {
                    progressBar.style.width = '100%';
                    progressBar.className = 'bg-green-500 h-2 rounded-full transition-all duration-300';
                }
                
                setTimeout(() => {
                    this.removeToast(progressToast);
                }, 2000);
            }
        };
    }

    confirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            
            modal.innerHTML = `
                <div class="modal-content max-w-md">
                    <h3 class="text-xl font-bold mb-4">${title}</h3>
                    <p class="text-gray-700 mb-6">${message}</p>
                    <div class="flex space-x-3">
                        <button class="confirm-yes action-button action-button-primary flex-1">
                            <i class="fas fa-check mr-2"></i>Yes
                        </button>
                        <button class="confirm-no action-button action-button-secondary flex-1">
                            <i class="fas fa-times mr-2"></i>No
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            modal.querySelector('.confirm-yes').addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            modal.querySelector('.confirm-no').addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }

    showModal(title, content, size = 'md') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-2xl',
            lg: 'max-w-4xl',
            xl: 'max-w-6xl'
        };
        
        modal.innerHTML = `
            <div class="modal-content ${sizeClasses[size] || sizeClasses.md}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">${title}</h3>
                    <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
    }
}

// Make available globally
window.NotificationSystem = NotificationSystem;