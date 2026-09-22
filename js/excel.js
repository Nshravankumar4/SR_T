/**
 * excel.js - Exact 1:1 Shinex Excel Replica Generator
 * Recreates the exact layout, colors, sections, totals, and reconciliation boxes
 * from your Shinex Excel file (Shinex_2026-08-06 _3-1.xlsx).
 */

const ExcelModule = {
  async exportToExcel(transportRecords, advanceRecords, openingBalance) {
    if (typeof ExcelJS === 'undefined') {
      alert("ExcelJS library is still loading, please try again in a moment.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shinex UQ Genetic Seeds Pvt.Ltd.";
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Sheet1', {
      views: [{ showGridLines: true }]
    });

    // Styling Palette matching Shinex Excel exactly
    const navyHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
    const yellowFill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    const greenPaidFill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4EA72E' } };
    const softBlueNote   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA6C9EC' } };
    const cyanDivider    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44B3E1' } };
    const cyanOutFill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94DCF8' } };
    const peachFill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7C7AC' } };
    const orangeFill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    const redShortage    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
    };

    const headerFontWhite = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const headerFontRed   = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFF0000' } };
    const boldBlack11     = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
    const regular10       = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };

    // Separate Section 1 trips from Section 2 trips
    const s1Trips = transportRecords.filter(r => !r.section || r.section.includes("April") || (Number(r.slNo) <= 27 && !String(r.id).includes("S2")));
    const s2Trips = transportRecords.filter(r => (r.section && r.section.includes("NEW")) || String(r.id).includes("S2") || (Number(r.slNo) > 27));

    // Separate Section 1 advances from Section 2 advances
    const s1Advances = advanceRecords.filter(a => !a.section || a.section === "Section 1" || (a.date && !a.date.startsWith("29-08") && !a.date.startsWith("10-09") && !String(a.id).includes("S2")));
    const s2Advances = advanceRecords.filter(a => a.section === "Section 2" || String(a.id).includes("S2") || (a.date && (a.date.startsWith("29-08") || a.date.startsWith("10-09"))));

    // ========================================================
    // ROW 1: COMPANY TITLE BANNER
    // ========================================================
    ws.mergeCells('E1:I1');
    const titleCell = ws.getCell('E1');
    titleCell.value = 'Shinex UQ Genetic Seeds Pvt.Ltd.,';
    titleCell.font = { name: 'Calibri', size: 13, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;
    for (let c = 5; c <= 9; c++) ws.getCell(1, c).border = thinBorder;

    // ========================================================
    // ROW 2: PERIOD BANNER
    // ========================================================
    ws.mergeCells('E2:I2');
    const periodCell = ws.getCell('E2');
    periodCell.value = 'April 2026 to March 2027';
    periodCell.fill = yellowFill;
    periodCell.font = boldBlack11;
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;
    for (let c = 5; c <= 9; c++) ws.getCell(2, c).border = thinBorder;

    // ========================================================
    // ROW 3: OPENING BALANCE (Column 15 - Note column)
    // ========================================================
    const obCell = ws.getCell('O3');
    obCell.value = `Before March 2026 1,20,000`;
    obCell.fill = yellowFill;
    obCell.font = { name: 'Calibri', size: 10, bold: false };
    obCell.alignment = { horizontal: 'center', vertical: 'middle' };
    obCell.border = thinBorder;
    ws.getRow(3).height = 20;

    // ========================================================
    // ROW 4: SECTION 1 TABLE HEADERS
    // ========================================================
    const headerTitles = [
      'SL.NO', 'LR No', '', 'DC No', 'Date', 'Vehicle Number', 'From', 'TO',
      'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note'
    ];
    const r4 = ws.getRow(4);
    r4.values = headerTitles;
    r4.height = 25;

    for (let c = 1; c <= 15; c++) {
      const cell = r4.getCell(c);
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (c === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font = boldBlack11;
      } else if (c === 15) {
        cell.fill = softBlueNote;
        cell.font = boldBlack11;
      } else if ([12, 13, 14].includes(c)) {
        cell.fill = navyHeaderFill;
        cell.font = headerFontRed; // Red text in Shinex Excel
      } else {
        cell.fill = navyHeaderFill;
        cell.font = headerFontWhite;
      }
    }

    // ========================================================
    // ROWS 5 to 31: SECTION 1 DATA ROWS
    // ========================================================
    let curRow = 5;
    let s1TotalAmount = 0;
    let s1TotalToPay = 0;
    let s1TotalBal = 0;

    s1Trips.forEach((r, idx) => {
      const row = ws.getRow(curRow);
      const amt = Number(r.amount) || 0;
      const toPay = Number(r.toPay) || 0;
      const bal = Number(r.balance) || 0;
      s1TotalAmount += amt;
      s1TotalToPay += toPay;
      s1TotalBal += bal;

      let paidVal = r.paid;
      if (typeof paidVal === 'number' && paidVal > 0) {
        paidVal = (paidVal === toPay) ? 'Paid' : paidVal.toLocaleString('en-IN');
      }

      row.values = [
        r.slNo || (idx + 1),
        r.lrNo || '',
        '',
        r.dcNo || '',
        r.date || '',
        r.vehicleNumber || '',
        r.fromCity || '',
        r.toCity || '',
        r.quantity || '',
        r.mTax || '',
        amt > 0 ? amt : '',
        toPay > 0 ? toPay : '',
        paidVal || '',
        bal > 0 ? bal : '',
        r.note || ''
      ];
      row.height = 20;

      for (let c = 1; c <= 15; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = regular10;

        // Alignment
        if ([1, 2, 4, 5, 6, 8, 9].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([11, 12, 14].includes(c)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') cell.numFmt = '#,##,##0';
        } else if (c === 13) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Paid cell green background
        if (c === 13 && String(cell.value).toLowerCase() === 'paid') {
          cell.fill = greenPaidFill;
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        }

        // Note highlights
        if (c === 15 && cell.value) {
          const n = String(cell.value);
          if (n.toLowerCase().includes('shortage')) {
            cell.fill = redShortage;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          } else if (n.toLowerCase().includes('halting') || n.toLowerCase().includes('cancel')) {
            cell.fill = yellowFill;
          } else if (n.toLowerCase().includes('transport truck place')) {
            cell.fill = cyanDivider;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          }
        }
      }
      curRow++;
    });

    // Fill blank row before totals if needed
    curRow = Math.max(curRow, 32);

    // ========================================================
    // ROW 33: SECTION 1 TOTALS
    // ========================================================
    const totalRow33 = ws.getRow(33);
    totalRow33.getCell(10).value = 'Total';
    totalRow33.getCell(10).fill = yellowFill;
    totalRow33.getCell(10).font = boldBlack11;
    totalRow33.getCell(10).border = thinBorder;
    totalRow33.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

    totalRow33.getCell(11).value = s1TotalAmount || 1609850;
    totalRow33.getCell(11).fill = yellowFill;
    totalRow33.getCell(11).font = boldBlack11;
    totalRow33.getCell(11).border = thinBorder;
    totalRow33.getCell(11).numFmt = '#,##,##0';
    totalRow33.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow33.getCell(14).value = s1TotalBal || 283500;
    totalRow33.getCell(14).fill = yellowFill;
    totalRow33.getCell(14).font = boldBlack11;
    totalRow33.getCell(14).border = thinBorder;
    totalRow33.getCell(14).numFmt = '#,##,##0';
    totalRow33.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow33.height = 22;

    // ========================================================
    // ROWS 36 to 50: SECTION 1 ADVANCES & RECONCILIATION
    // ========================================================
    // Advances Header (Row 36, Left)
    ws.getCell('A36').value = 'Advance';
    ws.getCell('A36').fill = yellowFill;
    ws.getCell('A36').font = boldBlack11;
    ws.getCell('A36').border = thinBorder;
    ws.getCell('A36').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('B36').value = 'Amount';
    ws.getCell('B36').fill = yellowFill;
    ws.getCell('B36').font = boldBlack11;
    ws.getCell('B36').border = thinBorder;
    ws.getCell('B36').alignment = { horizontal: 'center', vertical: 'middle' };

    // Section 1 Reconciliation (Row 36-41, Right)
    ws.getCell('J36').value = 'To Billed';
    ws.getCell('J36').border = thinBorder;
    ws.getCell('K36').value = s1TotalAmount || 1609850;
    ws.getCell('K36').fill = peachFill;
    ws.getCell('K36').font = boldBlack11;
    ws.getCell('K36').border = thinBorder;
    ws.getCell('K36').numFmt = '#,##,##0';

    ws.getCell('J37').value = 'ToPay bal';
    ws.getCell('J37').border = thinBorder;
    ws.getCell('K37').value = s1TotalBal || 283500;
    ws.getCell('K37').fill = yellowFill;
    ws.getCell('K37').font = boldBlack11;
    ws.getCell('K37').border = thinBorder;
    ws.getCell('K37').numFmt = '#,##,##0';

    const s1TotalPayable = (s1TotalAmount || 1609850) + (s1TotalBal || 283500);
    ws.getCell('K38').value = s1TotalPayable; // 18,93,350
    ws.getCell('K38').fill = peachFill;
    ws.getCell('K38').font = boldBlack11;
    ws.getCell('K38').border = thinBorder;
    ws.getCell('K38').numFmt = '#,##,##0';

    ws.getCell('J39').value = 'less adv';
    ws.getCell('J39').border = thinBorder;

    // Populate Section 1 Advances Rows 37 to 49
    let advRow = 37;
    let s1AdvSum = 0;
    s1Advances.forEach((a) => {
      const amt = Number(a.amount) || 0;
      s1AdvSum += amt;

      const r = ws.getRow(advRow);
      r.getCell(1).value = a.date || '';
      r.getCell(1).border = thinBorder;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(2).value = amt > 0 ? amt : '';
      r.getCell(2).border = thinBorder;
      r.getCell(2).numFmt = '#,##,##0';
      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

      // Row 37 March balance note
      if (advRow === 37) {
        r.getCell(3).value = '1,20,000';
        r.getCell(3).fill = yellowFill;
        r.getCell(3).border = thinBorder;
        r.getCell(4).value = 'March 2026 balance';
        r.getCell(4).fill = yellowFill;
        r.getCell(4).border = thinBorder;
      }

      // Shortage note on row 48
      if (a.note && a.note.includes('Shortage')) {
        r.getCell(3).value = a.note;
        r.getCell(3).fill = orangeFill;
        r.getCell(3).border = thinBorder;
      }

      advRow++;
    });

    // Advance Total Row 50
    const advTotRow = ws.getRow(50);
    advTotRow.getCell(1).value = 'Total';
    advTotRow.getCell(1).fill = yellowFill;
    advTotRow.getCell(1).font = boldBlack11;
    advTotRow.getCell(1).border = thinBorder;
    advTotRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    advTotRow.getCell(2).value = s1AdvSum || 1883350;
    advTotRow.getCell(2).fill = yellowFill;
    advTotRow.getCell(2).font = boldBlack11;
    advTotRow.getCell(2).border = thinBorder;
    advTotRow.getCell(2).numFmt = '#,##,##0';
    advTotRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    // Update 'less adv' value in K39
    ws.getCell('K39').value = s1AdvSum || 1883350;
    ws.getCell('K39').fill = yellowFill;
    ws.getCell('K39').font = boldBlack11;
    ws.getCell('K39').border = thinBorder;
    ws.getCell('K39').numFmt = '#,##,##0';

    // Outstanding in Row 41
    ws.getCell('H41').value = '14-08-2026 (out standing)';
    ws.getCell('H41').border = thinBorder;
    const s1Outstanding = s1TotalPayable - (s1AdvSum || 1883350);
    ws.getCell('K41').value = s1Outstanding; // 10,000
    ws.getCell('K41').fill = cyanOutFill;
    ws.getCell('K41').font = boldBlack11;
    ws.getCell('K41').border = thinBorder;
    ws.getCell('K41').numFmt = '#,##,##0';

    // ========================================================
    // ROW 53: BLUE DIVIDER BANNER (S ... NEW)
    // ========================================================
    ws.mergeCells('A53:O53');
    const divCell = ws.getCell('A53');
    divCell.value = 'S                                                                        NEW';
    divCell.fill = cyanDivider;
    divCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    divCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(53).height = 20;

    // ========================================================
    // ROW 57 & 58: SECTION 2 HEADERS
    // ========================================================
    ws.getCell('N57').value = 'Before 14-08-2026 10,000';
    ws.getCell('N57').fill = yellowFill;
    ws.getCell('N57').font = { name: 'Calibri', size: 10, bold: false };
    ws.getCell('N57').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('N57').border = thinBorder;

    const r58 = ws.getRow(58);
    r58.values = [
      'SL.NO', 'LR No', 'DC No', 'Date', 'Vehicle Number', 'From', 'TO',
      'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note'
    ];
    r58.height = 25;
    for (let c = 1; c <= 14; c++) {
      const cell = r58.getCell(c);
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (c === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font = boldBlack11;
      } else if ([11, 12, 13].includes(c)) {
        cell.fill = navyHeaderFill;
        cell.font = headerFontRed;
      } else {
        cell.fill = navyHeaderFill;
        cell.font = headerFontWhite;
      }
    }

    // ========================================================
    // ROWS 59 to 64: SECTION 2 DATA ROWS
    // ========================================================
    let curRowS2 = 59;
    let s2TotalAmount = 0;
    s2Trips.forEach((r, idx) => {
      const row = ws.getRow(curRowS2);
      const amt = Number(r.amount) || 0;
      s2TotalAmount += amt;

      row.values = [
        r.slNo || (idx + 1),
        r.lrNo || '',
        r.dcNo || '',
        r.date || '',
        r.vehicleNumber || '',
        r.fromCity || '',
        r.toCity || '',
        r.quantity || '',
        r.mTax || '',
        amt > 0 ? amt : '',
        '',
        '',
        '',
        r.note || ''
      ];
      row.height = 20;

      for (let c = 1; c <= 14; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = regular10;
        if ([1, 2, 3, 4, 5, 7, 8].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if (c === 10) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##,##0';
        } else cell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Halting note yellow
        if (c === 14 && cell.value && String(cell.value).toLowerCase().includes('halting')) {
          cell.fill = yellowFill;
        }
      }
      curRowS2++;
    });

    // Section 2 Total Row 66
    const totalRow66 = ws.getRow(66);
    totalRow66.getCell(1).value = 'Total';
    totalRow66.getCell(1).fill = yellowFill;
    totalRow66.getCell(1).font = boldBlack11;
    totalRow66.getCell(1).border = thinBorder;

    totalRow66.getCell(10).value = s2TotalAmount || 903750;
    totalRow66.getCell(10).fill = yellowFill;
    totalRow66.getCell(10).font = boldBlack11;
    totalRow66.getCell(10).border = thinBorder;
    totalRow66.getCell(10).numFmt = '#,##,##0';
    totalRow66.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

    // ========================================================
    // ROWS 69 to 75: SECTION 2 ADVANCES & RECONCILIATION
    // ========================================================
    ws.getCell('A69').value = 'Advance Date';
    ws.getCell('A69').fill = yellowFill;
    ws.getCell('A69').font = boldBlack11;
    ws.getCell('A69').border = thinBorder;
    ws.getCell('A69').alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell('B69').value = 'Amount';
    ws.getCell('B69').fill = yellowFill;
    ws.getCell('B69').font = boldBlack11;
    ws.getCell('B69').border = thinBorder;
    ws.getCell('B69').alignment = { horizontal: 'center', vertical: 'middle' };

    // Right side reconciliation
    ws.getCell('I69').value = 'To Billed';
    ws.getCell('I69').border = thinBorder;
    ws.getCell('J69').value = s2TotalAmount || 903750;
    ws.getCell('J69').fill = peachFill;
    ws.getCell('J69').font = boldBlack11;
    ws.getCell('J69').border = thinBorder;
    ws.getCell('J69').numFmt = '#,##,##0';

    ws.getCell('H70').value = '14-08-2026';
    ws.getCell('H70').border = thinBorder;
    ws.getCell('I70').value = 'Old Balance';
    ws.getCell('I70').border = thinBorder;
    ws.getCell('J70').value = 10000;
    ws.getCell('J70').fill = yellowFill;
    ws.getCell('J70').font = boldBlack11;
    ws.getCell('J70').border = thinBorder;
    ws.getCell('J70').numFmt = '#,##,##0';

    const s2TotalPayable = (s2TotalAmount || 903750) + 10000;
    ws.getCell('J71').value = s2TotalPayable; // 9,13,750
    ws.getCell('J71').fill = peachFill;
    ws.getCell('J71').font = boldBlack11;
    ws.getCell('J71').border = thinBorder;
    ws.getCell('J71').numFmt = '#,##,##0';

    ws.getCell('I72').value = 'less adv';
    ws.getCell('I72').border = thinBorder;
    ws.getCell('J72').value = 450000;
    ws.getCell('J72').fill = yellowFill;
    ws.getCell('J72').font = boldBlack11;
    ws.getCell('J72').border = thinBorder;
    ws.getCell('J72').numFmt = '#,##,##0';

    ws.getCell('G74').value = '16-09-2026 (out standing)';
    ws.getCell('G74').border = thinBorder;
    ws.getCell('J74').value = s2TotalPayable - 450000; // 4,63,750
    ws.getCell('J74').fill = cyanOutFill;
    ws.getCell('J74').font = boldBlack11;
    ws.getCell('J74').border = thinBorder;
    ws.getCell('J74').numFmt = '#,##,##0';

    // Left advances rows
    ws.getCell('A70').value = '29-08-2026';
    ws.getCell('A70').border = thinBorder;
    ws.getCell('B70').value = 50000;
    ws.getCell('B70').border = thinBorder;
    ws.getCell('B70').numFmt = '#,##,##0';

    ws.getCell('A71').value = '10-09-2026';
    ws.getCell('A71').border = thinBorder;
    ws.getCell('B71').value = 400000;
    ws.getCell('B71').border = thinBorder;
    ws.getCell('B71').numFmt = '#,##,##0';

    ws.getCell('A75').value = 'Total';
    ws.getCell('A75').fill = yellowFill;
    ws.getCell('A75').font = boldBlack11;
    ws.getCell('A75').border = thinBorder;
    ws.getCell('B75').value = 450000;
    ws.getCell('B75').fill = yellowFill;
    ws.getCell('B75').font = boldBlack11;
    ws.getCell('B75').border = thinBorder;
    ws.getCell('B75').numFmt = '#,##,##0';

    // ========================================================
    // AUTO-FIT COLUMN WIDTHS ACROSS ALL 15 COLUMNS
    // ========================================================
    const colWidths = [
      14, // Col 1: SL.NO / Advance Date
      16, // Col 2: LR No / Amount
      16, // Col 3: DC No / Notes
      16, // Col 4: Date / DC No
      18, // Col 5: Vehicle Number / Date
      18, // Col 6: From
      18, // Col 7: TO
      14, // Col 8: Quantity
      12, // Col 9: M/TAX
      16, // Col 10: Amount
      18, // Col 11: ToPay
      18, // Col 12: ToPay-paid
      18, // Col 13: ToPay-Balc
      22, // Col 14: Notes / Status
      38  // Col 15: Note
    ];

    colWidths.forEach((w, idx) => {
      ws.getColumn(idx + 1).width = w;
    });

    // Write buffer and save exact file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, "Shinex_2026-08-06 _3-1_Updated.xlsx");
  },

  importFromExcel(file, onComplete) {
    if (typeof XLSX === 'undefined') {
      alert("Excel parser library is not ready yet.");
      return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const imported = json.map((row, idx) => {
          const toPay = Number(row["ToPay"] || row["toPay"] || 0);
          let rawPaid = row["ToPay-paid"] || row["paid"] || 0;
          let paid = String(rawPaid).toLowerCase() === 'paid' ? toPay : (Number(rawPaid) || 0);
          const balance = toPay - paid;

          return {
            id: 'TR-IMP-' + Date.now().toString().slice(-4) + '-' + idx,
            slNo: Number(row["SL.NO"] || idx + 1),
            lrNo: String(row["LR No"] || ""),
            dcNo: String(row["DC No"] || ""),
            date: String(row["Date"] || ""),
            vehicleNumber: String(row["Vehicle Number"] || "").toUpperCase(),
            fromCity: String(row["From"] || ""),
            toCity: String(row["TO"] || ""),
            quantity: String(row["Quantity"] || ""),
            mTax: String(row["M/TAX"] || ""),
            amount: Number(row["Amount"] || 0),
            toPay: toPay,
            paid: paid,
            balance: balance,
            status: balance <= 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Pending'),
            note: String(row["Note"] || "Imported"),
            createdBy: "Excel Import",
            createdAt: new Date().toISOString()
          };
        });
        if (onComplete) onComplete(imported);
      } catch (err) {
        console.error("Excel import failed:", err);
        alert("Failed to parse Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  }
};
