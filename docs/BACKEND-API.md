# Backend API — `backend/Code.gs`

The Google Apps Script web app is the whole server. It is deployed once and every browser tab talks
to it directly.

---

## 1. Endpoint

```text
https://script.google.com/macros/s/AKfycbwnxIOGOYUzCfrdcbsw1kvD1x_bWwHp57Y_KJBnHBJB9pxK9d8SOhjufYwBHh3R0Dro/exec
```

This URL is also the built-in default in `js/api.js` (`DEFAULT_API_URL`) and in the Settings tab.
It can be overridden per device from **⚙️ Settings & API**.

**Deployment requirement:** *Execute as* `Me`, *Who has access* `Anyone`. Anything else makes Google
redirect to a sign-in page and the browser blocks it (CORS).

---

## 2. Request rules

### GET — query parameters

```text
?action=getAll                      full dataset
?action=getVersion                  lightweight version check (used by the 3.5 s poller)
?action=listBackups&user=…&token=…   Google Drive backup list (Admin session only)
```

### POST — one JSON envelope

```jsonc
{
  "action": "addTransport",     // one of the actions in §3
  "user":   "Administrator",    // display name, used for audit + session lookup
  "role":   "Admin",            // "Admin" | "Employee" | "Guest"
  "token":  "uuid-…",           // session token issued by the login action
  "secret": "…",                // optional shared API secret (see §2.1)
  "data":   { /* action payload */ }
}
```

### 2.1 Optional shared API secret

The web app URL is the only thing protecting the sheet by default. Set a script property named
**`API_SECRET`** and every request must then carry the same value:

| Transport | Where the secret travels |
| :--- | :--- |
| GET | `?secret=…` query parameter |
| POST | `secret` field of the JSON envelope |

`checkApiSecret()` is called at the top of both `doGet()` and `doPost()`.

* **Property absent** → the function returns `null` and the API behaves exactly as it always has.
* **Property present, value matches** → request proceeds.
* **Property present, value missing/wrong** → refused:

```jsonc
{ "success": false, "error": "API_SECRET_INVALID",
  "message": "API secret is missing or incorrect. Open Settings & API and enter the API secret." }
```

Enabling it takes three steps (order matters — see [`DEPLOYMENT.md`](DEPLOYMENT.md)):

1. Apps Script → Project Settings → Script Properties → Add `API_SECRET`.
2. Redeploy a new version.
3. Paste the same value in the app's **⚙️ Settings & API → 🔐 API Secret** on every device.

Disabling: delete the property and redeploy.

> ⚠️ **Always send `Content-Type: text/plain;charset=utf-8`.**
> `application/json` triggers a CORS preflight (`OPTIONS`) that Apps Script cannot answer, and every
> write fails with an opaque network error.

### Concurrency

Every POST takes `LockService.getScriptLock()` and waits up to **30 s**. If the lock cannot be
acquired the caller receives:

```json
{ "success": false, "error": "SERVER_BUSY", "message": "Server is currently processing another transaction. Please retry in a few seconds." }
```

Retrying is safe.

---

## 3. Actions

### `login` — POST

```jsonc
{ "action": "login", "username": "Admin", "password": "…" }
```

| Response | Meaning |
| :--- | :--- |
| `{ success:true, role:"Admin", name:"Administrator", token:"uuid" }` | accepted; **store `token`** |
| `{ success:true, role:"Employee", name:"Rudra", token:"uuid" }` | accepted |
| `{ success:false, message:"Invalid Username or Password" }` | rejected |
| `{ success:false, message:"Too many failed attempts…" }` | rate limited (8 failures / 5 min) |

The token is stored server-side in `ScriptProperties` under `SESSIONS_admin` / `SESSIONS_rudra`
(newest 5 per account). The client does not wait for this call — it creates the session locally and
upgrades the token in the background.

### `updatePassword` — POST

```jsonc
{ "action":"updatePassword", "username":"rudra", "password":"newpass", "user":"…", "role":"…", "token":"…" }
```

Requires a valid session for the **target user or Admin**. Minimum 6 characters. Updates
`ADMIN_PASS` / `EMP_PASS` in `ScriptProperties` and increments `DATA_VERSION`.

### `addTransport` / `updateTransport` — POST

Payload `data` is a transport record (see [DATA-MODEL](DATA-MODEL.md)). Requires a session token.

`addTransport` response:

