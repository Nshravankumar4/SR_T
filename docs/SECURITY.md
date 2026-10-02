# Security — Shinex Ledger

An honest account of what protects this ledger, what does **not**, and how to close the gaps.

---

## 1. Threat model

The ledger holds business data (freight bills, advances, transporter details) for two people. The
realistic risks, in order of likelihood:

| # | Risk | Realistic? | Status |
| :--- | :--- | :--- | :--- |
| 1 | Anyone who obtains the Apps Script URL reads/writes the whole ledger without logging in | **Yes — this is the big one** | Fixable with the API secret (§4) |
| 2 | A leaked password grants full access | Possible (passwords have been shared in chat/screenshots) | Mitigated: salted hashes only, rotate anytime |
| 3 | Rudra deletes records she should not | Possible by accident | **Blocked** — three independent guards |
| 4 | Someone edits the Google Sheet directly (bypassing the app) | Possible for sheet editors | Not blocked by the app — restrict Google account access |
| 5 | Repo or deployed files leak | Repo is private, but deployed JS is public | URL is visible in the deployed code until removed (§5) |

---

## 2. What is already protected

| Control | Implementation |
| :--- | :--- |
| Passwords never stored in plain text | Client stores `SHA-256(salt + password)`; backend stores plaintext only in `ScriptProperties` and returns **hashes only** |
| Server-side session tokens | `login` issues a UUID stored in `SESSIONS_admin` / `SESSIONS_rudra` (newest 5 per account); every write and every privileged read is checked against it |
| Delete is triple-guarded | Button hidden for Rudra → JS guard in `TransportModule`/`AdvancesModule` → server `userCanDelete()` requires an **Admin** role claim **and** a live Admin token |
| Settings & API locked to Admin | `.admin-only` class + `employee-mode` body class + JS route guard on the tab |
| Brute force | Client: 8 failures → 30 s lockout. Server: 8 failures in 5 minutes → temporary rejection |
| Session expiry | 8 hours, then forced logout |
| XSS | `escapeHtml()` / `escapeAttr()` on every user-controlled string reaching `innerHTML` |
| Restore is Admin-only | `restoreFullDataset` requires an Admin session and takes a Drive safety backup first |
| Audit trail | Every row keeps `Created_By` / `Created_At` / `Updated_At`; every write records `LAST_ACTION` + `LAST_UPDATED_BY` in `_Meta` |
| Backups | Automatic Drive copies on every mutation + downloadable dated workbooks |

---

## 3. What is **not** protected (be aware)

* **The web app URL in the deployed code.** `xtransport.vercel.app/js/api.js` contains
  `DEFAULT_API_URL` in plain text. Anyone on the internet can read it. The repo is private, but the
  *deployed files are public*. Until the API secret is enabled, that URL is effectively a master key.
* **GitHub Actions secrets.** They only reach CI workflows. This app is a static site and never
  reads them — adding one there protects nothing.
* **Direct Google Sheet access.** Anyone with edit rights on the spreadsheet can change rows behind
  the app's back; the app will simply show the new values on the next poll.
* **Transport/advance amounts in transit.** HTTPS protects them; there is no field-level encryption
  (not needed for this threat model).
* **A determined Admin.** An Admin token can delete and restore. That is by design.

---

## 4. Hardening checklist

### 4.1 Enable the API secret (highest value — do this)

1. Apps Script → ⚙️ Project Settings → Script Properties → **Add**
   - Key `API_SECRET`
   - Value: a long random string, e.g. `Shinex-8f4c1e93-Ledger-2026-xT7`
2. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
3. On **every** device: ⚙️ Settings & API → 🔐 API Secret → paste the same value → **Save Configuration**
4. Verify with **⚡ Test Cloud Connection & Live Sync**

While the property does not exist the API is unchanged, so this is safe to deploy in any order —
but do the backend first so no device is locked out.

**Emergency unlock:** delete the `API_SECRET` property and redeploy.

### 4.2 Rotate the passwords

They have been shared in chat and screenshots. Change Admin and Rudra passwords in
**⚙️ Settings & API → Update Account Passwords**; the change propagates to all devices.

### 4.3 Lock down Google itself

* Share the spreadsheet only with the two accounts that need it.
* Keep the Apps Script project private to your account.
* Turn on Google Account 2-Step Verification.

### 4.4 Repository hygiene

* Keep the repo private (it already is).
* Never commit passwords, tokens or the spreadsheet ID into a public repo.
* Prefer GitHub **Environments** protection over plain repo secrets if CI is ever added.

### 4.5 Remove the URL from the deployed code

Once every device has saved the URL in Settings (⚙️ Settings & API → **Save Configuration**), the
literal in `js/api.js` (`DEFAULT_API_URL`) and `index.html` can be deleted. The URL then exists
only in each browser's storage. Combine with the API secret for full effect.

---

## 5. Reporting

This is a single-tenant internal application. If you suspect compromise:

1. Change both passwords immediately.
2. Delete `SESSIONS_admin` and `SESSIONS_rudra` in Apps Script → Project Settings → Script Properties
   (this revokes every device session instantly).
3. Rotate `API_SECRET` and redeploy, then update each device.
4. Review `Transport` / `Advances` `Updated_At` columns and `_Meta.LAST_ACTION` / `LAST_UPDATED_BY`.
5. Restore from the most recent Drive backup if rows were altered.