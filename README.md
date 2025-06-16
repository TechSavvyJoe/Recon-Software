# Vehicle Reconditioning Tracker

A web app to track and manage the vehicle reconditioning workflow, including inventory, status, detailers, and reporting.

## Features
- Dashboard, Reports, Inventory, and Upload Data tabs
- Vehicle CRUD (add, view, delete, update status)
- CSV import/export and Google Sheet sync
- Detailer management
- Data visualization (charts, tables)
- Responsive UI with Tailwind CSS

## Getting Started

1. **Install dependencies:**
   ```zsh
   npm install
   ```
2. **Configure Firebase:**
   - Copy `.env.example` to `.env` and fill in your Firebase project credentials.
3. **Run Tailwind in development mode:**
   ```zsh
   npm run dev
   ```
4. **Open `public/index.html` in your browser.**

## Build for Production
```zsh
npm run build
```

## Project Structure
- `public/` — Static assets and `index.html`
- `src/` — JavaScript and CSS source files
- `.env.example` — Example Firebase config

## Dependencies
- Tailwind CSS
- Chart.js
- PapaParse
- Firebase (add your config)

---

**Note:** This project is static and uses Firebase via CDN. For advanced usage, consider moving Firebase config to `src/firebase.js` and using environment variables.

MIT License