```jsonc
{
  "success": true, "version": 240, "id": "TR-20261002-6842",
  "message": "Transport record saved to Google Sheets.",
  "data": { "slNo": 28, "amount": 150000, "toPay": 42000, "paid": 42000,
            "balance": 0, "status": "Paid", "section": "Section 2" }
}
```

If `slNo` is missing the backend computes `max(SL in section) + 1`. If `updateTransport` cannot find
the `id`, it transparently falls through to an add.

### `addAdvance` / `updateAdvance` — POST

Payload `data` is an advance record. `amount` must be > 0 or the call throws
`Advance Amount must be greater than zero.`

### `deleteRecord` — POST

```jsonc
{ "action":"deleteRecord", "type":"transport|advance", "id":"TR-…", "user":"…", "role":"Admin", "token":"…" }
```

**Admin only** (`userCanDelete()`): the username must map to `admin` **and** the role must be
`Admin` **and** the token must be a live admin session token. Rudra's username is explicitly denied
even if she claims the Admin role.

```jsonc
{ "success": false, "error": "DELETE_NOT_ALLOWED", "message": "Rudra does not have permission to delete records. Only Administrator can delete." }
```

### `createBackup` — POST

```jsonc
{ "action":"createBackup", "reason":"Save Transport LR: 196", "user":"…", "role":"…", "token":"…" }
```

Copies the spreadsheet into the `Shinex_Backups` Drive folder as
`Shinex_Backup_YYYY-MM-DD_HH-mm-ss_<reason>`. If Drive is unavailable it falls back to a `SNAP_…`
tab inside the spreadsheet. Requires a session token.

### `restoreFullDataset` — POST (Admin only)

```jsonc
{ "action":"restoreFullDataset", "user":"…", "role":"Admin", "token":"…",
  "data": { "transport":[…], "advances":[…], "sections":[…] } }
```

1. Takes a `Pre-Restore-Safety-Backup` in Drive.
2. Clears and rewrites `Transport` and `Advances` (re-running `calculateTransportRow()` on every row).
3. Restores section definitions when supplied.
4. Recalculates financials and increments `DATA_VERSION`.

### `saveSections` — POST

```jsonc
{ "action":"saveSections", "user":"…", "token":"…", "data":[{"id":"section-1","name":"Section 1", …}] }
```

Writes the section list into `_Meta.SECTIONS`.

### `setOpeningBalance` — POST (Admin session only)

```jsonc
{ "action":"setOpeningBalance", "amount":120000, "user":"…", "role":"Admin", "token":"…" }
```

### `recalculateFinancials` — POST (Admin session only)

Re-runs the full sweep across the `Transport` sheet and bumps the version.

### `getAll` — GET

```jsonc
{
  "success": true,
  "version": 239,
  "meta":    { "DATA_VERSION": 239, "OPENING_BALANCE": 120000, "SECTIONS": "…" },
  "data": {
    "transport": [ { "id":"TR-…", "slNo":1, "date":"20-04-2026", "amount":149500, "paid":"Paid", … } ],
    "advances":  [ { "id":"ADV-…", "date":"29-09-2026", "amount":50000, … } ],
    "sections":  [ { "id":"section-1", "name":"Section 1", "num":1, "isArchive":true } ],
    "summary":   { "totalTrips":36, "totalAdvancesCount":16, "section1":{…}, "section2":{…} }
  },
  "auth": { "adminPassHash":"…", "empPassHash":"…" }
}
```

Notes:

* **All dates are already `DD-MM-YYYY`** thanks to `formatSheetDate()`.
* `paid` is either a number or the string `"Paid"`.
* `auth` contains **hashes only** — plaintext passwords never leave the server.
* `sections` is `null` when nothing has been saved yet; the client then falls back to its defaults.

### `getVersion` — GET

```jsonc
{ "success": true, "version": 239, "lastUpdated": "2026-10-02T…", "lastAction": "ADD_TRANSPORT", "lastUpdatedBy": "Administrator" }
```

Cheap enough to poll every 3.5 s. This is the heartbeat of the whole sync system.

### `listBackups` — GET (Admin session only)

```text
?action=listBackups&user=Administrator&token=uuid
```

Returns up to 25 Drive backups, newest first:

```jsonc
{ "success": true, "backups": [ { "name":"Shinex_Backup_2026-10-02_11-59-23_Save_Transport", "created":"2026-10-02T…" } ] }
```

