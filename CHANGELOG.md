# Changelog

Every user-visible change, newest first. Dates are the working dates on this ledger
(April 2026 → March 2027 fiscal period).

---

## 2026-10-02 — Excel export correctness & zero visibility

### Fixed
* **ToPay-paid column total missing.** Section total rows now sum **all four** money columns —
  Amount, ToPay, ToPay-paid and ToPay-Balc — each with the yellow fill, border, right alignment and
  `#,##,##0` format. (Section 1 total row was also missing the ToPay sum entirely.)
* **`42,000 − 42,000 = 0` rendered blank.** A row only printed a value when it was `> 0`, so a zero
  balance and a zero paid amount became empty cells. A trip that has a ToPay now always shows its
  paid amount **and** its balance, including a genuine `0`.
* **Note colours missing in downloads.** The exporter only coloured notes containing "halting",
  while the on-screen view colours *every* remark. Added `noteStyleFor()` / `applyNoteStyle()` to
  mirror the UI exactly: yellow `FFFF00` for any remark, pink `FFC7CE` for `shortage`/`damage`,
  cyan `44B3E1` for `u&s`/`truck place`.
* **Removed the `Failed Amt.` column** from all three export writers, the SheetJS fallback, the total
  rows, the banner merges and the column-width map.
* **The literal word "Paid" no longer appears in any download.** Paid is written as the real money
  (green `C6EFCE` fill when fully settled).

### Added
* `Failed Amt.` derivation and its documentation, later withdrawn on request — see *Removed* above.

---

## 2026-10-02 — Cloud-only mode (no local or browser cache)

### Changed
* **`ApiService.fetchAll()` has no localStorage fallback any more.** It throws on any failure. The
  previous behaviour ("cloud failed → show this device's cached copy") is what allowed two devices
  to show different totals; it is gone for good.
* **Blocking ☁️ "Cannot load the ledger" screen** with the real cause and a **Retry now** button,
  shown until the first successful cloud load. Later outages during a session just turn the sidebar
  status dot red instead of blanking the screen.
* Failure messages are now specific instead of the misleading
  `⚠ Cloud Unreachable • Local Cache`: no-internet, sign-in redirect (*Only myself* deployment),
  URL not configured, API secret mismatch, and server-busy each report themselves.
* `localStorage` is still written after each cloud read, but is now used for diagnostics only —
  never as data.

### Unchanged (deliberately)
* Saves remain cloud-first: a save with no cloud **fails loudly** and is never queued locally.

---

## 2026-10-02 — API secret (optional lock on the web app URL)

### Added
* `checkApiSecret()` in `backend/Code.gs`, gating `doGet()` and `doPost()`. Sends the value as
  `?secret=` on GETs and `secret` in the POST envelope. **No-op while the `API_SECRET` script
  property does not exist**, so enabling it cannot break a running deployment by accident.
* 🔐 **API Secret** field in ⚙️ Settings & API, stored per device in `localStorage`
  (`shinex_api_secret`).
* `API_SECRET_INVALID` error surfaced to the user as
  *"API secret is missing or incorrect — open Settings & API"*.
* Full enable/disable procedure in [`docs/SECURITY.md`](docs/SECURITY.md) and
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 2026-10-02 — Auto section period

### Added
* `window.getSectionDisplayTitle()` / `getSectionLabel()` — a section title that the app generated
  itself (starting with `NEW`) is recomputed as **first record's month → current month**:
  Section 2 became `NEW August – October 2026` (today is October).
* Only auto titles are recomputed; a title typed by hand in Manage Sections is preserved
  (Section 1 stays `April 2026 to August 2026`).
* A brand-new section pre-fills as `NEW <current month year>` — e.g. `NEW October 2026`.
* Wired into all eight places a section title is rendered: Live Sheet banner, Excel export banner,
  dashboard reconciliation cards, section dropdowns (transport + advances), and Manage Sections.

---

## 2026-10-02 — Login speed & modal buttons

### Fixed
* **Login no longer waits for Apps Script.** The session is created locally first (~5 ms measured)
  and the server token is upgraded in the background by `upgradeCloudSessionToken()`, which patches
  the live session when it arrives. Previously the UI sat behind a 2–5 second round-trip.

### Changed
* Modal submit button follows the mode: **Submit** when adding, **Save** when editing — for both
  the transport and advance modals, restored correctly after a failed save.

### Changed
* Logout buttons (sidebar and mobile top bar) are now fully red: `#dc2626` fill, white text,
  `#b91c1c` border.

---

## 2026-10-02 — Documentation

### Added
* `README.md` rewritten end to end against the current code (the previous version still described
  34 trips / 15 advances, cache buster `v=5.0`, "polling every 3 seconds" and the old calculation
  engine).
* `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/BACKEND-API.md`, `docs/DEPLOYMENT.md`,
  `docs/SECURITY.md`, `CHANGELOG.md`.
* Documented the live state: 36 trips · 16 advances · `DATA_VERSION` 241.

### Note
The deployed backend at the time of writing was still an older build; the hardened
`backend/Code.gs` (session tokens, API secret, `listBackups`, `saveSections`, `setOpeningBalance`,
`formatSheetDate()` for the iOS Safari date bug) requires **Deploy → New version** to go live.

---

## Earlier in this session

* **iOS Safari date bug** — Google Sheets returned dates as
  `'Mon Apr 20 2026 00:00:00 GMT+0530 (India Standard Time)'`. Chrome repaired it silently; iOS
  Safari returned `NaN`. Fixed on both sides with `formatSheetDate()` (backend) and
  `parseLegacyDateString()` (client).
* **Empty-record guard** — programmatic submits bypassed HTML5 validation and wrote a junk trip to
  the live sheet. `checkValidity()` / `reportValidity()` now block it in both modals.
* **Mobile drawer** — Logout and the footer were cut off on short phones because
  `height:100vh` exceeded the phone viewport. Fixed with `max-height:100dvh`, `overflow-y:auto`,
  `env(safe-area-inset-bottom)`, a dim backdrop, a ✕ button and centralised
  `App.toggleSidebar()` / `closeSidebar()`.
* **Auto-dating** — new records default to the last trip date of their section, and the dashboard
  title follows the latest trip (`01-10-2026 Net Outstanding`).
* **Permission hardening** — `.admin-only` on Manage Sections, Load Exact Excel Data and Settings;
  Rudra sees no delete buttons and no Settings tab.
* **Export parity** — totals, colours, date formatting and section layout brought in line with the
  on-screen sheet view.