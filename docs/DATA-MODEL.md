# Data Model — Shinex Ledger

Everything that is stored, how it is typed, and how it is derived.

---

## 1. The spreadsheet

One Google Sheet is the entire database.

| Tab | Purpose | Key |
| :--- | :--- | :--- |
| `Transport` | one row per trip | `ID` (`TR-…`) |
| `Advances` | one row per advance payment | `ID` (`ADV-…`) |
| `_Meta` | key/value store: `DATA_VERSION`, `SCHEMA_VERSION`, `OPENING_BALANCE`, `SECTIONS`, `LAST_UPDATED`, `LAST_UPDATED_BY`, `LAST_ACTION` | `Key` |

Spreadsheet ID (also hard-coded as `SPREADSHEET_ID` in `backend/Code.gs`):

```text
1eZ748Kh9G1yYecjML-Pnc-nnDx9AVpz2o76e2jLckZg
```

### `Transport` headers

```text
ID | SL_NO | LR_NO | DC_NO | Date | Vehicle_Number | From_City | To_City |
Quantity | M_TAX | Amount | ToPay | Paid | Balance | Status | Note | Section |
Created_By | Created_At | Updated_At
```

### `Advances` headers

```text
ID | Date | Amount | Description | Reference | Section | Created_By | Created_At | Updated_At
```

### `_Meta` headers

```text
Key | Value | Updated_At
```

---

## 2. Transport record fields

| Field | Type | Meaning | Notes |
| :--- | :--- | :--- | :--- |
| `id` | text | Stable row identity | Generated as `TR-yyyyMMdd-nnnn`; required for edits and deletes |
| `slNo` | number | Sequence within the section | Auto-assigned `max(SL in section) + 1` when omitted |
| `lrNo` | text | Lorry receipt number | May hold several values: `191/192` |
| `dcNo` | text | Delivery challan number | May hold several values: `1274/75/76/77/78/79` |
| `date` | `DD-MM-YYYY` | Trip date | Drives the Net Outstanding title |
| `vehicleNumber` | text | Registration number | Stored upper-case |
| `fromCity` / `toCity` | text | Origin / destination | `toCity` may list several stops |
| `quantity` | text | Load size, e.g. `35MT` | Free text on purpose — units vary |
| `mTax` | text | Mandi/other tax | Optional |
| `amount` | number | Freight billed | `0` when only a ToPay exists |
| `toPay` | number | Amount still payable | Optional |
| `paid` | number **or** the text `Paid` | Amount settled | The literal word means *paid in full* |
| `balance` | number | `max(0, toPay − paid)` | Always derived, never typed by hand |
| `status` | text | `Paid` / `Partially Paid` / `Billed` / `Pending` | Derived, but an explicit value is preserved |
| `note` | text | Remarks | Drives note colours and the Failed rule |
| `section` | text | `Section 1`, `Section 2`, … | Aliases are normalised (see below) |
| `createdBy` / `createdAt` / `updatedAt` | text | Audit trail | ISO timestamps |

### Section normalisation

The backend maps legacy section labels onto canonical names so old rows never split:

| Input | Stored as |
| :--- | :--- |
| *(empty)*, `Section 2`, anything containing `active` | `Section 2` |
| `Section 1`, anything containing `april 2026 to august 2026` | `Section 1` |
| anything else (`Section 3`, custom names) | kept verbatim |

---

## 3. Advance record fields

| Field | Type | Meaning |
| :--- | :--- | :--- |
| `id` | text | `ADV-yyyyMMdd-nnn` |
| `date` | `DD-MM-YYYY` | Payment date |
| `amount` | number | Must be > 0 — the backend throws otherwise |
| `description` | text | e.g. "Bank Transfer", "Fuel advance" |
| `reference` | text | UTR / cheque / bank reference |
| `section` | text | Section the advance belongs to |
| `createdBy`, `createdAt`, `updatedAt` | text | Audit trail |

---

## 4. Value semantics

### Money

Everything goes through one parser, in the browser (`parseAmount`) and in Apps Script
(`parseAmount`) with identical behaviour:

```js
'₹1,73,500' → 173500     '1,73,500' → 173500
173500       → 173500     ''          → 0
null/undefined → 0        'Paid'      → 0   (handled separately — see below)
```

Never use bare `Number(...)` on these fields: `Number('Paid')` is `NaN`, which is exactly the bug
that once made a paid trip display as ₹0.

### Dates

| Context | Format |
| :--- | :--- |
| Stored in Sheets & shown in the app | `DD-MM-YYYY` |
| `<input type="date">` in modals | `YYYY-MM-DD` (converted by `formatDateForInput`) |
| Sorting | numeric timestamp via `parseDateToTimestamp` |
| Downloaded `.xlsx` | `DD-MM-YYYY` text |

Google Sheets sometimes hands real date cells back as
`Mon Apr 20 2026 00:00:00 GMT+0530 (India Standard Time)`. Chrome silently repairs this with
`Date.parse`; **iOS Safari returns `NaN`**. The backend's `formatSheetDate()` converts every date on
the way out, and `parseLegacyDateString()` repairs any legacy string that still reaches the client.

### The `Paid` sentinel

A trip can be stored as `Paid` (settled in full) or as a number (part payment). Readers must handle
both:

