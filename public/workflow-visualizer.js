/**
 * Workflow Visualizer Component
 * Creates visual workflow timeline for vehicles
 */

const WorkflowVisualizer = {
  stages: [
    { 
      name: 'New Arrival', 
      icon: '📥', 
      color: 'gray',
      description: 'Vehicle just arrived and needs initial inspection'
    },
    { 
      name: 'Mechanical', 
      icon: '🔧', 
      color: 'blue',
      description: 'Service and repairs',
      substeps: [
        { name: 'Initial Inspection', description: 'Comprehensive mechanical check' },
        { name: 'Repairs', description: 'Fix identified issues' },
        { name: 'Quality Check', description: 'Verify all repairs completed' }
      ]
    },
    { 
      name: 'Detailing', 
      icon: '✨', 
      color: 'purple',
      description: 'Interior and exterior cleaning'
    },
    { 
      name: 'Photos', 
      icon: '📸', 
      color: 'yellow',
      description: 'Professional photography for listings'
    },
    { 
      name: 'Title', 
      icon: '📄', 
      color: 'orange',
      description: 'Title processing and paperwork',
      substeps: [
        { name: 'Title Check', description: 'Verify title status' },
        { name: 'Processing', description: 'Handle title transfer' },
        { name: 'In-House', description: 'Title received in-house' }
      ]
    },
    { 
      name: 'Lot Ready', 
      icon: '✅', 
      color: 'green',
      description: 'Vehicle ready for sale'
    },
    { 
      name: 'Sold', 
      icon: '💰', 
      color: 'emerald',
      description: 'Vehicle sold'
    }
  ],

  /**
   * Create workflow timeline HTML
   * @param {Object} vehicle - Vehicle data
   * @param {boolean} interactive - Whether to include interactive elements
   * @returns {string} HTML string
   */
  createTimeline(vehicle, interactive = true) {
    const workflow = vehicle.workflow || this.getDefaultWorkflow();
    const currentStageIndex = this.getCurrentStageIndex(workflow);
    
    let html = '<div class="workflow-timeline">';
    
    // Progress bar
    const progress = this.calculateProgress(workflow);
    html += `
      <div class="mb-4">
        <div class="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>${progress}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
    
    // Timeline
    html += '<div class="relative">';
    
    this.stages.forEach((stage, index) => {
      const stageData = workflow[stage.name] || {};
      const isComplete = stageData.completed;
      const isActive = index === currentStageIndex;
      const isPending = index > currentStageIndex;
      
      let stageClass = 'timeline-stage';
      if (isComplete) stageClass += ' complete';
      if (isActive) stageClass += ' active';
      if (isPending) stageClass += ' pending';
      
      html += `
        <div class="${stageClass}" data-stage="${stage.name}">
          <div class="timeline-stage-header">
            <div class="timeline-stage-icon ${stage.color}">
              ${stage.icon}
            </div>
            <div class="timeline-stage-content">
              <h4 class="font-medium">${stage.name}</h4>
              <p class="text-sm text-gray-600">${stage.description}</p>
              ${stageData.completedAt ? `<p class="text-xs text-gray-500">Completed: ${new Date(stageData.completedAt).toLocaleDateString()}</p>` : ''}
              ${stageData.completedBy ? `<p class="text-xs text-gray-500">By: ${stageData.completedBy}</p>` : ''}
            </div>
      `;
      
      if (interactive && isActive && !isComplete) {
        html += `
          <div class="timeline-stage-actions">
            <button onclick="WorkflowVisualizer.completeStage('${vehicle['Stock #']}', '${stage.name}')" 
                    class="btn-complete-stage bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
              Complete
            </button>
          </div>
        `;
      }
      
      html += '</div>';
      
      // Substeps if any
      if (stage.substeps && stageData.substeps) {
        html += '<div class="timeline-substeps ml-8 mt-2">';
        stage.substeps.forEach((substep, subIndex) => {
          const substepData = stageData.substeps[substep.name] || {};
          const isSubComplete = substepData.completed;
          
          html += `
            <div class="timeline-substep ${isSubComplete ? 'complete' : ''}">
              <input type="checkbox" 
                     id="substep-${stage.name}-${subIndex}" 
                     ${isSubComplete ? 'checked' : ''}
                     ${interactive ? `onchange="WorkflowVisualizer.toggleSubstep('${vehicle['Stock #']}', '${stage.name}', '${substep.name}')"` : 'disabled'}>
              <label for="substep-${stage.name}-${subIndex}">
                ${substep.name}
                ${isSubComplete && substepData.completedAt ? 
                  `<span class="text-xs text-gray-500"> - ${new Date(substepData.completedAt).toLocaleDateString()}</span>` : ''}
              </label>
            </div>
          `;
        });
        html += '</div>';
      }
      
      html += '</div>';
      
      // Connect line
      if (index < this.stages.length - 1) {
        html += '<div class="timeline-connector"></div>';
      }
    });
    
    html += '</div></div>';
    
    return html;
  },

  /**
   * Get default workflow structure
   * @returns {Object} Default workflow object
   */
  getDefaultWorkflow() {
    const workflow = {};
    this.stages.forEach(stage => {
      workflow[stage.name] = {
        completed: false,
        completedAt: null,
        completedBy: null
      };
      
      if (stage.substeps) {
        workflow[stage.name].substeps = {};
        stage.substeps.forEach(substep => {
          workflow[stage.name].substeps[substep.name] = {
            completed: false,
            completedAt: null,
            completedBy: null
          };
        });
      }
    });
    return workflow;
  },

  /**
   * Get current stage index
   * @param {Object} workflow - Workflow data
   * @returns {number} Current stage index
   */
  getCurrentStageIndex(workflow) {
    for (let i = this.stages.length - 1; i >= 0; i--) {
      if (workflow[this.stages[i].name]?.completed) {
        return Math.min(i + 1, this.stages.length - 1);
      }
    }
    return 0;
  },

  /**
   * Calculate overall progress percentage
   * @param {Object} workflow - Workflow data
   * @returns {number} Progress percentage
   */
  calculateProgress(workflow) {
    let totalSteps = 0;
    let completedSteps = 0;
    
    this.stages.forEach(stage => {
      totalSteps++;
      if (workflow[stage.name]?.completed) {
        completedSteps++;
      }
      
      if (stage.substeps) {
        totalSteps += stage.substeps.length;
        stage.substeps.forEach(substep => {
          if (workflow[stage.name]?.substeps?.[substep.name]?.completed) {
            completedSteps++;
          }
        });
      }
    });
    
    return Math.round((completedSteps / totalSteps) * 100);
  },

  /**
   * Complete a workflow stage
   * @param {string} stockNumber - Vehicle stock number
   * @param {string} stageName - Stage name to complete
   */
  async completeStage(stockNumber, stageName) {
    const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNumber);
    if (!vehicle) return;
    
    if (!vehicle.workflow) {
      vehicle.workflow = this.getDefaultWorkflow();
    }
    
    vehicle.workflow[stageName].completed = true;
    vehicle.workflow[stageName].completedAt = new Date().toISOString();
    vehicle.workflow[stageName].completedBy = 'Current User'; // Would be from auth
    
    // Update status based on stage
    const stageIndex = this.stages.findIndex(s => s.name === stageName);
    if (stageIndex < this.stages.length - 1) {
      vehicle.Status = this.stages[stageIndex + 1].name;
    }
    
    // Save and refresh
    autoSave();
    renderAllTabs();
    
    showNotification(`${stageName} completed for Stock #${stockNumber}`, 'success');
  },

  /**
   * Toggle a substep completion
   * @param {string} stockNumber - Vehicle stock number
   * @param {string} stageName - Stage name
   * @param {string} substepName - Substep name
   */
  async toggleSubstep(stockNumber, stageName, substepName) {
    const vehicle = currentVehicleData.find(v => v['Stock #'] === stockNumber);
    if (!vehicle) return;
    
    if (!vehicle.workflow) {
      vehicle.workflow = this.getDefaultWorkflow();
    }
    
    if (!vehicle.workflow[stageName].substeps) {
      vehicle.workflow[stageName].substeps = {};
    }
    
    if (!vehicle.workflow[stageName].substeps[substepName]) {
      vehicle.workflow[stageName].substeps[substepName] = {};
    }
    
    const substep = vehicle.workflow[stageName].substeps[substepName];
    substep.completed = !substep.completed;
    substep.completedAt = substep.completed ? new Date().toISOString() : null;
    substep.completedBy = substep.completed ? 'Current User' : null;
    
    // Check if all substeps are complete
    const stage = this.stages.find(s => s.name === stageName);
    if (stage && stage.substeps) {
      const allComplete = stage.substeps.every(sub => 
        vehicle.workflow[stageName].substeps[sub.name]?.completed
      );
      
      if (allComplete && !vehicle.workflow[stageName].completed) {
        // Auto-complete the stage
        this.completeStage(stockNumber, stageName);
      }
    }
    
    // Save and refresh
    autoSave();
    renderAllTabs();
  }
};

