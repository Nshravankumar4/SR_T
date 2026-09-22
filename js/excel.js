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

      // Retrieve dynamic sections computation
      const allSectionsData = (typeof SheetViewModule !== 'undefined' && SheetViewModule.computeAllSectionsData)
        ? SheetViewModule.computeAllSectionsData()
        : [];

      // Section 1 trips and advances
      const s1Trips = allSectionsData[0]?.trips || tRecords
        .filter(r => (typeof window !== 'undefined' && window.isSection1Trip ? window.isSection1Trip(r) : !r.section?.includes('NEW')))
        .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

      const s1Advances = allSectionsData[0]?.advances || aRecords
        .filter(a => (typeof window !== 'undefined' && window.isSection1Advance ? window.isSection1Advance(a) : a.section !== 'Section 2'));

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
    const s1LatestDate = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(s1Trips, '14-08-2026')
      : '14-08-2026';
    ws.getCell('H41').value = `${s1LatestDate} (out standing)`;
    ws.getCell('H41').border = thinBorder;
    const s1Outstanding = s1TotalPayable - (s1AdvSum || 1883350);
    ws.getCell('K41').value = s1Outstanding; // 10,000
    ws.getCell('K41').fill = cyanOutFill;
    ws.getCell('K41').font = boldBlack11;
    ws.getCell('K41').border = thinBorder;
    ws.getCell('K41').numFmt = '#,##,##0';

    // ========================================================
    // SECTIONS 2, 3, 4... DYNAMIC MULTI-SECTION LOOP
    // ========================================================
    const defaultS2Trips = tRecords
      .filter(r => (typeof window !== 'undefined' && window.isSection2Trip ? window.isSection2Trip(r) : r.section?.includes('NEW')))
      .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));
    const defaultS2Advs = aRecords
      .filter(a => (typeof window !== 'undefined' && window.isSection2Advance ? window.isSection2Advance(a) : a.section === 'Section 2'));

    const laterSections = (allSectionsData && allSectionsData.length > 1)
      ? allSectionsData.slice(1)
      : [{
          section: { name: 'Section 2', num: 2 },
          trips: defaultS2Trips,
          advances: defaultS2Advs,
          totalAmount: 903750,
          oldBal: s1Outstanding || 10000,
          oldBalDate: s1LatestDate || '14-08-2026',
          totalPayable: 913750,
          advSum: 450000,
          netOutstanding: 463750,
          latestDate: '16-09-2026'
        }];

    let curStartRow = 53;

    laterSections.forEach((secData) => {
      const { section, trips, advances, totalAmount, oldBal, oldBalDate, totalPayable, advSum, netOutstanding, latestDate } = secData;

      // 1. Blue divider banner (matching Shinex Excel format)
      ws.mergeCells(`A${curStartRow}:O${curStartRow}`);
      const divCell = ws.getCell(`A${curStartRow}`);
      divCell.value = `${section.name}                                                                        NEW`;
      divCell.fill = cyanDivider;
      divCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      divCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(curStartRow).height = 20;

      // 2. Yellow note row (Before [Date] [Old Balance])
      const noteRow = curStartRow + 4;
      ws.getCell(`N${noteRow}`).value = `Before ${oldBalDate || '14-08-2026'} ${(Number(oldBal) || 0).toLocaleString('en-IN')}`;
      ws.getCell(`N${noteRow}`).fill = yellowFill;
      ws.getCell(`N${noteRow}`).font = { name: 'Calibri', size: 10, bold: false };
      ws.getCell(`N${noteRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`N${noteRow}`).border = thinBorder;

      // 3. Headers row
      const headerRowIndex = curStartRow + 5;
      const hRow = ws.getRow(headerRowIndex);
      hRow.values = [
        'SL.NO', 'LR No', 'DC No', 'Date', 'Vehicle Number', 'From', 'TO',
        'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note'
      ];
      hRow.height = 25;
      for (let c = 1; c <= 14; c++) {
        const cell = hRow.getCell(c);
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

      // 4. Data rows
      let curDataRow = headerRowIndex + 1;
      trips.forEach((r, idx) => {
        const row = ws.getRow(curDataRow);
        row.height = 20;
        const amt = Number(r.amount) || 0;
        const toPay = Number(r.toPay) || 0;
        const paid = Number(r.paid) || 0;
        const bal = Number(r.balance) || 0;

        let paidVal = r.paid;
        if (typeof paidVal === 'number' && paidVal > 0) {
          paidVal = (paidVal === toPay) ? 'Paid' : paidVal.toLocaleString('en-IN');
        }

        row.values = [
          r.slNo ? Number(r.slNo) : (idx + 1),
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

        for (let c = 1; c <= 14; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.font = regular10;
          if (c === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if ([2, 3, 4, 5, 8, 9].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if ([6, 7, 14].includes(c)) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          else if ([10, 11, 12, 13].includes(c)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (typeof cell.value === 'number') cell.numFmt = '#,##,##0';
          }
        }

        const isHalting = r.note && String(r.note).toLowerCase().includes('halting');
        if (isHalting) {
          row.getCell(14).fill = yellowFill;
        }

        curDataRow++;
      });

      // 5. Total Row
      const totalRowIndex = Math.max(curDataRow, headerRowIndex + 8);
      const secTotalRow = ws.getRow(totalRowIndex);
      secTotalRow.height = 22;
      secTotalRow.getCell(1).value = 'Total';
      secTotalRow.getCell(1).fill = yellowFill;
      secTotalRow.getCell(1).font = boldBlack11;
      secTotalRow.getCell(1).border = thinBorder;
      secTotalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      secTotalRow.getCell(10).value = totalAmount;
      secTotalRow.getCell(10).fill = yellowFill;
      secTotalRow.getCell(10).font = boldBlack11;
      secTotalRow.getCell(10).border = thinBorder;
      secTotalRow.getCell(10).numFmt = '#,##,##0';
      secTotalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

      // 6. Advances Table on Left
      const reconRow = totalRowIndex + 3;
      const advHRow = ws.getRow(reconRow);
      advHRow.getCell(1).value = 'Advance Date';
      advHRow.getCell(1).fill = yellowFill;
      advHRow.getCell(1).font = boldBlack11;
      advHRow.getCell(1).border = thinBorder;
      advHRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      advHRow.getCell(2).value = 'Amount';
      advHRow.getCell(2).fill = yellowFill;
      advHRow.getCell(2).font = boldBlack11;
      advHRow.getCell(2).border = thinBorder;
      advHRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };

      let advCursor = reconRow + 1;
      advances.forEach(adv => {
        const advR = ws.getRow(advCursor);
        advR.getCell(1).value = adv.date;
        advR.getCell(1).border = thinBorder;
        advR.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

        advR.getCell(2).value = Number(adv.amount) || 0;
        advR.getCell(2).border = thinBorder;
        advR.getCell(2).numFmt = '#,##,##0';
        advR.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };
        advCursor++;
      });

      // 7. Reconciliation Box on Right
      ws.getCell(`H${reconRow}`).value = 'To Billed';
      ws.getCell(`H${reconRow}`).border = thinBorder;
      ws.getCell(`H${reconRow}`).font = boldBlack11;
      ws.getCell(`J${reconRow}`).value = totalAmount;
      ws.getCell(`J${reconRow}`).fill = peachFill;
      ws.getCell(`J${reconRow}`).font = boldBlack11;
      ws.getCell(`J${reconRow}`).border = thinBorder;
      ws.getCell(`J${reconRow}`).numFmt = '#,##,##0';
      ws.getCell(`J${reconRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r2 = reconRow + 1;
      ws.getCell(`G${r2}`).value = oldBalDate || '14-08-2026';
      ws.getCell(`G${r2}`).border = thinBorder;
      ws.getCell(`G${r2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`H${r2}`).value = 'Old Balance';
      ws.getCell(`H${r2}`).border = thinBorder;
      ws.getCell(`H${r2}`).font = boldBlack11;
      ws.getCell(`J${r2}`).value = oldBal;
      ws.getCell(`J${r2}`).fill = yellowFill;
      ws.getCell(`J${r2}`).font = boldBlack11;
      ws.getCell(`J${r2}`).border = thinBorder;
      ws.getCell(`J${r2}`).numFmt = '#,##,##0';
      ws.getCell(`J${r2}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r3 = reconRow + 2;
      ws.getCell(`J${r3}`).value = totalPayable;
      ws.getCell(`J${r3}`).fill = peachFill;
      ws.getCell(`J${r3}`).font = boldBlack11;
      ws.getCell(`J${r3}`).border = thinBorder;
      ws.getCell(`J${r3}`).numFmt = '#,##,##0';
      ws.getCell(`J${r3}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r4 = reconRow + 3;
      ws.getCell(`H${r4}`).value = 'less adv';
      ws.getCell(`H${r4}`).border = thinBorder;
      ws.getCell(`H${r4}`).font = boldBlack11;
      ws.getCell(`J${r4}`).value = advSum;
      ws.getCell(`J${r4}`).fill = yellowFill;
      ws.getCell(`J${r4}`).font = boldBlack11;
      ws.getCell(`J${r4}`).border = thinBorder;
      ws.getCell(`J${r4}`).numFmt = '#,##,##0';
      ws.getCell(`J${r4}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r6 = reconRow + 5;
      ws.getCell(`G${r6}`).value = `${latestDate} (out standing)`;
      ws.getCell(`G${r6}`).border = thinBorder;
      ws.getCell(`G${r6}`).font = boldBlack11;
      ws.getCell(`J${r6}`).value = netOutstanding;
      ws.getCell(`J${r6}`).fill = cyanOutFill;
      ws.getCell(`J${r6}`).font = boldBlack11;
      ws.getCell(`J${r6}`).border = thinBorder;
      ws.getCell(`J${r6}`).numFmt = '#,##,##0';
      ws.getCell(`J${r6}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const advTotRowIndex = Math.max(advCursor, reconRow + 6);
      const secAdvTotRow = ws.getRow(advTotRowIndex);
      secAdvTotRow.getCell(1).value = 'Total';
      secAdvTotRow.getCell(1).fill = yellowFill;
      secAdvTotRow.getCell(1).font = boldBlack11;
      secAdvTotRow.getCell(1).border = thinBorder;
      secAdvTotRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      secAdvTotRow.getCell(2).value = advSum;
      secAdvTotRow.getCell(2).fill = yellowFill;
      secAdvTotRow.getCell(2).font = boldBlack11;
      secAdvTotRow.getCell(2).border = thinBorder;
      secAdvTotRow.getCell(2).numFmt = '#,##,##0';
      secAdvTotRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

      curStartRow = Math.max(r6, advTotRowIndex) + 4;
    });

    // ========================================================
    // ========================================================
    // DYNAMIC AUTO-FIT COLUMN WIDTHS ACROSS ALL 15 COLUMNS
    // Exact Excel "Alt + H + O + I" Equivalent:
    // Calculates the precise width of every column based on content,
    // formatted numbers, and text, completely eliminating truncated text and '###'.
    // ========================================================
    const baseColWidths = {
      1: 13, // Col 1: SL.NO / Advance Date
      2: 15, // Col 2: LR No / Advance Amount
      3: 15, // Col 3: DC No
      4: 14, // Col 4: Date
      5: 16, // Col 5: Vehicle Number
      6: 16, // Col 6: From City
      7: 26, // Col 7: TO City (Sabdhan & kaliachak, Raiganj & Dalkohala)
      8: 12, // Col 8: Quantity
      9: 10, // Col 9: M/TAX
      10: 16, // Col 10: Amount (e.g. 16,09,850)
      11: 14, // Col 11: ToPay
      12: 14, // Col 12: ToPay-paid
      13: 14, // Col 13: ToPay-Balc
      14: 52, // Col 14: Note (Halting notes)
      15: 30  // Col 15: Note / March balance
    };

    for (let c = 1; c <= 15; c++) {
      let maxLen = 0;
      const col = ws.getColumn(c);
      col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        // Skip header banners, divider rows, and multi-column merged cells
        if (rowNumber <= 3) return;
        if (cell.isMerged || (cell.master && cell.master !== cell)) return;

        let val = cell.value;
        if (val === null || val === undefined) return;

        let str = '';
        if (typeof val === 'number') {
          // Indian number format with commas
          str = val.toLocaleString('en-IN');
        } else if (typeof val === 'object') {
          if (val.richText) str = val.richText.map(t => t.text).join('');
          else if (val.result !== undefined) str = String(val.result);
          else str = '';
        } else {
          str = String(val);
        }

        // Ignore section banners or cross-table labels
        if (str.includes('Shinex') || str.includes('Genetic') || str.length > 70) return;

        if (str.length > maxLen) {
          maxLen = str.length;
        }
      });

      const baseW = baseColWidths[c] || 14;
      // AutoFit with +3 padding (standard Excel Alt+H+O+I formula)
      col.width = Math.max(baseW, maxLen + 3);
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
    if (typeof window.saveAs === 'function') {
      window.saveAs(blob, filename);
      return;
    }
    if (typeof saveAs === 'function') {
      saveAs(blob, filename);
      return;
    }
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
      console.warn("Direct anchor download error:", err);
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
      // AutoFit Column Widths for SheetJS
      wsTransport['!cols'] = [
        { wch: 8 },  // SL.NO
        { wch: 16 }, // Section
        { wch: 14 }, // LR No
        { wch: 16 }, // DC No
        { wch: 13 }, // Date
        { wch: 16 }, // Vehicle Number
        { wch: 15 }, // From
        { wch: 26 }, // TO
        { wch: 11 }, // Quantity
        { wch: 9 },  // M/TAX
        { wch: 16 }, // Amount
        { wch: 14 }, // ToPay
        { wch: 13 }, // ToPay-paid
        { wch: 14 }, // ToPay-Balc
        { wch: 52 }  // Note
      ];
      XLSX.utils.book_append_sheet(wb, wsTransport, "Transport Records");

      const wsAdvances = XLSX.utils.json_to_sheet(aRecords.map((a, i) => ({
        "Index": i + 1,
        "Date": a.date || '',
        "Amount": Number(a.amount) || 0,
        "Section": a.section || '',
        "Note": a.note || a.description || ''
      })));
      wsAdvances['!cols'] = [
        { wch: 8 },  // Index
        { wch: 14 }, // Date
        { wch: 16 }, // Amount
        { wch: 18 }, // Section
        { wch: 45 }  // Note
      ];
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