```text
isPaid = paid == "Paid" (any case) OR status == "Paid"
         OR (toPay > 0 AND balance == 0 AND paid >= toPay)

paidAmount = isPaid ? toPay : numeric(paid)      // clamped to at most toPay
balance    = isPaid ? 0 : max(0, toPay − paidAmount)
```

**Display rule:** every surface — live sheet, transport table, exported workbook — renders the *amount*,
never the word "Paid". Fully-paid cells keep their green highlight. The word survives only inside the
`Status` badge, which is a status, not an amount.

---

## 5. Derived calculations

### Per trip

| Derived | Rule |
| :--- | :--- |
| `balance` | `max(0, toPay − paidAmount)` (0 when fully paid) |
| `status` | `Paid` · `Partially Paid` · `Billed` · `Pending` (see [README §5](README.md)) |
| `slNo` | `max(SL in section) + 1` when not supplied |

### Per section

| Derived | Rule |
| :--- | :--- |
| `totalAmount` (To Billed) | `Σ amount` |
| `toPayBal` | `Σ balance` |
| `advSum` | `Σ advance amounts in the section` |
| `oldBal` | Section 1 → opening balance; later sections → previous section's `netOutstanding` |
| `totalPayable` | `Σ amount + oldBal + Σ balance` |
| `netOutstanding` | `totalPayable − advSum` |
| `latestDate` | newest trip date in the section |

### Failed amount (export only)

```text
failed if note/status contains any of:
  fail · cancel · shortage · returned · rejected · lost

failedAmount = max(0, toPay − paidAmount)   when failed, else 0
sectionFailed = Σ failedAmount               (shown in the export total row)
```

Display-only. It never changes `balance`, `status` or anything written back to Sheets.

---

## 6. Sections

Sections are a list (`{ id, name, num, title, isArchive }`) stored as JSON in `_Meta.SECTIONS` and
mirrored into `localStorage`.

```json
[
  { "id": "section-1", "name": "Section 1", "num": 1, "title": "April – August 2026", "isArchive": true },
  { "id": "section-2", "name": "Section 2", "num": 2, "title": "Active Period",    "isArchive": false }
]
```

* Section 1 and Section 2 are **protected** — they cannot be deleted, only re-titled.
* Section 3+ can be created by either user and deleted by Admin.
* Creating a section sets `shinex_sections_dirty` until the new list is pushed to the cloud; the
  next `fetchAll()` re-pushes local sections rather than letting the cloud overwrite them.

---

## 7. `DATA_VERSION`

`_Meta.DATA_VERSION` is the change counter that drives live sync.

| Event | Increment |
| :--- | :--- |
| add / update / delete transport | ✅ |
| add / update / delete advance | ✅ |
| `saveSections` | ✅ |
| `setOpeningBalance` | ✅ |
| `updatePassword` | ✅ |
| `recalculateFinancials` | ✅ |
| read-only requests | ❌ |

Every increment also writes `LAST_UPDATED`, `LAST_ACTION` and `LAST_UPDATED_BY`, which the
`getVersion` endpoint returns — that is how the UI can say *who* changed the data and *when*.

The client mirrors the last-seen value in `localStorage` under `shinex_data_version`.

---

## 8. Opening balance

One shared number, `_Meta.OPENING_BALANCE`, editable by Admin in Settings and pushed with
`setOpeningBalance`. It is Section 1's "Before March 2026" opening figure; it does not affect any
trip.

---

## 9. Browser-side cache keys

| Key | Contents | Notes |
| :--- | :--- | :--- |
| `transport_records_shinex_v9` | normalised transport rows | overwritten by every cloud fetch |
| `transport_advances_shinex_v9` | normalised advances | same |
| `transport_sections_shinex_v9` | section list | cloud is authoritative unless `shinex_sections_dirty` is set |
| `transport_opening_bal_shinex_v9` | opening balance | from `_Meta` |
| `shinex_data_version` | last cloud version seen | sync comparison key |
| `shinex_sections_dirty` | flag | pending local section changes |
| `transport_api_url` | Apps Script URL | Settings overrides the built-in default |
| `transport_user_session_v2` (**sessionStorage**) | user + token + expiry | cleared on logout/tab close |
| `transport_auth_users_v2` | salted password hashes | never plaintext |
| `auth_failed_attempts`, `auth_lock_until` | client rate limiting | — |
| `shinex_backup_snapshots_v1` | device-local snapshots | Admin-only restore |
| `shinex_backup_settings_v1` | auto-backup / auto-download flags | — |

Deleting all of these is safe: the app rebuilds them from the cloud on the next load.

---

## 10. Backup snapshot shape

```json
{
  "id": "SNAP-1759392000000",
  "timestamp": "2026-10-02T…",
  "displayDate": "02-10-2026, 11:59:23 am",
  "fileName": "Shinex_Backup_2026-10-02_11-59-23.xlsx",
  "reason": "Save Transport LR: 196",
  "tripCount": 36,
  "advanceCount": 16,
  "netOutstanding": "₹10,000",
  "data": { "transport": [], "advances": [], "openingBal": 120000, "sections": [] }
}
```

Restoring posts this back to `restoreFullDataset`, which takes a
`Pre-Restore-Safety-Backup` copy in Google Drive before writing anything.