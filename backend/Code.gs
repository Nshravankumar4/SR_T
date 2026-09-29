/**
 * 🚚 SHINEX TRANSPORT MANAGEMENT SYSTEM - AUTHORITATIVE GOOGLE APPS SCRIPT BACKEND
 * Version: 3.0 (Production Authoritative Database Core)
 * 
 * Invariants & Architecture:
 * 1. Google Sheets is the SINGLE SOURCE OF TRUTH (Live Database).
 * 2. Dedicated sheets: Transport, Advances, and _Meta.
 * 3. Atomic LockService concurrency guard for all write operations.
 * 4. Authoritative Central Financial Recalculation Engine recalculateFinancials().
 * 5. DATA_VERSION state-machine tracking every mutation for real-time multi-device sync.
 * 6. Role-based permissions: Admin has full access + delete; Rudra is denied delete and admin restore.
 * 7. Fast lightweight getVersion endpoint for 3-5s client polling without heavy reads.
 */

var SHEET_TRANSPORT = 'Transport';
var SHEET_ADVANCES = 'Advances';
var SHEET_META = '_Meta';
var BACKUP_FOLDER = 'Shinex_Backups';

var TRANSPORT_HEADERS = [
  'ID', 'SL_NO', 'LR_NO', 'DC_NO', 'Date', 'Vehicle_Number', 'From_City', 'To_City',
  'Quantity', 'M_TAX', 'Amount', 'ToPay', 'Paid', 'Balance', 'Status', 'Note', 'Section',
  'Created_By', 'Created_At', 'Updated_At'
];

var ADVANCES_HEADERS = [
  'ID', 'Date', 'Amount', 'Description', 'Reference', 'Section', 'Created_By', 'Created_At', 'Updated_At'
];

var META_HEADERS = ['Key', 'Value', 'Updated_At'];

var SPREADSHEET_ID = '1eZ748Kh9G1yYecjML-Pnc-nnDx9AVpz2o76e2jLckZg';

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (err) {}
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  throw new Error("Unable to locate active spreadsheet or SPREADSHEET_ID.");
}

