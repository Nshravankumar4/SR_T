# 🚛 Transport Management & Ledger System

A production-ready Transport Management & Financial Reconciliation application built specifically for transport operations, based on your exact **Shinex Excel data models** (April 2026 to March 2027 and beyond).

---

## 🌐 Live Web Deployment

* **Production URL:** [https://transportmanagement-ten.vercel.app](https://transportmanagement-ten.vercel.app/)
* **Hosting Platform:** Vercel (Auto-deploys securely from private GitHub repository)
* **Status:** Active & SSL Secured

---

## 🚀 Key Features

1. **Modern Left Sidebar Navigation (Top-to-Down):**
   - Sleek dark slate vertical sidebar (`270px`) replacing horizontal top tabs for an intuitive, modern SaaS experience.
   - User profile badge with greeting, role badge, status indicator, and quick logout.
   - Collapsible slide-out menu with hamburger toggle for tablets and smartphones.

2. **📊 Tab #1 Default Dashboard with Personalized Welcome Hero:**
   - Automatically loads upon login with a personalized greeting: `👋 Hello, [Admin1/EAdmin2]! Welcome to Shinex Transport Ledger & Dashboard`.
   - Instant quick action buttons: `➕ Add Transport Record`, `➕ Record Advance`, `📑 View Excel Sheet`, `💾 Export Excel`.
   - 7 key financial metric cards (Total Freight Billed, ToPay Remaining, Total Debt, Total Company Advances, Section 1 Old Balance, Active Section Advances, Net Outstanding).
   - Dynamic multi-section reconciliation grid chaining balances automatically across sections.

3. **Exact 1:1 Live Excel Spreadsheet View:**
   - Visual clone of your Shinex workbook directly inside the browser.
   - Distinct tabs and views for **Section 1 (April – August 2026)**, **Section 2 (NEW August – September 2026)**, and any custom added sections (**Section 3, Section 4...**).
   - Real-time totals, advance deduction blocks, and pixel-matched reconciliation boxes.
   - **⛶ Fullscreen Mode:** Expand the spreadsheet across your display for presentations.
   - **🔍 Zoom Controls (80% Fit, 90%, 100%, 115%):** Dynamically scales all 15 columns to fit any screen without horizontal cutoff.

2. **Chained Multi-Section Financial Reconciliation:**
   - **Section 1 Reconciliation (Closed Period):**
     $$\text{Total Payable (₹18,93,350)} = \text{To Billed (₹16,09,850)} + \text{ToPay Bal (₹2,83,500)}$$
     $$\text{14-08-2026 Net Outstanding (₹10,000)} = \text{Total Payable} - \text{Advances (₹18,83,350)}$$
   - **Section 2 Reconciliation (Active Period):**
     $$\text{Total Payable} = \text{To Billed (Freight Amount)} + \text{14-08-2026 Old Balance (₹10,000)} + \text{ToPay Balance}$$
     $$\text{Net Outstanding} = \text{Total Payable} - \text{Section 2 Advances}$$
   - **Section 3, Section 4... (Chained Recursion):**
     Each subsequent section automatically starts with the preceding section's closing Net Outstanding and date as its starting Old Balance. Every mathematical component is transparently displayed.

3. **Section-Divided Advance Payments Ledger:**
   - Filter advances by section (`All Sections`, `Section 1`, `Section 2`, `Section 3`...) or search by UTR/cheque reference.
   - Instant advance stats bar showing filtered count and total advance sum.
   - Creating advances automatically defaults to the selected section.

4. **Bulletproof Excel (.xlsx) Downloads with AutoFit:**
   - Bundled local engines in `libs/` (`libs/exceljs.min.js`, `libs/FileSaver.min.js`, `libs/xlsx.full.min.js`).
   - Calculates exact cell-by-cell AutoFit column widths (**Alt + H + O + I equivalent**), eliminating truncated text or `###` errors.
   - Works 100% offline and in private environments without external CDN dependencies.

5. **Role-Based Access Control & Strict Employee Isolation:**
   - **Administrator (`Admin1`):** Full control (Add, Edit, Delete trips, advances, and custom sections; manage Settings & API).
   - **Employee (`EAdmin2`):** Data entry & viewing permissions. Strict `.employee-mode` CSS isolation completely hides Settings & API and removes all Delete actions.
   - Web Crypto SHA-256 salted password hashing with brute-force rate limiting.

6. **Dual-Mode Storage & Online Live Status:**
   - Instant browser storage (`localStorage`) ensuring immediate access anywhere.
   - Real-time online status indicator (`🟢 Online • Live Database Active`).
   - Optional ₹0 cloud synchronization to Google Sheets via Google Apps Script (`backend/Code.gs`).

---

## 📁 Project Structure

```text
D:\US\
├── index.html            # Main UI Dashboard, Live Sheet View & Modals
├── css\
│   └── styles.css        # Responsive dashboard, widescreen table & employee isolation styles
├── js\
│   ├── api.js            # Real Shinex dataset, date parsing, and CRUD data bridge
│   ├── auth.js           # Salted SHA-256 authentication & session security
│   ├── transport.js      # Transport table rendering, filters, and modals
│   ├── advances.js       # Section-divided advance payments ledger
│   ├── sheetview.js      # Live Excel spreadsheet replica & zoom controller
│   ├── excel.js          # Exact 1:1 Excel export & AutoFit (Alt+H+O+I) engine
│   └── app.js            # Main application orchestrator & dynamic reconciliation renderer
├── libs\                 # Local vendor libraries (Offline & Private Repo ready)
│   ├── exceljs.min.js    # Excel styling & cell formatting engine
│   ├── FileSaver.min.js  # File download handler
│   └── xlsx.full.min.js  # SheetJS parser and fallback export engine
├── backend\
│   └── Code.gs           # Optional Google Apps Script backend for Google Sheets sync
└── README.md             # Project documentation
```

---

## 🛠️ Usage Instructions

### Default Accounts:
* **Administrator:** Username: `Admin1` | Password: `Shravan@1`
* **Employee:** Username: `EAdmin2` | Password: `EShravan@2`

### Method 1: Using the Live Web App (Vercel)
Open [https://transportmanagement-ten.vercel.app](https://transportmanagement-ten.vercel.app/) on any browser (PC, tablet, mobile) and sign in.

### Method 2: Running Locally from your PC
Double-click `index.html` to run completely offline without internet or local server setup.

---

## ☁️ Google Sheets Cloud Sync Setup (Optional)

1. Open [Google Sheets](https://sheets.new) and create a sheet named **"Transport Management Data"**.
2. Create two tabs: `Transport` and `Advances`.
3. Click **Extensions** ➔ **Apps Script**, paste the contents of `backend/Code.gs`, and click **Deploy ➔ New deployment (Web app, Anyone)**.
4. Copy the Web App URL and paste it into the **⚙️ Settings & API** tab in your application dashboard.
