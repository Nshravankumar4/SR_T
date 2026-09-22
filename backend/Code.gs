/**
 * Google Apps Script Web App for Transport Management System
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new) and create a new Spreadsheet.
 * 2. Name the spreadsheet "Transport Management Data".
 * 3. Rename the first sheet to "Transport" and create a second sheet named "Advances".
 * 4. In "Transport" sheet, Row 1 Headers:
 *    [ID, SL_NO, LR_NO, DC_NO, Date, Vehicle_Number, From_City, To_City, Quantity, M_TAX, Amount, ToPay, Paid, Balance, Status, Note, Created_By, Created_At]
 * 5. In "Advances" sheet, Row 1 Headers:
 *    [ID, Date, Amount, Description, Reference, Created_By, Created_At]
 * 6. Click "Extensions" -> "Apps Script".
 * 7. Replace all code with this file content.
 * 8. Click "Deploy" -> "New deployment".
 * 9. Select type: "Web app".
 * 10. Execute as: "Me", Who has access: "Anyone".
 * 11. Click "Deploy" and copy the Web App URL into your js/api.js file!
 */

function doGet(e) {
  var action = e.parameter.action || 'getAll';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === 'getAll') {
    var transportSheet = getOrCreateSheet(ss, 'Transport', [
      'ID', 'SL_NO', 'LR_NO', 'DC_NO', 'Date', 'Vehicle_Number', 'From_City', 'To_City',
      'Quantity', 'M_TAX', 'Amount', 'ToPay', 'Paid', 'Balance', 'Status', 'Note', 'Created_By', 'Created_At'
    ]);
    var advanceSheet = getOrCreateSheet(ss, 'Advances', [
      'ID', 'Date', 'Amount', 'Description', 'Reference', 'Created_By', 'Created_At'
    ]);
    
    var transportData = getRowsData(transportSheet);
    var advanceData = getRowsData(advanceSheet);
    
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
      var item = body.data;
      var newId = item.id || ('TR-' + Utilities.getUuid().substring(0, 8));
      var now = new Date().toISOString();
      
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
        Number(item.toPay) || 0,
        Number(item.paid) || 0,
        (Number(item.toPay) || 0) - (Number(item.paid) || 0),
        item.status || 'Pending',
        item.note || '',
        item.createdBy || 'Unknown',
        now
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ success: true, id: newId });
    }
    
    if (action === 'addAdvance') {
      var sheet = getOrCreateSheet(ss, 'Advances');
      var item = body.data;
      var newId = item.id || ('ADV-' + Utilities.getUuid().substring(0, 8));
      var now = new Date().toISOString();
      
      var row = [
        newId,
        item.date || '',
        Number(item.amount) || 0,
        item.description || item.note || '',
        item.reference || '',
        item.createdBy || 'Unknown',
        now
      ];
      
      sheet.appendRow(row);
      return jsonResponse({ success: true, id: newId });
    }

    if (action === 'updateAdvance') {
      var sheet = getOrCreateSheet(ss, 'Advances');
      var item = body.data;
      var data = sheet.getDataRange().getValues();
      var targetRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(item.id)) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow > 0) {
        sheet.getRange(targetRow, 2, 1, 4).setValues([[
          item.date || '',
          Number(item.amount) || 0,
          item.description || item.note || '',
          item.reference || ''
        ]]);
        return jsonResponse({ success: true, message: 'Advance updated' });
      }
      return jsonResponse({ success: false, message: 'Advance not found' });
    }
    
    if (action === 'updateTransport') {
      var sheet = getOrCreateSheet(ss, 'Transport');
      var item = body.data;
      var data = sheet.getDataRange().getValues();
      var idCol = 0; // ID is first column
      var targetRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(item.id)) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow > 0) {
        var bal = (Number(item.toPay) || 0) - (Number(item.paid) || 0);
        sheet.getRange(targetRow, 2, 1, 15).setValues([[
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
          Number(item.toPay) || 0,
          Number(item.paid) || 0,
          bal,
          item.status || (bal <= 0 ? 'Paid' : (Number(item.paid) > 0 ? 'Partially Paid' : 'Pending')),
          item.note || ''
        ]]);
        return jsonResponse({ success: true, message: 'Updated' });
      }
      return jsonResponse({ success: false, message: 'Record not found' });
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

function getRowsData(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
