<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Reconditioning Tracker</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.3.2/papaparse.min.js" onerror="console.error('DIRECT SCRIPT LOAD ERROR: PapaParse failed to load from jsdelivr CDN via script tag onerror event.');"></script> 
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .modal { display: none; position: fixed; z-index: 100; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); }
        .modal-content { background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 80%; max-width: 750px; border-radius: 8px; }
        .dashboard-vehicle-card { cursor: pointer; } 
        .disabled-button { 
            cursor: not-allowed !important; 
            background-color: #9ca3af !important; 
            opacity: 0.7 !important; 
        }
        .chart-container { position: relative; height: 300px; width: 100%; max-height: 40vh; }
        .modal-content { max-height: 90vh; overflow-y: auto; }
        .progress-bar-bg { background-color: #e5e7eb; }
        .progress-bar-fg { background-color: #3b82f6; }

        .action-button {
             display: block;
            width: 100%;
            text-align: center;
            padding: 0.625rem 1rem; 
            margin-bottom: 0.5rem;
            border-radius: 0.375rem; 
            transition: background-color 0.2s ease-in-out;
            font-weight: 500; 
            border: 1px solid transparent;
        }
        .action-button-primary {
            background-color: #2563eb; 
            color: white;
        }
        .action-button-primary:hover {
            background-color: #1d4ed8; 
        }
        .action-button-secondary {
            background-color: #e5e7eb; 
            color: #374151; 
            border-color: #d1d5db; 
        }
        .action-button-secondary:hover {
            background-color: #d1d5db; 
        }
         .action-button-completed {
            background-color: #d1fae5; 
            color: #065f46; 
            border-left: 4px solid #10b981; 
            cursor: default;
            text-align: left;
        }
        .status-history-entry {
            padding: 0.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        .status-history-entry:last-child {
            border-bottom: none;
        }
        .dashboard-timeline-entry {
            font-size: 0.8rem;
            padding-left: 0.5rem;
            border-left: 2px solid #cbd5e1;
            margin-left: 0.25rem;
            margin-bottom: 0.25rem;
        }
        th.sortable { cursor: pointer; }
        th.sortable:hover { background-color: #3b82f6; /* Tailwind's blue-500 */ }
        th .sort-arrow { margin-left: 5px; }
        .pending-task-badge {
            display: inline-block;
            padding: 0.125rem 0.5rem;
            margin-right: 0.25rem;
            margin-bottom: 0.25rem;
            font-size: 0.7rem;
            font-weight: 500;
            border-radius: 0.25rem;
        }
        .pending-mechanical { background-color: #fef3c7; color: #92400e; } /* yellow-100, yellow-700 */
        .pending-detailing { background-color: #f3e8ff; color: #6b21a8; } /* purple-100, purple-700 */
        .pending-photos { background-color: #ffe4e6; color: #be123c; } /* pink-100, pink-700 */
        .pending-title { background-color: #e0e7ff; color: #4338ca; } /* indigo-100, indigo-700 */


    </style>
</head>
<body class="bg-gray-100 text-gray-800">
    <div class="container mx-auto p-4">
        <header class="bg-sky-700 text-white p-6 rounded-lg shadow-md mb-6">
            <h1 class="text-3xl font-bold">Vehicle Reconditioning Workflow Tracker</h1>
        </header>

        <div class="mb-6 bg-white p-3 rounded-lg shadow">
            <nav class="flex flex-wrap space-x-2 sm:space-x-4" id="tabs">
                <button data-tab="dashboard" class="tab-button py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">Dashboard</button>
                <button data-tab="reports" class="tab-button py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md transition">Reports</button>
                <button data-tab="inventory" class="tab-button py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md transition">Inventory</button>
                <button data-tab="upload" class="tab-button py-2 px-4 bg-gray-200 hover:bg-gray-300 rounded-md transition">Upload Data</button>
            </nav>
        </div>

        <main id="tab-content-area">
            <div id="dashboard-content" class="tab-content p-6 bg-white rounded-lg shadow">
                <div class="flex flex-wrap gap-4 mb-6 items-center">
                    <h2 class="text-2xl font-semibold">Active Reconditioning Overview</h2>
                    <input type="text" id="dashboard-search" placeholder="Search VIN, Stock#, Make, Model..." class="p-2 border rounded-md flex-grow min-w-[200px] sm:min-w-[300px]">
                    <div class="flex items-center space-x-2">
                        <label for="dashboard-status-filter" class="text-sm font-medium">Filter by Status:</label>
                        <select id="dashboard-status-filter" class="p-2 border rounded-md">
                            <option value="">All Active</option>
                            <option value="needs_attention">Needs Attention (Any Stage)</option>
                            </select>
                    </div>
                </div>
                <div id="dashboard-vehicle-list" class="space-y-4"> 
                    </div>
            </div>

            <div id="reports-content" class="tab-content p-6 bg-white rounded-lg shadow">
                <h2 class="text-2xl font-semibold mb-4">Recon Reports & Metrics</h2>
                <div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div class="p-4 bg-sky-50 rounded-lg shadow">
                        <h4 class="text-md font-semibold text-sky-700">Avg. Total Recon Time</h4>
                        <p id="avgTotalReconTime" class="text-2xl font-bold text-sky-600">N/A</p>
                        <p class="text-xs text-gray-500">(New Arrival to Lot Ready)</p>
                    </div>
                    <div class="p-4 bg-pink-50 rounded-lg shadow">
                        <h4 class="text-md font-semibold text-pink-700">Avg. Photo Cycle Time</h4>
                        <p id="avgPhotoCycleTime" class="text-2xl font-bold text-pink-600">N/A</p>
                        <p class="text-xs text-gray-500">(Photos Start to Photos Taken)</p>
                    </div>
                    <div class="p-4 bg-green-50 rounded-lg shadow">
                        <h4 class="text-md font-semibold text-green-700">Avg. Time to Frontline</h4>
                        <p id="avgTimeToFrontline" class="text-2xl font-bold text-green-600">N/A</p>
                        <p class="text-xs text-gray-500">(New Arrival to Lot Ready)</p>
                    </div>
                </div>
                
                <div class="mb-8 p-4 border rounded-lg">
                    <h3 class="text-xl font-semibold mb-3">Vehicles Needing Photos (Detailing Complete)</h3>
                    <div id="vehicles-needing-photos-area" class="overflow-x-auto">
                        <p class="text-gray-500">No vehicles currently needing photos or data not loaded.</p>
                    </div>
                </div>

                <div class="mb-8 p-4 border rounded-lg">
                    <h3 class="text-xl font-semibold mb-3">Stage Bottleneck Analysis</h3>
                    <div id="stage-bottleneck-area">
                        <p class="text-gray-500">No data available to analyze bottlenecks yet.</p>
                    </div>
                </div>

                <div class="mb-8 p-4 border rounded-lg">
                    <h3 class="text-xl font-semibold mb-3">Detailer Performance</h3>
                    <div id="detailer-performance-area" class="space-y-2">
                        <p class="text-gray-500">No detailing data available yet.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="chart-container">
                        <h3 class="text-xl font-medium mb-2">Workflow Status Distribution</h3>
                        <canvas id="reportsWorkflowStatusChart" class="rounded-lg shadow-sm"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3 class="text-xl font-medium mb-2">Average Time per Stage (Days)</h3>
                        <canvas id="reportsAvgTimePerStageChart" class="rounded-lg shadow-sm"></canvas>
                    </div>
                    <div class="chart-container">
                        <h3 class="text-xl font-medium mb-2">Photo Status</h3>
                        <canvas id="reportsPhotoStatusChart" class="rounded-lg shadow-sm"></canvas>
                    </div>
                </div>
            </div>


            <div id="inventory-content" class="tab-content p-6 bg-white rounded-lg shadow">
                <h2 class="text-2xl font-semibold mb-4">Vehicle Inventory</h2>
                <div class="flex flex-wrap gap-4 mb-4 items-center">
                    <input type="text" id="inventory-search" placeholder="Search VIN, Stock#, Make, Model..." class="p-2 border rounded-md flex-grow min-w-[200px]">
                    <div class="flex items-center space-x-2">
                        <label for="inventory-view-filter" class="text-sm font-medium">View:</label>
                        <select id="inventory-view-filter" class="p-2 border rounded-md">
                            <option value="active">Active Recon</option>
                            <option value="needs_attention">Needs Attention (Any Stage)</option>
                            <option value="lot_ready">Lot Ready</option>
                            <option value="sold">Sold</option>
                            <option value="all">All Vehicles</option>
                        </select>
                    </div>
                     <button id="export-csv-button" class="py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition">Export to CSV</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border">
                        <thead class="bg-sky-600 text-white">
                            <tr>
                                <th class="py-2 px-3 text-left sortable" data-sort="stockNumber">Stock# <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="vin">VIN <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="vehicle">Vehicle <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="ageInInventory">Age <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="acquisitionType">Acq. Type <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="currentReconStatus">Status <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left sortable" data-sort="titleInHouse">Title <span class="sort-arrow"></span></th>
                                <th class="py-2 px-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-table-body">
                            </tbody>
                    </table>
                </div>
            </div>
            
            <div id="upload-content" class="tab-content p-6 bg-white rounded-lg shadow">
                <h2 class="text-2xl font-semibold mb-4">Upload & Sync Data</h2>
                <div id="csv-library-status" class="mb-4 p-3 rounded-md text-sm"></div>
                
                <div class="mb-6 pb-6 border-b">
                    <h3 class="text-lg font-semibold mb-2">Upload CSV File</h3>
                    <p class="mb-2 text-sm text-gray-600">Upload a CSV file with vehicle inventory.</p>
                    <input type="file" id="csv-file-input" accept=".csv" class="mb-4 p-2 border rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100">
                    <button id="upload-csv-button" class="py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">Upload and Process CSV</button>
                    <div id="upload-status" class="mt-4"></div>
                </div>

                <div class="mb-6 pb-6 border-b">
                    <h3 class="text-lg font-semibold mb-2">Sync from Google Sheet</h3>
                    <p class="mb-2 text-sm text-gray-600">Sync inventory from the pre-configured Google Sheet. This will add new vehicles and update existing ones based on VIN/Stock#.</p>
                    <button id="sync-google-sheet-button" class="py-2 px-4 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition">Sync from Google Sheet</button>
                    <button id="refresh-google-sheet-button" class="ml-2 py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">Refresh Synced Data</button>
                    <div id="google-sheet-sync-status" class="mt-4"></div>
                </div>
                
                <div class="mb-6 pb-6 border-b">
                    <h3 class="text-lg font-semibold mb-2">Manage Detailers</h3>
                    <div class="flex gap-2 mb-2">
                        <input type="text" id="new-detailer-name" placeholder="Enter detailer name" class="p-2 border rounded-md flex-grow">
                        <button id="add-detailer-button" class="py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">Add Detailer</button>
                    </div>
                    <div id="detailer-list" class="text-sm space-y-1">
                        <p class="text-gray-500">No detailers configured yet.</p>
                    </div>
                </div>


                <div class="mt-8">
                    <h3 class="text-xl font-semibold mb-2">Sample CSV Structure (for direct upload):</h3>
                    <pre class="bg-gray-50 p-3 rounded-md text-xs overflow-x-auto">Stock#,VIN,Year,Make,Model,Recon Status,Recon Cost,Notes,Inventory Date,Acquisition Type
1001,VIN123,2022,Ford,F-150,New Arrival,0,Needs inspection,2023-10-01,Trade-In
1002,VIN456,2021,Toyota,Camry,Mechanical,50,Engine check,2023-10-05,Auction
...
                    </pre>
                </div>
            </div>
        </main>

        <div id="vehicle-detail-modal" class="modal">
            <div class="modal-content relative">
                <span class="close-modal absolute top-4 right-6 text-2xl font-bold cursor-pointer">&times;</span>
                <h3 class="text-2xl font-semibold mb-1" id="modal-vehicle-title">Vehicle Details</h3>
                <div id="modal-vehicle-info" class="mb-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm border-b pb-3"></div>
                
                <div id="modal-action-area" class="mt-3">
                    <div id="modal-email-request-area" class="mb-3">
                        </div>
                    
                    <h4 class="text-lg font-semibold mb-2">Reconditioning Progress & Actions</h4>
                    <div id="modal-interactive-actions" class="space-y-2 mb-4">
                        <!-- Action buttons will be populated here -->
                    </div>

                    <div id="modal-status-update-form-area" class="hidden mt-4 p-4 border rounded-md bg-gray-50">
                        <h5 id="modal-updating-to-status-label" class="text-md font-semibold mb-3">Complete [Previous Stage] & Move to [New Stage]</h5>
                        
                        <div id="modal-mechanical-cost-fields" class="hidden space-y-2 mb-3">
                            <div>
                                <label for="modal-mechanical-cost" class="block text-xs font-medium text-gray-700">Mechanical Service Costs ($) (Optional):</label>
                                <input type="number" id="modal-mechanical-cost" placeholder="0.00" class="mt-1 block w-full p-2 text-xs border border-gray-300 rounded-md shadow-sm">
                            </div>
                        </div>

                        <div id="modal-quality-review-fields" class="hidden space-y-2 mb-3">
                             <p class="text-sm font-medium text-gray-800">Detailing Quality Review (Required):</p>
                             <div>
                                <label for="modal-detailer-name" class="block text-xs font-medium text-gray-700">Detailer Name:</label>
                                <select id="modal-detailer-name" class="mt-1 block w-full p-2 text-xs border border-gray-300 rounded-md shadow-sm">
                                    <option value="">Select Detailer</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label for="modal-interior-quality" class="block text-xs font-medium text-gray-700">Interior Quality (1-5):</label>
                                    <select id="modal-interior-quality" class="mt-1 block w-full p-2 text-xs border border-gray-300 rounded-md shadow-sm">
                                        <option value="">N/A</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="modal-exterior-quality" class="block text-xs font-medium text-gray-700">Exterior Quality (1-5):</label>
                                    <select id="modal-exterior-quality" class="mt-1 block w-full p-2 text-xs border border-gray-300 rounded-md shadow-sm">
                                        <option value="">N/A</option> <option value="1">1</option> <option value="2">2</option> <option value="3">3</option> <option value="4">4</option> <option value="5">5</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label for="modal-notes-input" class="block text-xs font-medium text-gray-700">Notes for <span id="previous-status-note-label"></span> (optional):</label>
                            <textarea id="modal-notes-input" rows="2" class="mt-1 block w-full p-2 text-xs border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500"></textarea>
                        </div>
                        <button id="modal-confirm-status-update-button" class="mt-3 py-2 px-4 bg-sky-500 text-white text-sm rounded-md hover:bg-sky-600 transition">Confirm Action</button>
                    </div>
                </div>
                
                <hr class="my-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-lg font-semibold mb-2">Photo Status</h4>
                        <div class="flex items-center space-x-3">
                            <select id="modal-photo-status-select" class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm">
                                <option value="Not Taken">Not Taken</option> 
                                <option value="Taken">Taken</option> 
                            </select>
                            <button id="modal-update-photo-status-button" class="py-2 px-4 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 transition">Update</button>
                        </div>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold mb-2">Title Status</h4>
                        <div class="flex items-center mt-1">
                            <input id="modal-title-inhouse-checkbox" type="checkbox" class="h-4 w-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500">
                            <label for="modal-title-inhouse-checkbox" class="ml-2 block text-sm text-gray-900">Title In-House?</label>
                        </div>
                    </div>
                </div>
                
                <div id="modal-email-log" class="mt-4 text-xs text-gray-500"></div>
                 <hr class="my-4">
                 <div id="modal-status-history-display" class="mt-4">
                    <h4 class="text-lg font-semibold mb-2">Status History Log</h4>
                    <div class="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2 text-xs bg-gray-50">
                        <!-- History log populated by JS -->
                    </div>
                </div>
            </div>
        </div>
        
        <div id="message-modal" class="modal">
            <div class="modal-content w-1/3">
                 <span class="close-message-modal absolute top-2 right-4 text-xl font-bold cursor-pointer">&times;</span>
                <h3 id="message-modal-title" class="text-xl font-semibold mb-3">Notification</h3>
                <p id="message-modal-text"></p>
                <button id="message-modal-ok-button" class="mt-4 py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">OK</button>
            </div>
        </div>

    </div>

    <script type="module">
        // Firebase SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, writeBatch, serverTimestamp, setLogLevel, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // --- Global Variables and Configuration ---
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-recon-app';
        
        let db, auth, userId, isAuthReady = false;
        let currentVehicleData = []; 
        let activeVehicleId = null; 
        let statusToUpdateTo = null; 
        let stageBeingCompletedForForm = null; 
        let detailerNames = [];

        const RECON_STATUSES = [ 
            "New Arrival", "Mechanical", "Detailing", "Photos", "Lot Ready", "Sold"
        ];
        // KANBAN_COLUMNS not needed anymore as Kanban is removed

        const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vShuNsL67l-E9e2szUNtQ6Xo5H5B3zQKuPusaOgcK-sigasM3MLBDKuutxJj1oBCt7pxs0Mur2i93vy/pub?gid=639386898&single=true&output=csv';
        const SETTINGS_DOC_ID = "reconAppSettings"; 

        // --- Utility Functions ---
        function populateStatusFilter(selectElementId, includeAllOption = true, excludeStatuses = []) {
            const filterSelect = document.getElementById(selectElementId);
            if (!filterSelect) {
                return; 
            }
            const currentVal = filterSelect.value; 
            filterSelect.innerHTML = ''; 
            if (includeAllOption) {
                 const allOpt = document.createElement('option');
                 allOpt.value = "";
                 allOpt.textContent = "All Active Stages";
                 filterSelect.appendChild(allOpt);
            }
            
            RECON_STATUSES.filter(status => !excludeStatuses.includes(status)).forEach(status => {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = status;
                filterSelect.appendChild(option);
            });
            filterSelect.value = currentVal; 
        }
        
        function hasStartedStage(vehicle, stageName) {
            if (!vehicle || !vehicle.statusHistory) return false;
            return vehicle.statusHistory.some(entry => entry.status === stageName && entry.notes?.toLowerCase().includes("started"));
        }

        function isStageCompleted(vehicle, stageName) {
            if (!vehicle || !vehicle.statusHistory) return false;
            if (stageName === "Mechanical") {
                return vehicle.statusHistory.some(entry => entry.status === "Mechanical" && entry.mechanicalCost !== undefined && entry.notes?.toLowerCase().includes("completed"));
            }
            if (stageName === "Detailing") {
                return vehicle.statusHistory.some(entry => entry.status === "Detailing" && entry.detailer && entry.interiorQuality && entry.exteriorQuality && entry.notes?.toLowerCase().includes("completed"));
            }
            if (stageName === "Photos") { 
                return vehicle.photoStatus === "Taken";
            }
            if (stageName === "New Arrival") { 
                 return vehicle.statusHistory.some(entry => entry.status === "New Arrival" && !entry.notes?.toLowerCase().includes("imported")) || RECON_STATUSES.indexOf(vehicle.currentReconStatus) > RECON_STATUSES.indexOf("New Arrival");
            }
            return false; 
        }


        // --- Firebase Initialization and Auth ---
        async function initializeFirebase() {
            if (!firebaseConfig) {
                console.error("Firebase config is not available.");
                showMessageModal("Error", "Firebase configuration is missing. App cannot connect to database.");
                return;
            }
            try {
                const app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
                setLogLevel('debug'); 

                await setPersistence(auth, browserLocalPersistence); 

                onAuthStateChanged(auth, async (user) => {
                    if (user) {
                        userId = user.uid;
                        isAuthReady = true;
                        console.log("User authenticated:", userId);
                        await loadDetailerNames(); 
                        loadInitialData(); 
                    } else {
                        console.log("No user found, attempting sign-in.");
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            try {
                                await signInWithCustomToken(auth, __initial_auth_token);
                                console.log("Signed in with custom token.");
                            } catch (error) {
                                console.error("Custom token sign-in error, trying anonymous:", error);
                                await signInAnonymously(auth);
                                console.log("Signed in anonymously after custom token failure.");
                            }
                        } else {
                            await signInAnonymously(auth);
                            console.log("Signed in anonymously.");
                        }
                    }
                });
            } catch (error) {
                console.error("Firebase initialization error:", error);
                showMessageModal("Firebase Error", `Could not initialize Firebase: ${error.message}. Please check console.`);
            }
        }
        
        // --- Data Loading and Firestore Interaction ---
        function getVehiclesCollectionRef() {
            if (!db || !userId) {
                console.error("DB or UserID not initialized for collection ref.");
                return null;
            }
            return collection(db, `artifacts/${appId}/users/${userId}/recon_vehicles`);
        }
        function getSettingsDocRef() {
             if (!db || !userId) {
                console.error("DB or UserID not initialized for settings doc ref.");
                return null;
            }
            return doc(db, `artifacts/${appId}/users/${userId}/recon_settings`, SETTINGS_DOC_ID);
        }


        async function loadInitialData() {
            if (!isAuthReady || !db || !userId) {
                console.log("Auth not ready or DB/UserID not set, deferring data load.");
                return;
            }
            console.log("Loading initial data from Firestore...");
            const vehiclesColRef = getVehiclesCollectionRef();
            if (!vehiclesColRef) return;

            onSnapshot(query(vehiclesColRef), (snapshot) => {
                currentVehicleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log("Vehicle data updated from Firestore:", currentVehicleData.length, "vehicles");
                populateInventoryTable();
                updateDashboardView(); 
                updateReportsCharts(); 
                populateStatusFilter('dashboard-status-filter', true, ['Sold', 'Lot Ready']); 
            }, (error) => {
                console.error("Error listening to vehicle collection:", error);
                showMessageModal("Data Error", `Failed to load vehicle data: ${error.message}`);
            });
        }

        // --- CSV/Google Sheet Processing ---
        function processImportedData(data, sourceName) {
            const uploadStatusDiv = sourceName === 'CSV' ? document.getElementById('upload-status') : document.getElementById('google-sheet-sync-status');
            
            const vehicles = data.map(row => mapCsvRowToVehicle(row));
            if (vehicles.length === 0) {
                uploadStatusDiv.textContent = `No valid vehicle data found in ${sourceName}.`;
                uploadStatusDiv.className = 'mt-4 text-yellow-500';
                return;
            }

            try {
                const vehiclesColRef = getVehiclesCollectionRef();
                if (!vehiclesColRef) {
                    showMessageModal("Error", "Cannot get vehicles collection reference.");
                    uploadStatusDiv.textContent = 'Error: Database not ready.';
                    uploadStatusDiv.className = 'mt-4 text-red-500';
                    return;
                }

                const batch = writeBatch(db);
                let processedCount = 0;
                vehicles.forEach(vehicle => {
                    if (vehicle.vin || vehicle.stockNumber) { 
                        const docId = (vehicle.vin || vehicle.stockNumber).replace(/[\.#$\[\]\/]/g, "_"); 
                        const docRef = doc(vehiclesColRef, docId);
                        vehicle.statusHistory = Array.isArray(vehicle.statusHistory) ? vehicle.statusHistory : [];
                        vehicle.totalReconCost = parseFloat(vehicle.totalReconCost) || 0;
                        batch.set(docRef, vehicle, { merge: true }); 
                        processedCount++;
                    }
                });
                
                batch.commit().then(() => {
                    uploadStatusDiv.textContent = `Successfully processed and saved ${processedCount} vehicles from ${sourceName} to database.`;
                    uploadStatusDiv.className = 'mt-4 text-green-500';
                    if (sourceName === 'CSV') {
                        document.getElementById('csv-file-input').value = ''; 
                    }
                }).catch(error => {
                    console.error(`Error saving vehicles from ${sourceName} to Firestore:`, error);
                    uploadStatusDiv.textContent = `Error saving data from ${sourceName}: ${error.message}`;
                    uploadStatusDiv.className = 'mt-4 text-red-500';
                });

            } catch (error) {
                console.error(`Error during ${sourceName} processing:`, error);
                uploadStatusDiv.textContent = `Error processing data from ${sourceName}: ${error.message}`;
                uploadStatusDiv.className = 'mt-4 text-red-500';
            }
        }


        document.getElementById('upload-csv-button').addEventListener('click', async () => {
            const fileInput = document.getElementById('csv-file-input');
            const file = fileInput.files[0];
            const uploadStatusDiv = document.getElementById('upload-status');

            if (!file) {
                uploadStatusDiv.textContent = 'Please select a CSV file first.';
                uploadStatusDiv.className = 'mt-4 text-red-500';
                return;
            }
            if (!isAuthReady || !db) {
                 showMessageModal("Error", "Database connection not ready. Please wait and try again.");
                 return;
            }
            if (typeof window.Papa === 'undefined') { 
                handlePapaParseError('upload-status');
                return;
            }

            uploadStatusDiv.textContent = 'Processing CSV...';
            uploadStatusDiv.className = 'mt-4 text-blue-500';

            window.Papa.parse(file, { 
                header: true,
                skipEmptyLines: true,
                complete: results => processImportedData(results.data, 'CSV'),
                error: error => {
                    console.error("CSV parsing error:", error);
                    uploadStatusDiv.textContent = `Error parsing CSV: ${error.message}`;
                    uploadStatusDiv.className = 'mt-4 text-red-500';
                }
            });
        });
        
        const syncGoogleSheetButton = document.getElementById('sync-google-sheet-button');
        const refreshGoogleSheetButton = document.getElementById('refresh-google-sheet-button');

        function triggerGoogleSheetSync() {
            const syncStatusDiv = document.getElementById('google-sheet-sync-status');
            if (!isAuthReady || !db) {
                 showMessageModal("Error", "Database connection not ready. Please wait and try again.");
                 return;
            }
            if (typeof window.Papa === 'undefined') {
                handlePapaParseError('google-sheet-sync-status');
                return;
            }

            syncStatusDiv.textContent = 'Fetching data from Google Sheet...';
            syncStatusDiv.className = 'mt-4 text-blue-500';

            try {
                fetch(GOOGLE_SHEET_CSV_URL)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Failed to fetch Google Sheet: ${response.status} ${response.statusText}`);
                        }
                        return response.text();
                    })
                    .then(csvText => {
                        window.Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: results => processImportedData(results.data, 'Google Sheet'),
                            error: error => {
                                console.error("Google Sheet CSV parsing error:", error);
                                syncStatusDiv.textContent = `Error parsing Google Sheet data: ${error.message}`;
                                syncStatusDiv.className = 'mt-4 text-red-500';
                            }
                        });
                    })
                    .catch(error => {
                        console.error("Error fetching Google Sheet:", error);
                        syncStatusDiv.textContent = `Error fetching Google Sheet: ${error.message}`;
                        syncStatusDiv.className = 'mt-4 text-red-500';
                    });
            } catch (error) {
                console.error("Error initiating Google Sheet fetch:", error);
                syncStatusDiv.textContent = `Error initiating Google Sheet fetch: ${error.message}`;
                syncStatusDiv.className = 'mt-4 text-red-500';
            }
        }

        if(syncGoogleSheetButton) syncGoogleSheetButton.addEventListener('click', triggerGoogleSheetSync);
        if(refreshGoogleSheetButton) refreshGoogleSheetButton.addEventListener('click', triggerGoogleSheetSync);


        function mapCsvRowToVehicle(row) {
            const normalizedRow = {};
            for (const key in row) {
                let normKey = key.trim().toLowerCase()
                                  .replace(/[^a-z0-9\s_#]/g, '') 
                                  .replace(/\s+/g, '_');       
                if (normKey === 'stock_#' || normKey === 'stock_no' || normKey === 'stock#') normKey = 'stocknum';
                if (normKey === 'age_days' || normKey === 'days_in_inventory' || normKey === 'age_in_days') normKey = 'age';
                if (normKey === 'acq_type' || normKey === 'acquisition' || normKey === 'source') normKey = 'acquisitiontype';
                if (normKey === 'inventory_date' || normKey === 'date_in' || normKey === 'date_entered') normKey = 'entrydate';


                normalizedRow[normKey] = row[key];
            }
        
            const now = new Date().toISOString();
            const entryTimestamp = normalizedRow['entrydate'] ? new Date(normalizedRow['entrydate']).toISOString() : now;

            const initialStep = {
                status: "New Arrival", 
                timestamp: entryTimestamp,
                notes: `Imported. Original Recon Status from sheet: ${normalizedRow['recon_status'] || 'N/A'}`,
            };
            
            return {
                stockNumber: normalizedRow['stocknum'] || normalizedRow['stock_number'] || normalizedRow['stock'] || '',
                vin: normalizedRow['vin'] || '',
                year: parseInt(normalizedRow['year']) || null,
                make: normalizedRow['make'] || '',
                model: normalizedRow['model'] || '',
                bodyStyle: normalizedRow['body_style'] || normalizedRow['bodystyle'] || '',
                trimLevel: normalizedRow['trim_level'] || normalizedRow['trimlevel'] || '',
                extColor: normalizedRow['ext_color'] || normalizedRow['extcolor'] || '',
                intColor: normalizedRow['int_color'] || normalizedRow['intcolor'] || '',
                mileage: parseInt(normalizedRow['mileage']) || 0,
                vehicleType: normalizedRow['type'] || '', 
                ageInInventory: parseInt(normalizedRow['age']) || 0, 
                lotLocation: normalizedRow['lot'] || '', 
                currentReconStatus: "New Arrival", 
                purchaseDate: normalizedRow['purchase_date'] || normalizedRow['purchasedate'] || null,
                entryDate: entryTimestamp, 
                photoStatus: normalizedRow['photo_status'] || normalizedRow['photostatus'] || 'Not Taken',
                photoDate: normalizedRow['photo_date'] || normalizedRow['photodate'] || null,
                notes: normalizedRow['notes'] || '',
                totalReconCost: parseFloat(normalizedRow['recon_cost'] || normalizedRow['reconcost']) || 0, 
                reconCompleteDate: normalizedRow['recon_complete_date'] || normalizedRow['reconcompletedate'] || null,
                daysInRecon: parseInt(normalizedRow['days_in_recon'] || normalizedRow['daysinrecon']) || 0, 
                retailDate: normalizedRow['retail_date'] || normalizedRow['retaildate'] || null,
                acquisitionType: normalizedRow['acquisitiontype'] || '',
                titleInHouse: false, 
                lastUpdated: serverTimestamp(),
                statusHistory: [initialStep], 
                qualityReview: {
                    detailer: "",
                    interior: null,
                    exterior: null,
                    reviewDate: null
                }
            };
        }
        
        // --- UI Rendering and Interaction ---
        const tabs = document.getElementById('tabs');
        const tabContents = document.getElementById('tab-content-area').children;
        const tabButtons = tabs.querySelectorAll('.tab-button');

        tabs.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                const targetTab = e.target.dataset.tab;

                tabButtons.forEach(button => {
                    button.classList.remove('bg-sky-500', 'text-white');
                    button.classList.add('bg-gray-200', 'hover:bg-gray-300');
                });
                e.target.classList.add('bg-sky-500', 'text-white');
                e.target.classList.remove('bg-gray-200', 'hover:bg-gray-300');

                for (let content of tabContents) {
                    content.classList.remove('active');
                }
                document.getElementById(`${targetTab}-content`).classList.add('active');
                if (targetTab === 'dashboard') updateDashboardView(); 
                if (targetTab === 'reports') updateReportsCharts();
                if (targetTab === 'inventory') populateInventoryTable();
            }
        });

        document.getElementById('inventory-view-filter').addEventListener('change', populateInventoryTable);
        document.getElementById('inventory-search').addEventListener('input', populateInventoryTable);
        document.getElementById('dashboard-search').addEventListener('input', updateDashboardView);
        document.getElementById('dashboard-status-filter').addEventListener('change', updateDashboardView);


        function populateInventoryTable() {
            const tableBody = document.getElementById('inventory-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = ''; 

            const searchTerm = document.getElementById('inventory-search').value.toLowerCase();
            const viewFilter = document.getElementById('inventory-view-filter').value;

            let dataToDisplay = [...currentVehicleData]; 

             dataToDisplay = dataToDisplay.filter(vehicle => {
                const matchesSearch = searchTerm === '' ||
                    (vehicle.vin && vehicle.vin.toLowerCase().includes(searchTerm)) ||
                    (vehicle.stockNumber && vehicle.stockNumber.toLowerCase().includes(searchTerm)) ||
                    (vehicle.make && vehicle.make.toLowerCase().includes(searchTerm)) ||
                    (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;

                switch(viewFilter) {
                    case 'active':
                        return vehicle.currentReconStatus !== 'Lot Ready' && vehicle.currentReconStatus !== 'Sold';
                    case 'needs_attention':
                        return (
                            !isStageCompleted(vehicle, "Mechanical") ||
                            !isStageCompleted(vehicle, "Detailing") ||
                            vehicle.photoStatus !== "Taken" ||
                            !vehicle.titleInHouse
                        ) && vehicle.currentReconStatus !== 'Sold' && vehicle.currentReconStatus !== 'Lot Ready';
                    case 'lot_ready':
                        return vehicle.currentReconStatus === 'Lot Ready';
                    case 'sold':
                        return vehicle.currentReconStatus === 'Sold';
                    case 'all':
                        return true;
                    default:
                        return true;
                }
            });

            if (currentSort.column) {
                dataToDisplay.sort((a, b) => {
                    let valA = a[currentSort.column];
                    let valB = b[currentSort.column];

                    if (currentSort.column === 'vehicle') {
                        valA = `${a.year} ${a.make} ${a.model}`;
                        valB = `${b.year} ${b.make} ${b.model}`;
                    } else if (typeof valA === 'string') {
                        valA = valA.toLowerCase();
                        valB = valB.toLowerCase();
                    } else if (typeof valA === 'number') {
                        // No change needed for numbers
                    }


                    if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }


            if (dataToDisplay.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No vehicles found matching criteria.</td></tr>'; 
                return;
            }

            dataToDisplay.forEach(vehicle => {
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td class="border px-3 py-2 text-sm">${vehicle.stockNumber || 'N/A'}</td>
                    <td class="border px-3 py-2 text-sm">${vehicle.vin || 'N/A'}</td>
                    <td class="border px-3 py-2 text-sm">${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}</td>
                    <td class="border px-3 py-2 text-sm">${vehicle.ageInInventory || 0} days</td>
                    <td class="border px-3 py-2 text-sm">${vehicle.acquisitionType || 'N/A'}</td>
                    <td class="border px-3 py-2 text-sm"><span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.currentReconStatus)}">${vehicle.currentReconStatus || 'N/A'}</span></td>
                    <td class="border px-3 py-2 text-sm">${vehicle.titleInHouse ? '<i class="fas fa-check-circle text-green-500"></i> Yes' : '<i class="fas fa-times-circle text-red-500"></i> No'}</td>
                    <td class="border px-3 py-2 text-sm">
                        <button class="view-detail-button text-sky-600 hover:text-sky-800 mr-2" data-id="${vehicle.id}"><i class="fas fa-eye"></i> View</button>
                        <button class="delete-vehicle-button text-red-500 hover:text-red-700" data-id="${vehicle.id}"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                `;
            });
            addInventoryTableEventListeners();
        }
        
        let currentSort = { column: null, direction: 'asc' };

        document.querySelectorAll('#inventory-content th.sortable').forEach(headerCell => {
            headerCell.addEventListener('click', () => {
                const sortColumn = headerCell.dataset.sort;
                if (currentSort.column === sortColumn) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = sortColumn;
                    currentSort.direction = 'asc';
                }
                document.querySelectorAll('#inventory-content th.sortable .sort-arrow').forEach(arrow => arrow.textContent = '');
                const currentArrow = headerCell.querySelector('.sort-arrow');
                if (currentArrow) currentArrow.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
                
                populateInventoryTable();
            });
        });


        function addInventoryTableEventListeners() {
            document.querySelectorAll('.view-detail-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const vehicleId = e.currentTarget.dataset.id;
                    openVehicleDetailModal(vehicleId);
                });
            });
            document.querySelectorAll('.delete-vehicle-button').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const vehicleId = e.currentTarget.dataset.id;
                    const userConfirmed = await showConfirmModal("Confirm Deletion", `Are you sure you want to delete vehicle ${vehicleId}? This cannot be undone.`);
                    if (userConfirmed) {
                        try {
                            const vehiclesColRef = getVehiclesCollectionRef();
                            if (!vehiclesColRef) return;
                            await deleteDoc(doc(vehiclesColRef, vehicleId));
                            showMessageModal("Success", `Vehicle ${vehicleId} deleted.`);
                        } catch (error) {
                            console.error("Error deleting vehicle:", error);
                            showMessageModal("Error", `Failed to delete vehicle: ${error.message}`);
                        }
                    }
                });
            });
        }
        
        function getStatusColor(status) {
            const colors = {
                "New Arrival": "bg-blue-100 text-blue-800",
                "Mechanical": "bg-yellow-100 text-yellow-800",
                "Detailing": "bg-purple-100 text-purple-800",
                "Photos": "bg-pink-100 text-pink-800",
                "Lot Ready": "bg-green-100 text-green-800",
                "Sold": "bg-gray-300 text-gray-800"
            };
            return colors[status] || "bg-gray-100 text-gray-800";
        }

        const modal = document.getElementById('vehicle-detail-modal');
        const closeModalButton = modal.querySelector('.close-modal');
        
        closeModalButton.onclick = () => modal.style.display = 'none';
        window.onclick = (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

        function formatDuration(milliseconds) {
            if (milliseconds < 0 || isNaN(milliseconds)) return "N/A";
            let seconds = Math.floor(milliseconds / 1000);
            let minutes = Math.floor(seconds / 60);
            let hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            hours = hours % 24;
            minutes = minutes % 60;
            seconds = seconds % 60;

            let durationString = "";
            if (days > 0) durationString += `${days}d `;
            if (hours > 0) durationString += `${hours}h `;
            if (minutes > 0) durationString += `${minutes}m `;
            if (days === 0 && hours === 0 ) { 
                 durationString += `${seconds}s`;
            }
            return durationString.trim() || "0s"; 
        }


        function openVehicleDetailModal(vehicleId) {
            activeVehicleId = vehicleId;
            statusToUpdateTo = null; 
            stageBeingCompletedForForm = null;
            
            const vehicle = currentVehicleData.find(v => v.id === vehicleId);
            if (!vehicle) {
                console.error("Vehicle not found for modal:", vehicleId);
                showMessageModal("Error", "Could not find vehicle details.");
                return;
            }

            const modalTitleEl = document.getElementById('modal-vehicle-title');
             if (modalTitleEl) {
                modalTitleEl.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.vin})`;
            } else {
                console.error("CRITICAL ERROR: Element 'modal-vehicle-title' not found.");
            }
            
            const infoDiv = document.getElementById('modal-vehicle-info');
            if (!infoDiv) { 
                console.error("CRITICAL ERROR: Element with ID 'modal-vehicle-info' not found in openVehicleDetailModal. Modal cannot be populated."); 
                showMessageModal("Modal Error", "Could not display vehicle details (DOM element 'modal-vehicle-info' missing). Please check console and report this error.");
                return; 
            }
            try {
                infoDiv.innerHTML = `
                    <p><strong>Stock #:</strong> ${vehicle.stockNumber || 'N/A'}</strong></p>
                    <p><strong>VIN:</strong> ${vehicle.vin || 'N/A'}</p>
                    <p><strong>Acq. Type:</strong> ${vehicle.acquisitionType || 'N/A'}</p>
                    <p><strong>Mileage:</strong> ${vehicle.mileage ? vehicle.mileage.toLocaleString() : 0}</p>
                    <p><strong>Current Status:</strong> <span class="font-semibold ${getStatusColor(vehicle.currentReconStatus).split(' ')[0]} px-1 rounded">${vehicle.currentReconStatus || 'N/A'}</span></p>
                    <p><strong>Total Recon Cost:</strong> $${(vehicle.totalReconCost || 0).toFixed(2)}</p>
                    <p><strong>Photo Status:</strong> ${vehicle.photoStatus || 'N/A'}</p>
                    <p><strong>Title In-House:</strong> ${vehicle.titleInHouse ? '<i class="fas fa-check-circle text-green-500"></i> Yes' : '<i class="fas fa-times-circle text-red-500"></i> No'}</p>
                    <p class="col-span-2"><strong>General Notes:</strong> ${vehicle.notes || 'N/A'}</p>
                `;
            } catch (e) {
                console.error("ERROR during infoDiv.innerHTML assignment:", e);
                console.error("infoDiv at time of error:", infoDiv); 
                showMessageModal("Modal Error", "Failed to set vehicle details content. " + e.message);
                return; 
            }
            
            const interactiveActionsDiv = document.getElementById('modal-interactive-actions'); 
            if (!interactiveActionsDiv) { console.error("CRITICAL ERROR: Element with ID 'modal-interactive-actions' not found in openVehicleDetailModal. Modal actions cannot be built."); return; }

            const statusUpdateFormArea = document.getElementById('modal-status-update-form-area');
            const qualityReviewFields = document.getElementById('modal-quality-review-fields');
            const mechanicalCostFields = document.getElementById('modal-mechanical-cost-fields');
            interactiveActionsDiv.innerHTML = ''; 
            statusUpdateFormArea.classList.add('hidden');
            qualityReviewFields.classList.add('hidden');
            mechanicalCostFields.classList.add('hidden');
            document.getElementById('modal-notes-input').value = '';
            document.getElementById('modal-mechanical-cost').value = '';


            const emailRequestArea = document.getElementById('modal-email-request-area');
             if (!emailRequestArea) { console.error("CRITICAL ERROR: Element with ID 'modal-email-request-area' not found in openVehicleDetailModal."); }
             else { emailRequestArea.innerHTML = ''; }
            
            const isEssentiallyNew = !vehicle.statusHistory || vehicle.statusHistory.length === 0 || 
                                   (vehicle.statusHistory.length === 1 && vehicle.statusHistory[0].notes?.toLowerCase().includes("imported"));

            if (isEssentiallyNew || (vehicle.currentReconStatus === "New Arrival" && vehicle.statusHistory?.length <=1 && !vehicle.statusHistory.some(h => h.status === "Mechanical" && h.notes?.toLowerCase().includes("service request sent")))) {
                 const emailButton = document.createElement('button');
                 emailButton.className = 'action-button action-button-primary mb-3';
                 emailButton.innerHTML = '<i class="fas fa-envelope mr-2"></i>Send Service Request & Start Recon (to Mechanical)';
                 emailButton.onclick = async () => {
                    const emailLog = document.getElementById('modal-email-log');
                    if(emailLog) emailLog.innerHTML = `<strong>Simulated Email Sent:</strong> Service/Inspection request for ${vehicle.vin} at ${new Date().toLocaleTimeString()}`;
                    console.log(`Simulating Service/Inspection email for ${vehicle.vin}`);
                    
                    statusToUpdateTo = "Mechanical"; 
                    stageBeingCompletedForForm = "New Arrival"; 
                    document.getElementById('modal-notes-input').value = "Service request sent; vehicle moved to Mechanical.";
                    await handleModalStatusUpdate(true, false); // isInitialReconStart = true, isButtonCompletionAction = false
                 };
                 if (emailRequestArea) emailRequestArea.appendChild(emailButton);
            }
            
            const currentStatus = vehicle.currentReconStatus;
            const sortedHistory = vehicle.statusHistory ? [...vehicle.statusHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
            
            const photosAreTaken = vehicle.photoStatus === "Taken";

            const createActionButton = (text, targetStatusOnClick, stageBeingActioned, isPrimary = false, iconClass = 'fa-arrow-right', isCompletionAction = false) => {
                const button = document.createElement('button');
                button.className = `action-button ${isPrimary ? 'action-button-primary' : 'action-button-secondary'}`;
                
                if (isStageCompleted(vehicle, stageBeingActioned) && !isCompletionAction && stageBeingActioned !== currentStatus && targetStatusOnClick !== "Lot Ready") {
                     button.classList.remove('action-button-secondary', 'action-button-primary');
                     button.classList.add('action-button-completed');
                     button.disabled = true; 
                }


                button.dataset.targetStatus = targetStatusOnClick; 
                button.dataset.stageBeingActioned = stageBeingActioned; 
                button.dataset.isCompletion = isCompletionAction.toString(); 
                button.innerHTML = `<i class="fas ${iconClass} mr-2"></i> ${text}`; 
                
                button.onclick = () => {
                    if(button.disabled) return;
                    statusToUpdateTo = targetStatusOnClick; 
                    stageBeingCompletedForForm = stageBeingActioned; 
                    
                    const confirmButton = document.getElementById('modal-confirm-status-update-button');
                    if(confirmButton) confirmButton.dataset.isCompletionAction = isCompletionAction.toString();
                    
                    statusUpdateFormArea.classList.remove('hidden'); 

                    const updatingLabel = document.getElementById('modal-updating-to-status-label');
                    if (updatingLabel) updatingLabel.textContent = text; 
                    
                    const confirmNameLabel = document.getElementById('confirm-update-status-name'); // This ID was not found in HTML, ensure it exists or remove this line
                    if(confirmNameLabel) confirmNameLabel.textContent = targetStatusOnClick; 
                    
                    const prevStatusNoteLabel = document.getElementById('previous-status-note-label');
                    if(prevStatusNoteLabel) prevStatusNoteLabel.textContent = stageBeingActioned; 
                    
                    mechanicalCostFields.classList.add('hidden');
                    qualityReviewFields.classList.add('hidden');

                    if (stageBeingActioned === "Mechanical" && isCompletionAction) { 
                        mechanicalCostFields.classList.remove('hidden');
                        document.getElementById('modal-mechanical-cost').focus();
                    } else if (stageBeingActioned === "Detailing" && isCompletionAction) { 
                        qualityReviewFields.classList.remove('hidden');
                        populateDetailerDropdownInModal(); 
                        document.getElementById('modal-detailer-name').value = vehicle.qualityReview?.detailer || '';
                        document.getElementById('modal-interior-quality').value = vehicle.qualityReview?.interior || '';
                        document.getElementById('modal-exterior-quality').value = vehicle.qualityReview?.exterior || '';
                        document.getElementById('modal-detailer-name').focus();
                    } else { 
                        document.getElementById('modal-notes-input').focus();
                    }
                };
                interactiveActionsDiv.appendChild(button);
            };
            
            // Logic for displaying action buttons
            if (currentStatus !== "Sold" && currentStatus !== "Lot Ready") {
                // Mechanical
                if (!isStageCompleted(vehicle, "Mechanical")) {
                    createActionButton(currentStatus === "Mechanical" ? "Complete Mechanical & Add Costs" : "Start/Resume Mechanical", "Mechanical", "Mechanical", currentStatus === "Mechanical", "fa-wrench", currentStatus === "Mechanical");
                } else {
                     const mechEntry = sortedHistory.find(h => h.status === "Mechanical" && h.mechanicalCost !== undefined);
                     if(mechEntry && !interactiveActionsDiv.querySelector('.action-button-completed[data-status="Mechanical"]')) {
                        interactiveActionsDiv.appendChild(createCompletedStepDisplay("Mechanical", mechEntry.timestamp, mechEntry.notes, mechEntry.mechanicalCost));
                     }
                }

                // Detailing
                if (!isStageCompleted(vehicle, "Detailing")) {
                     createActionButton(currentStatus === "Detailing" ? "Complete Detailing & Add Review" : "Start/Resume Detailing", "Detailing", "Detailing", currentStatus === "Detailing", "fa-spray-can", currentStatus === "Detailing");
                } else {
                     const detailEntry = sortedHistory.find(h => h.status === "Detailing" && h.detailer);
                     if(detailEntry && !interactiveActionsDiv.querySelector('.action-button-completed[data-status="Detailing"]')) {
                        interactiveActionsDiv.appendChild(createCompletedStepDisplay("Detailing", detailEntry.timestamp, detailEntry.notes, null, detailEntry.detailer, detailEntry.interiorQuality, detailEntry.exteriorQuality));
                     }
                }
                
                // Photos
                if (!isStageCompleted(vehicle, "Photos")) { 
                     if (currentStatus !== "Photos" && !hasStartedStage(vehicle, "Photos")) { 
                        createActionButton("Start Photos", "Photos", "Photos", false, "fa-camera", false); 
                     } else if (currentStatus === "Photos" && !photosAreTaken) {
                        const p = document.createElement('p');
                        p.className = "text-sm text-center text-gray-600 py-2";
                        p.innerHTML = "<i class='fas fa-info-circle mr-1'></i>Use 'Photo Status' section below to mark photos as 'Taken'.";
                        interactiveActionsDiv.appendChild(p);
                     }
                } else { 
                     if (!interactiveActionsDiv.querySelector('.action-button-completed[data-status="Photos"]')) {
                        interactiveActionsDiv.appendChild(createCompletedStepDisplay("Photos", vehicle.photoDate || "Unknown", "Photos marked as Taken"));
                     }
                }
                
                // Lot Ready
                if (isStageCompleted(vehicle, "Mechanical") && isStageCompleted(vehicle, "Detailing") && photosAreTaken && vehicle.titleInHouse) {
                    createActionButton("Move to Lot Ready", "Lot Ready", currentStatus, true, "fa-store", true); 
                } else if (currentStatus !== "Lot Ready" && currentStatus !== "Sold") { 
                    let prereqMsg = "Prerequisites for Lot Ready: ";
                    const missing = [];
                    if (!isStageCompleted(vehicle, "Mechanical")) missing.push("Mechanical Complete");
                    if (!isStageCompleted(vehicle, "Detailing")) missing.push("Detailing Complete (with Review)");
                    if (!photosAreTaken) missing.push("Photos Taken");
                    if (!vehicle.titleInHouse) missing.push("Title In-House");
                    if (missing.length > 0) {
                        const p = document.createElement('p');
                        p.className = "text-xs text-center text-gray-500 py-2";
                        p.innerHTML = `<i class='fas fa-info-circle mr-1'></i>${prereqMsg} ${missing.join(', ')}.`;
                        interactiveActionsDiv.appendChild(p);
                    }
                }


            } else if (currentStatus === "Lot Ready") {
                interactiveActionsDiv.appendChild(createCompletedStepDisplay("Lot Ready", vehicle.reconCompleteDate || "Unknown"));
                 createActionButton("<i class='fas fa-dollar-sign mr-2'></i>Mark as Sold", "Sold", "Lot Ready", true, "fa-dollar-sign", true);
            }


            // Populate Photo Status and History Log
            document.getElementById('modal-photo-status-select').value = vehicle.photoStatus || 'Not Taken';
            document.getElementById('modal-title-inhouse-checkbox').checked = vehicle.titleInHouse || false;

            
            const emailLogEl = document.getElementById('modal-email-log');
            if (emailLogEl) emailLogEl.textContent = ''; 
            
            const historyLogContainer = document.getElementById('modal-status-history-display');
            if (historyLogContainer) {
                const historyLogDiv = historyLogContainer.querySelector('div');
                if (historyLogDiv) {
                    historyLogDiv.innerHTML = '';
                    if (sortedHistory.length > 0) {
                        sortedHistory.forEach(entry => {
                            const p = document.createElement('p');
                            p.className = 'status-history-entry';
                            const date = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A';
                            let entryText = `<strong class="text-gray-700">${entry.status}</strong> <span class="text-xs text-gray-500">on ${date}</span>`;
                            if (entry.notes) entryText += `<br/><em class="text-xs text-gray-600">Notes: ${entry.notes}</em>`;
                            if (entry.detailer) entryText += `<br/><em class="text-xs text-gray-600">Detailer: ${entry.detailer} (Int: ${entry.interiorQuality || 'N/A'}, Ext: ${entry.exteriorQuality || 'N/A'})</em>`;
                            if (entry.mechanicalCost !== undefined && typeof entry.mechanicalCost === 'number' && !isNaN(entry.mechanicalCost) ) {
                                entryText += `<br/><em class="text-xs text-gray-600">Mech. Cost: $${parseFloat(entry.mechanicalCost).toFixed(2)}</em>`;
                            } else if (entry.status === "Mechanical" && entry.notes?.toLowerCase().includes("completed")) {
                                entryText += `<br/><em class="text-xs text-gray-600">Mech. Cost: $0.00</em>`;
                            }
                            p.innerHTML = entryText;
                            historyLogDiv.appendChild(p);
                        });
                    } else {
                        historyLogDiv.innerHTML = '<p>No status history recorded.</p>';
                    }
                } else {
                     console.error("Element for history log content (div inside modal-status-history-display) not found.");
                }
            } else {
                console.error("Element 'modal-status-history-display' not found.");
            }


            modal.style.display = 'block';
        }

        function createCompletedStepDisplay(statusName, completedTimestamp, notes, cost, detailer, intQuality, extQuality) {
            const div = document.createElement('button'); 
            div.className = 'action-button action-button-completed'; 
            div.disabled = true; 
            div.dataset.status = statusName;
            let content = `<i class="fas fa-check-circle mr-2"></i>${statusName} (Completed: ${completedTimestamp ? new Date(completedTimestamp).toLocaleDateString() : 'N/A'})`;
            if (notes) content += `<br><small class="italic">Notes: ${notes}</small>`;
            
            if (statusName === "Mechanical") {
                if (cost !== undefined && cost !== null && typeof cost === 'number' && !isNaN(cost)) {
                    content += `<br><small>Cost: $${cost.toFixed(2)}</small>`;
                } else {
                    content += `<br><small>Cost: $0.00</small>`; 
                }
            }
            if (detailer) content += `<br><small>Detailer: ${detailer} (Int: ${intQuality || 'N/A'}, Ext: ${extQuality || 'N/A'})</small>`;
            div.innerHTML = content;
            return div;
        }
        
        document.getElementById('modal-confirm-status-update-button').addEventListener('click', () => {
            const confirmButton = document.getElementById('modal-confirm-status-update-button');
            const isCompletion = confirmButton.dataset.isCompletionAction === 'true';
            handleModalStatusUpdate(false, isCompletion);
        });


        async function handleModalStatusUpdate(isInitialReconStart = false, isButtonCompletionActionFlag = false) {
            if (!activeVehicleId || !statusToUpdateTo) return;
            const vehicle = currentVehicleData.find(v => v.id === activeVehicleId);
            if (!vehicle) return;

            const actionedStage = stageBeingCompletedForForm; 
            const targetStatus = statusToUpdateTo; 
            
            let nextCurrentReconStatus = targetStatus; 
            
            const stepNotes = document.getElementById('modal-notes-input').value.trim();
            let mechanicalCost = 0; // Initialize to 0
            
            const isActuallyCompletingMechanical = actionedStage === "Mechanical" && isButtonCompletionActionFlag;
            const isActuallyCompletingDetailing = actionedStage === "Detailing" && isButtonCompletionActionFlag;


            const vehiclesColRef = getVehiclesCollectionRef();
            if (!vehiclesColRef) return;
            const vehicleRef = doc(vehiclesColRef, activeVehicleId);

            const newHistoryEntry = {
                status: actionedStage, 
                timestamp: new Date().toISOString(),
                notes: stepNotes,
                previousStatus: vehicle.currentReconStatus 
            };
             let qualityReviewDataToSave = vehicle.qualityReview || {}; 

            if (isActuallyCompletingMechanical) { 
                let rawCost = document.getElementById('modal-mechanical-cost').value;
                mechanicalCost = (rawCost === "" || rawCost === null || isNaN(parseFloat(rawCost))) ? 0 : parseFloat(rawCost); 
                newHistoryEntry.mechanicalCost = mechanicalCost; 
                newHistoryEntry.notes = stepNotes ? `Mechanical Completed. ${stepNotes}` : "Mechanical Completed.";
                
                const tempVehicleForStatusCheck = { ...vehicle, statusHistory: [...vehicle.statusHistory, newHistoryEntry], mechanicalCost: mechanicalCost, qualityReview: qualityReviewDataToSave }; // Pass current quality review
                nextCurrentReconStatus = determineNextOverallStatus(tempVehicleForStatusCheck);

            } else if (isActuallyCompletingDetailing) { 
                const detailer = document.getElementById('modal-detailer-name').value;
                const interior = document.getElementById('modal-interior-quality').value;
                const exterior = document.getElementById('modal-exterior-quality').value;
                
                if (!detailer || !interior || !exterior) {
                    showMessageModal("Input Required", "Please provide Detailer Name, Interior Quality, and Exterior Quality to complete the Detailing stage.");
                    return; 
                }

                newHistoryEntry.detailer = detailer;
                newHistoryEntry.interiorQuality = interior ? parseInt(interior) : null;
                newHistoryEntry.exteriorQuality = exterior ? parseInt(exterior) : null;
                newHistoryEntry.notes = stepNotes ? `Detailing Completed. ${stepNotes}` : "Detailing Completed.";
                
                qualityReviewDataToSave = {
                    detailer: detailer,
                    interior: newHistoryEntry.interiorQuality,
                    exterior: newHistoryEntry.exteriorQuality,
                    reviewDate: new Date().toISOString()
                };
                 const tempVehicleForStatusCheck = { ...vehicle, statusHistory: [...vehicle.statusHistory, newHistoryEntry], qualityReview: qualityReviewDataToSave };
                nextCurrentReconStatus = determineNextOverallStatus(tempVehicleForStatusCheck);
            }
            
            // If it's just starting a stage (not completing one with special fields)
            else if (!isInitialReconStart) { // Not initial, and not completing Mech/Detail
                newHistoryEntry.notes = stepNotes ? `${actionedStage} Started. ${stepNotes}` : `${actionedStage} Started.`;
                newHistoryEntry.status = actionedStage; 
                nextCurrentReconStatus = actionedStage; 
            }
            
            if (isInitialReconStart && actionedStage === "New Arrival" && targetStatus === "Mechanical") { 
                newHistoryEntry.notes = "Service request sent; vehicle moved to Mechanical.";
                newHistoryEntry.status = "Mechanical"; 
                nextCurrentReconStatus = "Mechanical";
            }


            const updatedStatusHistory = Array.isArray(vehicle.statusHistory) ? [...vehicle.statusHistory, newHistoryEntry] : [newHistoryEntry];
            
            const updateData = {
                currentReconStatus: nextCurrentReconStatus, 
                statusHistory: updatedStatusHistory,
                lastUpdated: serverTimestamp(),
            };
            if (isActuallyCompletingMechanical) { 
                 updateData.totalReconCost = (vehicle.totalReconCost || 0) + mechanicalCost;
            }
            if (isActuallyCompletingDetailing) { // Only update qualityReview if it's a detailing completion
                updateData.qualityReview = qualityReviewDataToSave;
            }
            
            if (nextCurrentReconStatus === "Lot Ready" && !vehicle.reconCompleteDate) {
                updateData.reconCompleteDate = new Date().toISOString();
            }
            if (nextCurrentReconStatus === "Sold" && !vehicle.retailDate) { 
                updateData.retailDate = new Date().toISOString();
            }

            try {
                await updateDoc(vehicleRef, updateData);
                showMessageModal("Success", `Vehicle status updated to ${nextCurrentReconStatus}.`);
                document.getElementById('modal-notes-input').value = '';
                document.getElementById('modal-mechanical-cost').value = '';
                document.getElementById('modal-status-update-form-area').classList.add('hidden');
                openVehicleDetailModal(activeVehicleId); 
            } catch (error) {
                console.error("Error updating vehicle status:", error);
                showMessageModal("Error", `Failed to update status: ${error.message}`);
            }
        }

        function determineNextOverallStatus(vehicleData) {
            // This function assumes vehicleData contains the most up-to-date info for checks
            if (vehicleData.currentReconStatus === "Sold") return "Sold"; // Already sold, no change
            
            const mechCompleted = isStageCompleted(vehicleData, "Mechanical");
            const detailCompleted = isStageCompleted(vehicleData, "Detailing");
            const photosTaken = vehicleData.photoStatus === "Taken";
            const titleIn = vehicleData.titleInHouse;

            if (mechCompleted && detailCompleted && photosTaken && titleIn) {
                return "Lot Ready";
            }
            if (!mechCompleted) return "Mechanical";
            if (!detailCompleted) return "Detailing";
            if (!photosTaken) return "Photos"; 
            
            // Fallback: if it's not any of the above, and not Lot Ready/Sold,
            // it implies some inconsistency or it's in a valid intermediate state.
            // We might prefer to keep its current status if it's a valid active one.
            if (RECON_STATUSES.includes(vehicleData.currentReconStatus) && vehicleData.currentReconStatus !== "New Arrival"){
                 return vehicleData.currentReconStatus;
            }
            return "New Arrival"; // Default if no other active stage applies
        }


        document.getElementById('modal-update-photo-status-button').addEventListener('click', async () => {
            if (!activeVehicleId) return;
            const vehicle = currentVehicleData.find(v => v.id === activeVehicleId);
            if (!vehicle) return;

            const newPhotoStatus = document.getElementById('modal-photo-status-select').value;
            
            const vehiclesColRef = getVehiclesCollectionRef(); 
            if (!vehiclesColRef) return;
            const vehicleRef = doc(vehiclesColRef, activeVehicleId);
            
            const updateData = {
                photoStatus: newPhotoStatus,
                lastUpdated: serverTimestamp()
            };

            if (newPhotoStatus === "Taken" ) { 
                updateData.photoDate = new Date().toISOString(); 
            }
            
            // Determine next overall status after photo update
            const tempVehicleState = { ...vehicle, ...updateData };
            updateData.currentReconStatus = determineNextOverallStatus(tempVehicleState);


            try {
                await updateDoc(vehicleRef, updateData);
                showMessageModal("Success", `Photo status updated to ${newPhotoStatus}. Vehicle status is now ${updateData.currentReconStatus}.`);
                openVehicleDetailModal(activeVehicleId); 
            } catch (error) {
                console.error("Error updating photo status:", error);
                showMessageModal("Error", `Failed to update photo status: ${error.message}`);
            }
        });

        // Listener for Title In-House checkbox
        const titleCheckbox = document.getElementById('modal-title-inhouse-checkbox');
        if(titleCheckbox) {
            titleCheckbox.addEventListener('change', async (e) => {
                if (!activeVehicleId) return;
                const vehicle = currentVehicleData.find(v => v.id === activeVehicleId);
                if (!vehicle) return;

                const vehiclesColRef = getVehiclesCollectionRef();
                if (!vehiclesColRef) return;
                const vehicleRef = doc(vehiclesColRef, activeVehicleId);

                const updateData = {
                    titleInHouse: e.target.checked,
                    lastUpdated: serverTimestamp()
                };

                const tempVehicleState = { ...vehicle, ...updateData };
                updateData.currentReconStatus = determineNextOverallStatus(tempVehicleState);

                try {
                    await updateDoc(vehicleRef, updateData);
                    showMessageModal("Success", `Title status updated. Vehicle status is now ${updateData.currentReconStatus}.`);
                    openVehicleDetailModal(activeVehicleId); 
                } catch (error) {
                    console.error("Error updating title status:", error);
                    showMessageModal("Error", "Failed to update title status.");
                }
            });
        }
        
        // --- Dashboard View Update ---
        function updateDashboardView() {
            const dashboardListDiv = document.getElementById('dashboard-vehicle-list');
            if (!dashboardListDiv) return;
            dashboardListDiv.innerHTML = ''; 

            const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
            const statusFilter = document.getElementById('dashboard-status-filter').value;

            let vehiclesToDisplay = currentVehicleData.filter(v => v.currentReconStatus && v.currentReconStatus !== 'Sold');

            if (statusFilter) {
                 if (statusFilter === 'needs_attention') {
                    vehiclesToDisplay = vehiclesToDisplay.filter(vehicle => 
                        (!isStageCompleted(vehicle, "Mechanical") || 
                         !isStageCompleted(vehicle, "Detailing") || 
                         vehicle.photoStatus !== "Taken" || 
                         !vehicle.titleInHouse) && 
                         vehicle.currentReconStatus !== 'Lot Ready' && 
                         vehicle.currentReconStatus !== 'Sold'
                    );
                } else {
                    vehiclesToDisplay = vehiclesToDisplay.filter(v => v.currentReconStatus === statusFilter);
                }
            }

            if (searchTerm) {
                vehiclesToDisplay = vehiclesToDisplay.filter(vehicle => 
                    (vehicle.vin && vehicle.vin.toLowerCase().includes(searchTerm)) ||
                    (vehicle.stockNumber && vehicle.stockNumber.toLowerCase().includes(searchTerm)) ||
                    (vehicle.make && vehicle.make.toLowerCase().includes(searchTerm)) ||
                    (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm))
                );
            }
            
            vehiclesToDisplay.sort((a,b) => {
                const aLastUpdate = a.statusHistory && a.statusHistory.length > 0 ? new Date([...a.statusHistory].pop().timestamp) : new Date(0);
                const bLastUpdate = b.statusHistory && b.statusHistory.length > 0 ? new Date([...b.statusHistory].pop().timestamp) : new Date(0);
                return aLastUpdate - bLastUpdate; 
            });


            if (vehiclesToDisplay.length === 0) {
                dashboardListDiv.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-full">No vehicles currently matching active reconditioning filters.</p>';
                return;
            }
            
            const totalActiveStagesForProgressBar = RECON_STATUSES.indexOf('Lot Ready'); 

            vehiclesToDisplay.forEach(vehicle => {
                const card = document.createElement('div');
                card.className = 'dashboard-vehicle-card bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 flex flex-col justify-between';
                card.dataset.id = vehicle.id;
                card.addEventListener('click', () => openVehicleDetailModal(vehicle.id));

                let timeInCurrentStatus = "N/A";
                const lastStatusEntry = vehicle.statusHistory && vehicle.statusHistory.length > 0 ? 
                                        [...vehicle.statusHistory].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))[0] : null;
                if(lastStatusEntry && lastStatusEntry.timestamp && lastStatusEntry.status === vehicle.currentReconStatus) {
                    const statusStartDate = new Date(lastStatusEntry.timestamp);
                    if(!isNaN(statusStartDate)) {
                        timeInCurrentStatus = formatDuration(new Date() - statusStartDate);
                    }
                }
                
                let currentStageIndexForProgress = RECON_STATUSES.indexOf(vehicle.currentReconStatus);
                if (vehicle.currentReconStatus === "Lot Ready") {
                    currentStageIndexForProgress = totalActiveStagesForProgressBar; 
                } else if (currentStageIndexForProgress > totalActiveStagesForProgressBar) {
                     currentStageIndexForProgress = totalActiveStagesForProgressBar; 
                }
                
                const progressPercentage = totalActiveStagesForProgressBar > 0 ? Math.max(0, Math.min(100, (currentStageIndexForProgress / totalActiveStagesForProgressBar) * 100)) : 0;

                let historyHTML = '<div class="mt-2 space-y-1 max-h-24 overflow-y-auto">'; 
                if (vehicle.statusHistory && vehicle.statusHistory.length > 0) {
                    const sortedDashHistory = [...vehicle.statusHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    sortedDashHistory.forEach((entry, idx) => {
                        let durationText = "";
                        if (idx > 0) {
                            const prevT = new Date(sortedDashHistory[idx-1].timestamp);
                            const currT = new Date(entry.timestamp);
                            if(!isNaN(prevT) && !isNaN(currT)) durationText = ` <span class="text-gray-500">(${formatDuration(currT - prevT)} in ${sortedDashHistory[idx-1].status})</span>`;
                        }
                        historyHTML += `<p class="dashboard-timeline-entry"><i class="fas fa-check-circle text-green-500 mr-1"></i><strong>${entry.status}</strong> at ${new Date(entry.timestamp).toLocaleDateString()} ${durationText}</p>`;
                    });
                     if (vehicle.currentReconStatus !== "Lot Ready" && vehicle.currentReconStatus !== "Sold") {
                         historyHTML += `<p class="dashboard-timeline-entry"><i class="fas fa-spinner fa-spin text-blue-500 mr-1"></i><strong>${vehicle.currentReconStatus}</strong> (In progress - ${timeInCurrentStatus})</p>`;
                     }
                } else {
                    historyHTML += `<p class="dashboard-timeline-entry">No history</p>`;
                }
                historyHTML += '</div>';
                
                // Pending tasks display
                let pendingTasksHTML = '<div class="mt-2 text-xs"><strong class="text-red-600">Pending:</strong> ';
                const pendingItems = [];
                if (!isStageCompleted(vehicle, "Mechanical")) pendingItems.push('<span class="pending-task-badge pending-mechanical">Mechanical</span>');
                if (!isStageCompleted(vehicle, "Detailing")) pendingItems.push('<span class="pending-task-badge pending-detailing">Detailing</span>');
                if (vehicle.photoStatus !== "Taken") pendingItems.push('<span class="pending-task-badge pending-photos">Photos</span>');
                if (!vehicle.titleInHouse) pendingItems.push('<span class="pending-task-badge pending-title">Title</span>');
                
                if (pendingItems.length > 0) {
                    pendingTasksHTML += pendingItems.join(' ');
                } else {
                    pendingTasksHTML += '<span class="text-green-600">All core tasks complete for Lot Ready consideration.</span>';
                }
                pendingTasksHTML += '</div>';


                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="text-md font-semibold text-sky-700">${vehicle.year} ${vehicle.make} ${vehicle.model}</h4>
                                <p class="text-xs text-gray-500">VIN: ${vehicle.vin || 'N/A'}</p>
                                <p class="text-xs text-gray-500">Stock#: ${vehicle.stockNumber || 'N/A'}</p>
                            </div>
                            <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(vehicle.currentReconStatus)}">${vehicle.currentReconStatus}</span>
                        </div>
                        <div class="text-xs text-gray-600 mb-1">
                            <p><i class="fas fa-calendar-alt mr-1 text-gray-400"></i>Age: <strong>${vehicle.ageInInventory || 0} days</strong></p>
                        </div>
                         ${pendingTasksHTML}
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 mb-1 mt-3">Recon Progress Overview:</p>
                        <div class="w-full progress-bar-bg rounded-full h-2 mb-2">
                            <div class="progress-bar-fg h-2 rounded-full" style="width: ${progressPercentage}%"></div>
                        </div>
                        ${historyHTML}
                    </div>
                `;
                dashboardListDiv.appendChild(card);
            });
        }
        
        // --- Reports Tab Chart Logic ---
        window.reportsWorkflowStatusChartInstance = null;
        window.reportsAvgTimePerStageChartInstance = null;
        window.reportsPhotoStatusChartInstance = null;

        function updateReportsCharts() {
            const chartInstanceMap = {
                'reportsWorkflowStatusChart': 'reportsWorkflowStatusChartInstance',
                'reportsAvgTimePerStageChart': 'reportsAvgTimePerStageChartInstance',
                'reportsPhotoStatusChart': 'reportsPhotoStatusChartInstance',
            };

            const noDataMessage = (canvas) => {
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '16px Inter, sans-serif';
                ctx.fillStyle = '#6b7280'; 
                ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
                ctx.restore();
            };
            
            if (!currentVehicleData || currentVehicleData.length === 0) {
                console.log("No data for reports. Clearing chart canvases.");
                Object.keys(chartInstanceMap).forEach(canvasId => {
                    const instanceName = chartInstanceMap[canvasId];
                    if (window[instanceName]) {
                        window[instanceName].destroy();
                        window[instanceName] = null; 
                    }
                    const canvas = document.getElementById(canvasId);
                    if (canvas) {
                         setTimeout(() => { 
                            const currentCanvas = document.getElementById(canvasId);
                            if(currentCanvas) noDataMessage(currentCanvas);
                        }, 50);
                    }
                });
                
                const avgTotalReconTimeEl = document.getElementById('avgTotalReconTime');
                if (avgTotalReconTimeEl) avgTotalReconTimeEl.textContent = 'N/A';

                const avgPhotoCycleTimeEl = document.getElementById('avgPhotoCycleTime');
                if (avgPhotoCycleTimeEl) avgPhotoCycleTimeEl.textContent = 'N/A';
                
                const avgTimeToFrontlineEl = document.getElementById('avgTimeToFrontline');
                if (avgTimeToFrontlineEl) avgTimeToFrontlineEl.textContent = 'N/A';
                
                const detailerPerformanceArea = document.getElementById('detailer-performance-area');
                if(detailerPerformanceArea) detailerPerformanceArea.innerHTML = '<p class="text-gray-500">No detailing data available yet.</p>';
                
                const stageBottleneckArea = document.getElementById('stage-bottleneck-area');
                 if(stageBottleneckArea) stageBottleneckArea.innerHTML = '<p class="text-gray-500">No data available to analyze bottlenecks yet.</p>';
                
                const vehiclesNeedingPhotosArea = document.getElementById('vehicles-needing-photos-area');
                if (vehiclesNeedingPhotosArea) vehiclesNeedingPhotosArea.innerHTML = '<p class="text-gray-500">No vehicles currently needing photos or data not loaded.</p>';


                return; 
            }

            // Calculate New Metrics
            let totalReconTimeSum = 0;
            let reconTimeCount = 0;
            let photoCycleTimeSum = 0;
            let photoCycleCount = 0;
            const detailerStats = {};
            const currentStageTimings = RECON_STATUSES.filter(s => s !== 'Sold').reduce((acc, s) => { acc[s] = {count: 0, totalDays: 0, maxDays: 0, vehicleIds: []}; return acc; }, {});


            currentVehicleData.forEach(vehicle => {
                const sortedHistory = vehicle.statusHistory ? [...vehicle.statusHistory].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];
                const arrivalEntry = sortedHistory.find(h => h.status === "New Arrival");
                const arrivalTime = arrivalEntry ? new Date(arrivalEntry.timestamp) : (vehicle.entryDate ? new Date(vehicle.entryDate) : null);
                
                if (vehicle.reconCompleteDate && arrivalTime && !isNaN(arrivalTime)) {
                    const completeTime = new Date(vehicle.reconCompleteDate);
                    if(!isNaN(completeTime)) {
                        totalReconTimeSum += (completeTime - arrivalTime);
                        reconTimeCount++;
                    }
                }

                const photosEntry = sortedHistory.find(h => h.status === "Photos");
                if (photosEntry && vehicle.photoDate) { 
                    const photosStartTime = new Date(photosEntry.timestamp);
                    const photosDoneTime = new Date(vehicle.photoDate);
                    if (!isNaN(photosStartTime) && !isNaN(photosDoneTime) && photosDoneTime >= photosStartTime) {
                        photoCycleTimeSum += (photosDoneTime - photosStartTime);
                        photoCycleCount++;
                    }
                }

                // Aggregate Detailer Stats
                sortedHistory.forEach(entry => {
                    if (entry.status === "Detailing" && entry.detailer && entry.interiorQuality && entry.exteriorQuality) {
                        if (!detailerStats[entry.detailer]) {
                            detailerStats[entry.detailer] = { count: 0, totalInterior: 0, totalExterior: 0 };
                        }
                        detailerStats[entry.detailer].count++;
                        detailerStats[entry.detailer].totalInterior += parseInt(entry.interiorQuality);
                        detailerStats[entry.detailer].totalExterior += parseInt(entry.exteriorQuality);
                    }
                });

                // Bottleneck data
                if (vehicle.currentReconStatus && vehicle.currentReconStatus !== 'Sold' && currentStageTimings[vehicle.currentReconStatus]) {
                    const lastEntryForCurrentStatus = sortedHistory.filter(h => h.status === vehicle.currentReconStatus).pop();
                    if (lastEntryForCurrentStatus && lastEntryForCurrentStatus.timestamp) {
                        const daysInStage = (new Date() - new Date(lastEntryForCurrentStatus.timestamp)) / (1000 * 60 * 60 * 24);
                        if (daysInStage >= 0) {
                            currentStageTimings[vehicle.currentReconStatus].count++;
                            currentStageTimings[vehicle.currentReconStatus].totalDays += daysInStage;
                            if (daysInStage > currentStageTimings[vehicle.currentReconStatus].maxDays) {
                                currentStageTimings[vehicle.currentReconStatus].maxDays = daysInStage;
                            }
                            currentStageTimings[vehicle.currentReconStatus].vehicleIds.push(vehicle.id);
                        }
                    }
                }
            });
            
            const avgTotalReconTimeEl = document.getElementById('avgTotalReconTime');
            if (avgTotalReconTimeEl) avgTotalReconTimeEl.textContent = reconTimeCount > 0 ? formatDuration(totalReconTimeSum / reconTimeCount) : 'N/A';
            
            const avgPhotoCycleTimeEl = document.getElementById('avgPhotoCycleTime');
            if (avgPhotoCycleTimeEl) avgPhotoCycleTimeEl.textContent = photoCycleCount > 0 ? formatDuration(photoCycleTimeSum / photoCycleCount) : 'N/A';
            
            const avgTimeToFrontlineEl = document.getElementById('avgTimeToFrontline');
            if (avgTimeToFrontlineEl) avgTimeToFrontlineEl.textContent = reconTimeCount > 0 ? formatDuration(totalReconTimeSum / reconTimeCount) : 'N/A'; 

            // Display Detailer Performance
            const detailerPerformanceArea = document.getElementById('detailer-performance-area');
            if (detailerPerformanceArea) {
                detailerPerformanceArea.innerHTML = ''; 
                if (Object.keys(detailerStats).length > 0) {
                    const table = document.createElement('table');
                    table.className = 'min-w-full divide-y divide-gray-200 text-sm';
                    table.innerHTML = `
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Detailer</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Vehicles Detailed</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Avg. Interior</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Avg. Exterior</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200"></tbody>
                    `;
                    const tbody = table.querySelector('tbody');
                    for (const name in detailerStats) {
                        const stats = detailerStats[name];
                        const avgInt = stats.count > 0 ? (stats.totalInterior / stats.count).toFixed(1) : 'N/A';
                        const avgExt = stats.count > 0 ? (stats.totalExterior / stats.count).toFixed(1) : 'N/A';
                        const row = tbody.insertRow();
                        row.innerHTML = `
                            <td class="px-4 py-2 whitespace-nowrap">${name}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${stats.count}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${avgInt}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${avgExt}</td>
                        `;
                    }
                    detailerPerformanceArea.appendChild(table);
                } else {
                    detailerPerformanceArea.innerHTML = '<p class="text-gray-500">No detailing review data available yet.</p>';
                }
            }

            // Display Stage Bottleneck Analysis
            const stageBottleneckArea = document.getElementById('stage-bottleneck-area');
            if (stageBottleneckArea) {
                stageBottleneckArea.innerHTML = '';
                const table = document.createElement('table');
                table.className = 'min-w-full divide-y divide-gray-200 text-sm';
                table.innerHTML = `
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Stage</th>
                            <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider"># Vehicles</th>
                            <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Avg. Days in Stage</th>
                            <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Max Days in Stage</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200"></tbody>
                `;
                const tbody = table.querySelector('tbody');
                let hasBottleneckData = false;
                RECON_STATUSES.filter(s => s !== 'Sold' && s !== 'Lot Ready').forEach(stage => {
                    const stats = currentStageTimings[stage];
                    if (stats && stats.count > 0) {
                        hasBottleneckData = true;
                        const avgDays = (stats.totalDays / stats.count).toFixed(1);
                        const row = tbody.insertRow();
                        row.innerHTML = `
                            <td class="px-4 py-2 whitespace-nowrap">${stage}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${stats.count}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${avgDays}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${stats.maxDays.toFixed(1)}</td>
                        `;
                    }
                });
                if(hasBottleneckData) {
                    stageBottleneckArea.appendChild(table);
                } else {
                    stageBottleneckArea.innerHTML = '<p class="text-gray-500">No vehicles currently in active recon stages to analyze for bottlenecks.</p>';
                }
            }
            
            // Vehicles Needing Photos Table
            const vehiclesNeedingPhotosArea = document.getElementById('vehicles-needing-photos-area');
            if (vehiclesNeedingPhotosArea) {
                vehiclesNeedingPhotosArea.innerHTML = '';
                const needingPhotos = currentVehicleData.filter(v => v.photoStatus === 'Not Taken' && v.currentReconStatus !== 'Sold' && isStageCompleted(v, "Detailing"));
                if (needingPhotos.length > 0) {
                    const table = document.createElement('table');
                    table.className = 'min-w-full divide-y divide-gray-200 text-sm';
                    table.innerHTML = `
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Stock#</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">VIN</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Vehicle</th>
                                <th class="px-4 py-2 text-left font-medium text-gray-500 tracking-wider">Current Status</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200"></tbody>
                    `;
                    const tbody = table.querySelector('tbody');
                    needingPhotos.forEach(v => {
                        const row = tbody.insertRow();
                        row.dataset.id = v.id; // Add data-id for clickability
                        row.className = 'cursor-pointer hover:bg-gray-50';
                        row.innerHTML = `
                            <td class="px-4 py-2 whitespace-nowrap">${v.stockNumber || 'N/A'}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${v.vin || 'N/A'}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${v.year} ${v.make} ${v.model}</td>
                            <td class="px-4 py-2 whitespace-nowrap">${v.currentReconStatus}</td>
                        `;
                    });
                    vehiclesNeedingPhotosArea.appendChild(table);
                    // Add event listener for clicking rows in this table
                    tbody.addEventListener('click', (e) => {
                        const row = e.target.closest('tr');
                        if (row && row.dataset.id) {
                            openVehicleDetailModal(row.dataset.id);
                        }
                    });

                } else {
                    vehiclesNeedingPhotosArea.innerHTML = '<p class="text-gray-500">All detailed vehicles have photos marked as taken or no vehicles are detailed yet.</p>';
                }
            }


            // 1. Workflow Status Distribution
            const statusCounts = RECON_STATUSES.reduce((acc, status) => { acc[status] = 0; return acc; }, {});
            currentVehicleData.forEach(v => {
                if (v.currentReconStatus && statusCounts.hasOwnProperty(v.currentReconStatus)) {
                    statusCounts[v.currentReconStatus]++;
                }
            });
            const workflowCtx = document.getElementById('reportsWorkflowStatusChart').getContext('2d');
            if (window.reportsWorkflowStatusChartInstance) window.reportsWorkflowStatusChartInstance.destroy();
            window.reportsWorkflowStatusChartInstance = new Chart(workflowCtx, {
                type: 'doughnut',
                data: { labels: RECON_STATUSES, datasets: [{ label: 'Vehicles', data: RECON_STATUSES.map(s => statusCounts[s]), backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(100, 220, 132, 0.7)', 'rgba(200, 200, 200, 0.7)'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

            // 2. Average Time per Stage 
            const avgTimes = RECON_STATUSES.reduce((acc, status) => { acc[status] = 0; return acc; }, {});
            const stageCounts = RECON_STATUSES.reduce((acc, status) => { acc[status] = 0; return acc; }, {});
            
            currentVehicleData.forEach(vehicle => {
                if (vehicle.statusHistory && vehicle.statusHistory.length > 0) { 
                    const sortedHistory = [...vehicle.statusHistory].sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    for (let i = 0; i < sortedHistory.length - 1; i++) {
                        const currentStep = sortedHistory[i];
                        const nextStep = sortedHistory[i+1];
                        if (currentStep.timestamp && nextStep.timestamp && RECON_STATUSES.includes(currentStep.status)) {
                            const t1 = new Date(nextStep.timestamp);
                            const t0 = new Date(currentStep.timestamp);
                            if (!isNaN(t0) && !isNaN(t1)) {
                                const timeInCurrentStage = (t1 - t0) / (1000 * 60 * 60 * 24); 
                                if (timeInCurrentStage >= 0 && isFinite(timeInCurrentStage)) { 
                                    avgTimes[currentStep.status] += timeInCurrentStage;
                                    stageCounts[currentStep.status]++;
                                }
                            }
                        }
                    }
                    
                    const lastHistoryEntry = sortedHistory[sortedHistory.length - 1];
                    if (lastHistoryEntry && lastHistoryEntry.timestamp && vehicle.currentReconStatus && 
                        !["Lot Ready", "Sold"].includes(vehicle.currentReconStatus) && 
                        RECON_STATUSES.includes(vehicle.currentReconStatus) &&
                        vehicle.currentReconStatus === lastHistoryEntry.status) { 
                            
                        const lastEntryTime = new Date(lastHistoryEntry.timestamp);
                        if (!isNaN(lastEntryTime)) {
                            const timeInCurrentStage = (new Date() - lastEntryTime) / (1000 * 60 * 60 * 24);
                            if (timeInCurrentStage >= 0 && isFinite(timeInCurrentStage)) {
                                avgTimes[vehicle.currentReconStatus] += timeInCurrentStage; 
                                stageCounts[vehicle.currentReconStatus]++; 
                            }
                        }
                    }
                }
            });

            const avgTimeData = RECON_STATUSES.map(status => {
                const avg = stageCounts[status] > 0 ? (avgTimes[status] / stageCounts[status]) : 0;
                return parseFloat(avg.toFixed(1));
            });

            const avgTimeCtx = document.getElementById('reportsAvgTimePerStageChart').getContext('2d');
            if (window.reportsAvgTimePerStageChartInstance) window.reportsAvgTimePerStageChartInstance.destroy();
            window.reportsAvgTimePerStageChartInstance = new Chart(avgTimeCtx, {
                type: 'bar',
                data: { labels: RECON_STATUSES.filter(s => s !== "Sold"), datasets: [{ label: 'Avg Days in Stage', data: avgTimeData.filter((_,idx) => RECON_STATUSES[idx] !== "Sold"), backgroundColor: 'rgba(75, 192, 192, 0.7)' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
            
            // Photo Status Chart
            const photoStatusCounts = { "Not Taken": 0, "Taken": 0 }; 
            currentVehicleData.forEach(v => { 
                if (v.photoStatus === "Taken") photoStatusCounts["Taken"]++;
                else photoStatusCounts["Not Taken"]++;
            });
            const photoCtx = document.getElementById('reportsPhotoStatusChart').getContext('2d');
            if (window.reportsPhotoStatusChartInstance) window.reportsPhotoStatusChartInstance.destroy();
            window.reportsPhotoStatusChartInstance = new Chart(photoCtx, {
                type: 'pie',
                data: { labels: Object.keys(photoStatusCounts), datasets: [{ data: Object.values(photoStatusCounts), backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(75, 192, 192, 0.7)'] }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
        
        const messageModal = document.getElementById('message-modal');
        const messageModalTitle = document.getElementById('message-modal-title');
        const messageModalText = document.getElementById('message-modal-text');
        const messageModalOkButton = document.getElementById('message-modal-ok-button');
        const closeMessageModalButton = messageModal.querySelector('.close-message-modal');

        async function showConfirmModal(title, text) {
            return new Promise((resolve) => {
                const confirmModal = document.createElement('div');
                confirmModal.className = 'modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-[200]';
                confirmModal.style.display = 'flex';
                
                confirmModal.innerHTML = `
                    <div class="modal-content bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto">
                        <h3 class="text-xl font-semibold mb-4">${title}</h3>
                        <p class="mb-6">${text}</p>
                        <div class="flex justify-end space-x-3">
                            <button id="confirm-cancel-button" class="py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition">Cancel</button>
                            <button id="confirm-ok-button" class="py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 transition">Confirm</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(confirmModal);

                document.getElementById('confirm-ok-button').onclick = () => {
                    document.body.removeChild(confirmModal);
                    resolve(true);
                };
                document.getElementById('confirm-cancel-button').onclick = () => {
                    document.body.removeChild(confirmModal);
                    resolve(false);
                };
            });
        }


        function showMessageModal(title, text) {
            messageModalTitle.textContent = title;
            messageModalText.innerHTML = text.replace(/\n/g, '<br>'); 
            messageModal.style.display = 'block';
        }
        messageModalOkButton.onclick = () => messageModal.style.display = 'none';
        closeMessageModalButton.onclick = () => messageModal.style.display = 'none';
        window.addEventListener('click', (event) => {
            if (event.target == messageModal) {
                messageModal.style.display = 'none';
            }
        });

        function handlePapaParseError(statusDivId) {
            const statusDiv = document.getElementById(statusDivId);
            const errorMessage = 'Error: CSV parsing library (PapaParse) is not available. CSV features are disabled.';
            if (statusDiv) {
                statusDiv.textContent = errorMessage;
                statusDiv.className = 'mt-4 text-red-500 font-semibold';
            }
            console.error("window.Papa is undefined.");
            showMessageModal("Library Error", "CSV Library (PapaParse) failed to load. CSV upload and export functionality will be unavailable. Please check your internet connection and browser console, then try refreshing the page.");
        }


        document.getElementById('export-csv-button').addEventListener('click', () => {
            if (currentVehicleData.length === 0) {
                showMessageModal("Info", "No data to export.");
                return;
            }
            if (typeof window.Papa === 'undefined') { 
                handlePapaParseError(null); 
                return;
            }
            
            const headers = [
                "id", "stockNumber", "vin", "year", "make", "model", "bodyStyle", "trimLevel", 
                "extColor", "intColor", "mileage", "vehicleType", "ageInInventory", "lotLocation",
                "currentReconStatus", "purchaseDate", "entryDate", "photoStatus", "photoDate", 
                "notes", "totalReconCost", "reconCompleteDate", "daysInRecon", "retailDate",
                "lastUpdated", "qualityReview", "statusHistory", "acquisitionType", "titleInHouse" 
            ];
            
            const csvData = currentVehicleData.map(vehicle => {
                const row = {};
                headers.forEach(header => {
                    if (header === "statusHistory") {
                        row[header] = JSON.stringify(vehicle.statusHistory || []);
                    } else if (header === "qualityReview") {
                         row[header] = JSON.stringify(vehicle.qualityReview || {});
                    } else {
                        row[header] = vehicle[header] !== undefined && vehicle[header] !== null ? vehicle[header] : '';
                    }
                });
                return row;
            });

            const csvString = window.Papa.unparse(csvData, { header: true }); 
            
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            if (link.download !== undefined) { 
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", `recon_export_${new Date().toISOString().slice(0,10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                showMessageModal("Error", "CSV export is not supported in this browser.");
            }
        });
        
        // --- Detailer Management ---
        const addDetailerButton = document.getElementById('add-detailer-button');
        const newDetailerNameInput = document.getElementById('new-detailer-name');
        const detailerListDiv = document.getElementById('detailer-list');

        async function loadDetailerNames() {
            const settingsDocRef = getSettingsDocRef();
            if (!settingsDocRef) return;
            try {
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists() && docSnap.data().detailers) {
                    detailerNames = docSnap.data().detailers;
                } else {
                    detailerNames = []; 
                    await setDoc(settingsDocRef, { detailers: [] }); 
                }
                renderDetailerList();
                populateDetailerDropdownInModal();
            } catch (error) {
                console.error("Error loading detailer names:", error);
            }
        }

        function renderDetailerList() {
            detailerListDiv.innerHTML = '';
            if (detailerNames.length === 0) {
                detailerListDiv.innerHTML = '<p class="text-gray-500">No detailers configured yet.</p>';
                return;
            }
            const ul = document.createElement('ul');
            ul.className = 'list-disc pl-5';
            detailerNames.forEach(name => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center py-1';
                li.textContent = name;
                const deleteButton = document.createElement('button');
                deleteButton.innerHTML = '<i class="fas fa-times text-red-500 hover:text-red-700"></i>';
                deleteButton.className = 'ml-2 p-1';
                deleteButton.onclick = async () => {
                    if (await showConfirmModal("Delete Detailer", `Are you sure you want to delete detailer "${name}"?`)) {
                        await deleteDetailer(name);
                    }
                };
                li.appendChild(deleteButton);
                ul.appendChild(li);
            });
            detailerListDiv.appendChild(ul);
        }
        
        function populateDetailerDropdownInModal() {
            const select = document.getElementById('modal-detailer-name');
            if (!select) return;
            const currentValue = select.value; 
            select.innerHTML = '<option value="">Select Detailer</option>';
            detailerNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                if (name === currentValue) option.selected = true;
                select.appendChild(option);
            });
        }


        addDetailerButton.addEventListener('click', async () => {
            const name = newDetailerNameInput.value.trim();
            if (name && !detailerNames.includes(name)) {
                const settingsDocRef = getSettingsDocRef();
                if (!settingsDocRef) return;
                try {
                    await updateDoc(settingsDocRef, {
                        detailers: arrayUnion(name)
                    });
                    detailerNames.push(name); 
                    renderDetailerList();
                    populateDetailerDropdownInModal();
                    newDetailerNameInput.value = '';
                    showMessageModal("Success", `Detailer "${name}" added.`);
                } catch (error) {
                    console.error("Error adding detailer:", error);
                    showMessageModal("Error", "Failed to add detailer.");
                }
            } else if (detailerNames.includes(name)) {
                 showMessageModal("Info", `Detailer "${name}" already exists.`);
            } else {
                 showMessageModal("Info", "Please enter a detailer name.");
            }
        });

        async function deleteDetailer(name) {
            const settingsDocRef = getSettingsDocRef();
            if (!settingsDocRef) return;
            try {
                await updateDoc(settingsDocRef, {
                    detailers: arrayRemove(name)
                });
                detailerNames = detailerNames.filter(d => d !== name); 
                renderDetailerList();
                populateDetailerDropdownInModal();
                showMessageModal("Success", `Detailer "${name}" removed.`);
            } catch (error) {
                console.error("Error deleting detailer:", error);
                showMessageModal("Error", "Failed to remove detailer.");
            }
        }


        // --- Initial Setup ---
        document.addEventListener('DOMContentLoaded', async () => {
            const uploadButton = document.getElementById('upload-csv-button');
            const exportButton = document.getElementById('export-csv-button');
            const googleSyncButton = document.getElementById('sync-google-sheet-button');
            const csvLibraryStatusDiv = document.getElementById('csv-library-status');
            const csvFileInput = document.getElementById('csv-file-input');


            if (typeof window.Papa === 'undefined') {
                 console.error("CRITICAL: window.Papa is undefined after DOMContentLoaded. The PapaParse script from CDN likely failed to load or execute. Check the network tab in developer tools for errors related to papaparse.min.js.");
                 
                 const papaScriptTag = document.querySelector('script[src*="papaparse"]');
                 const papaCDN = papaScriptTag ? `<code>${papaScriptTag.src}</code>` : 'the configured CDN';

                 const errorMessageHTML = `
                    <div class="flex items-start">
                        <i class="fas fa-times-circle text-red-500 fa-lg mr-3 mt-1"></i>
                        <div>
                            <strong class="font-semibold">Critical Library Error: PapaParse Failed to Load</strong><br>
                            The essential CSV parsing library (PapaParse) could not be loaded from ${papaCDN}. 
                            This is likely due to network connectivity issues, a firewall, or browser/environment restrictions preventing access to this external script.
                            <br><br>
                            <strong>As a result, CSV upload and export features are disabled.</strong>
                            <br><br>
                            <strong>Troubleshooting Steps:</strong>
                            <ul class="list-disc list-inside ml-4 text-sm">
                                <li>Check your internet connection.</li>
                                <li>Ensure the CDN (e.g., <code>cdn.jsdelivr.net</code> or <code>cdnjs.cloudflare.com</code>) is not blocked by a firewall or proxy.</li>
                                <li>Open your browser's Developer Tools (usually F12), go to the "Console" and "Network" tabs, and refresh the page. Look for errors related to <code>papaparse.min.js</code>. The Network tab should show if the script download failed (e.g., status 404, 403, or network error).</li>
                                <li>Try refreshing this page.</li>
                            </ul>
                            If the problem persists, the CDN might be temporarily unavailable or continuously blocked in your current environment.
                        </div>
                    </div>`;
                 
                 showMessageModal("Library Load Failed", "The CSV library (PapaParse) failed to load. CSV features will be disabled. Please check the console and the 'Upload Data' tab for more details and troubleshooting steps.");
                 
                 if(uploadButton) {
                    uploadButton.disabled = true;
                    uploadButton.classList.add('disabled-button');
                 }
                 if(exportButton) {
                    exportButton.disabled = true;
                    exportButton.classList.add('disabled-button');
                 }
                  if(googleSyncButton) {
                    googleSyncButton.disabled = true;
                    googleSyncButton.classList.add('disabled-button');
                 }
                 if(csvFileInput) {
                    csvFileInput.disabled = true;
                 }
                 if(csvLibraryStatusDiv) {
                    csvLibraryStatusDiv.innerHTML = errorMessageHTML;
                    csvLibraryStatusDiv.className = 'mb-4 p-4 rounded-md text-sm bg-red-50 border-l-4 border-red-400 text-red-700';
                 }

            } else {
                console.log("PapaParse appears to be loaded at DOMContentLoaded.");
                 if(csvLibraryStatusDiv) {
                    csvLibraryStatusDiv.innerHTML = '<div class="flex items-center"><i class="fas fa-check-circle text-green-500 fa-lg mr-3"></i><div>CSV Processing Library (PapaParse) loaded successfully. Ready for CSV uploads and Google Sheet Sync.</div></div>';
                    csvLibraryStatusDiv.className = 'mb-4 p-4 rounded-md text-sm bg-green-50 border-l-4 border-green-400 text-green-700';
                 }
            }
            
            initializeFirebase(); 
            document.querySelector('.tab-button[data-tab="dashboard"]').click(); 
        });

    </script>
</body>
</html>