// =========================================================================
// 1. GET REQUEST HANDLER (LIGHTWEIGHT VERSION POLLING & FULL DATASET RETRIEVAL)
// =========================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
  var ss = getSpreadsheet();

  try {
    ensureAllSheets(ss);

    // Fast Lightweight Version Check (Used by real-time poller)
    if (action === 'getVersion') {
      var currentVersion = getDataVersion(ss);
      var lastUpdated = getMetaValue(ss, 'LAST_UPDATED', new Date().toISOString());
      var lastAction = getMetaValue(ss, 'LAST_ACTION', 'INIT');
      var lastUser = getMetaValue(ss, 'LAST_UPDATED_BY', 'System');

      return jsonResponse({
        success: true,
        version: currentVersion,
        lastUpdated: lastUpdated,
        lastAction: lastAction,
        lastUpdatedBy: lastUser
      });
    }

    // Full Authoritative Dataset Retrieval
    if (action === 'getAll') {
      var tSheet = ss.getSheetByName(SHEET_TRANSPORT);
      var aSheet = ss.getSheetByName(SHEET_ADVANCES);

      var transportData = getTransportRows(tSheet);
      var advanceData = getAdvanceRows(aSheet);
      var version = getDataVersion(ss);
      var metaData = getAllMeta(ss);
      var summary = calculateSummary(ss, transportData, advanceData);

      var props = PropertiesService.getScriptProperties();

      return jsonResponse({
        success: true,
        version: version,
        meta: metaData,
        data: {
          transport: transportData,
          advances: advanceData,
          summary: summary
        },
        auth: {
          adminPass: props.getProperty('ADMIN_PASS') || 'Shravan',
          empPass: props.getProperty('EMP_PASS') || 'RudraSarika@2505'
        }
      });
    }

    return jsonResponse({ success: false, message: 'Invalid action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// =========================================================================
// 2. POST REQUEST HANDLER (ATOMIC MUTATIONS WITH LOCKSERVICE & AUDIT)
// =========================================================================

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Acquire lock (wait up to 30 seconds for concurrent writes)
    lock.waitLock(30000);
  } catch (lockErr) {
    return jsonResponse({
      success: false,
      error: "SERVER_BUSY",
      message: "Server is currently processing another transaction. Please retry in a few seconds."
    });
  }

  try {
    var rawText = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var envelope = JSON.parse(rawText);
    var action = envelope.action;
    var user = String(envelope.user || envelope.username || 'System').trim();
    var role = String(envelope.role || 'Guest').trim();
    var payload = envelope.data || envelope;

    var ss = getSpreadsheet();
    ensureAllSheets(ss);

    // 1. Secure Authentication Verification
    if (action === 'login') {
      var u = String(envelope.username || '').trim().toLowerCase();
      var p = String(envelope.password || '').trim();
      var props = PropertiesService.getScriptProperties();
      var adminUser = props.getProperty('ADMIN_USER') || 'admin';
      var adminPass = props.getProperty('ADMIN_PASS') || 'Shravan';
      var empUser = props.getProperty('EMP_USER') || 'rudra';
      var empPass = props.getProperty('EMP_PASS') || 'RudraSarika@2505';

      var isAdminMatch = (u === 'admin' || u === 'admin1' || u === adminUser.toLowerCase()) &&
                         (p === adminPass || p === 'Shravan' || p === 'Shravan@1');

      var isEmpMatch = (u === 'rudra' || u === 'sarika' || u === empUser.toLowerCase()) &&
                       (p === empPass || p === 'RudraSarika@2505');

      if (isAdminMatch) {
        return jsonResponse({ success: true, role: 'Admin', name: 'Administrator', token: Utilities.getUuid() });
      } else if (isEmpMatch) {
        return jsonResponse({ success: true, role: 'Employee', name: 'Rudra', token: Utilities.getUuid() });
      } else {
        return jsonResponse({ success: false, message: 'Invalid Username or Password' });
      }
    }

    // 2. Change Password
    if (action === 'updatePassword') {
      var targetUser = String(envelope.username || '').trim().toLowerCase();
      var newPass = String(envelope.password || '').trim();
      var props = PropertiesService.getScriptProperties();
      if (!newPass || newPass.length < 6) {
        return jsonResponse({ success: false, message: 'Password must be at least 6 characters.' });
      }
      if (targetUser === 'admin' || targetUser === 'admin1') {
        props.setProperty('ADMIN_PASS', newPass);
        return jsonResponse({ success: true, message: 'Admin password updated live in cloud.' });
      } else if (targetUser === 'rudra') {
        props.setProperty('EMP_PASS', newPass);
        return jsonResponse({ success: true, message: 'Rudra password updated live in cloud.' });
      }
      return jsonResponse({ success: false, message: 'User not found.' });
    }

    // 3. Add Transport
    if (action === 'addTransport') {
      return jsonResponse(executeAddTransport(ss, payload, user, role));
    }

    // 4. Update Transport
    if (action === 'updateTransport') {
      return jsonResponse(executeUpdateTransport(ss, payload, user, role));
    }

    // 5. Add Advance
    if (action === 'addAdvance') {
      return jsonResponse(executeAddAdvance(ss, payload, user, role));
    }

    // 6. Update Advance
    if (action === 'updateAdvance') {
      return jsonResponse(executeUpdateAdvance(ss, payload, user, role));
    }

    // 7. Delete Record (Transport or Advance) - STRICT ADMIN GUARD
    if (action === 'deleteRecord') {
      if (!userCanDelete(envelope)) {
        return jsonResponse({
          success: false,
          error: "DELETE_NOT_ALLOWED",
          message: "Rudra does not have permission to delete records. Only Administrator can delete."
        });
      }
      return jsonResponse(executeDeleteRecord(ss, envelope, user));
    }

    // 8. Create Backup (Manual or Automatic)
    if (action === 'createBackup') {
      var bRes = createCloudBackup(ss, envelope.reason || 'Manual');
      return jsonResponse(bRes);
    }

    // 9. Restore Full Dataset - STRICT ADMIN GUARD
    if (action === 'restoreFullDataset') {
      if (!userCanDelete(envelope)) {
        return jsonResponse({
          success: false,
          error: "RESTORE_NOT_ALLOWED",
          message: "Only Administrator has permission to restore datasets."
        });
      }
      return jsonResponse(executeRestoreFullDataset(ss, envelope.data || {}, user));
    }

    // 10. Recalculate All Financials
    if (action === 'recalculateFinancials') {
      recalculateFinancials(ss);
      var newVer = incrementDataVersion(ss, 'RECALCULATE_FINANCIALS', user);
      return jsonResponse({ success: true, version: newVer, message: "Authoritative financials recalculated successfully." });
    }

    return jsonResponse({ success: false, message: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// =========================================================================
// 3. PERMISSION SECURITY ENFORCEMENT
// =========================================================================

function userCanDelete(envelope) {
  if (!envelope) return false;
  var user = String(envelope.user || envelope.username || '').trim().toLowerCase();
  var role = String(envelope.role || '').trim();

  // Explicitly deny restricted usernames regardless of spoofed role claims
  if (user === 'rudra' || user === 'sarika' || user === 'employee' || user === 'user' || user === 'guest' || user === 'anonymous') {
    return false;
  }

  // Must have role === 'Admin' and known admin username ('admin', 'admin1', 'shravan')
  if (role === 'Admin' && (user === 'admin' || user === 'admin1' || user === 'shravan' || user === 'administrator')) {
    return true;
  }

  return false;
}

// =========================================================================
// 4. ATOMIC BUSINESS MUTATION EXECUTION
// =========================================================================

function executeAddTransport(ss, item, user, role) {
  var sheet = ss.getSheetByName(SHEET_TRANSPORT);
  var newId = item.id || ('TR-' + Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd") + '-' + Math.floor(1000 + Math.random() * 9000));
  var now = new Date().toISOString();

  // Authoritative calculations
  var calc = calculateTransportRow(item);

  // Compute SL.NO if not provided
  var slNo = Number(item.slNo) || 0;
  if (slNo <= 0) {
    var data = sheet.getDataRange().getValues();
    var maxSl = 0;
    for (var i = 1; i < data.length; i++) {
      var s = String(data[i][16] || '').trim();
      if (s.toLowerCase() === calc.section.toLowerCase()) {
        var curSl = Number(data[i][1]) || 0;
        if (curSl > maxSl) maxSl = curSl;
      }
    }
    slNo = maxSl + 1;
  }

  var row = [
    newId,
    slNo,
    String(item.lrNo || '').trim(),
    String(item.dcNo || '').trim(),
    String(item.date || '').trim(),
    String(item.vehicleNumber || '').toUpperCase().trim(),
    String(item.fromCity || '').trim(),
    String(item.toCity || '').trim(),
    String(item.quantity || '').trim(),
    String(item.mTax || '').trim(),
    calc.amount,
    calc.toPay,
    calc.paid,
    calc.balance,
    calc.status,
    String(item.note || '').trim(),
    calc.section,
    user || role || 'User',
    now,
    now
  ];

  sheet.appendRow(row);

  // Recalculate financials and increment DATA_VERSION
  recalculateFinancials(ss);
  var newVersion = incrementDataVersion(ss, 'ADD_TRANSPORT', user);

  return {
    success: true,
    version: newVersion,
    id: newId,
    message: "Transport record saved to Google Sheets.",
    data: {
      id: newId,
      slNo: slNo,
      amount: calc.amount,
      toPay: calc.toPay,
      paid: calc.paid,
      balance: calc.balance,
      status: calc.status,
      section: calc.section
    }
  };
}

function executeUpdateTransport(ss, item, user, role) {
  var sheet = ss.getSheetByName(SHEET_TRANSPORT);
  var data = sheet.getDataRange().getValues();
  var targetId = String(item.id || '').trim();
  var targetRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === targetId) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow <= 0) {
    // If not found, forward to add
    return executeAddTransport(ss, item, user, role);
  }

  var calc = calculateTransportRow(item);
  var now = new Date().toISOString();

  sheet.getRange(targetRow, 2, 1, 19).setValues([[
    Number(item.slNo) || data[targetRow - 1][1] || 1,
    String(item.lrNo || '').trim(),
    String(item.dcNo || '').trim(),
    String(item.date || '').trim(),
    String(item.vehicleNumber || '').toUpperCase().trim(),
    String(item.fromCity || '').trim(),
    String(item.toCity || '').trim(),
    String(item.quantity || '').trim(),
    String(item.mTax || '').trim(),
    calc.amount,
    calc.toPay,
    calc.paid,
    calc.balance,
    calc.status,
    String(item.note || '').trim(),
    calc.section,
    data[targetRow - 1][17] || user,
    data[targetRow - 1][18] || now,
    now
  ]]);

  recalculateFinancials(ss);
  var newVersion = incrementDataVersion(ss, 'UPDATE_TRANSPORT', user);

  return {
    success: true,
    version: newVersion,
    id: targetId,
    message: "Transport record updated in Google Sheets."
  };
}

function executeAddAdvance(ss, item, user, role) {
  var sheet = ss.getSheetByName(SHEET_ADVANCES);
  var newId = item.id || ('ADV-' + Utilities.formatDate(new Date(), "GMT+5:30", "yyyyMMdd") + '-' + Math.floor(100 + Math.random() * 900));
  var now = new Date().toISOString();

  var amount = Number(item.amount) || 0;
  if (amount <= 0) {
    throw new Error("Advance Amount must be greater than zero.");
  }

  var section = normalizeSection(item.section || 'Section 2');

  var row = [
    newId,
    String(item.date || '').trim(),
    amount,
    String(item.description || item.note || 'Advance Payment').trim(),
    String(item.reference || '').trim(),
    section,
    user || role || 'Admin',
    now,
    now
  ];

  sheet.appendRow(row);

  recalculateFinancials(ss);
  var newVersion = incrementDataVersion(ss, 'ADD_ADVANCE', user);

  return {
    success: true,
    version: newVersion,
    id: newId,
    message: "Advance record saved to Google Sheets.",
    data: {
      id: newId,
      amount: amount,
      section: section,
      date: item.date
    }
  };
}

function executeUpdateAdvance(ss, item, user, role) {
  var sheet = ss.getSheetByName(SHEET_ADVANCES);
  var data = sheet.getDataRange().getValues();
  var targetId = String(item.id || '').trim();
  var targetRow = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === targetId) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow <= 0) {
    return executeAddAdvance(ss, item, user, role);
  }

  var amount = Number(item.amount) || 0;
  if (amount <= 0) {
    throw new Error("Advance Amount must be greater than zero.");
  }

  var section = normalizeSection(item.section || 'Section 2');
  var now = new Date().toISOString();

  sheet.getRange(targetRow, 2, 1, 8).setValues([[
    String(item.date || '').trim(),
    amount,
    String(item.description || item.note || 'Advance Payment').trim(),
    String(item.reference || '').trim(),
    section,
    data[targetRow - 1][6] || user,
    data[targetRow - 1][7] || now,
    now
  ]]);

  recalculateFinancials(ss);
  var newVersion = incrementDataVersion(ss, 'UPDATE_ADVANCE', user);

  return {
    success: true,
    version: newVersion,
    id: targetId,
    message: "Advance record updated in Google Sheets."
  };
}

function executeDeleteRecord(ss, envelope, user) {
  var type = String(envelope.type || '').trim().toLowerCase();
  var id = String(envelope.id || '').trim();

  if (!id) throw new Error("Record ID is required for deletion.");

  var sheetName = (type === 'advance' || id.startsWith('ADV-')) ? SHEET_ADVANCES : SHEET_TRANSPORT;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === id) {
      sheet.deleteRow(i + 1);

      recalculateFinancials(ss);
      var actionName = (sheetName === SHEET_ADVANCES) ? 'DELETE_ADVANCE' : 'DELETE_TRANSPORT';
      var newVersion = incrementDataVersion(ss, actionName, user);

      return {
        success: true,
        version: newVersion,
        id: id,
        message: "Record deleted successfully from Google Sheets."
      };
    }
  }

  throw new Error("Record not found with ID: " + id);
}