Without a valid admin token it returns `{ "success": false, "error": "SESSION_INVALID" }`.

---

## 4. Permission matrix (server side)

| Action | Session required | Extra rule |
| :--- | :--- | :--- |
| `getVersion`, `getAll` | none | — |
| `login` | none | rate limited |
| `updatePassword` | target user **or** admin | min 6 chars |
| `addTransport`, `updateTransport` | any valid token | — |
| `addAdvance`, `updateAdvance` | any valid token | amount > 0 |
| `createBackup`, `saveSections` | any valid token | — |
| `deleteRecord` | admin token | role must be `Admin`, username must map to admin |
| `restoreFullDataset` | admin token | safety backup taken first |
| `setOpeningBalance`, `recalculateFinancials` | admin token | — |
| `listBackups` | admin token | — |

A missing or stale token returns:

```jsonc
{ "success": false, "error": "SESSION_INVALID", "message": "Session not authorized for this action. Please log out and log in again." }
```

A wrong (or missing) shared API secret is checked even earlier and returns `API_SECRET_INVALID`.

| Error code | Meaning | What the user sees |
| :--- | :--- | :--- |
| `API_SECRET_INVALID` | `API_SECRET` property is set and the value did not match | *"API secret is missing or incorrect — open Settings & API"* |
| `SESSION_INVALID` | No valid session token for a privileged action | *"Please log out and log in again"* |
| `DELETE_NOT_ALLOWED` / `RESTORE_NOT_ALLOWED` | Non-Admin attempted a destructive action | *"Only Administrator can…"* |
| `SERVER_BUSY` | The write lock was held for 30 s | *"Please retry in a few seconds"* |
| `advance amount must be greater than zero` | Invalid advance payload | Form-level toast |

---

## 5. Automatic side effects of every write

`recalculateFinancials()` re-derives `Balance` and `Status` for **every** row and writes back only
the cells that changed, then `incrementDataVersion()` writes:

```text
DATA_VERSION     = previous + 1
LAST_UPDATED     = ISO timestamp
LAST_ACTION      = ADD_TRANSPORT | UPDATE_TRANSPORT | DELETE_TRANSPORT
                   | ADD_ADVANCE | UPDATE_ADVANCE | DELETE_ADVANCE
                   | SAVE_SECTIONS | SET_OPENING_BALANCE | UPDATE_PASSWORD
                   | RECALCULATE_FINANCIALS | RESTORE_DATASET
LAST_UPDATED_BY  = the user name in the envelope
```

This is why the app can never drift out of sync with the sheet, and why another device learns about
a change with a single cheap GET.

---

## 6. Helper functions worth knowing

| Function | Purpose |
| :--- | :--- |
| `calculateTransportRow(item)` | Single source of truth for `amount / toPay / paid / balance / status / section` on the server |
| `checkApiSecret(params)` | Optional shared-secret gate; returns `null` when protection is disabled |
| `recalculateFinancials(ss)` | Sweeps the whole `Transport` sheet and repairs any drifted row |
| `calculateSummary(ss, transport, advances)` | Per-section and grand totals returned in `getAll` |
| `formatSheetDate(value)` | Any sheet value → `DD-MM-YYYY` (the iOS Safari date fix) |
| `parseAmount(value)` | `'₹1,73,500'` → `173500` |
| `normalizeSection(sec)` | Aliases → canonical section names |
| `getMetaValue` / `setMetaValue` | `_Meta` key/value access |
| `issueSessionToken` / `getActiveSessionUser` | Session lifecycle |
| `ensureAllSheets(ss)` | Creates `Transport`, `Advances`, `_Meta` with headers and defaults if missing |

---

## 7. Verifying a deployment

```bash
# 1. reachable without a Google login?
curl "https://script.google.com/macros/s/AKfycb…/exec?action=getVersion"
#    → {"success":true,"version":239,…}

# 2. dataset intact?
curl "https://script.google.com/macros/s/AKfycb…/exec?action=getAll" | head -c 400
#    → {"success":true,…,"transport":[…36 rows…]}

# 3. listBackups must be REFUSED without a token
curl "https://script.google.com/macros/s/AKfycb…/exec?action=listBackups"
#    → {"success":false,"error":"SESSION_INVALID",…}
```

If step 1 returns HTML containing `accounts.google.com`, the deployment is set to
**Only myself** — fix it in *Manage deployments* → ✏️ → *Who has access* → **Anyone** → Deploy.