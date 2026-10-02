# Architecture — Shinex Ledger

How the application is assembled, who talks to whom, and what happens on every user action.

---

## 1. Design goals

1. **Google Sheets is the database.** The browser is a cache and a calculator, never the source of truth.
2. **No build step, no framework, no CDN.** Open `index.html` and it runs — useful for a private repo
   and for offline development.
3. **One calculation rule, three enforcement points** (client, backend sweep, displayed sheet) so the
   numbers can never disagree.
4. **Deletions are protected twice** — the UI hides them and the server rejects them without an
   Admin session token.
5. **Saving is cloud-first.** If the cloud write fails, the user is told; nothing is silently queued.

---

## 2. Module map

| Module | File | Responsibility |
| :--- | :--- | :--- |
| `App` | `js/app.js` | Orchestrator. Auth gating, tab routing, `refreshData()`, metrics/reconciliation cards, section CRUD modals, toast messages, live-sync listeners, `downloadShinexExcel()` |
| `AuthService` | `js/auth.js` | Login/logout, salted SHA-256 hashing, credential store, session (8 h), rate limiting, RBAC helpers, background cloud-token upgrade |
| `ApiService` | `js/api.js` | All cloud I/O (`fetchAll`, `saveTransport`, `saveAdvance`, `deleteTransport`, `deleteAdvance`, `getDataVersion`, `getCloudBackups`, `resetToExactExcelData`), sections, opening balance, normalisation, plus the shared `window.*` helpers |
| `TransportModule` | `js/transport.js` | Transport table (filters, search, badges, admin delete), add/edit modal, auto-date, `ToPay − Paid = Balance`, `⚡ Mark Fully Paid` |
| `AdvancesModule` | `js/advances.js` | Advances table, filters, stats bar, add/edit modal, auto-date |
| `SheetViewModule` | `js/sheetview.js` | `computeAllSectionsData()` (the section maths), 1:1 sheet rendering, view switching, zoom, fullscreen, click-to-edit rows |
| `ExcelModule` | `js/excel.js` | `.xlsx` generation (ExcelJS), three section writers, SheetJS fallback, importer, amount helpers |
| `BackupModule` | `js/backup.js` | Device-local snapshots, Google Drive backup list, point-in-time restore, dated workbook download |
| Backend | `backend/Code.gs` | Apps Script: sheet I/O, `LockService`, session tokens, `DATA_VERSION`, financial recalculation, Drive backups |

Load order in `index.html` matters: libraries → `auth.js` → `api.js` → feature modules → `app.js`.

---

## 3. Startup sequence

```text
DOMContentLoaded
  └─ App.init()
       ├─ setupEventListeners()        login, filters, forms, buttons, online/offline
       ├─ initRealtimeSync()           BroadcastChannel, storage, focus, 3.5 s poller
       ├─ BackupModule.init()          settings, snapshots, cloud backup list
       └─ checkAuth()
            ├─ no session  → show #authWrapper, preselect last logged-in user
            └─ session     → show #mainApp, apply role CSS, refreshData()
                              ├─ ApiService.fetchAll()   (cloud-first)
                              ├─ push records into modules
                              ├─ updateMetrics()         dashboard + reconciliation cards
                              ├─ SheetViewModule.render()
                              └─ BackupModule.renderUI()
```

`AuthService.init()` runs at script load and only fills in missing credential hashes; it never
overwrites a password that is already set.

---

## 4. Read path (loading data)

`ApiService.fetchAll()`:

1. If an API URL exists → `GET ?action=getAll`.
2. On success it stores the cloud `version`, syncs sections (unless local edits are marked dirty, in
   which case local sections are re-pushed), stores the shared opening balance, normalises every
   record and writes the result to `localStorage`.
3. If the sheet comes back empty it seeds the canonical baseline once
   (`seedCloudDatabaseWithMasterBaseline()`).
4. **There is no local fallback.** A failure throws, and the app shows the blocking
   ☁️ *"Cannot load the ledger"* screen (`App.showCloudBlock()`) with the real reason and a
   **Retry now** button. Nothing from `localStorage` is ever displayed as data.

Normalisation (`normalizeTransportRecord` / `normalizeAdvanceRecord`) is applied to **both** cloud and
local data so the app never renders two different shapes of the same record.

### Shared helpers defined in `api.js`