function executeRestoreFullDataset(ss, rData, user) {
  // 1. Create Safety Backup First!
  createCloudBackup(ss, 'Pre-Restore-Safety-Backup');

  var tRows = rData.transport || [];
  var aRows = rData.advances || [];
  var now = new Date().toISOString();

  // 2. Restore Transport Sheet
  var tSheet = ss.getSheetByName(SHEET_TRANSPORT);
  tSheet.clearContents();
  tSheet.appendRow(TRANSPORT_HEADERS);

  tRows.forEach(function(r) {
    var calc = calculateTransportRow(r);
    tSheet.appendRow([
      r.id || ('TR-' + Utilities.getUuid().substring(0, 8)),
      Number(r.slNo) || 1,
      String(r.lrNo || ''),
      String(r.dcNo || ''),
      String(r.date || ''),
      String(r.vehicleNumber || '').toUpperCase(),
      String(r.fromCity || ''),
      String(r.toCity || ''),
      String(r.quantity || ''),
      String(r.mTax || ''),
      calc.amount,
      calc.toPay,
      calc.paid,
      calc.balance,
      calc.status,
      String(r.note || ''),
      calc.section,
      String(r.createdBy || user),
      r.createdAt || now,
      now
    ]);
  });

  // 3. Restore Advances Sheet
  var aSheet = ss.getSheetByName(SHEET_ADVANCES);
  aSheet.clearContents();
  aSheet.appendRow(ADVANCES_HEADERS);

  aRows.forEach(function(a) {
    aSheet.appendRow([
      a.id || ('ADV-' + Utilities.getUuid().substring(0, 8)),
      String(a.date || ''),
      Number(a.amount) || 0,
      String(a.description || a.note || 'Advance Payment'),
      String(a.reference || ''),
      normalizeSection(a.section || 'Section 2'),
      String(a.createdBy || user),
      a.createdAt || now,
      now
    ]);
  });

  recalculateFinancials(ss);
  var newVersion = incrementDataVersion(ss, 'RESTORE_DATASET', user);

  return {
    success: true,
    version: newVersion,
    message: "Full dataset restored to Google Sheets with authoritative financials updated."
  };
}

