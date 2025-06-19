function parseVehicleDataFromCSV(csvText) {
  const vehicles = [];
  
  if (typeof window.Papa !== 'undefined') {
    const results = window.Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: function(header) {
        // Clean up header names - remove quotes and extra whitespace
        return header.replace(/["\r\n]/g, '').trim();
      }
    });
    
    results.data.forEach(row => {
      // Get stock number from the correct field
      const stockNum = row['Stock #'] || row['Stock#'] || '';
      
      if (stockNum) {
        // Clean up numeric values
        const cleanNumber = (str) => {
          if (!str) return 0;
          return parseInt(str.toString().replace(/[$,\s]/g, '')) || 0;
        };
        
        const vehicle = {
          'Stock #': stockNum,
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
          'Odometer': cleanNumber(row['Odometer']),
          'Original Cost': row['Original Cost'] || '',
          'Unit Cost': row['Unit Cost'] || '',
          'Vehicle Source': row['Vehicle Source'] || '',
          'Photos': parseInt(row['Photos']) || 0,
          'Age': parseInt(row['Age']) || 0,
          'Appraised Value': row['Appraised Value'] || '',
          'Last Updated': new Date().toISOString()
        };
        
        // Initialize workflow status
        vehicle.workflow = {
          currentStage: 'New Arrival',
          startDate: vehicle['Date In'],
          stages: {
            'New Arrival': { completed: false, date: vehicle['Date In'] },
            'Mechanical': { 
              completed: false, 
              date: null,
              substeps: {
                'Oil Change': { completed: false, date: null },
                'Inspection': { completed: false, date: null },
                'Repairs': { completed: false, date: null }
              }
            },
            'Detailing': { completed: false, date: null },
            'Photos': { completed: false, date: null },
            'Title': { 
              completed: false, 
              date: null,
              inHouse: false
            },
            'Lot Ready': { completed: false, date: null },
            'Sold': { completed: false, date: null }
          }
        };
        
        vehicles.push(vehicle);
      }
    });
  } else {
    // Manual CSV parsing fallback
    const lines = csvText.split('\n');
    if (lines.length < 2) return vehicles;
    
    // Parse headers
    const headers = [];
    const headerLine = lines[0];
    let inQuotes = false;
    let currentHeader = '';
    
    for (let i = 0; i < headerLine.length; i++) {
      const char = headerLine[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        headers.push(currentHeader.trim());
        currentHeader = '';
      } else {
        currentHeader += char;
      }
    }
    if (currentHeader) {
      headers.push(currentHeader.trim());
    }
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      if (currentValue) {
        values.push(currentValue.trim());
      }
      
      // Create vehicle object
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      const stockNum = row['Stock #'] || '';
      if (stockNum) {
        const cleanNumber = (str) => {
          if (!str) return 0;
          return parseInt(str.replace(/[$,\s]/g, '')) || 0;
        };
        
        const vehicle = {
          'Stock #': stockNum,
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
          'Odometer': cleanNumber(row['Odometer']),
          'Original Cost': row['Original Cost'] || '',
          'Unit Cost': row['Unit Cost'] || '',
          'Vehicle Source': row['Vehicle Source'] || '',
          'Photos': parseInt(row['Photos']) || 0,
          'Age': parseInt(row['Age']) || 0,
          'Appraised Value': row['Appraised Value'] || '',
          'Last Updated': new Date().toISOString(),
          'workflow': getWorkflowStatus({})
        };
        
        vehicles.push(vehicle);
      }
    }
  }
  
  return vehicles;
}

// --- Data Loading Functions ---
async function loadInitialData() {
  try {
    let url = './Recon -Mission Ford of Dearborn-2025-06-10-0955.csv';
    if (!url.startsWith('./')) url = './' + url;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load inventory CSV');
    const csvText = await res.text();
    currentVehicleData = parseVehicleDataFromCSV(csvText);
    if (currentVehicleData.length === 0) {
      currentVehicleData = getSampleData();
      showMessageModal('Notice', 'Using sample data because the CSV file format is invalid.');
    }
    autoSave();
    renderAllTabs();
  } catch (e) {
    currentVehicleData = getSampleData();
    showMessageModal('Notice', 'Using sample data. Original error: ' + e.message);
    autoSave();
    renderAllTabs();
  }
}