| Helper | Purpose |
| :--- | :--- |
| `parseAmount(v)` | `'₹1,73,500'` → `173500`, never `NaN` |
| `parseLegacyDateString(s)` | Parses raw sheet strings such as `Mon Apr 20 2026 00:00:00 GMT+0530 (…)` (iOS Safari returns `NaN` for these without help) |
| `formatDateForDisplay(d)` | Normalises any input date to `DD-MM-YYYY` |
| `formatDateForInput(d)` | `DD-MM-YYYY` → `YYYY-MM-DD` for `<input type="date">` |
| `parseDateToTimestamp(d)` | Multi-format sortable timestamp (`DD-MM-YYYY`, `YYYY-MM-DD`, `DD/MM/YYYY`) |
| `getLatestTripDate(rows, fallback)` | Newest date in a set of rows |
| `getTripSection(r)` / `getAdvanceSection(a)` / `normalizeSection(s)` | Section resolution & aliasing (`April 2026 to August 2026` → `Section 1`) |
| `escapeHtml(v)` / `escapeAttr(v)` | XSS guards for every value injected into markup |
| `broadcastDataChange(type, data)` | BroadcastChannel notification for other tabs |
| `shinexSyncChannel` | The channel instance itself |

---

## 5. Write path (saving data)

```text
Form submit
  ├─ checkValidity() / reportValidity()      ← empty forms never reach the cloud
  ├─ isSubmitting guard                     ← no double submits
  ├─ button → "⏳ Saving to Google Sheets…"
  ├─ read fields, derive status/balance      (client rules, identical to the server)
  ├─ ApiService.saveTransport() / saveAdvance()
  │    ├─ POST text/plain envelope { action, user, role, token, secret, data }
  │    ├─ cloud write is REQUIRED (throws if no URL configured)
  │    └─ on success: cache copy written for diagnostics, version stored
  ├─ close modal, toast
  ├─ App.refreshData()                      ← authoritative re-read
  └─ BackupModule.onRecordMutated(...)      ← snapshot + Drive backup (non-blocking)
```

Writes are cloud-first on purpose: an offline "success" would let two devices disagree, which was
the exact failure mode this system was rebuilt to eliminate.

---

## 6. Live-sync engine

`App.initRealtimeSync()` registers four independent triggers:

| Trigger | Mechanism | Latency |
| :--- | :--- | :--- |
| Background poller | `setInterval(checkCloudVersionAndSync, 3500)` → `GET ?action=getVersion` | ≤ 3.5 s |
| Window focus | `focus` → same check | instant on return |
| Same-machine tabs | `BroadcastChannel('shinex_sync_channel')` | instant |
| Storage event | fallback `storage` listener | instant |

Every request also carries the optional `secret` (`ApiService.withSecret()` for GETs,
`getSessionEnvelope()` for POSTs) once an API secret is configured on that device.

`checkCloudVersionAndSync()` compares the cloud `DATA_VERSION` with `shinex_data_version`. On a
mismatch it triggers a full `refreshData(true)`.

`refreshData()` is re-entrancy safe: concurrent calls set `_refreshQueued` and the queued refresh
runs in the `finally` block, so a save is never left showing pre-save data.

### Cloud-only enforcement

```text
fetchAll()                       ← throws on ANY failure, never falls back
  └─ App.refreshData()
       ├─ success → App.hideCloudBlock()  → render
       └─ failure → App.showCloudBlock(reason)
                      └─ shown only until the first successful cloud load
                         (an outage later in the session just turns the status dot red)
```

| Situation | Result |
| :--- | :--- |
| Cloud reachable | Normal operation, `_hasLoadedFromCloud = true` |
| Cloud down before first load | Full-screen block + Retry now |
| Cloud drops later | Data on screen stays (it came from the cloud), status dot turns red, saves fail loudly |
| No URL configured | Block screen: *"Cloud database URL is not configured…"* |
| Wrong API secret | Block screen: *"API secret is missing or incorrect…"* |
| Web app set to *Only myself* | Block screen: *"Google redirected to a sign-in page…"* |

`ApiService.describeCloudFailure()` turns the raw response into one of those messages.

---

## 7. Section maths (`SheetViewModule.computeAllSectionsData`)

One function produces the numbers used by the dashboard, the live sheet, the exporter and the backup
snapshots — so all four always agree:

```text
for each section, in order:
  trips     = records whose section matches, sorted by SL
  advances  = advances for that section, sorted by date then id
  totalAmount = Σ amount
  toPayBal   = Σ balance
  advSum     = Σ advance amounts

  if first section:  oldBal = opening balance, label "Before March 2026"
                     totalPayable = totalAmount + toPayBal
  else:              oldBal = previous netOutstanding
                     totalPayable = totalAmount + oldBal + toPayBal

  netOutstanding = totalPayable − advSum
  latestDate     = newest TRIP date (falls back to advances, then a per-section default)
  latestAdvDate  = newest advance date, only when it is AFTER latestDate
```

