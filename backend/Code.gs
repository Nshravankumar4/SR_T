/**
 * Google Apps Script Web App for Transport Management System
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new) and create a new Spreadsheet.
 * 2. Name the spreadsheet "Transport Management Data".
 * 3. Rename the first sheet to "Transport" and create a second sheet named "Advances".
 * 4. Click "Extensions" -> "Apps Script".
 * 5. Replace all code with this file content.
 * 6. Click "Deploy" -> "New deployment".
 * 7. Select type: "Web app".
 * 8. Execute as: "Me", Who has access: "Anyone".
 * 9. Click "Deploy" and copy the Web App URL into your Settings & API tab!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getAll') {
    var transportSheet = getOrCreateSheet(ss, 'Transport', [
      'ID', 'SL_NO', 'LR_NO', 'DC_NO', 'Date', 'Vehicle_Number', 'From_City', 'To_City',
      'Quantity', 'M_TAX', 'Amount', 'ToPay', 'Paid', 'Balance', 'Status', 'Note', 'Section', 'Created_By', 'Created_At'
    ]);
    var advanceSheet = getOrCreateSheet(ss, 'Advances', [
      'ID', 'Date', 'Amount', 'Description', 'Reference', 'Section', 'Created_By', 'Created_At'
    ]);
    
    var transportData = getTransportRows(transportSheet);
    var advanceData = getAdvanceRows(advanceSheet);
    
    return jsonResponse({
      success: true,
      data: {
        transport: transportData,
        advances: advanceData
      }
    });
  }
  
  return jsonResponse({ success: false, message: 'Invalid action' });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Secure Backend Authentication Check
    if (action === 'login') {
      var username = String(body.username || '').trim();
      var password = String(body.password || '').trim();
      var props = PropertiesService.getScriptProperties();
      var adminUser = props.getProperty('ADMIN_USER') || 'Admin1';
      var adminPass = props.getProperty('ADMIN_PASS') || 'Shravan@1';
      var empUser = props.getProperty('EMP_USER') || 'EAdmin2';
      var empPass = props.getProperty('EMP_PASS') || 'EShravan@2';

      if (username.toLowerCase() === adminUser.toLowerCase() && password === adminPass) {
        return jsonResponse({ success: true, role: 'Admin', name: 'Administrator', token: Utilities.getUuid() });
      } else if (username.toLowerCase() === empUser.toLowerCase() && password === empPass) {
        return jsonResponse({ success: true, role: 'Employee', name: 'Employee', token: Utilities.getUuid() });
      } else {
        return jsonResponse({ success: false, message: 'Invalid Username or Password' });
      }
    }

    if (action === 'addTransport') {
      var sheet = getOrCreateSheet(ss, 'Transport');
      var item = body.data || {};
      var newId = item.id || ('TR-' + Utilities.getUuid().substring(0, 8));
      var now = new Date().toISOString();
      var toPay = Number(item.toPay) || 0;
      var paid = (item.paid === 'Paid' || String(item.paid).toLowerCase() === 'paid') ? 'Paid' : (Number(item.paid) || 0);
      var bal = (paid === 'Paid') ? 0 : Math.max(0, toPay - (Number(paid) || 0));
      
      var row = [
        newId,
        item.slNo || '',
        item.lrNo || '',
        item.dcNo || '',
        item.date || '',
        item.vehicleNumber || '',
        item.fromCity || '',
        item.toCity || '',
        item.quantity || '',
        item.mTax || '',
        Number(item.amount) || 0,
        toPay,
        paid,
        bal,
        item.status || (bal <= 0 && toPay > 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending')),
        item.note || '',
        item.section || 'Section 2',
        item.createdBy || 'Unknown',
        now
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ success: true, id: newId });
    }

    if (action === 'updateTransport') {
      var sheet = getOrCreateSheet(ss, 'Transport');
      var item = body.data || {};
      var data = sheet.getDataRange().getValues();
      var targetRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(item.id)) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow > 0) {
        var toPay = Number(item.toPay) || 0;
        var paid = (item.paid === 'Paid' || String(item.paid).toLowerCase() === 'paid') ? 'Paid' : (Number(item.paid) || 0);
        var bal = (paid === 'Paid') ? 0 : Math.max(0, toPay - (Number(paid) || 0));
        
        sheet.getRange(targetRow, 2, 1, 16).setValues([[
          item.slNo || '',
          item.lrNo || '',
          item.dcNo || '',
          item.date || '',
          item.vehicleNumber || '',
          item.fromCity || '',
          item.toCity || '',
          item.quantity || '',
          item.mTax || '',
          Number(item.amount) || 0,
          toPay,
          paid,
          bal,
          item.status || (bal <= 0 && toPay > 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending')),
          item.note || '',
          item.section || 'Section 2'
        ]]);
        return jsonResponse({ success: true, message: 'Updated' });
      } else {
        // If not found, append
        return doPost({ postData: { contents: JSON.stringify({ action: 'addTransport', data: item }) } });
      }
    }
    
    if (action === 'addAdvance') {
      var sheet = getOrCreateSheet(ss, 'Advances');
      var item = body.data || {};
      var newId = item.id || ('ADV-' + Utilities.getUuid().substring(0, 8));
      var now = new Date().toISOString();
      
      var row = [
        newId,
        item.date || '',
        Number(item.amount) || 0,
        item.description || item.note || '',
        item.reference || '',
        item.section || 'Section 2',
        item.createdBy || 'Unknown',
        now
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ success: true, id: newId });
    }

    if (action === 'updateAdvance') {
      var sheet = getOrCreateSheet(ss, 'Advances');
      var item = body.data || {};
      var data = sheet.getDataRange().getValues();
      var targetRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(item.id)) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow > 0) {
        sheet.getRange(targetRow, 2, 1, 5).setValues([[
          item.date || '',
          Number(item.amount) || 0,
          item.description || item.note || '',
          item.reference || '',
          item.section || 'Section 2'
        ]]);
        return jsonResponse({ success: true, message: 'Advance updated' });
      } else {
        return doPost({ postData: { contents: JSON.stringify({ action: 'addAdvance', data: item }) } });
      }
    }
    
    if (action === 'deleteRecord') {
      var sheetName = body.type === 'advance' ? 'Advances' : 'Transport';
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ success: false, message: 'Sheet not found' });
      
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true, message: 'Deleted' });
        }
      }
      return jsonResponse({ success: false, message: 'Record not found' });
    }
    
    return jsonResponse({ success: false, message: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) {
      sheet.appendRow(headers);
    }
  }
  return sheet;
}

function getTransportRows(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var d = data[i];
    if (!d[0]) continue;
    rows.push({
      id: String(d[0]),
      slNo: Number(d[1]) || (i),
      lrNo: String(d[2] || ''),
      dcNo: String(d[3] || ''),
      date: String(d[4] || ''),
      vehicleNumber: String(d[5] || '').toUpperCase(),
      fromCity: String(d[6] || ''),
      toCity: String(d[7] || ''),
      quantity: String(d[8] || ''),
      mTax: String(d[9] || ''),
      amount: Number(d[10]) || 0,
      toPay: Number(d[11]) || 0,
      paid: d[12] === 'Paid' ? 'Paid' : (Number(d[12]) || 0),
      balance: Number(d[13]) || 0,
      status: String(d[14] || 'Pending'),
      note: String(d[15] || ''),
      section: String(d[16] || 'Section 2'),
      createdBy: String(d[17] || 'Unknown'),
      createdAt: String(d[18] || '')
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
      id: String(d[0]),
      date: String(d[1] || ''),
      amount: Number(d[2]) || 0,
      description: String(d[3] || 'Advance Payment'),
      note: String(d[3] || ''),
      reference: String(d[4] || ''),
      section: String(d[5] || 'Section 2'),
      createdBy: String(d[6] || 'Admin'),
      createdAt: String(d[7] || '')
    });
  }
  return rows;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
