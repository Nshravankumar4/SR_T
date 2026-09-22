# 🚛 Transport Management & Ledger System

A production-ready Transport Management & Financial Reconciliation application built specifically for transport operations, based on your exact **Shinex Excel data models** (April 2026 to March 2027).

---

## 🌐 Live Web Deployment

* **Production URL:** [https://transportmanagement-ten.vercel.app](https://transportmanagement-ten.vercel.app/)
* **Hosting Platform:** Vercel (Auto-deploys securely from private GitHub repository)
* **Status:** Active & SSL Secured

---

## 🚀 Key Features

1. **Exact 1:1 Live Excel Spreadsheet View:**
   - Visual clone of the original Shinex workbook right in the browser.
   - Distinct **Section 1 (April – August 2026)** and **Section 2 (NEW August – September 2026)** with real-time totals and pixel-matched reconciliation boxes.
   - **⛶ Fullscreen Mode:** Expand the spreadsheet across the entire display.
   - **🔍 Zoom Controls (80% Fit, 90%, 100%, 115%):** Dynamically scales all 15 columns to fit any laptop or monitor without horizontal scrolling.

2. **Dual-Section Financial Reconciliation:**
   - **Section 1 Reconciliation (Closed Period):**
     $$\text{Total Payable (₹18,93,350)} = \text{To Billed (₹16,09,850)} + \text{ToPay Bal (₹2,83,500)}$$
     $$\text{14-08-2026 Balance (₹10,000)} = \text{Total Payable} - \text{Advances (₹18,83,350)}$$
   - **Section 2 Reconciliation (Active Period):**
     $$\text{Total Payable} = \text{To Billed (Section 2 Amount)} + \text{Old Balance (₹10,000)}$$
     $$\text{Net Outstanding} = \text{Total Payable} - \text{Section 2 Advances (₹4,50,000)}$$

3. **Bulletproof Excel (.xlsx) Downloads:**
   - Bundled with local spreadsheet engines in `libs/` (`libs/exceljs.min.js`, `libs/FileSaver.min.js`, `libs/xlsx.full.min.js`).
   - Works 100% offline, in private repositories, and on web hosts without CDN network failure.
   - Dual-engine fallback: If one engine encounters a browser restriction, the backup engine automatically takes over.
   - Dynamic auto-fitting column widths so notes like *"halting at 2 days loading pnt"* and cities like *"Sabdhan & kaliachak"* are never truncated.

4. **Role-Based Access Control:**
   - **Administrator:** Full permissions (Add, Edit, and Delete any transport or advance entry, manage settings).
   - **Employee:** Data entry and read-only viewing permissions.
   - Web Crypto SHA-256 salted password hashing with brute-force rate limiting (temporary lockout after consecutive failed attempts).

5. **Dual-Mode Storage & Cloud Sync:**
   - Works immediately offline using browser `localStorage`.
   - Optionally syncs live to a private Google Sheet via Google Apps Script (`backend/Code.gs`).

---

## 📁 Project Structure

```text
D:\US\
├── index.html            # Main UI Dashboard & Secure Login
├── css\
│   └── styles.css        # Responsive layout, widescreen table, and fullscreen overlay
├── js\
│   ├── api.js            # Data layer bridge (Local storage + Google Apps Script)
│   ├── auth.js           # Salted SHA-256 authentication & session security
│   ├── transport.js      # Transport ledger table rendering and CRUD actions
│   ├── advances.js       # Company advance payments ledger and modals
│   ├── sheetview.js      # Live in-browser Excel replica, Fullscreen & Zoom controller
│   ├── excel.js          # Exact 1:1 Excel export & import engine with fallbacks
│   └── app.js            # Application controller and metrics computation
├── libs\                 # Local high-performance vendor libraries (Offline & Private Repo ready)
│   ├── exceljs.min.js    # Excel styling & cell formatting engine
│   ├── FileSaver.min.js  # File download handler
│   └── xlsx.full.min.js  # SheetJS parser and fallback export engine
├── backend\
│   └── Code.gs           # Optional Google Apps Script backend for Google Sheets sync
└── README.md             # Project documentation
```

---

## 🛠️ Usage Instructions

### Method 1: Using the Live Web App (Vercel)
Open [https://transportmanagement-ten.vercel.app](https://transportmanagement-ten.vercel.app/) on any device (computer, tablet, or phone) and sign in.

### Method 2: Running Locally from your PC (Offline & Private)
1. Double-click `index.html` in your local project folder to launch in Chrome, Edge, or Firefox.
2. Sign in with your configured credentials.
3. Add trips, record advances, view the live sheet, or download `.xlsx` files without needing internet access.

---

## ☁️ Google Sheets Cloud Sync Setup (Optional)

1. Open [Google Sheets](https://sheets.new) and create a sheet named **"Transport Management Data"**.
2. Create two tabs: `Transport` and `Advances`.
3. Click **Extensions** ➔ **Apps Script**, paste the contents of `backend/Code.gs`, and click **Deploy ➔ New deployment (Web app, Anyone)**.
4. Copy the Web App URL and paste it into the **⚙️ Settings & API** tab in your application dashboard.