Because sections are processed in order, creating Section 3 automatically chains from Section 2's
closing balance — no configuration needed.

---

## 8. UI structure

`index.html` holds every screen; JS only swaps `active` classes.

```text
#cloudBlockScreen            ☁️ blocking "cannot load the ledger" panel (cloud-only mode)
#authWrapper                 login card, user switcher, password, footer bar
#mainApp
 ├── aside.app-sidebar       brand · user card · nav tabs · status · logout
 ├── #sidebarBackdrop        dim overlay for the mobile drawer
 └── .app-main-viewport
      ├── .mobile-top-bar    brand + ☰ Menu + Logout (phones only)
      ├── main
      │    ├── #cloudSyncAlertBanner     (Admin only, permission problem)
      │    ├── #tab-dashboard
      │    ├── #tab-transport
      │    ├── #tab-sheetview
      │    ├── #tab-advances
      │    ├── #tab-excel
      │    └── #tab-settings             (Admin only)
      └── footer.app-footer
+ modals: transport · advance · section · manageSection · changePassword
+ #toastContainer
```

### Mobile behaviour

* The sidebar becomes a drawer below 900 px: `max-height: 100dvh`, `overflow-y: auto`,
  `env(safe-area-inset-bottom)` so Logout and the footer are never cut off on short phones.
* Open/close is centralised in `App.toggleSidebar()` / `App.closeSidebar()`: the ☰ button, the ✕
  button, the dim backdrop, choosing a tab, and logging out all funnel through it.
* `body.sidebar-open { overflow: hidden }` prevents background scroll while the drawer is open.
* The top bar shrinks below 480 px so brand, Menu and Logout never overlap.

### Role gating

`checkAuth()` toggles `employee-mode` on `<body>` and sets `style.display` on every `.admin-only`
element. Both mechanisms are used because the class also carries layout rules while the inline style
guarantees the element is truly not rendered.

---

## 9. Export architecture

```text
ExcelModule.exportToExcel(transport, advances, openingBalance, sectionFilter)
  ├─ ExcelJS available?
  │    ├─ yes → build workbook, three writers:
  │    │        • Section 1 block (canonical Shinex layout)
  │    │        • each later section block, stacked with dynamic row offsets
  │    │        • writeSingleGenericSection() for single-section downloads
  │    │      then AutoFit every column, writeBuffer(), saveBlob()
  │    └─ no  → exportWithSheetJS() fallback
  └─ customFileName === '__BLOB__' → return the Blob instead of downloading
                                     (used by the backup module)
```

Amount helpers live on `ExcelModule`: `num()`, `isFullyPaid()`, `paidAmountOf()`, plus
`noteStyleFor()` / `applyNoteStyle()` which reproduce the on-screen Note colours. They only **read**
records, so the exporter can never alter data.

Row rules: a trip with `toPay > 0` always prints its paid amount **and** its balance (a real `0`
included), so `42,000 − 42,000 = 0` is visible. Rows with no ToPay stay blank.

Column layout per block:

| Block | Amount | ToPay | Paid | Balance | Note |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Section 1 | 11 | 12 | 13 | 14 | 15 |
| Later sections / single section | 10 | 11 | 12 | 13 | 14 |

---

## 10. Error handling conventions

* **Toasts** (`App.showToast`) for success/info; `alert()` only for destructive confirmations.
* **Cloud failures** never leave a half-saved UI: the modal stays open, the button is re-enabled and
  the error text is shown.
* **Permission errors** return `{ success:false, error:'SESSION_INVALID' | 'DELETE_NOT_ALLOWED' | … }`
  and are surfaced with a specific message rather than a generic failure.
* **`SERVER_BUSY`** means another write held the Apps Script lock for 30 s — retry is safe.

---

## 11. Extension points

| Want to add… | Touch |
| :--- | :--- |
| A new tab | add `<section id="tab-x">` in `index.html`, a `.nav-tab` in the sidebar, and a branch in `App.setupEventListeners()` |
| A new field | add the column to `TRANSPORT_HEADERS` in `backend/Code.gs`, handle it in `calculateTransportRow()`, `getTransportRows()` and `normalizeTransportRecord()` |
| A new derived figure | add it in `SheetViewModule.computeAllSectionsData()` so the dashboard, sheet, export and backup all pick it up |
| A new export column | add it in the three writers in `js/excel.js` and extend the total row accordingly |