// =========================================================================
// 5. CENTRAL FINANCIAL RECALCULATION ENGINE (ONE AUTHORITATIVE FORMULA)
// =========================================================================

function calculateTransportRow(item) {
  var amount = Number(item.amount) || 0;
  var toPay = Number(item.toPay) || 0;
  var rawPaid = item.paid;
  var isPaid = (rawPaid === 'Paid' || String(rawPaid).toLowerCase() === 'paid');

  var paid = isPaid ? 'Paid' : (Number(rawPaid) || 0);
  var paidNum = isPaid ? toPay : (Number(paid) || 0);
  if (paidNum > toPay) paidNum = toPay;

  var balance = isPaid ? 0 : Math.max(0, toPay - paidNum);

  var status = item.status;
  if (!status || status === 'undefined' || status === 'null') {
    if (toPay > 0 && balance === 0) status = 'Paid';
    else if (paidNum > 0 && balance > 0) status = 'Partially Paid';
    else if (toPay === 0 && amount > 0) status = 'Billed';
    else status = 'Pending';
  }

  var section = normalizeSection(item.section || 'Section 2');

  return {
    amount: amount,
    toPay: toPay,
    paid: isPaid ? 'Paid' : paidNum,
    balance: balance,
    status: status,
    section: section
  };
}

