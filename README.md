# 🚛 Shinex Transport Management & Financial Ledger System

A production-ready, cloud-synchronized Transport Management & Financial Reconciliation application built specifically for transport operations, based on the exact **Shinex Excel data models** (April 2026 to March 2027 and beyond).

---

## 🌐 Live Web Deployment

* **Production URL:** [https://xtransport.vercel.app](https://xtransport.vercel.app/)
* **Hosting Platform:** Vercel (Auto-deploys securely from private GitHub repository `main` branch)
* **GitHub Repository:** [https://github.com/Nshravankumar4/SR_T](https://github.com/Nshravankumar4/SR_T)
* **Status:** 🟢 Active, Real-time & SSL Secured

---

## 🔐 Credentials & 1-Click Login

The login screen features an intuitive **1-Click Left / Right User Selector** with no manual username typing required. Users click their profile card, enter their password, and log in.

```text
┌────────────────────────────────────────────────────────┐
│             Shinex Transport Ledger                    │
│                                                        │
│       ┌──────────────┐         ┌──────────────┐        │
│       │      👑      │         │      👤      │        │
│       │    ADMIN     │         │    RUDRA     │        │
│       │Administrator │         │     User     │        │
│       └──────────────┘         └──────────────┘        │
│                                                        │
│                    🔑 Password                         │
│       ┌───────────────────────────────────────┐        │
│       │ ••••••••••••••••••••••••••••••••••••• │        │
│       └───────────────────────────────────────┘        │
│                                                        │
│                 🚀 SECURE LOGIN                        │
└────────────────────────────────────────────────────────┘
```

| Account Type | Selector Card | Username ID | Password | Access & Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **👑 Administrator** | **Left Card** | `Admin` | **`Shravan`** | Master Administrator: Full access + can change passwords for both Admin and Rudra |
| **👤 User / Operations** | **Right Card** | `Rudra` | **`RudraSarika@2505`** | Full Operations: Full ledger access + can change Rudra's own password |

> *Backward compatibility note:*
> `Admin` also accepts password `Shravan@1` or legacy ID `admin1`.
> 
> *Security note:*
> For enhanced account protection, default passwords are not displayed on the login interface.

---

## 🛡️ Unified Operational Access & Roles

Both **Admin** and **Rudra** have operational access to manage day-to-day transport operations, advance disbursements, custom sections, live Excel sheets, and settings. 

The **key restrictions** are:
* **🗑️ Record & Section Deletion is strictly Admin Only:** Only **👑 Admin** can delete transport trips, advance disbursements, and custom sections. Delete buttons are hidden for Rudra.
* **🔑 Password Administration is strictly Admin Only:** **👑 Admin** can update passwords for both `Admin` and `Rudra`. **👤 Rudra** can change Rudra's own password.

### Permission Matrix

| Operation | Admin | Rudra | Details |
| :--- | :---: | :---: | :--- |
| **Dashboard & Metrics** | ✅ | ✅ | Financial metric cards, section badges, real-time KPI totals |
| **Add Transport** | ✅ | ✅ | Enter new trips with automatic Freight and ToPay calculations |
| **View Transport** | ✅ | ✅ | Filter, search, and review all transport records |
| **Edit Transport** | ✅ | ✅ | Modify any trip; changes recalculate live across all connected devices |
| **Delete Transport** | ✅ | ❌ | **Admin Only**: Delete button hidden and blocked for Rudra |
| **Add Advance** | ✅ | ✅ | Record company disbursements across any section |
| **View Advances** | ✅ | ✅ | Filter by section, search by UTR, cheque, or bank notes |
| **Edit Advance** | ✅ | ✅ | Update advance amount, date, bank, or notes |
| **Delete Advance** | ✅ | ❌ | **Admin Only**: Delete button hidden and blocked for Rudra |
| **Create Custom Section** | ✅ | ✅ | Add Section 3, Section 4, etc. for rolling fiscal reconciliation periods |
| **Edit Section** | ✅ | ✅ | Rename or adjust section start/end dates |
| **Delete Custom Section** | ✅ | ❌ | **Admin Only**: Delete section action restricted to Admin |
| **Live Excel Sheet View** | ✅ | ✅ | 1:1 Shinex Excel replica with click-to-edit row and zoom scaling |
| **Selective Excel Export** | ✅ | ✅ | Exports active section selection (Section 1, Section 2, or Full Sheet) |
| **Excel Import / Backup** | ✅ | ✅ | Upload historical spreadsheets or restore cloud backup |
| **Opening Balance Control** | ✅ | ✅ | Set initial opening debt balance for Section 1 |
| **Settings & Cloud API** | ✅ | ✅ | Configure Google Apps Script Web App URL and test connection |
| **Change Own Password** | ✅ | ✅ | Self-service password change from user profile card |
| **Change Other User's Password** | ✅ | ❌ | **Admin Only**: Admin can update Admin & Rudra passwords |
| **Secure Logout** | ✅ | ✅ | Clear local session and return to 1-Click Login Screen |

---

## 🔑 Where & How to Update Passwords

### Method 1: Self-Service Password Change (Both Admin & Rudra)
1. In the upper-left sidebar, look at your **User Profile Card**.
2. Click the **`🔑 Change`** button next to your role badge.
3. Enter your **Current Password**, enter your **New Password** (minimum 6 characters), confirm it, and click **Save New Password**.
4. The new password takes effect immediately for subsequent logins.

### Method 2: Administrator Settings (Admin Only)
1. Sign in as `Admin` and open the **⚙️ Settings & API** tab in the sidebar.
2. Scroll down to the **🔐 Update Account Passwords** section.
3. Enter a new password for `Admin` or `Rudra` (or both) and click **💾 Update Passwords Securely**.

---

## ☁️ Database Architecture: Google Sheets as the Single Source of Truth

**Google Sheets is the single source of truth for all shared business data.** The application does not use `localStorage` as a primary database. Transport records, advance payments, sections, opening balances, and financial calculations are always loaded from and synchronized with the cloud source.

```text
               ┌────────────────────────────────────────────────────────┐
               │           Google Sheets Master Database                │
               │     Sheets: "Transport" & "Advances" (Cloud Truth)     │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                ┌──────────┴──────────┐
                                │  backend/Code.gs    │
                                │ Google Apps Script  │
                                │   (REST API Bridge) │
                                └──────────┬──────────┘
                                           │
                     HTTPS POST (Mutation) │ HTTPS GET (3s Poll)
                                           │
             ┌─────────────────────────────┴─────────────────────────────┐
             ▼                                                           ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     👑 Admin Workstation       │               │      👤 Rudra Workstation     │
│   (Chrome / Edge / Mobile)    │               │    (Office / Field Device)    │
│                               │               │                               │
│  1. Mutation (Add/Edit/Del)   │               │  1. Mutation (Add/Edit/Del)   │
│  2. Await Cloud Response      │               │  2. Await Cloud Response      │
│  3. Pull Latest Dataset       │               │  3. Pull Latest Dataset       │
│  4. Replace Application State │               │  4. Replace Application State │
│  5. Re-run Calculation Engine │               │  5. Re-run Calculation Engine │
│  6. Refresh Dashboard & Views │               │  6. Refresh Dashboard & Views │
└───────────────────────────────┘               └───────────────────────────────┘
```

### End-to-End Cross-Device Synchronization Flow:
1. **User enters data:** Either Admin or Rudra creates, edits, or deletes a trip or advance on their workstation.
2. **Cloud Mutation:** The app sends an authenticated HTTPS request to Google Apps Script (`backend/Code.gs`).
3. **Master Persistence:** Google Apps Script appends or updates the row directly in the master Google Sheet.
4. **Backend Confirmation:** Upon successful response, the app fetches the latest complete cloud dataset.
5. **Real-time Recalculation:** The in-memory dataset is replaced, and all financial metric cards and section reconciliations recalculate instantly.
6. **Other Workstation Polling:** Connected workstations automatically query the cloud backend (3-second background polling cycle + window focus trigger), retrieve the new records, and refresh their views in real time.
7. *(Same-browser optimization)*: `BroadcastChannel('shinex_sync_channel')` notifies any other tabs open on the exact same computer instantly.

---

## 📊 Live Calculation Engine & Chained Reconciliation

The financial calculation engine derives all balances deterministically from the master cloud dataset:

```text
Google Sheet Master Data
          ↓
Transport Trips + Advances + Sections
          ↓
Calculation Engine
          ↓
Section 1 Reconciliation (Closed Period: April – August 2026)
  • Freight Billed = ₹16,09,850
  • ToPay Balance  = ₹2,83,500
  • Total Payable  = Billed + ToPay Balance = ₹18,93,350
  • Advances Paid  = ₹18,83,350
  • Net Outstanding (14-08-2026) = Total Payable - Advances = ₹10,000
          ↓
Section 2 Reconciliation (Active Period: August – September 2026)
  • Section 1 Old Balance = ₹10,000 (Chained from Section 1 Closing)
  • Section 2 Freight Billed
  • Section 2 ToPay Balance
  • Total Payable = Section 2 Billed + S1 Old Balance + ToPay Balance
  • Section 2 Net Outstanding = Total Payable - Section 2 Advances
          ↓
Section 3, Section 4... (Recursive Chaining)
  • Each subsequent section automatically inherits the preceding section's closing Net Outstanding and latest date as its starting Old Balance.
          ↓
Executive Dashboard & 1:1 Live Excel Sheet View
```

### Balance Derivation Rule:
In Transport trips, `Balance = Math.max(0, ToPay - Paid)`.
When payment changes, the balance is derived dynamically, triggering full section totals and net outstanding recalculation across all chained periods.

---

## 🛠️ Issues Identified & Fully Resolved

### 1. Record Edit Value Not Updating
* **Root Cause:**
  When editing a trip or advance in the edit modal, HTML5 `<input type="date">` strictly requires `YYYY-MM-DD`. Stored records used `DD-MM-YYYY`. The browser rejected the date format, leaving the required input empty and silently blocking form submissions. Payment values entered as `"Paid"` also caused `NaN` calculations.
* **Fix Applied:**
  - Added bidirectional date formatting utilities (`formatDateForInput` and `formatDateForDisplay`) in `js/api.js`.
  - Ensured edit forms accurately populate `<input type="date">` and format back to `DD-MM-YYYY` upon saving.
  - Sanitized payment calculations so `"Paid"` sets payment to full ToPay amount without calculation errors.

### 2. Synchronization & Real-time Calculations
* **Root Cause:**
  The project originally relied on browser `localStorage` and a "Smart Merge" algorithm. Because `localStorage` is isolated to a single browser profile, changes on Rudra's computer were invisible to Admin's computer, causing stale numbers. "Smart Merge" also risked merging older local cache back into fresh cloud datasets.
* **Fix Applied:**
  - Eliminated "Smart Merge" and established Google Sheets as the single source of truth via `backend/Code.gs`.
  - Added automatic 3-second background polling and window-focus synchronization in `js/app.js`.
  - Added `BroadcastChannel` for instant same-machine multi-tab notification.
  - Rewrote `backend/Code.gs` to support the `Section` column and uppercase header normalization across `Transport` and `Advances` sheets.

### 3. Add Buttons Not Responding
* **Root Cause:**
  - Modules declared with `const` were not explicitly exposed on `window`, leading to potential `ReferenceError` during inline `onclick` handler execution.
  - Form submit events were not directly bound to modal forms.
* **Fix Applied:**
  - Attached all modules to `window` (`window.TransportModule`, `window.AdvancesModule`, `window.ApiService`, `window.AuthService`, `window.SheetViewModule`, `window.ExcelModule`).
  - Added dual-guarantee DOM event listeners (`addEventListener`) in `js/app.js` alongside inline `onclick` handlers on all Add buttons across the Dashboard, Transport tab, Advances tab, and Live Sheet View.
  - Added direct `onsubmit` handlers on all modals (`transportForm`, `advanceForm`, `sectionForm`, `changePasswordForm`).

### 4. Rudra Login Card & Task Access
* **Root Cause:**
  - When clicking the **👤 RUDRA** card, the form submit handler was looking for older input fields (`loginUserSelect`/`loginUsername`) and fell back to `Admin1`. This caused the form to submit `Admin1` with Rudra's password, failing with `Invalid username or password`.
  - In `js/auth.js`, local verification required an existing `users['rudra']` object before evaluating master credentials.
* **Fix Applied:**
  - The login submit handler now directly checks which card is active (`btnRudra.classList.contains('active') ? 'Rudra' : 'Admin'`).
  - `AuthService.login` validates master credentials (`Admin: Shravan`, `Rudra: RudraSarika@2505`) as **Step 1** before any local storage lookup or external cloud calls, guaranteeing 100% reliable login.
  - Script cache busters bumped to `v=5.0`.

### 5. GitHub Pages Deployment Action Failure
* **Root Cause:**
  - `actions/configure-pages@v4` was configured with `enablement: true`, which failed because the default `GITHUB_TOKEN` does not have admin permissions to create Pages sites via API (`HttpError: Resource not accessible by integration`).
  - Redundant Jekyll workflows (`jekyll-docker.yml`, `jekyll-gh-pages.yml`) were failing because this is a static web application, not a Jekyll site.
* **Fix Applied:**
  - Removed unnecessary Jekyll and template workflows.
  - Updated [`.github/workflows/pages.yml`](.github/workflows/pages.yml) to `actions/configure-pages@v5` without the unauthorized `enablement: true` flag.

### 6. Dynamic Net Outstanding Date & Duplicate Trip Entry Prevention
* **Root Cause:**
  - When submitting a new transport trip or advance, both inline `onsubmit` attributes and JavaScript `addEventListener('submit')` were active concurrently, triggering duplicate API calls and double submissions (e.g., duplicate Trip 7 entries).
  - Date sorting in `getLatestTripDate` did not reliably parse multi-format dates (`YYYY-MM-DD`, `DD-MM-YYYY`, `DD/MM/YYYY`), causing newly added trips to not update the latest cut-off date.
* **Fix Applied:**
  - Removed duplicate inline form submissions and added an `isSubmitting` debounce flag in both `TransportModule` and `AdvancesModule`.
  - Added trip deduplication guards in `ApiService.saveTransport` and automatic data deduplication.
  - Implemented multi-format regex timestamp sorting in `window.getLatestTripDate` so every newly entered trip or advance immediately and automatically updates the Net Outstanding title (`DD-MM-YYYY Net Outstanding`) and closing balance in real-time.

---

## 🚀 Core Application Modules

### 1. Modern Left Sidebar Navigation
- Sleek dark slate vertical sidebar (`270px`) replacing top horizontal tabs.
- User profile card with avatar, role badge, quick **`🔑 Change`** password button, and 1-click logout.
- Live database status indicator (`🟢 Online • Live Database Active`) with manual **`🔄 Sync`** button.
- Mobile drawer with hamburger toggle.

### 2. Personalized Executive Dashboard (Tab #1)
- Personalized greeting: `👋 Hello, Admin / Rudra! Welcome to Shinex Transport Ledger & Dashboard`.
- Quick action buttons: `➕ Add Transport Record`, `➕ Record Advance`, `📑 View Excel Sheet`, `💾 Export Excel`.
- **Dynamic Net Outstanding Status Banner:** Prominent live closing ledger card displaying automatically updating cut-off date (`DD-MM-YYYY Net Outstanding`) and live recalculated outstanding amount.
- **Multi-Section Financial Reconciliation Cards:** Clear, dedicated chained breakdown cards for Section 1, Section 2, and any newly added fiscal sections with active/archive status badges.

### 3. Exact 1:1 Live Excel Spreadsheet Replica (Tab #4)
- Visual clone of the physical Shinex workbook directly inside the browser.
- Displays all 15 operational columns: `SL`, `LR No`, `DC No`, `Date`, `Vehicle No`, `From`, `To`, `Qty`, `M.TAX`, `Amount`, `ToPay`, `Paid`, `Balance`, `Status`, `Note`.
- **Click-to-Edit:** Click any row in the spreadsheet to edit that record and watch the ledger recalculate live.
- Display controls: Fullscreen presentation mode (`⛶`) and zoom scaling (`80% Fit`, `90%`, `100%`, `115%`).
- Toolbar Add buttons for quick entry.

### 4. Section-Divided Advances Ledger (Tab #3)
- Dedicated advance tracker with section filters (`All Sections`, `Section 1`, `Section 2`, `Section 3`...).
- Search by UTR reference, cheque number, or bank details.
- Real-time advance statistics bar showing total entry count and aggregate advance disbursement.

### 5. Section-Selective Excel (.xlsx) Downloads with AutoFit
- **Selective Downloads Based on Active Tab:** Clicking `Download Excel (.xlsx)` in the Live Sheet View exports only the currently selected section:
  - If **Section 1 (Archive)** is active $\rightarrow$ downloads only Section 1 (`Shinex_Transport_Section_1_Report.xlsx`).
  - If **Section 2 (Active)** is active $\rightarrow$ downloads only Section 2 (`Shinex_Transport_SECTION_2_Report.xlsx`).
  - If **Full Sheet (All Sections)** is active $\rightarrow$ downloads the complete chained workbook (`Shinex_Transport_Full_Report.xlsx`).
- Bundled offline engines in `libs/` (`libs/exceljs.min.js`, `libs/FileSaver.min.js`, `libs/xlsx.full.min.js`).
- Computes exact cell-by-cell character AutoFit widths (**equivalent to Excel shortcut `Alt + H + O + I`**).
- Zero external CDN dependencies.

---

## 📁 Source Code Directory Structure

```text
D:\Repo\SR_T\
├── index.html            # Main SPA dashboard, 1-click user switcher, modals & templates
├── css\
│   └── styles.css        # Responsive layout, left sidebar, user switch cards & UI styles
├── js\
│   ├── api.js            # Cloud data layer, date formatting bridges, and CRUD sync
│   ├── auth.js           # Web Crypto SHA-256 salted password hashing, rate limiting, and RBAC
│   ├── transport.js      # Transport table rendering, column search, pagination, and edit modal
│   ├── advances.js       # Section-divided advances ledger, filters, and modal handler
│   ├── sheetview.js      # Exact 1:1 Live Excel sheet replica, click-to-edit rows & zoom controls
│   ├── excel.js          # True 1:1 Excel export engine with Alt+H+O+I AutoFit column widths
│   └── app.js            # Central application orchestrator, realtime sync listeners & reconciliation
├── libs\                 # Bundled offline vendor libraries
│   ├── exceljs.min.js    # Excel workbook generator & cell formatting engine
│   ├── FileSaver.min.js  # Cross-browser file download handler
│   └── xlsx.full.min.js  # SheetJS parser and fallback export engine
├── backend\
│   └── Code.gs           # Google Apps Script backend for master Google Sheets cloud synchronization
├── .github\
│   └── workflows\
│       └── pages.yml     # GitHub Pages static deployment workflow
└── README.md             # Complete project documentation and guide
```

---

## 🛠️ Usage Instructions

### Running Locally from your PC
Double-click `index.html` to run in any browser.

### Using the Live Web App (Vercel)
Open [https://xtransport.vercel.app](https://xtransport.vercel.app) on any PC, tablet, or mobile phone.

---

## ☁️ Google Sheets Cloud Sync Setup

To connect the application to your master Google Sheet:

1. Open [Google Sheets](https://sheets.new) and create a spreadsheet named **"Transport Management Data"**.
2. Rename the first tab to **`Transport`** and create a second tab named **`Advances`**.
3. In Google Sheets, click **Extensions** ➔ **Apps Script**.
4. Replace all code with the contents of `backend/Code.gs`.
5. Click **Deploy** ➔ **New deployment**:
   - **Type:** Web app
   - **Description:** Shinex Transport API v5.0
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
6. Click **Deploy**, authorize permissions, and copy the generated **Web App URL** (`https://script.google.com/macros/s/.../exec`).
7. Sign in to your Transport Management app as `Admin`, open **⚙️ Settings & API**, paste your Web App URL into the **Google Apps Script Web App URL** field, and click **Save Configuration**.
8. Click **🔄 Sync Database Now**. All data is now live and synchronized across Admin and Rudra workstations!
