# Deployment & Operations — Shinex Ledger

Two independent deployments: a static front end and an Apps Script backend. Each has to be updated
separately, and that is the single most common cause of "my fix isn't showing".

---

## 1. What deploys where

| Piece | Where it lives | How it is deployed | Owner |
| :--- | :--- | :--- | :--- |
| `index.html`, `css/`, `js/`, `libs/` | Git repo → Vercel | Automatic on push to the deployment branch | Front-end |
| Same files | Git repo → GitHub Pages | `.github/workflows/pages.yml` on push to `main` | Front-end |
| `backend/Code.gs` | Google Apps Script project bound to the spreadsheet | Manual **Deploy → Manage deployments → New version** | Backend |

**Editing `Code.gs` in the Apps Script editor does nothing until you redeploy a new version.**

---

## 2. Backend deployment (Google Apps Script)

### First-time setup

1. Open the master spreadsheet (ID `1eZ748Kh9G1yYecjML-Pnc-nnDx9AVpz2o76e2jLckZg`).
2. **Extensions → Apps Script**.
3. Select all code in the editor and replace it with the contents of `backend/Code.gs`.
4. **Deploy → New deployment**:

   | Field | Value |
   | :--- | :--- |
   | Type | Web app |
   | Description | Shinex Transport API |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

5. Authorise the permission prompts (Sheets + Drive).
6. Copy the `…/exec` URL and paste it into **⚙️ Settings & API → Google Apps Script Web App URL**.

The first request creates the `Transport`, `Advances` and `_Meta` tabs automatically
(`ensureAllSheets`), seeded with `DATA_VERSION = 101`, `SCHEMA_VERSION = 3.0` and
`OPENING_BALANCE = 120000`.

### Updating the backend later

```text
1. Paste the new backend/Code.gs into the Apps Script editor, Save.
2. Deploy → Manage deployments → ✏️ (pencil) next to the Web App.
3. Version:  New version
4. Deploy.  →  Authorise if prompted.
```

> Choosing **Version: Current** redeploys the *old* code. Always pick **New version**.

### Verifying

```bash
curl "https://script.google.com/macros/s/<ID>/exec?action=getVersion"
```

Expected: `{"success":true,"version":<n>,"lastUpdated":"…","lastAction":"…","lastUpdatedBy":"…"}`

Then open the app as Admin → **⚡ Test Cloud Connection & Live Sync**. It reports the live trip and
advance counts; a green result means the URL, the permissions and the CORS path are all correct.

### Common backend errors

| Error | Meaning | Fix |
| :--- | :--- | :--- |
| HTML containing `accounts.google.com` | access is `Only myself` | redeploy with **Anyone** |
| `SERVER_BUSY` | a write held the lock > 30 s | wait a few seconds, retry |
| `SESSION_INVALID` | token missing/stale | log out and back in (the background upgrade re-issues it) |
| `DELETE_NOT_ALLOWED` | non-Admin attempted a delete | expected — Admin only |
| `Advance Amount must be greater than zero.` | invalid advance payload | fix the form value |

---

## 3. Front-end deployment (Vercel)

1. Commit and push the changed files.
2. Vercel builds from the repository root — **there is no build command**; the repository *is* the
   output. No `package.json` is required.
3. Watch the deployment, then open <https://xtransport.vercel.app>.

### Cache busters — always do this

Every asset URL carries a version query:

```html
<link rel="stylesheet" href="css/styles.css?v=13.8">
<script src="js/app.js?v=13.8"></script>
```

Browsers cache aggressively. After changing any file, bump `v=13.8` to the next value (e.g. `13.8`)
in `index.html`, otherwise users can keep running the previous build for days.

A hard refresh (`Ctrl+Shift+R`) hides the symptom, never the cause.

### GitHub Pages

`.github/workflows/pages.yml` publishes the same static site with `actions/configure-pages@v5`.
Note it uploads the **whole repository**, so the `.xlsx`, `.json` and `backend/` files in the repo
root are also published — keep that in mind if the repo ever contains sensitive extracts.

---

## 4. Deployment checklist (front-end change)

```text
[ ] Edit the file(s)
[ ] Bump the ?v= cache busters in index.html
[ ] Test locally:  python -m http.server 8123 --bind 127.0.0.1
[ ] Verify in the browser console: no errors, correct data (version unchanged)
[ ] Confirm live numbers did NOT change (trips/advances/totals)
[ ] Commit & push
[ ] Open the live URL in a private window, hard-refresh
```

