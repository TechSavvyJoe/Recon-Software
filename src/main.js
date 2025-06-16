/* Main entry point for the Vehicle Reconditioning Tracker app. */
import { db, auth } from './firebase.js';

// Import Chart.js and PapaParse from CDN globals
const Chart = window.Chart;
const Papa = window.Papa;

// --- HTML Template Injection ---
const appDiv = document.getElementById('app');
if (appDiv) {
  appDiv.innerHTML = `
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
        <div id="dashboard-content" class="tab-content p-6 bg-white rounded-lg shadow"></div>
        <div id="reports-content" class="tab-content p-6 bg-white rounded-lg shadow"></div>
        <div id="inventory-content" class="tab-content p-6 bg-white rounded-lg shadow"></div>
        <div id="upload-content" class="tab-content p-6 bg-white rounded-lg shadow"></div>
      </main>
      <div id="vehicle-detail-modal" class="modal"></div>
      <div id="message-modal" class="modal"></div>
    </div>
  `;
}

// --- App Logic ---
// You must migrate all event listeners, rendering, and logic from your previous HTML <script> block here.
// For brevity, only the HTML shell and basic structure are injected above.
// You should now move all the logic for tab switching, Firebase CRUD, CSV, and UI rendering into this file.

// --- Tab Switching Logic ---
function setupTabs() {
  const tabs = document.getElementById('tabs');
  const tabButtons = tabs.querySelectorAll('.tab-button');
  const tabContents = [
    document.getElementById('dashboard-content'),
    document.getElementById('reports-content'),
    document.getElementById('inventory-content'),
    document.getElementById('upload-content')
  ];
  tabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-button')) {
      const targetTab = e.target.dataset.tab;
      tabButtons.forEach(button => {
        button.classList.remove('bg-sky-500', 'text-white');
        button.classList.add('bg-gray-200', 'hover:bg-gray-300');
      });
      e.target.classList.add('bg-sky-500', 'text-white');
      e.target.classList.remove('bg-gray-200', 'hover:bg-gray-300');
      tabContents.forEach(content => content.classList.remove('active'));
      document.getElementById(`${targetTab}-content`).classList.add('active');
    }
  });
  // Default to dashboard
  tabButtons[0].click();
}

document.addEventListener('DOMContentLoaded', setupTabs);

// --- App State ---
let currentVehicleData = [];
let detailerNames = [];
let userId = null;
let isAuthReady = false;
const RECON_STATUSES = ["New Arrival", "Mechanical", "Detailing", "Photos", "Lot Ready", "Sold"];
const SETTINGS_DOC_ID = "reconAppSettings";

// --- Firebase Auth and Data Load ---
import { onAuthStateChanged, signInAnonymously, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, arrayUnion, arrayRemove, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

async function initializeFirebaseApp() {
  await setPersistence(auth, browserLocalPersistence);
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId = user.uid;
      isAuthReady = true;
      await loadDetailerNames();
      loadInitialData();
    } else {
      await signInAnonymously(auth);
    }
  });
}

function getVehiclesCollectionRef() {
  if (!db || !userId) return null;
  return collection(db, `artifacts/default-recon-app/users/${userId}/recon_vehicles`);
}
function getSettingsDocRef() {
  if (!db || !userId) return null;
  return doc(db, `artifacts/default-recon-app/users/${userId}/recon_settings`, SETTINGS_DOC_ID);
}

function loadInitialData() {
  const vehiclesColRef = getVehiclesCollectionRef();
  if (!vehiclesColRef) return;
  onSnapshot(query(vehiclesColRef), (snapshot) => {
    currentVehicleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderInventory();
    renderDashboard();
    renderReports();
  });
}

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
  } catch (error) {
    detailerNames = [];
  }
}

