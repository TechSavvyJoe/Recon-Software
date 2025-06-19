// Vehicle Reconditioning Tracker - Configuration
// Global configuration settings

window.VRT_CONFIG = {
  // Backend Configuration
  API_BASE_URL: 'http://localhost:3002/api',
  
  // Feature Flags
  features: {
    backend_integration: true,
    real_time_sync: true,
    admin_panel: true,
    csv_auto_load: true,
    photo_detection: true,
    vin_scanner: true,
    enhanced_reporting: true,
    mobile_optimized: true
  },
  
  // Data Sources Priority
  dataSources: {
    primary: 'mission_ford_csv',
    fallback: ['sample_csv', 'local_storage', 'built_in_sample']
  },
  
  // CSV Configuration
  csv: {
    mission_ford_file: 'Recon -Mission Ford of Dearborn-2025-06-10-0955.csv',
    sample_file: 'sample-inventory.csv',
    auto_detect_photos: true,
    photo_keywords: ['Photo', 'photo', 'Pic', 'pic', 'Image', 'image']
  },
  
  // Performance Settings
  performance: {
    auto_save_interval: 30000, // 30 seconds
    debounce_delay: 300,
    max_retries: 3
  },
  
  // UI Settings
  ui: {
    modal_animation_duration: 300,
    toast_duration: 4000,
    chart_animation: true,
    mobile_breakpoint: 768
  }
};

// Environment Detection
window.VRT_CONFIG.environment = window.location.hostname === 'localhost' ? 'development' : 'production';

// Debug Mode
window.VRT_CONFIG.debug = window.VRT_CONFIG.environment === 'development';

// Version Info
window.VRT_CONFIG.version = '2.0.0';
window.VRT_CONFIG.build_date = '2025-01-13';

console.log('Vehicle Reconditioning Tracker Config Loaded:', window.VRT_CONFIG);