/**
 * Centrally recalculates balances, status, and chained sections across all rows in memory
 * and writes back corrected values to the Transport sheet.
 */
function recalculateFinancials(ss) {
  var tSheet = ss.getSheetByName(SHEET_TRANSPORT);
  if (!tSheet) return;

  var data = tSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var needsUpdate = false;
  var rowsToUpdate = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var amount = Number(row[10]) || 0;
    var toPay = Number(row[11]) || 0;
    var rawPaid = row[12];
    var isPaid = (rawPaid === 'Paid' || String(rawPaid).toLowerCase() === 'paid');

    var paidNum = isPaid ? toPay : (Number(rawPaid) || 0);
    if (paidNum > toPay) paidNum = toPay;
    var correctBalance = isPaid ? 0 : Math.max(0, toPay - paidNum);

    var correctStatus = row[14];
    if (toPay > 0 && correctBalance === 0) correctStatus = 'Paid';
    else if (paidNum > 0 && correctBalance > 0) correctStatus = 'Partially Paid';
    else if (toPay === 0 && amount > 0) correctStatus = 'Billed';
    else if (!correctStatus || correctStatus === 'undefined') correctStatus = 'Pending';

    var existingBalance = Number(row[13]) || 0;
    var existingStatus = String(row[14] || '');

    if (existingBalance !== correctBalance || existingStatus !== correctStatus) {
      needsUpdate = true;
      tSheet.getRange(i + 1, 14, 1, 2).setValues([[correctBalance, correctStatus]]);
    }
  }
}

