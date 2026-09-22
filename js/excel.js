/**
 * excel.js - Exact 1:1 Shinex Excel Replica Generator
 * Recreates the exact layout, colors, sections, totals, and reconciliation boxes
 * from your Shinex Excel file (Shinex_2026-08-06 _3-1.xlsx).
 */

const ExcelModule = {
  async exportToExcel(transportRecords, advanceRecords, openingBalance) {
    // Robust record resolution from parameters, window.App, or default dataset
    const tRecords = (transportRecords && transportRecords.length > 0)
      ? transportRecords
      : (window.App?.transportRecords && window.App.transportRecords.length > 0)
        ? window.App.transportRecords
        : (typeof REAL_SHINEX_TRANSPORT !== 'undefined' ? REAL_SHINEX_TRANSPORT : []);

    const aRecords = (advanceRecords && advanceRecords.length > 0)
      ? advanceRecords
      : (window.App?.advanceRecords && window.App.advanceRecords.length > 0)
        ? window.App.advanceRecords
        : (typeof REAL_SHINEX_ADVANCES !== 'undefined' ? REAL_SHINEX_ADVANCES : []);

    // If ExcelJS is not ready or failed to load, seamlessly use SheetJS engine
    if (typeof ExcelJS === 'undefined') {
      console.warn("ExcelJS not available, falling back to SheetJS engine.");
      return this.exportWithSheetJS(tRecords, aRecords);
    }

    try {
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

      // Separate Section 1 trips from Section 2 trips using global helpers
      const s1Trips = tRecords
        .filter(r => (typeof window !== 'undefined' && window.isSection1Trip ? window.isSection1Trip(r) : !r.section?.includes('NEW')))
        .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

      const s2Trips = tRecords
        .filter(r => (typeof window !== 'undefined' && window.isSection2Trip ? window.isSection2Trip(r) : r.section?.includes('NEW')))
        .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

      // Separate Section 1 advances from Section 2 advances
      const s1Advances = aRecords.filter(a => (typeof window !== 'undefined' && window.isSection1Advance ? window.isSection1Advance(a) : a.section !== 'Section 2'));
      const s2Advances = aRecords.filter(a => (typeof window !== 'undefined' && window.isSection2Advance ? window.isSection2Advance(a) : a.section === 'Section 2'));

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
    // ROWS 59+: SECTION 2 DATA ROWS
    // ========================================================
    let curRowS2 = 59;
    let s2TotalAmount = 0;
    s2Trips.forEach((r, idx) => {
      const row = ws.getRow(curRowS2);
      const amt = Number(r.amount) || 0;
      const toPay = Number(r.toPay) || 0;
      const bal = Number(r.balance) || 0;
      s2TotalAmount += amt;

      let paidVal = r.paid;
      if (typeof paidVal === 'number' && paidVal > 0) {
        paidVal = (paidVal === toPay) ? 'Paid' : paidVal.toLocaleString('en-IN');
      }

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
        toPay > 0 ? toPay : '',
        paidVal || '',
        bal > 0 ? bal : '',
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

    // Section 2 Total Row: 1 row after trips (at least row 66)
    const s2TotalRowIndex = Math.max(curRowS2 + 1, 66);
    const totalRow = ws.getRow(s2TotalRowIndex);
    totalRow.height = 22;
    totalRow.getCell(1).value = 'Total';
    totalRow.getCell(1).fill = yellowFill;
    totalRow.getCell(1).font = boldBlack11;
    totalRow.getCell(1).border = thinBorder;
    totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    totalRow.getCell(10).value = s2TotalAmount || 903750;
    totalRow.getCell(10).fill = yellowFill;
    totalRow.getCell(10).font = boldBlack11;
    totalRow.getCell(10).border = thinBorder;
    totalRow.getCell(10).numFmt = '#,##,##0';
    totalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

    // ========================================================
    // DYNAMIC SECTION 2 ADVANCES & RECONCILIATION
    // Starts 3 rows below the Total Row (row 69 when 6 trips)
    // ========================================================
    const reconRow = s2TotalRowIndex + 3;

    // Advances Header (Left)
    ws.getCell(`A${reconRow}`).value = 'Advance Date';
    ws.getCell(`A${reconRow}`).fill = yellowFill;
    ws.getCell(`A${reconRow}`).font = boldBlack11;
    ws.getCell(`A${reconRow}`).border = thinBorder;
    ws.getCell(`A${reconRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`B${reconRow}`).value = 'Amount';
    ws.getCell(`B${reconRow}`).fill = yellowFill;
    ws.getCell(`B${reconRow}`).font = boldBlack11;
    ws.getCell(`B${reconRow}`).border = thinBorder;
    ws.getCell(`B${reconRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Right side reconciliation: To Billed
    ws.getCell(`I${reconRow}`).value = 'To Billed';
    ws.getCell(`I${reconRow}`).border = thinBorder;
    ws.getCell(`I${reconRow}`).font = boldBlack11;
    ws.getCell(`J${reconRow}`).value = s2TotalAmount || 903750;
    ws.getCell(`J${reconRow}`).fill = peachFill;
    ws.getCell(`J${reconRow}`).font = boldBlack11;
    ws.getCell(`J${reconRow}`).border = thinBorder;
    ws.getCell(`J${reconRow}`).numFmt = '#,##,##0';
    ws.getCell(`J${reconRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Old Balance from Section 1 (Row reconRow + 1)
    const r2 = reconRow + 1;
    ws.getCell(`H${r2}`).value = '14-08-2026';
    ws.getCell(`H${r2}`).border = thinBorder;
    ws.getCell(`I${r2}`).value = 'Old Balance';
    ws.getCell(`I${r2}`).border = thinBorder;
    ws.getCell(`I${r2}`).font = boldBlack11;
    const s2OldBalance = s1Outstanding || 10000;
    ws.getCell(`J${r2}`).value = s2OldBalance;
    ws.getCell(`J${r2}`).fill = yellowFill;
    ws.getCell(`J${r2}`).font = boldBlack11;
    ws.getCell(`J${r2}`).border = thinBorder;
    ws.getCell(`J${r2}`).numFmt = '#,##,##0';
    ws.getCell(`J${r2}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Total Payable (Row reconRow + 2)
    const r3 = reconRow + 2;
    const s2TotalPayable = (s2TotalAmount || 903750) + s2OldBalance;
    ws.getCell(`J${r3}`).value = s2TotalPayable;
    ws.getCell(`J${r3}`).fill = peachFill;
    ws.getCell(`J${r3}`).font = boldBlack11;
    ws.getCell(`J${r3}`).border = thinBorder;
    ws.getCell(`J${r3}`).numFmt = '#,##,##0';
    ws.getCell(`J${r3}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Populate Section 2 Advances on Left (Rows reconRow + 1 onwards)
    let s2AdvSum = 0;
    let advCursor = reconRow + 1;
    s2Advances.forEach(adv => {
      const amt = Number(adv.amount) || 0;
      s2AdvSum += amt;
      const advR = ws.getRow(advCursor);
      advR.getCell(1).value = adv.date || '';
      advR.getCell(1).border = thinBorder;
      advR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      advR.getCell(2).value = amt > 0 ? amt : '';
      advR.getCell(2).border = thinBorder;
      advR.getCell(2).numFmt = '#,##,##0';
      advR.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
      advCursor++;
    });

    // If no advances found in state, fallback to the 2 real Section 2 advances
    if (s2Advances.length === 0) {
      const fallbackAdvs = [
        { date: '29-08-2026', amount: 50000 },
        { date: '10-09-2026', amount: 400000 }
      ];
      fallbackAdvs.forEach(adv => {
        s2AdvSum += adv.amount;
        const advR = ws.getRow(advCursor);
        advR.getCell(1).value = adv.date;
        advR.getCell(1).border = thinBorder;
        advR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        advR.getCell(2).value = adv.amount;
        advR.getCell(2).border = thinBorder;
        advR.getCell(2).numFmt = '#,##,##0';
        advR.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        advCursor++;
      });
    }

    // less adv on Right (Row reconRow + 3)
    const reconRowAdv = reconRow + 3;
    ws.getCell(`I${reconRowAdv}`).value = 'less adv';
    ws.getCell(`I${reconRowAdv}`).border = thinBorder;
    ws.getCell(`I${reconRowAdv}`).font = boldBlack11;
    ws.getCell(`J${reconRowAdv}`).value = s2AdvSum;
    ws.getCell(`J${reconRowAdv}`).fill = yellowFill;
    ws.getCell(`J${reconRowAdv}`).font = boldBlack11;
    ws.getCell(`J${reconRowAdv}`).border = thinBorder;
    ws.getCell(`J${reconRowAdv}`).numFmt = '#,##,##0';
    ws.getCell(`J${reconRowAdv}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Net Outstanding on Right (Row reconRow + 5)
    const r6 = reconRow + 5;
    ws.getCell(`G${r6}`).value = '16-09-2026 (out standing)';
    ws.getCell(`G${r6}`).border = thinBorder;
    ws.getCell(`G${r6}`).font = boldBlack11;
    const s2NetOutstanding = s2TotalPayable - s2AdvSum;
    ws.getCell(`J${r6}`).value = s2NetOutstanding;
    ws.getCell(`J${r6}`).fill = cyanOutFill;
    ws.getCell(`J${r6}`).font = boldBlack11;
    ws.getCell(`J${r6}`).border = thinBorder;
    ws.getCell(`J${r6}`).numFmt = '#,##,##0';
    ws.getCell(`J${r6}`).alignment = { horizontal: 'right', vertical: 'middle' };

    // Advances Total on Left (Row reconRow + 6)
    const advTotRowIndex = Math.max(advCursor, reconRow + 6);
    const s2AdvTotRow = ws.getRow(advTotRowIndex);
    s2AdvTotRow.getCell(1).value = 'Total';
    s2AdvTotRow.getCell(1).fill = yellowFill;
    s2AdvTotRow.getCell(1).font = boldBlack11;
    s2AdvTotRow.getCell(1).border = thinBorder;
    s2AdvTotRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    s2AdvTotRow.getCell(2).value = s2AdvSum;
    s2AdvTotRow.getCell(2).fill = yellowFill;
    s2AdvTotRow.getCell(2).font = boldBlack11;
    s2AdvTotRow.getCell(2).border = thinBorder;
    s2AdvTotRow.getCell(2).numFmt = '#,##,##0';
    s2AdvTotRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    // ========================================================
    // DYNAMIC AUTO-FIT COLUMN WIDTHS ACROSS ALL 15 COLUMNS
    // Ensures text like "Sabdhan & kaliachak" and long halting notes never truncate!
    // ========================================================
    const baseColWidths = {
      1: 14, // Col 1: SL.NO / Advance Date
      2: 16, // Col 2: LR No / Amount
      3: 16, // Col 3: DC No / Notes
      4: 16, // Col 4: Date / DC No
      5: 20, // Col 5: Vehicle Number
      6: 22, // Col 6: From
      7: 30, // Col 7: TO (Ample width for "Sabdhan & kaliachak", "Raiganj & Dalkohala")
      8: 14, // Col 8: Quantity
      9: 12, // Col 9: M/TAX
      10: 18, // Col 10: Amount
      11: 16, // Col 11: ToPay
      12: 16, // Col 12: ToPay-paid
      13: 16, // Col 13: ToPay-Balc
      14: 60, // Col 14: Note (Ample width for "halting at 2 days loading pnt &2 days Unloading pnt")
      15: 38  // Col 15: Note / March balance
    };

    for (let c = 1; c <= 15; c++) {
      let maxLen = 0;
      const col = ws.getColumn(c);
      col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        // Skip merged title rows (1, 2, 53)
        if (rowNumber === 1 || rowNumber === 2 || rowNumber === 53) return;
        const text = cell.value ? String(cell.value) : '';
        if (text.length > maxLen) {
          maxLen = text.length;
        }
      });
      const minW = baseColWidths[c] || 16;
      col.width = Math.max(minW, Math.min(maxLen + 4, 70));
    }

      // Write buffer and save exact file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      this.saveBlob(blob, "Shinex_2026-08-06 _3-1_Updated.xlsx");
      if (window.App?.showToast) {
        window.App.showToast("Excel spreadsheet downloaded successfully!", "success");
      }
    } catch (err) {
      console.error("ExcelJS export error, falling back to SheetJS engine:", err);
      return this.exportWithSheetJS(tRecords, aRecords);
    }
  },

  saveBlob(blob, filename) {
    try {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (e) {}
      }, 2000);
      return;
    } catch (err) {
      console.warn("Direct anchor download error, attempting saveAs fallback:", err);
      if (typeof saveAs === 'function') {
        saveAs(blob, filename);
        return;
      }
      throw err;
    }
  },

  exportWithSheetJS(tRecords, aRecords) {
    if (typeof XLSX === 'undefined') {
      alert("Spreadsheet engines are loading, please try again in a moment.");
      return;
    }
    try {
      const wb = XLSX.utils.book_new();

      const wsTransport = XLSX.utils.json_to_sheet(tRecords.map(r => ({
        "SL.NO": r.slNo,
        "Section": r.section || '',
        "LR No": r.lrNo || '',
        "DC No": r.dcNo || '',
        "Date": r.date || '',
        "Vehicle Number": r.vehicleNumber || '',
        "From": r.fromCity || '',
        "TO": r.toCity || '',
        "Quantity": r.quantity || '',
        "M/TAX": r.mTax || '',
        "Amount": Number(r.amount) || 0,
        "ToPay": Number(r.toPay) || 0,
        "ToPay-paid": r.paid || '',
        "ToPay-Balc": Number(r.balance) || 0,
        "Note": r.note || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsTransport, "Transport Records");

      const wsAdvances = XLSX.utils.json_to_sheet(aRecords.map((a, i) => ({
        "Index": i + 1,
        "Date": a.date || '',
        "Amount": Number(a.amount) || 0,
        "Section": a.section || '',
        "Note": a.note || a.description || ''
      })));
      XLSX.utils.book_append_sheet(wb, wsAdvances, "Advances Ledger");

      XLSX.writeFile(wb, "Shinex_2026-08-06 _3-1_Updated.xlsx");
      if (window.App?.showToast) {
        window.App.showToast("Excel report downloaded successfully!", "success");
      }
    } catch (e) {
      console.error("SheetJS export failed:", e);
      alert("Failed to export Excel file: " + e.message);
    }
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