---

## 5. Deployment checklist (backend change)

```text
[ ] Edit backend/Code.gs
[ ] Paste into the Apps Script editor, Save
[ ] Deploy → Manage deployments → ✏️ → New version → Deploy
[ ] curl "?action=getVersion"  → returns JSON (not a login page)
[ ] In the app: ⚡ Test Cloud Connection
[ ] Make one harmless change (add + edit a trip) and confirm it persists
[ ] Confirm DATA_VERSION increased by the expected amount
```

---

## 6. Recovery procedures

### "Someone deleted a record"

1. Admin → **📥 Excel Backup & Import**.
2. Either restore a **Backup Snapshot** (1-click, device-local) or ask the backend for a Drive copy
   in `Shinex_Backups/`.
3. Restoring always takes a `Pre-Restore-Safety-Backup` first, so a restore is itself reversible.

### "The sheet looks wrong (balances/status drift)"

The backend repairs rows on every write. To force a full sweep:

```jsonc
{ "action": "recalculateFinancials", "user": "Administrator", "role": "Admin", "token": "<admin token>" }
```

### "Everyone is seeing stale data"

1. Compare versions: in the app, the sidebar shows `Online • Google Sheets Active (v239)`.
   `curl "?action=getVersion"` shows the cloud truth.
2. If they differ, a device is offline or its poller is throttled — press **🔄 Sync**.
3. If the cloud itself is stale, the last write did not land: check the browser console for
   `Cloud connection unavailable`.

### "Everything is local-only again"

That is the Apps Script access-permission regression. Redo §2 with **Anyone**, then press
**⚡ Test Cloud Connection**. While it is broken the app deliberately keeps working from cache rather
than losing data — so the ledger stays readable, it just stops syncing.

### "The app is fine but old code is running"

Bump the cache busters, redeploy, hard-refresh. If a device is stuck, clear that site's cache/storage
for the origin — all cached data is rebuilt from the cloud on the next load.

---

## 7. Environment reference

| Item | Value |
| :--- | :--- |
| Live app | <https://xtransport.vercel.app> |
| Repository | <https://github.com/Nshravankumar4/SR_T> |
| Spreadsheet ID | `1eZ748Kh9G1yYecjML-Pnc-nnDx9AVpz2o76e2jLckZg` |
| Apps Script web app | `https://script.google.com/macros/s/AKfycbwnxIOGOYUzCfrdcbsw1kvD1x_bWwHp57Y_KJBnHBJB9pxK9d8SOhjufYwBHh3R0Dro/exec` |
| Drive backup folder | `Shinex_Backups` |
| Password salt (client + server must match) | `SHINEX_SEED_SECURE_SALT_2026_@#!` |
| Front-end cache version | `v=13.8` |

> **Changing the salt in one place only** breaks password verification everywhere. If the salt
> changes, both `js/auth.js` (`AuthService.salt`) and `backend/Code.gs`
> (`CLIENT_PASSWORD_SALT`) must change together, and every user must reset their password.

---

## 8. Security operations

* **Rotate a password:** in-app (Change button, or Admin → Settings). It propagates to every device
  at the next login. No redeploy needed.
* **Revoke a device:** that account's oldest session tokens fall out of `SESSIONS_*` automatically
  after five newer logins; to force it immediately, delete the `SESSIONS_rudra` / `SESSIONS_admin`
  property in Apps Script → Project Settings → Script Properties.
* **Lock someone out:** change the password in `ScriptProperties` (`ADMIN_PASS`, `EMP_PASS`) — the
  client cannot override it, because the server re-verifies every privileged action.
* **Rotate the session salt:** see the warning in §7.

---

## 9. Pre-flight checklist before any release

```text
[ ] Trip count, advance count and DATA_VERSION unchanged (or intentionally changed)
[ ] Every section total still matches the sheet by hand
[ ] Login works as Admin and as Rudra; Rudra sees no delete buttons or Settings tab
[ ] Add + edit + delete (as Admin) each round-trip to the sheet
[ ] Export Section 1, Section 2 and Full Sheet; open all three in Excel
[ ] Export totals equal the on-screen totals
[ ] Mobile drawer opens, closes and never clips the Logout button at 360 px
[ ] Cache busters bumped
```