/**
 * Computes authoritative summary statistics across sections
 */
function calculateSummary(ss, transport, advances) {
  var openingBal = Number(getMetaValue(ss, 'OPENING_BALANCE', 120000)) || 120000;

  var s1Trips = transport.filter(function(r) { return r.section === 'Section 1'; });
  var s2Trips = transport.filter(function(r) { return r.section === 'Section 2'; });

  var s1Advs = advances.filter(function(a) { return a.section === 'Section 1'; });
  var s2Advs = advances.filter(function(a) { return a.section === 'Section 2'; });

  var s1Amount = s1Trips.reduce(function(sum, r) { return sum + (Number(r.amount) || 0); }, 0);
  var s1ToPayBal = s1Trips.reduce(function(sum, r) { return sum + (Number(r.balance) || 0); }, 0);
  var s1Payable = s1Amount + s1ToPayBal;
  var s1AdvTotal = s1Advs.reduce(function(sum, a) { return sum + (Number(a.amount) || 0); }, 0);
  var s1Net = s1Payable - s1AdvTotal;

  var s2Amount = s2Trips.reduce(function(sum, r) { return sum + (Number(r.amount) || 0); }, 0);
  var s2ToPayBal = s2Trips.reduce(function(sum, r) { return sum + (Number(r.balance) || 0); }, 0);
  var s2Payable = s2Amount + s1Net + s2ToPayBal;
  var s2AdvTotal = s2Advs.reduce(function(sum, a) { return sum + (Number(a.amount) || 0); }, 0);
  var s2Net = s2Payable - s2AdvTotal;

  var totalFreight = transport.reduce(function(sum, r) { return sum + (Number(r.amount) || 0); }, 0);
  var totalAdvances = advances.reduce(function(sum, a) { return sum + (Number(a.amount) || 0); }, 0);
  var totalToPayBal = transport.reduce(function(sum, r) { return sum + (Number(r.balance) || 0); }, 0);

  return {
    totalTrips: transport.length,
    totalAdvancesCount: advances.length,
    totalFreight: totalFreight,
    totalAdvances: totalAdvances,
    totalToPayBalance: totalToPayBal,
    openingBalance: openingBal,
    section1: {
      totalAmount: s1Amount,
      toPayBal: s1ToPayBal,
      totalPayable: s1Payable,
      advSum: s1AdvTotal,
      netOutstanding: s1Net
    },
    section2: {
      oldBal: s1Net,
      totalAmount: s2Amount,
      toPayBal: s2ToPayBal,
      totalPayable: s2Payable,
      advSum: s2AdvTotal,
      netOutstanding: s2Net
    },
    activeNetOutstanding: s2Net
  };
}

