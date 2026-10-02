# 🚛 Shinex Ledger — Transport & Accounts

A cloud-synchronised transport and accounts ledger for **Shinex UQ Genetic Seeds Pvt. Ltd.**
Built as a **vanilla-JavaScript single-page app** (no framework, no build step, no CDN) on top of a
**Google Sheets** database reached through a **Google Apps Script** web app.

* **Live app:** <https://xtransport.vercel.app>
* **Repository:** <https://github.com/Nshravankumar4/SR_T> (private)
* **Backend:** Google Apps Script web app → Google Sheets
* **Live ledger snapshot (02-10-2026):** 36 trips · 16 advances · `DATA_VERSION` 239

---

## Table of contents

1. [What this app does](#1-what-this-app-does)
2. [Quick start](#2-quick-start)
3. [Accounts and permissions](#3-accounts-and-permissions)
4. [How the system is put together](#4-how-the-system-is-put-together)
5. [The calculation engine](#5-the-calculation-engine)
6. [Features, tab by tab](#6-features-tab-by-tab)
7. [Excel export and import](#7-excel-export-and-import)
8. [Backup and recovery](#8-backup-and-recovery)
9. [Cross-device synchronisation](#9-cross-device-synchronisation)
10. [Security model](#10-security-model)
11. [Project structure](#11-project-structure)
12. [Deployment](#12-deployment)
13. [Troubleshooting](#13-troubleshooting)
14. [Further documentation](#14-further-documentation)

---

## 1. What this app does

Shinex runs freight trips between its plants and destinations. Each trip creates:

* a **freight bill** (the *Amount*), and
* sometimes an **amount still to be paid** (*ToPay*), which is later settled *Paid*, partly paid, or left outstanding.

Advances (money paid to transporters up-front) are recorded separately and are deducted from what the
company owes. Because the ledger is a chain, everything is split into **Sections** — closed periods
(Section 1) and the live period (Section 2, Section 3, …). Each section opens with the previous
section's closing **Net Outstanding**, so the whole year reconciles without any file juggling.

The app is used by two people:

| Person | Role | What they do |
| :--- | :--- | :--- |
| **Shravan** | 👑 Administrator | Everything, plus deletes, section management, cloud settings |
| **Rudra** | 👤 Employee | Daily data entry and viewing, no deletes |

---

## 2. Quick start

### Use the live app

Open <https://xtransport.vercel.app> on any phone, tablet or PC, pick your user card, type your
password, press **🚀 Secure Login**.

### Run it locally

There is no build step and no `npm install`. Any static server works:

```bash
# option A — just open the file
start index.html                 # Windows
open  index.html                 # macOS

# option B — small local server (recommended, matches production)
python -m http.server 8123 --bind 127.0.0.1
# then browse http://127.0.0.1:8123/index.html
```

The app talks to the same cloud backend when it runs locally, so local and hosted views stay identical.

---

## 3. Accounts and permissions

### Credentials

| Card | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| 👑 ADMIN | `Admin` | `Shravan` | `Shravan@1` and `admin1` also work |
| 👤 RUDRA | `Rudra` | `RudraSarika@2505` | `Rudra` and `sarika` also work as aliases |

Passwords can be changed in-app (see [Security model](#10-security-model)). The change is pushed to
Apps Script, so it takes effect on **every device** at the next login.

### Permission matrix

| Capability | Admin | Rudra | Enforced by |
| :--- | :---: | :---: | :--- |
| Dashboard, metrics, reconciliation cards | ✅ | ✅ | — |
| Add / edit transport records | ✅ | ✅ | — |
| Add / edit advances | ✅ | ✅ | — |
| Delete transport or advance records | ✅ | ❌ | Hidden button + JS guard + server check |
| Create new sections (Section 3, 4, …) | ✅ | ✅ | — |
| Edit a section title | ✅ | ✅ | — |
| Delete a custom section | ✅ | ❌ | Protected for Section 1/2; Admin-only button |
| Live Excel Sheet view | ✅ | ✅ | — |
| Download `.xlsx` | ✅ | ✅ | — |
| Excel import | ✅ | ✅ | — |
| Change own password | ✅ | ✅ | — |
| Change another user's password | ✅ | ❌ | Admin session token required by the server |
| Cloud backup list (Google Drive) | ✅ | ❌ | Admin session token required by the server |
| Restore a snapshot | ✅ | ❌ | Admin guard + server guard |
| Opening balance | ✅ | ❌ | `_Meta` write requires an admin session |
| ⚙️ Settings & API tab | ✅ | ❌ | `.admin-only` class + JS route guard |

Employee-mode is applied by adding `employee-mode` to `<body>`; that class hides every admin-only
control (Settings tab, *Manage Sections*, *Load Exact Excel Data*, Admin password field).

---

## 4. How the system is put together

```text
┌──────────────────────── Browser (any device) ────────────────────────┐
│  index.html            markup: login, sidebar, 6 tabs, 5 modals     │
│  css/styles.css        layout, drawer, tables, print styles          │
│  js/auth.js            login, salted hashing, RBAC, rate limiting    │
│  js/api.js             cloud data layer + shared helpers             │
│  js/transport.js       transport table + add/edit modal              │
│  js/advances.js        advances table + add/edit modal               │
│  js/sheetview.js       1:1 live Excel replica + section maths        │
│  js/excel.js           .xlsx export engine (ExcelJS + SheetJS)      │
│  js/backup.js          snapshots, Drive backups, point-in-time restore│
│  js/app.js             orchestrator: routing, metrics, live sync     │
│  libs/                 exceljs.min.js, FileSaver.min.js, xlsx.full…   │
└───────────────┬──────────────────────────────────────────────────────┘
                │  HTTPS  (GET ?action=…   |   POST text/plain JSON envelope)
┌───────────────▼──────────────────────────────────────────────────────┐
│  backend/Code.gs  —  Google Apps Script web app                     │
│  LockService guard · session tokens · DATA_VERSION · recalculation │
└───────────────┬──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│  Google Sheets (single source of truth)                             │
│  tabs: Transport · Advances · _Meta                                  │
│  Google Drive: Shinex_Backups/ (timestamped .xlsx copies)            │
└──────────────────────────────────────────────────────────────────────┘
```

Detailed design notes live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 5. The calculation engine

All money is parsed with one helper (`parseAmount`), which strips `₹`, commas and spaces, so
`"₹1,73,500"`, `"1,73,500"` and `173500` are all the same number.

### Per-trip rules

```text
Paid (as stored)  = the literal text "Paid"  OR  a number
paid amount       = ToPay                       when stored as "Paid"
                  = ToPay  when number ≥ ToPay  (clamped, never above ToPay)
                  = number                      otherwise

Balance           = max(0, ToPay − paid amount)
Balance           = 0                           when stored as "Paid"
```

### Status badge

```text
ToPay > 0  and Balance = 0        → "Paid"
Paid > 0   and Balance > 0        → "Partially Paid"
ToPay = 0  and Amount > 0        → "Billed"
otherwise                         → "Pending"
```

This runs in three places and must agree: the browser (`js/api.js`), the Apps Script
`recalculateFinancials()` sweep, and the sheet the user actually sees.

### Section reconciliation (chained)

For **Section 1** (the closed period):

```text
Total Payable    = Σ Amount + Σ Balance
Net Outstanding  = Total Payable − Σ Advances
```

For **Section 2, 3, 4 …** (each chained from the previous section):

```text
Old Balance      = previous section's Net Outstanding
Total Payable    = Σ Amount + Old Balance + Σ Balance
Net Outstanding  = Total Payable − Σ Advances
```

The dashboard title is always the **last trip date of the active section**, e.g.
`01-10-2026 Net Outstanding`. If an advance is dated *later* than the last trip, it is shown
alongside as a secondary note (`01-10-2026 • adv 29-09-2026`) rather than replacing the trip date.

### Failed amount (export only)

A trip counts as *failed* when its Note or Status contains
`fail`, `cancel`, `shortage`, `returned`, `rejected` or `lost`.

```text
Failed Amount = max(0, ToPay − paid amount)   for failed trips, 0 otherwise
```

This is a **display-only** figure added in the exported workbook; it never changes a balance or any
stored record. On the current data it flags LR 185 (`29 bags shortage`) at ₹1,21,500.

---

## 6. Features, tab by tab

### 📊 Dashboard

* Greeting with the signed-in user's name.
* Quick actions: Add Transport, Record Advance, View Excel Sheet, Export Excel.
* Big **Net Outstanding** banner titled with the active section's latest trip date.
* One reconciliation card per section showing To Billed → (+) Old Balance → (+) ToPay Balance →
  (=) Total Payable → (−) Less Advances → (=) out standing.
* Written business rules, always visible under the cards.

### 🚛 Transport Records

* Section filter, free-text search, status filter and month filter.
* Columns: SL, Section, LR No, DC No, Date, Vehicle, From, TO, Quantity, M/TAX, Amount, ToPay,
  **Paid (real amount)**, Balance, Status badge, Note, Actions.
* Inline stats bar: trips in view, active-section billed, advances, current outstanding.
* The **Paid** column always shows money — never the word "Paid" — and stays green when a trip is
  fully settled.

### 📑 Live Excel Sheet

* A 1:1 browser replica of the Shinex workbook: banners, navy header row, red ToPay headers, yellow
  highlighting on "Before <date>" notes and the auto-sum total row.
* View switcher: any section, or **Full Sheet** (all sections stacked).
* Zoom `80% Fit / 90% / 100% / 115%`, full-screen mode, print button.
* **Click any row to edit it** — opens the same modal as the table.
* Reconciliation box per section: `To Billed`, `ToPay bal`, `TotalB=ToBilled+TopayBAl`, `less adv`,
  and the closing `TotalB-Less Adv` outstanding.

### 💰 Advance Payments

* Section filter + search across description / UTR / cheque.
* Columns: SL, Section, Date, Amount, Description, Reference, Entered By, Actions.
* Stats bar: count in view, section total, Section 1 and Section 2 totals.

### 📥 Excel Backup & Import

* Manual **BACKUP FULL DATABASE NOW**, automatic snapshots after every save/delete, optional
  auto-download of a dated workbook.
* Snapshot history table with 1-click restore (Admin only).
* Google Drive backup list (Admin only).
* Full workbook export and `.xlsx` import.

### ⚙️ Settings & API (Admin only)

* Google Apps Script Web App URL.
* March 2026 opening balance.
* **⚡ Test Cloud Connection & Live Sync** diagnostic with the 30-second permission fix.
* Password update fields for Admin and Rudra.

### Modals — Add vs Edit

The submit button follows the mode: **Submit** when adding a new record, **Save** when editing an
existing one. Both modals also guard against empty submits (HTML5 validation is enforced before any
cloud call) and prevent double submits with an `isSubmitting` flag.

**Auto-dating:** when you open *Add*, the date defaults to the last trip of the selected section, so
new trips land on the correct cut-off date. Editing always keeps the record's own date.

---

## 7. Excel export and import

Downloaded workbooks are produced with **ExcelJS** (bundled locally in `libs/`) and fall back to
**SheetJS** if ExcelJS is unavailable.

* Section-scoped downloads follow the active view — `Download SECTION 2 (xlsx)` exports only
  Section 2, *Full Sheet* exports everything.
* Three writers produce the layouts: Section 1 (canonical Shinex layout), the "later sections"
  blocks, and `writeSingleGenericSection()` for a single-section export.
* Every section block ends with an **auto-sum total row** covering Amount, ToPay, Paid, Balance and
  Failed.
* Columns are auto-fitted character by character (Excel's `Alt + H + O + I`), so no `###` or
  truncated headings.
* Dates are always `DD-MM-YYYY`.
* **Paid** is written as a number (green fill when fully paid); the word "Paid" never appears in the
  workbook.
* **Failed Amt.** column, shaded red when non-zero.

**Import** accepts a `.xlsx` whose **first sheet** has these headers (case as shown, blanks allowed):

```text
SL.NO · LR No · DC No · Date · Vehicle Number · From · TO · Quantity · M/TAX
Amount · ToPay · ToPay-paid (or "paid") · Note
```

Balance and Status are **recalculated** on import (`balance = ToPay − paid`; Status becomes `Paid`,
`Partially Paid` or `Pending`) rather than read from the file, so an imported sheet can never inject
an inconsistent balance. A `Paid` text cell is treated as *paid in full* (`paid = ToPay`). Records get
temporary ids `TR-IMP-xxxx-n`, are stamped `createdBy: "Excel Import"`, and the app shows a confirm
dialog with the parsed count before anything is written to the cloud.

---

## 8. Backup and recovery

| Layer | Where | Who sees it | Trigger |
| :--- | :--- | :--- | :--- |
| Device-local snapshots | `localStorage` key `shinex_backup_snapshots_v1` | The device that took them | Every save/delete (if auto-backup is on) |
| Google Drive copies | `Shinex_Backups/` folder | Everyone (list is Admin-gated) | Same trigger, via Apps Script |
| Manual workbook | Downloads as `Shinex_Backup_YYYY-MM-DD_HH-mm-ss.xlsx` | Whoever downloads | "Back up now" button |

A snapshot stores the full dataset (transport, advances, sections, opening balance) plus the net
outstanding at that moment. Restoring writes the dataset back to Google Sheets — the backend takes a
`Pre-Restore-Safety-Backup` copy first, so a restore is always reversible.

---

## 9. Cross-device synchronisation

```text
Save on device A
   └─► POST to Apps Script (cloud-first; the save FAILS if no cloud URL is configured)
        └─► row written to Google Sheets
             └─► recalculateFinancials() + DATA_VERSION++
                  └─► response returns new version
                       └─► device A re-fetches and re-renders

Device B (any other device, any browser)
   └─► polls ?action=getVersion every 3.5 s
        └─► cloud version ≠ local version
             └─► full ?action=getAll fetch → local storage replaced → all views recalculate
```

Additional triggers, for instant updates:

* **Window focus** — switching back to the tab checks the cloud version immediately.
* **BroadcastChannel** (`shinex_sync_channel`) — other tabs on the same machine update instantly.
* **`storage` event** — fallback for multi-tab / incognito cases.
* **Online/offline events** — going back online triggers a refresh.

`localStorage` is a **cache**, never the database. If the cloud is unreachable the app says
`⚠ Cloud Unreachable • Local Cache` and keeps showing the last known data instead of silently
diverging.

---

## 10. Security model

* **Passwords are never stored in plain text in the browser.** The client stores
  `SHA-256(salt + password)` with salt `SHINEX_SEED_SECURE_SALT_2026_@#!`; the backend stores the
  password in `ScriptProperties` and only ever returns its hash.
* **Server session tokens.** `login` returns a UUID token stored in `ScriptProperties`
  (`SESSIONS_admin` / `SESSIONS_rudra`, newest 5 per account). Every write — add/update/backup/
  `saveSections` — and every privileged action (`deleteRecord`, `restoreFullDataset`,
  `setOpeningBalance`, `recalculateFinancials`, `listBackups`) is checked against that token.
* **Login is instant.** The session is created locally first (≈5 ms) and the server token is
  upgraded in the background, so the UI never waits on Apps Script.
* **Rate limiting.** Client: 8 failed attempts → 30 s lockout. Server: 8 failures in 5 minutes →
  temporary rejection.
* **Sessions expire after 8 hours.**
* **XSS guarding.** `escapeHtml()` / `escapeAttr()` are used for every user-controlled string that
  reaches `innerHTML`.
* **CORS.** All POSTs use `Content-Type: text/plain;charset=utf-8`. `application/json` triggers a
  preflight that Apps Script cannot answer — do not change this.
* **Web app permission must be `Anyone`.** If it is `Only myself`, Google redirects to
  `accounts.google.com`, CORS blocks it, and the app silently falls back to local cache. The app
  detects this and shows an Admin-only banner with the fix.

### Changing a password

1. Sidebar user card → **🔑 Change** (own password, either user), or
2. Admin → **⚙️ Settings & API** → new password for Admin and/or Rudra.

The new hash is pushed to the cloud immediately; other devices pick it up on their next login.

---

## 11. Project structure

```text
SR_T/
├── index.html                    # SPA shell: login screen, sidebar, 6 tabs, 6 modals
├── README.md                     # this file
│
├── css/
│   └── styles.css                # layout, sidebar/drawer, tables, modals, print
│
├── js/
│   ├── auth.js                   # login/logout, SHA-256 hashing, RBAC, rate limiting
│   ├── api.js                    # seed data + cloud data layer + shared helpers
│   ├── transport.js              # transport table, filters, add/edit modal
│   ├── advances.js               # advances table, filters, add/edit modal
│   ├── sheetview.js              # live Excel replica, section maths, zoom/fullscreen
│   ├── excel.js                  # .xlsx export engine (ExcelJS) + SheetJS fallback
│   ├── backup.js                 # snapshots, Drive backups, point-in-time restore
│   └── app.js                    # orchestrator: routing, metrics, live sync, modals
│
├── libs/                         # bundled offline vendors — no CDN at runtime
│   ├── exceljs.min.js
│   ├── FileSaver.min.js
│   └── xlsx.full.min.js
│
├── backend/
│   └── Code.gs                   # Google Apps Script API (the cloud database layer)
│
├── docs/                         # deeper documentation (see section 14)
│
├── .github/workflows/pages.yml   # GitHub Pages static deploy
└── reference xlsx / json files   # original Shinex workbook + extracted seed data
```

Local storage keys used by the app:

| Key | Purpose |
| :--- | :--- |
| `transport_records_shinex_v9` | cached transport rows |
| `transport_advances_shinex_v9` | cached advance rows |
| `transport_sections_shinex_v9` | cached section definitions |
| `transport_opening_bal_shinex_v9` | opening balance |
| `shinex_data_version` | last seen cloud `DATA_VERSION` |
| `transport_user_session_v2` | **sessionStorage**, current user + token |
| `transport_auth_users_v2` | salted password hashes |
| `shinex_backup_snapshots_v1` | device-local snapshots |
| `shinex_sections_dirty` | set while local section edits await push |

Script and stylesheet URLs carry a cache buster (`?v=13.6`). **Bump it after every deploy** or
browsers may keep serving an old file.

---

## 12. Deployment

### Front end (Vercel)

1. Push to the repository.
2. Vercel (connected to the repo, `main`) redeploys automatically — no build command, output is the
   repository root.
3. Confirm <https://xtransport.vercel.app>.
4. Hard-refresh on devices; if the old code sticks, bump the `?v=` cache busters.

A GitHub Pages workflow (`.github/workflows/pages.yml`) also publishes the same static site.

### Backend (Google Apps Script)

1. Open the spreadsheet → **Extensions → Apps Script**.
2. Replace the editor contents with [`backend/Code.gs`](backend/Code.gs).
3. **Deploy → New deployment → Web app**, execute as **Me**, access **Anyone**.
4. On later changes use **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
   (editing the code alone does nothing until you redeploy).
5. Verify with `curl "<web app URL>?action=getVersion"` — it must return
   `{"success":true,"version":…}` **without** a Google login redirect.

Full checklists and troubleshooting are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| Login spinner feels slow | Apps Script round-trip on the login path | Already fixed — token upgrade is backgrounded |
| Data not appearing on the other device | Cloud version not picked up | Check the sidebar status dot; press 🔄 Sync |
| Everything looks local/stale | Web app access is `Only myself` | Deploy with **Anyone**, then *Test Cloud Connection* |
| `Failed to fetch` / CORS error | Wrong web app URL, or preflight triggered | Use the full `/exec` URL; never send `application/json` |
| Dates show as `Mon Apr 20 2026 …` | Raw sheet date leaked through | Already fixed by `formatSheetDate()` + `parseLegacyDateString()`; redeploy the backend |
| Export shows "Paid" text | Stale cached `excel.js` | Bump cache busters and hard-refresh |
| Delete button missing | You are signed in as Rudra | Expected — Admin only |
| Changes vanish after reload | Cloud unreachable, working from cache | Check `⚡ Test Cloud Connection` in Settings |
| Extra junk trip row appears | Old build without the empty-form guard | Redeploy; the current build blocks empty submits |

---

## 14. Further documentation

| Document | What it covers |
| :--- | :--- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module map, data flow, sync engine, UI structure, mobile behaviour |
| [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) | Google Sheets schema, every field, dates, money, status, sections, Failed rule |
| [`docs/BACKEND-API.md`](docs/BACKEND-API.md) | Every Apps Script action, request envelope, response shape, permission rules |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Apps Script and Vercel deployment, redeploys, verification, recovery |

---

**© 2026 Shinex UQ Genetic Seeds Pvt. Ltd. — Developed by Shravan Kumar. All rights reserved.**