// --- UI Render Functions (Dashboard, Inventory, Reports, Upload) ---
function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  if (!el) return;
  // Example: List vehicles in dashboard
  el.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Active Reconditioning Overview</h2>
    <ul class="divide-y divide-gray-200">
      ${currentVehicleData.map(v => `
        <li class="py-2 flex justify-between items-center">
          <span>${v.year || ''} ${v.make || ''} ${v.model || ''} (${v.vin || 'N/A'})</span>
          <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${v.currentReconStatus || 'N/A'}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderInventory() {
  const el = document.getElementById('inventory-content');
  if (!el) return;
  el.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Vehicle Inventory</h2>
    <button onclick="addDemoVehicle()" class="mb-4 py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition">Add Demo Vehicle</button>
    <table class="min-w-full bg-white border">
      <thead class="bg-sky-600 text-white">
        <tr>
          <th class="py-2 px-3 text-left">Stock#</th>
          <th class="py-2 px-3 text-left">VIN</th>
          <th class="py-2 px-3 text-left">Vehicle</th>
          <th class="py-2 px-3 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        ${currentVehicleData.map(v => `
          <tr>
            <td class="border px-3 py-2 text-sm">${v.stockNumber || ''}</td>
            <td class="border px-3 py-2 text-sm">${v.vin || ''}</td>
            <td class="border px-3 py-2 text-sm">${v.year || ''} ${v.make || ''} ${v.model || ''}</td>
            <td class="border px-3 py-2 text-sm">${v.currentReconStatus || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderReports() {
  const el = document.getElementById('reports-content');
  if (!el) return;
  el.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Recon Reports & Metrics</h2>
    <div class="text-gray-500">(Charts and metrics coming soon)</div>
  `;
}

function renderDetailerList() {
  const el = document.getElementById('upload-content');
  if (!el) return;
  el.innerHTML = `
    <h2 class="text-2xl font-semibold mb-4">Manage Detailers</h2>
    <ul class="list-disc pl-5">
      ${detailerNames.length === 0 ? '<li class="text-gray-500">No detailers configured yet.</li>' : detailerNames.map(name => `<li>${name}</li>`).join('')}
    </ul>
    <div class="mt-4">
      <button onclick="alert('CSV Import coming soon!')" class="py-2 px-4 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition">Import CSV</button>
      <button onclick="alert('CSV Export coming soon!')" class="ml-2 py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 transition">Export CSV</button>
    </div>
    <div class="mt-4 text-gray-500">(Google Sheet sync coming soon)</div>
  `;
}

// --- Minimal content for each tab to verify rendering ---
document.getElementById('dashboard-content').innerHTML = `<h2 class="text-2xl font-semibold">Active Reconditioning Overview</h2><p class="mt-4">Dashboard content goes here.</p>`;
document.getElementById('reports-content').innerHTML = `<h2 class="text-2xl font-semibold">Recon Reports & Metrics</h2><p class="mt-4">Reports content goes here.</p>`;
document.getElementById('inventory-content').innerHTML = `<h2 class="text-2xl font-semibold">Vehicle Inventory</h2><p class="mt-4">Inventory content goes here.</p>`;
document.getElementById('upload-content').innerHTML = `<h2 class="text-2xl font-semibold">Upload & Sync Data</h2><p class="mt-4">Upload content goes here.</p>`;

// --- Add Vehicle (Demo Only) ---
window.addDemoVehicle = async function() {
  if (!isAuthReady || !db || !userId) return;
  const vehiclesColRef = getVehiclesCollectionRef();
  if (!vehiclesColRef) return;
  const newVehicle = {
    stockNumber: '1001',
    vin: 'VIN' + Math.floor(Math.random() * 100000),
    year: 2022,
    make: 'Ford',
    model: 'F-150',
    currentReconStatus: 'New Arrival',
    statusHistory: [{ status: 'New Arrival', timestamp: new Date().toISOString(), notes: 'Demo vehicle added.' }],
    lastUpdated: serverTimestamp()
  };
  await setDoc(doc(vehiclesColRef, newVehicle.vin), newVehicle);
};

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebaseApp();
});