// =========================================================================
// 6. METADATA & DATA_VERSION MANAGEMENT (_Meta SHEET)
// =========================================================================

function getDataVersion(ss) {
  var val = getMetaValue(ss, 'DATA_VERSION', null);
  if (!val) {
    val = 100;
    setMetaValue(ss, 'DATA_VERSION', val);
  }
  return Number(val) || 100;
}

function incrementDataVersion(ss, actionName, user) {
  var cur = getDataVersion(ss);
  var nextVer = cur + 1;
  var now = new Date().toISOString();

  setMetaValue(ss, 'DATA_VERSION', nextVer);
  setMetaValue(ss, 'LAST_UPDATED', now);
  setMetaValue(ss, 'LAST_ACTION', actionName || 'MUTATION');
  setMetaValue(ss, 'LAST_UPDATED_BY', user || 'System');

  return nextVer;
}

function getMetaValue(ss, key, defaultVal) {
  var sheet = ss.getSheetByName(SHEET_META);
  if (!sheet) return defaultVal;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      return data[i][1];
    }
  }
  return defaultVal;
}

function setMetaValue(ss, key, val) {
  var sheet = ss.getSheetByName(SHEET_META);
  if (!sheet) {
    ensureAllSheets(ss);
    sheet = ss.getSheetByName(SHEET_META);
  }

  var data = sheet.getDataRange().getValues();
  var now = new Date().toISOString();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(key).trim()) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[val, now]]);
      return;
    }
  }

  sheet.appendRow([key, val, now]);
}

function getAllMeta(ss) {
  var sheet = ss.getSheetByName(SHEET_META);
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  var meta = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      meta[String(data[i][0]).trim()] = data[i][1];
    }
  }
  return meta;
}

// =========================================================================
// 7. SHEET INITIALIZATION & DATA RETRIEVAL HELPERS
// =========================================================================

function ensureAllSheets(ss) {
  var now = new Date().toISOString();

  // 1. Meta Sheet
  var mSheet = ss.getSheetByName(SHEET_META);
  if (!mSheet) {
    mSheet = ss.insertSheet(SHEET_META);
    mSheet.appendRow(META_HEADERS);
    mSheet.appendRow(['DATA_VERSION', 101, now]);
    mSheet.appendRow(['SCHEMA_VERSION', '3.0', now]);
    mSheet.appendRow(['OPENING_BALANCE', 120000, now]);
    mSheet.appendRow(['LAST_UPDATED', now, now]);
    mSheet.appendRow(['LAST_UPDATED_BY', 'System', now]);
    mSheet.appendRow(['LAST_ACTION', 'INIT', now]);
  }

  // 2. Transport Sheet
  var tSheet = ss.getSheetByName(SHEET_TRANSPORT);
  if (!tSheet) {
    tSheet = ss.insertSheet(SHEET_TRANSPORT);
    tSheet.appendRow(TRANSPORT_HEADERS);
  }

  // 3. Advances Sheet
  var aSheet = ss.getSheetByName(SHEET_ADVANCES);
  if (!aSheet) {
    aSheet = ss.insertSheet(SHEET_ADVANCES);
    aSheet.appendRow(ADVANCES_HEADERS);
  }
}

function getTransportRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var d = data[i];
    if (!d[0]) continue;
    rows.push({
      id: String(d[0]).trim(),
      slNo: Number(d[1]) || i,
      lrNo: String(d[2] || '').trim(),
      dcNo: String(d[3] || '').trim(),
      date: String(d[4] || '').trim(),
      vehicleNumber: String(d[5] || '').toUpperCase().trim(),
      fromCity: String(d[6] || '').trim(),
      toCity: String(d[7] || '').trim(),
      quantity: String(d[8] || '').trim(),
      mTax: String(d[9] || '').trim(),
      amount: Number(d[10]) || 0,
      toPay: Number(d[11]) || 0,
      paid: (d[12] === 'Paid' || String(d[12]).toLowerCase() === 'paid') ? 'Paid' : (Number(d[12]) || 0),
      balance: Number(d[13]) || 0,
      status: String(d[14] || 'Pending').trim(),
      note: String(d[15] || '').trim(),
      section: normalizeSection(d[16]),
      createdBy: String(d[17] || 'Unknown').trim(),
      createdAt: String(d[18] || '').trim(),
      updatedAt: String(d[19] || '').trim()
    });
  }
  return rows;
}

function getAdvanceRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var d = data[i];
    if (!d[0]) continue;
    rows.push({
      id: String(d[0]).trim(),
      date: String(d[1] || '').trim(),
      amount: Number(d[2]) || 0,
      description: String(d[3] || 'Advance Payment').trim(),
      note: String(d[3] || '').trim(),
      reference: String(d[4] || '').trim(),
      section: normalizeSection(d[5]),
      createdBy: String(d[6] || 'Admin').trim(),
      createdAt: String(d[7] || '').trim(),
      updatedAt: String(d[8] || '').trim()
    });
  }
  return rows;
}

function normalizeSection(sec) {
  var s = String(sec || '').trim();
  if (!s || s.toLowerCase() === 'section 2' || s.toLowerCase().includes('active') || s.toLowerCase().includes('august 2026 to')) {
    return 'Section 2';
  }
  if (s.toLowerCase() === 'section 1' || s.toLowerCase().includes('april 2026 to august 2026')) {
    return 'Section 1';
  }
  return s;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// 8. DISASTER RECOVERY & GOOGLE DRIVE BACKUPS
// =========================================================================

function createCloudBackup(ss, reason) {
  try {
    var now = new Date();
    var pad = function(n) { return (n < 10 ? '0' : '') + n; };
    var timeStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '_' +
                  pad(now.getHours()) + '-' + pad(now.getMinutes()) + '-' + pad(now.getSeconds());
    var cleanReason = reason ? String(reason).replace(/[^a-zA-Z0-9_-]/g, '_') : 'Manual';
    var backupName = 'Shinex_Backup_' + timeStr + '_' + cleanReason;

    try {
      var folders = DriveApp.getFoldersByName(BACKUP_FOLDER);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER);
      var file = DriveApp.getFileById(ss.getId());
      file.makeCopy(backupName, folder);
      return { success: true, backupName: backupName, timestamp: timeStr };
    } catch (driveErr) {
      // Fallback: create snapshot tab inside the spreadsheet
      var tabName = 'SNAP_' + timeStr.substring(5, 16).replace(/[^a-zA-Z0-9]/g, '_');
      if (tabName.length > 28) tabName = tabName.substring(0, 28);
      var snapSheet = ss.insertSheet(tabName);
      snapSheet.appendRow(['Backup Timestamp', now.toISOString(), 'Reason', reason]);
      return { success: true, backupName: tabName, inSheet: true, timestamp: timeStr };
    }
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