// Add styles
const workflowStyles = `
<style>
.workflow-timeline {
  padding: 1rem;
}

.timeline-stage {
  position: relative;
  padding: 1rem;
  margin-bottom: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.timeline-stage.complete {
  border-color: #10b981;
  background: #f0fdf4;
}

.timeline-stage.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.timeline-stage.pending {
  opacity: 0.6;
}

.timeline-stage-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.timeline-stage-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.timeline-stage-icon.gray { background: #f3f4f6; }
.timeline-stage-icon.blue { background: #dbeafe; }
.timeline-stage-icon.purple { background: #e9d5ff; }
.timeline-stage-icon.yellow { background: #fef3c7; }
.timeline-stage-icon.orange { background: #fed7aa; }
.timeline-stage-icon.green { background: #d1fae5; }
.timeline-stage-icon.emerald { background: #a7f3d0; }

.timeline-stage-content {
  flex: 1;
}

.timeline-stage-actions {
  position: absolute;
  top: 1rem;
  right: 1rem;
}

.timeline-connector {
  width: 2px;
  height: 2rem;
  background: #e5e7eb;
  margin-left: 2.25rem;
  margin-top: -1rem;
  margin-bottom: -1rem;
}

.timeline-substeps {
  margin-top: 0.5rem;
}

.timeline-substep {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.timeline-substep.complete {
  color: #10b981;
}

.timeline-substep input[type="checkbox"] {
  cursor: pointer;
}

.timeline-substep label {
  cursor: pointer;
  flex: 1;
}
</style>
`;

// Add styles to document
if (!document.getElementById('workflow-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'workflow-styles';
  styleElement.innerHTML = workflowStyles;
  document.head.appendChild(styleElement);
}

// Make available globally
window.WorkflowVisualizer = WorkflowVisualizer;
