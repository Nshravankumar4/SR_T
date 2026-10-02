/**
 * excel.js - Exact 1:1 Shinex Excel Replica Generator
 * Recreates the exact layout, colors, sections, totals, and reconciliation boxes
 * from your Shinex Excel file (Shinex_2026-08-06 _3-1.xlsx).
 */

const ExcelModule = {
  // ===== Export-only amount helpers =====
  // These READ the existing records; they never change what is stored.
  num(v) {
    if (typeof window !== 'undefined' && typeof window.parseAmount === 'function') {
      return window.parseAmount(v);
    }
    const n = Number(String(v === null || v === undefined ? '' : v).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  },

  // The sheet stores the literal word "Paid" when a trip is settled in full.
  isFullyPaid(r) {
    const toPay = this.num(r.toPay);
    const bal = this.num(r.balance);
    const raw = String(r.paid === null || r.paid === undefined ? '' : r.paid).trim().toLowerCase();
    if (raw === 'paid') return true;
    if (String(r.status || '').trim().toLowerCase() === 'paid') return true;
    return toPay > 0 && bal === 0 && this.num(r.paid) >= toPay;
  },

  // Real money that was paid against this trip (number, never the word "Paid").
  paidAmountOf(r) {
    const toPay = this.num(r.toPay);
    if (this.isFullyPaid(r)) return toPay;
    return this.num(r.paid);
  },

  // "Failed" money = the unpaid part of a trip whose Note/status marks it as
  // failed (fail / cancel / shortage / returned / rejected / lost).
  failedAmountOf(r) {
    const note = String(r.note || '').toLowerCase();
    const status = String(r.status || '').toLowerCase();
    const isFailed = status.includes('fail') || note.includes('fail') || note.includes('cancel') ||
      note.includes('shortage') || note.includes('returned') || note.includes('rejected') || note.includes('lost');
    if (!isFailed) return 0;
    return Math.max(0, this.num(r.toPay) - this.paidAmountOf(r));
  },

  async exportToExcel(transportRecords, advanceRecords, openingBalance, sectionFilter = null, customFileName = null) {
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

    let normalizedFilter = 'FULL';
    if (sectionFilter) {
      const sf = String(sectionFilter).trim().toUpperCase().replace(/\s+/g, '_');
      if (sf === 'SECTION_1' || sf.startsWith('SECTION_')) {
        normalizedFilter = sf;
      } else if (sf === 'FULL' || sf === 'ALL') {
        normalizedFilter = 'FULL';
      }
    }

    // If ExcelJS is not ready or failed to load, seamlessly use SheetJS engine
    if (typeof ExcelJS === 'undefined') {
      console.warn("ExcelJS not available, falling back to SheetJS engine.");
      return this.exportWithSheetJS(tRecords, aRecords, normalizedFilter);
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

      if (normalizedFilter !== 'FULL' && normalizedFilter !== 'SECTION_1') {
        const targetSecName = normalizedFilter.replace(/_/g, ' ');
        const secData = allSectionsData.find(s => s.section && s.section.name.toUpperCase() === targetSecName) || {
          section: { name: targetSecName, num: 2 },
          trips: tRecords.filter(r => (typeof window !== 'undefined' && window.getTripSection ? window.getTripSection(r) : r.section || '').toUpperCase() === targetSecName),
          advances: aRecords.filter(a => (typeof window !== 'undefined' && window.getAdvanceSection ? window.getAdvanceSection(a) : a.section || '').toUpperCase() === targetSecName),
          totalAmount: 0,
          oldBal: 0,
          oldBalDate: '',
          totalPayable: 0,
          advSum: 0,
          netOutstanding: 0,
          latestDate: ''
        };
        this.writeSingleGenericSection(ws, secData, yellowFill, cyanDivider, thinBorder, boldBlack11, regular10, navyHeaderFill, headerFontRed, headerFontWhite, peachFill, cyanOutFill);
      } else {
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
    obCell.value = `Before March 2026 ${(typeof ApiService !== 'undefined' ? ApiService.getOpeningBalance() : 120000).toLocaleString('en-IN')}`;
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
      'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note', 'Failed Amt.'
    ];
    const r4 = ws.getRow(4);
    r4.values = headerTitles;
    r4.height = 25;

    for (let c = 1; c <= 16; c++) {
      const cell = r4.getCell(c);
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (c === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font = boldBlack11;
      } else if (c === 15) {
        cell.fill = softBlueNote;
        cell.font = boldBlack11;
      } else if ([12, 13, 14, 16].includes(c)) {
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
    let s1TotalPaid = 0;
    let s1TotalBal = 0;
    let s1TotalFailed = 0;

    s1Trips.forEach((r, idx) => {
      const row = ws.getRow(curRow);
      const amt = Number(r.amount) || 0;
      const toPay = Number(r.toPay) || 0;
      const bal = Number(r.balance) || 0;
      s1TotalAmount += amt;
      s1TotalToPay += toPay;
      s1TotalBal += bal;

      // Paid is written as the ACTUAL money (number), not the word "Paid"
      const isPaid = this.isFullyPaid(r);
      const paidNum = this.paidAmountOf(r);
      const failedNum = this.failedAmountOf(r);
      s1TotalPaid += paidNum;
      s1TotalFailed += failedNum;

      const tripDateStr = r.date ? (window.formatDateForDisplay ? window.formatDateForDisplay(r.date) : r.date) : '';

      row.values = [
        r.slNo || (idx + 1),
        r.lrNo || '',
        '',
        r.dcNo || '',
        tripDateStr,
        r.vehicleNumber || '',
        r.fromCity || '',
        r.toCity || '',
        r.quantity || '',
        r.mTax || '',
        amt > 0 ? amt : '',
        toPay > 0 ? toPay : '',
        paidNum > 0 ? paidNum : '',
        bal > 0 ? bal : '',
        r.note || '',
        failedNum > 0 ? failedNum : ''
      ];
      row.height = 20;

      for (let c = 1; c <= 16; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = regular10;

        // Alignment
        if ([1, 2, 4, 5, 6, 8, 9].includes(c)) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if ([11, 12, 13, 14, 16].includes(c)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') cell.numFmt = '#,##,##0';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }

        // Paid cell keeps its green highlight, but now shows the real amount
        if (c === 13 && isPaid) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF006100' } };
        }

        // Failed money is flagged red so it is obvious at a glance
        if (c === 16 && failedNum > 0) {
          cell.fill = redShortage;
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

    // Dynamic Section 1 layout: keeps the canonical Shinex rows (totals=33,
    // advances/recon=36-50) for the standard 27-trip section, but shifts every
    // block down when more trips exist so data rows never overwrite totals.
    const s1BlankRow = Math.max(curRow, 32);
    const s1TotalRow = Math.max(s1BlankRow + 1, 33);
    const rowBase = s1TotalRow - 33; // 0 = exact 1:1 layout
    const s1AdvHeaderRow = 36 + rowBase;
    const s1AdvStartRow = 37 + rowBase;
    const s1ReconRow = 36 + rowBase;
    const s1OutRow = 41 + rowBase;
    const s1AdvTotRowNum = Math.max(50 + rowBase, s1AdvStartRow + s1Advances.length);

    // ========================================================
    // SECTION 1 TOTALS
    // ========================================================
    const totalRow33 = ws.getRow(s1TotalRow);
    totalRow33.getCell(10).value = 'Total';
    totalRow33.getCell(10).fill = yellowFill;
    totalRow33.getCell(10).font = boldBlack11;
    totalRow33.getCell(10).border = thinBorder;
    totalRow33.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

totalRow33.getCell(11).value = s1TotalAmount;
totalRow33.getCell(11).fill = yellowFill;
totalRow33.getCell(11).font = boldBlack11;
totalRow33.getCell(11).border = thinBorder;
totalRow33.getCell(11).numFmt = '#,##,##0';
totalRow33.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

// Auto-sum ToPay (column 12) — matches the on-screen Live Sheet total row
totalRow33.getCell(12).value = s1TotalToPay;
totalRow33.getCell(12).fill = yellowFill;
totalRow33.getCell(12).font = boldBlack11;
totalRow33.getCell(12).border = thinBorder;
totalRow33.getCell(12).numFmt = '#,##,##0';
totalRow33.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

totalRow33.getCell(14).value = s1TotalBal;
    totalRow33.getCell(14).fill = yellowFill;
    totalRow33.getCell(14).font = boldBlack11;
    totalRow33.getCell(14).border = thinBorder;
    totalRow33.getCell(14).numFmt = '#,##,##0';
    totalRow33.getCell(14).alignment = { horizontal: 'right', vertical: 'middle' };

    // Auto-sum Paid and Failed money (numeric, so the sums are real)
    totalRow33.getCell(13).value = s1TotalPaid;
    totalRow33.getCell(13).fill = yellowFill;
    totalRow33.getCell(13).font = boldBlack11;
    totalRow33.getCell(13).border = thinBorder;
    totalRow33.getCell(13).numFmt = '#,##,##0';
    totalRow33.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

    totalRow33.getCell(16).value = s1TotalFailed;
    totalRow33.getCell(16).fill = yellowFill;
    totalRow33.getCell(16).font = boldBlack11;
    totalRow33.getCell(16).border = thinBorder;
    totalRow33.getCell(16).numFmt = '#,##,##0';
    totalRow33.getCell(16).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow33.height = 22;

    // ========================================================
    // ROWS 36 to 50: SECTION 1 ADVANCES & RECONCILIATION
    // ========================================================
    // Advances Header (Left)
    ws.getCell(`A${s1AdvHeaderRow}`).value = 'Advance';
    ws.getCell(`A${s1AdvHeaderRow}`).fill = yellowFill;
    ws.getCell(`A${s1AdvHeaderRow}`).font = boldBlack11;
    ws.getCell(`A${s1AdvHeaderRow}`).border = thinBorder;
    ws.getCell(`A${s1AdvHeaderRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(`B${s1AdvHeaderRow}`).value = 'Amount';
    ws.getCell(`B${s1AdvHeaderRow}`).fill = yellowFill;
    ws.getCell(`B${s1AdvHeaderRow}`).font = boldBlack11;
    ws.getCell(`B${s1AdvHeaderRow}`).border = thinBorder;
    ws.getCell(`B${s1AdvHeaderRow}`).alignment = { horizontal: 'center', vertical: 'middle' };

    // Section 1 Reconciliation (Right)
    ws.getCell(`J${s1ReconRow}`).value = 'To Billed';
    ws.getCell(`J${s1ReconRow}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow}`).value = s1TotalAmount;
    ws.getCell(`K${s1ReconRow}`).fill = peachFill;
    ws.getCell(`K${s1ReconRow}`).font = boldBlack11;
    ws.getCell(`K${s1ReconRow}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow}`).numFmt = '#,##,##0';

    ws.getCell(`J${s1ReconRow + 1}`).value = 'ToPay bal';
    ws.getCell(`J${s1ReconRow + 1}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow + 1}`).value = s1TotalBal;
    ws.getCell(`K${s1ReconRow + 1}`).fill = yellowFill;
    ws.getCell(`K${s1ReconRow + 1}`).font = boldBlack11;
    ws.getCell(`K${s1ReconRow + 1}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow + 1}`).numFmt = '#,##,##0';

    const s1TotalPayable = s1TotalAmount + s1TotalBal;
    ws.getCell(`J${s1ReconRow + 2}`).value = 'TotalB=ToBilled+TopayBAl';
    ws.getCell(`J${s1ReconRow + 2}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow + 2}`).value = s1TotalPayable; // 18,93,350
    ws.getCell(`K${s1ReconRow + 2}`).fill = peachFill;
    ws.getCell(`K${s1ReconRow + 2}`).font = boldBlack11;
    ws.getCell(`K${s1ReconRow + 2}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow + 2}`).numFmt = '#,##,##0';

    ws.getCell(`J${s1ReconRow + 3}`).value = 'less adv';
    ws.getCell(`J${s1ReconRow + 3}`).border = thinBorder;

    // Populate Section 1 Advances
    let advRow = s1AdvStartRow;
    let s1AdvSum = 0;
    s1Advances.forEach((a) => {
      const amt = window.parseAmount(a.amount);
      s1AdvSum += amt;

      const r = ws.getRow(advRow);
      r.getCell(1).value = a.date || '';
      r.getCell(1).border = thinBorder;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      r.getCell(2).value = amt > 0 ? amt : '';
      r.getCell(2).border = thinBorder;
      r.getCell(2).numFmt = '#,##,##0';
      r.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

      // First advance row carries the March balance note
      if (advRow === s1AdvStartRow) {
        r.getCell(3).value = (typeof ApiService !== 'undefined' ? ApiService.getOpeningBalance() : 120000).toLocaleString('en-IN');
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

    // Advance Total Row
    const advTotRow = ws.getRow(s1AdvTotRowNum);
    advTotRow.getCell(1).value = 'Total';
    advTotRow.getCell(1).fill = yellowFill;
    advTotRow.getCell(1).font = boldBlack11;
    advTotRow.getCell(1).border = thinBorder;
    advTotRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    advTotRow.getCell(2).value = s1AdvSum;
    advTotRow.getCell(2).fill = yellowFill;
    advTotRow.getCell(2).font = boldBlack11;
    advTotRow.getCell(2).border = thinBorder;
    advTotRow.getCell(2).numFmt = '#,##,##0';
    advTotRow.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' };

    // Update 'less adv' value
    ws.getCell(`K${s1ReconRow + 3}`).value = s1AdvSum;
    ws.getCell(`K${s1ReconRow + 3}`).fill = yellowFill;
    ws.getCell(`K${s1ReconRow + 3}`).font = boldBlack11;
    ws.getCell(`K${s1ReconRow + 3}`).border = thinBorder;
    ws.getCell(`K${s1ReconRow + 3}`).numFmt = '#,##,##0';

    // Outstanding (dynamic latest trip date for Section 1)
    const s1LatestDate = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(s1Trips, '17-06-2026')
      : '17-06-2026';
    const s1AdvDateAll = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(aRecords.filter(a => (typeof window.isSection1Advance ? window.isSection1Advance(a) : a.section === 'Section 1')), '')
      : '';
    const s1AdvDateNote = (s1AdvDateAll && typeof window.parseDateToTimestamp === 'function' && window.parseDateToTimestamp(s1AdvDateAll) > window.parseDateToTimestamp(s1LatestDate))
      ? ` / adv ${s1AdvDateAll}` : '';
    ws.getCell(`H${s1OutRow}`).value = `${s1LatestDate}${s1AdvDateNote} (out standing)`;
    ws.getCell(`H${s1OutRow}`).border = thinBorder;
    ws.getCell(`H${s1OutRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`J${s1OutRow}`).value = 'TotalB-Less Adv';
    ws.getCell(`J${s1OutRow}`).border = thinBorder;
    const s1Outstanding = s1TotalPayable - s1AdvSum;
    ws.getCell(`K${s1OutRow}`).value = s1Outstanding; // 10,000 with current data
    ws.getCell(`K${s1OutRow}`).fill = cyanOutFill;
    ws.getCell(`K${s1OutRow}`).font = boldBlack11;
    ws.getCell(`K${s1OutRow}`).border = thinBorder;
    ws.getCell(`K${s1OutRow}`).numFmt = '#,##,##0';

    // ========================================================
    // SECTIONS 2, 3, 4... DYNAMIC MULTI-SECTION LOOP
    // ========================================================
    const defaultS2Trips = tRecords
      .filter(r => (typeof window !== 'undefined' && window.isSection2Trip ? window.isSection2Trip(r) : r.section?.includes('NEW')))
      .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));
    const defaultS2Advs = aRecords
      .filter(a => (typeof window !== 'undefined' && window.isSection2Advance ? window.isSection2Advance(a) : a.section === 'Section 2'));

    const s2Amt = defaultS2Trips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const s2ToPayBal = defaultS2Trips.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
    const s2AdvSum = defaultS2Advs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const s2OldBal = s1Outstanding;
    const s2OldBalDate = '14-08-2026';
    const s2TotPayable = s2Amt + s2OldBal + s2ToPayBal;
    const s2NetOut = s2TotPayable - s2AdvSum;
    const s2TripDate = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(defaultS2Trips, '23-09-2026')
      : '23-09-2026';
    const s2AdvDateOnly = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(defaultS2Advs, '')
      : '';
    const s2AdvDateNote = (s2AdvDateOnly && typeof window.parseDateToTimestamp === 'function' && window.parseDateToTimestamp(s2AdvDateOnly) > window.parseDateToTimestamp(s2TripDate))
      ? ` / adv ${s2AdvDateOnly}` : '';
    const s2LatestDate = s2TripDate + s2AdvDateNote;

    const laterSections = (allSectionsData && allSectionsData.length > 1)
      ? allSectionsData.slice(1)
      : [{
          section: { name: 'Section 2', num: 2 },
          trips: defaultS2Trips,
          advances: defaultS2Advs,
          totalAmount: s2Amt,
          oldBal: s2OldBal,
          oldBalDate: s2OldBalDate,
          totalPayable: s2TotPayable,
          advSum: s2AdvSum,
          netOutstanding: s2NetOut,
          latestDate: s2LatestDate
        }];

    if (normalizedFilter === 'FULL') {
      // Section 2 starts at row 53 (canonical layout) or right after Section 1's
      // last used row when Section 1 has grown beyond 27 trips.
      let curStartRow = Math.max(53, s1AdvTotRowNum + 3, s1OutRow + 3);

      laterSections.forEach((secData) => {
      const { section, trips, advances, totalAmount, oldBal, oldBalDate, totalPayable, advSum, netOutstanding, latestDate, latestAdvDate = '' } = secData;

      // 1. Blue divider banner (matching Shinex Excel format)
      ws.mergeCells(`A${curStartRow}:P${curStartRow}`);
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
        'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note', 'Failed Amt.'
      ];
      hRow.height = 25;
      for (let c = 1; c <= 15; c++) {
        const cell = hRow.getCell(c);
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (c === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.font = boldBlack11;
        } else if ([11, 12, 13, 15].includes(c)) {
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

        // Paid is written as the ACTUAL money (number), not the word "Paid"
        const isPaid = this.isFullyPaid(r);
        const paidNum = this.paidAmountOf(r);
        const failedNum = this.failedAmountOf(r);

        const tripDateStr = r.date ? (window.formatDateForDisplay ? window.formatDateForDisplay(r.date) : r.date) : '';

        row.values = [
          r.slNo ? Number(r.slNo) : (idx + 1),
          r.lrNo || '',
          r.dcNo || '',
          tripDateStr,
          r.vehicleNumber || '',
          r.fromCity || '',
          r.toCity || '',
          r.quantity || '',
          r.mTax || '',
          amt > 0 ? amt : '',
          toPay > 0 ? toPay : '',
          paidNum > 0 ? paidNum : '',
          bal > 0 ? bal : '',
          r.note || '',
          failedNum > 0 ? failedNum : ''
        ];

        for (let c = 1; c <= 15; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.font = regular10;
          if (c === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if ([2, 3, 4, 5, 8, 9].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
          else if ([6, 7, 14].includes(c)) cell.alignment = { horizontal: 'left', vertical: 'middle' };
          else if ([10, 11, 12, 13, 15].includes(c)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            if (typeof cell.value === 'number') cell.numFmt = '#,##,##0';
          }
        }

        const isHalting = r.note && String(r.note).toLowerCase().includes('halting');
        if (isHalting) {
          row.getCell(14).fill = yellowFill;
        }

        // Mirror the on-screen view: green paid cell, red bold outstanding balance
        if (isPaid) {
          const paidCell = row.getCell(12);
          paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          paidCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF006100' } };
        }
        if (bal > 0) {
          const balCell = row.getCell(13);
          balCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
        }
        if (failedNum > 0) {
          const failCell = row.getCell(15);
          failCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
          failCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
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

      // Auto-sum ToPay, Paid, ToPay-Balance and Failed money
      const toPaySum = trips.reduce((s, r) => s + window.parseAmount(r.toPay), 0);
      const balSum = trips.reduce((s, r) => s + window.parseAmount(r.balance), 0);
      const paidSum = trips.reduce((s, r) => s + this.paidAmountOf(r), 0);
      const failedSum = trips.reduce((s, r) => s + this.failedAmountOf(r), 0);

      secTotalRow.getCell(12).value = paidSum;
      secTotalRow.getCell(12).fill = yellowFill;
      secTotalRow.getCell(12).font = boldBlack11;
      secTotalRow.getCell(12).border = thinBorder;
      secTotalRow.getCell(12).numFmt = '#,##,##0';
      secTotalRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

      secTotalRow.getCell(15).value = failedSum;
      secTotalRow.getCell(15).fill = yellowFill;
      secTotalRow.getCell(15).font = boldBlack11;
      secTotalRow.getCell(15).border = thinBorder;
      secTotalRow.getCell(15).numFmt = '#,##,##0';
      secTotalRow.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };

      secTotalRow.getCell(11).value = toPaySum;
      secTotalRow.getCell(11).fill = yellowFill;
      secTotalRow.getCell(11).font = boldBlack11;
      secTotalRow.getCell(11).border = thinBorder;
      secTotalRow.getCell(11).numFmt = '#,##,##0';
      secTotalRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

      secTotalRow.getCell(13).value = balSum;
      secTotalRow.getCell(13).fill = yellowFill;
      secTotalRow.getCell(13).font = boldBlack11;
      secTotalRow.getCell(13).border = thinBorder;
      secTotalRow.getCell(13).numFmt = '#,##,##0';
      secTotalRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

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
      ws.getCell(`I${reconRow}`).value = 'To Billed';
      ws.getCell(`I${reconRow}`).border = thinBorder;
      ws.getCell(`I${reconRow}`).font = boldBlack11;
      ws.getCell(`J${reconRow}`).value = totalAmount;
      ws.getCell(`J${reconRow}`).fill = peachFill;
      ws.getCell(`J${reconRow}`).font = boldBlack11;
      ws.getCell(`J${reconRow}`).border = thinBorder;
      ws.getCell(`J${reconRow}`).numFmt = '#,##,##0';
      ws.getCell(`J${reconRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r2 = reconRow + 1;
      ws.getCell(`H${r2}`).value = oldBalDate || '14-08-2026';
      ws.getCell(`H${r2}`).border = thinBorder;
      ws.getCell(`H${r2}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`H${r2}`).font = boldBlack11;
      ws.getCell(`I${r2}`).value = 'ToPay bal';
      ws.getCell(`I${r2}`).border = thinBorder;
      ws.getCell(`I${r2}`).font = boldBlack11;
      ws.getCell(`J${r2}`).value = oldBal;
      ws.getCell(`J${r2}`).fill = yellowFill;
      ws.getCell(`J${r2}`).font = boldBlack11;
      ws.getCell(`J${r2}`).border = thinBorder;
      ws.getCell(`J${r2}`).numFmt = '#,##,##0';
      ws.getCell(`J${r2}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r3 = reconRow + 2;
      ws.getCell(`I${r3}`).value = 'TotalB=ToBilled+TopayBAl';
      ws.getCell(`I${r3}`).border = thinBorder;
      ws.getCell(`I${r3}`).font = boldBlack11;
      ws.getCell(`J${r3}`).value = totalPayable;
      ws.getCell(`J${r3}`).fill = peachFill;
      ws.getCell(`J${r3}`).font = boldBlack11;
      ws.getCell(`J${r3}`).border = thinBorder;
      ws.getCell(`J${r3}`).numFmt = '#,##,##0';
      ws.getCell(`J${r3}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r4 = reconRow + 3;
      ws.getCell(`I${r4}`).value = 'less adv';
      ws.getCell(`I${r4}`).border = thinBorder;
      ws.getCell(`I${r4}`).font = boldBlack11;
      ws.getCell(`J${r4}`).value = advSum;
      ws.getCell(`J${r4}`).fill = yellowFill;
      ws.getCell(`J${r4}`).font = boldBlack11;
      ws.getCell(`J${r4}`).border = thinBorder;
      ws.getCell(`J${r4}`).numFmt = '#,##,##0';
      ws.getCell(`J${r4}`).alignment = { horizontal: 'right', vertical: 'middle' };

      const r6 = reconRow + 5;
      ws.getCell(`H${r6}`).value = `${latestDate}${latestAdvDate ? ` / adv ${latestAdvDate}` : ''} (out standing)`;
      ws.getCell(`H${r6}`).border = thinBorder;
      ws.getCell(`H${r6}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`H${r6}`).font = boldBlack11;
      ws.getCell(`I${r6}`).value = 'TotalB-Less Adv';
      ws.getCell(`I${r6}`).border = thinBorder;
      ws.getCell(`I${r6}`).font = boldBlack11;
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
    }
    }

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
      15: 30, // Col 15: Note / March balance
      16: 14  // Col 16: Failed Amt.
    };

    for (let c = 1; c <= 16; c++) {
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

      // Determine filename and message based on active selection
      let fileName = customFileName || "Shinex_Transport_Full_Report.xlsx";
      let toastMsg = customFileName ? `Backup file ${customFileName} generated successfully!` : "Full Excel report downloaded successfully!";
      if (!customFileName) {
        if (normalizedFilter === 'SECTION_1') {
          fileName = "Shinex_Transport_Section_1_Report.xlsx";
          toastMsg = "Section 1 (Archive) Excel report downloaded successfully!";
        } else if (normalizedFilter.startsWith('SECTION_')) {
          const secDisplay = normalizedFilter.replace(/_/g, ' ');
          fileName = `Shinex_Transport_${normalizedFilter}_Report.xlsx`;
          toastMsg = `${secDisplay} Excel report downloaded successfully!`;
        }
      }

      // Write buffer and save exact file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      if (customFileName === '__BLOB__') {
        return blob;
      }

      this.saveBlob(blob, fileName);
      if (window.App?.showToast) {
        window.App.showToast(toastMsg, "success");
      }
      return blob;
    } catch (err) {
      console.error("ExcelJS export error, falling back to SheetJS engine:", err);
      return this.exportWithSheetJS(tRecords, aRecords, normalizedFilter);
    }
  },

  writeSingleGenericSection(ws, secData, yellowFill, cyanDivider, thinBorder, boldBlack11, regular10, navyHeaderFill, headerFontRed, headerFontWhite, peachFill, cyanOutFill) {
    const { section, trips, advances, totalAmount, oldBal, oldBalDate, totalPayable, advSum, netOutstanding, latestDate, latestAdvDate = '' } = secData;

    // 1. Company Banner
    ws.mergeCells('E1:I1');
    const titleCell = ws.getCell('E1');
    titleCell.value = 'Shinex UQ Genetic Seeds Pvt.Ltd.,';
    titleCell.font = { name: 'Calibri', size: 13, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;
    for (let c = 5; c <= 9; c++) ws.getCell(1, c).border = thinBorder;

    // 2. Section Period Banner
    ws.mergeCells('E2:I2');
    const periodCell = ws.getCell('E2');
    periodCell.value = `${section.name}: ${section.title || (section.isArchive ? 'Archive' : 'Active Ledger')}`;
    periodCell.fill = yellowFill;
    periodCell.font = boldBlack11;
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;
    for (let c = 5; c <= 9; c++) ws.getCell(2, c).border = thinBorder;

    // 3. Blue divider banner
    ws.mergeCells('A3:P3');
    const divCell = ws.getCell('A3');
    divCell.value = `${section.name}                                                                        NEW`;
    divCell.fill = cyanDivider;
    divCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    divCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 20;

    // 4. Yellow note row (Before [Date] [Old Balance])
    ws.getCell('N4').value = `Before ${oldBalDate || '14-08-2026'} ${(Number(oldBal) || 0).toLocaleString('en-IN')}`;
    ws.getCell('N4').fill = yellowFill;
    ws.getCell('N4').font = { name: 'Calibri', size: 10, bold: false };
    ws.getCell('N4').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('N4').border = thinBorder;
    ws.getRow(4).height = 20;

    // 5. Headers row
    const hRow = ws.getRow(5);
    hRow.values = [
      'SL.NO', 'LR No', 'DC No', 'Date', 'Vehicle Number', 'From', 'TO',
      'Quantity', 'M/TAX', 'Amount', 'ToPay', 'ToPay-paid', 'ToPay-Balc', 'Note', 'Failed Amt.'
    ];
    hRow.height = 25;
    for (let c = 1; c <= 15; c++) {
      const cell = hRow.getCell(c);
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (c === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        cell.font = boldBlack11;
      } else if ([11, 12, 13, 15].includes(c)) {
        cell.fill = navyHeaderFill;
        cell.font = headerFontRed;
      } else {
        cell.fill = navyHeaderFill;
        cell.font = headerFontWhite;
      }
    }

    // 6. Data rows
    let curDataRow = 6;
    trips.forEach((r, idx) => {
      const row = ws.getRow(curDataRow);
      row.height = 20;
      const amt = Number(r.amount) || 0;
      const toPay = Number(r.toPay) || 0;
      const bal = Number(r.balance) || 0;

      const isPaid = this.isFullyPaid(r);
      const paidNum = this.paidAmountOf(r);
      const failedNum = this.failedAmountOf(r);

      const tripDateStr = r.date ? (window.formatDateForDisplay ? window.formatDateForDisplay(r.date) : r.date) : '';

      row.values = [
        r.slNo ? Number(r.slNo) : (idx + 1),
        r.lrNo || '',
        r.dcNo || '',
        tripDateStr,
        r.vehicleNumber || '',
        r.fromCity || '',
        r.toCity || '',
        r.quantity || '',
        r.mTax || '',
        amt > 0 ? amt : '',
        toPay > 0 ? toPay : '',
        paidNum > 0 ? paidNum : '',
        bal > 0 ? bal : '',
        r.note || '',
        failedNum > 0 ? failedNum : ''
      ];

      for (let c = 1; c <= 15; c++) {
        const cell = row.getCell(c);
        cell.border = thinBorder;
        cell.font = regular10;
        if (c === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if ([2, 3, 4, 5, 8, 9].includes(c)) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else if ([6, 7, 14].includes(c)) cell.alignment = { horizontal: 'left', vertical: 'middle' };
        else if ([10, 11, 12, 13, 15].includes(c)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') cell.numFmt = '#,##,##0';
        }
      }

      if (r.note && String(r.note).toLowerCase().includes('halting')) {
        row.getCell(14).fill = yellowFill;
      }

      // Mirror the on-screen view: green paid cell, red bold outstanding balance
      if (isPaid) {
        const paidCell = row.getCell(12);
        paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
        paidCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF006100' } };
      }
      if (bal > 0) {
        const balCell = row.getCell(13);
        balCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
      }
      if (failedNum > 0) {
        const failCell = row.getCell(15);
        failCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        failCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      }
      curDataRow++;
    });

    // 7. Total Row
    const totalRowIndex = Math.max(curDataRow, 14);
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

    // Auto-sum ToPay, Paid, ToPay-Balance and Failed money
    const toPaySum = trips.reduce((s, r) => s + window.parseAmount(r.toPay), 0);
    const balSum = trips.reduce((s, r) => s + window.parseAmount(r.balance), 0);
    const paidSum = trips.reduce((s, r) => s + this.paidAmountOf(r), 0);
    const failedSum = trips.reduce((s, r) => s + this.failedAmountOf(r), 0);

    secTotalRow.getCell(12).value = paidSum;
    secTotalRow.getCell(12).fill = yellowFill;
    secTotalRow.getCell(12).font = boldBlack11;
    secTotalRow.getCell(12).border = thinBorder;
    secTotalRow.getCell(12).numFmt = '#,##,##0';
    secTotalRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };

    secTotalRow.getCell(15).value = failedSum;
    secTotalRow.getCell(15).fill = yellowFill;
    secTotalRow.getCell(15).font = boldBlack11;
    secTotalRow.getCell(15).border = thinBorder;
    secTotalRow.getCell(15).numFmt = '#,##,##0';
    secTotalRow.getCell(15).alignment = { horizontal: 'right', vertical: 'middle' };

    secTotalRow.getCell(11).value = toPaySum;
    secTotalRow.getCell(11).fill = yellowFill;
    secTotalRow.getCell(11).font = boldBlack11;
    secTotalRow.getCell(11).border = thinBorder;
    secTotalRow.getCell(11).numFmt = '#,##,##0';
    secTotalRow.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };

    secTotalRow.getCell(13).value = balSum;
    secTotalRow.getCell(13).fill = yellowFill;
    secTotalRow.getCell(13).font = boldBlack11;
    secTotalRow.getCell(13).border = thinBorder;
    secTotalRow.getCell(13).numFmt = '#,##,##0';
    secTotalRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };

    // 8. Advances Table on Left & Reconciliation Box on Right
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

    // Reconciliation Box
    ws.getCell(`I${reconRow}`).value = 'To Billed';
    ws.getCell(`I${reconRow}`).border = thinBorder;
    ws.getCell(`I${reconRow}`).font = boldBlack11;
    ws.getCell(`J${reconRow}`).value = totalAmount;
    ws.getCell(`J${reconRow}`).fill = peachFill;
    ws.getCell(`J${reconRow}`).font = boldBlack11;
    ws.getCell(`J${reconRow}`).border = thinBorder;
    ws.getCell(`J${reconRow}`).numFmt = '#,##,##0';
    ws.getCell(`J${reconRow}`).alignment = { horizontal: 'right', vertical: 'middle' };

    const r2 = reconRow + 1;
    ws.getCell(`H${r2}`).value = oldBalDate || '14-08-2026';
    ws.getCell(`H${r2}`).border = thinBorder;
    ws.getCell(`H${r2}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`H${r2}`).font = boldBlack11;
    ws.getCell(`I${r2}`).value = 'ToPay bal';
    ws.getCell(`I${r2}`).border = thinBorder;
    ws.getCell(`I${r2}`).font = boldBlack11;
    ws.getCell(`J${r2}`).value = oldBal;
    ws.getCell(`J${r2}`).fill = yellowFill;
    ws.getCell(`J${r2}`).font = boldBlack11;
    ws.getCell(`J${r2}`).border = thinBorder;
    ws.getCell(`J${r2}`).numFmt = '#,##,##0';
    ws.getCell(`J${r2}`).alignment = { horizontal: 'right', vertical: 'middle' };

    const r3 = reconRow + 2;
    ws.getCell(`I${r3}`).value = 'TotalB=ToBilled+TopayBAl';
    ws.getCell(`I${r3}`).border = thinBorder;
    ws.getCell(`I${r3}`).font = boldBlack11;
    ws.getCell(`J${r3}`).value = totalPayable;
    ws.getCell(`J${r3}`).fill = peachFill;
    ws.getCell(`J${r3}`).font = boldBlack11;
    ws.getCell(`J${r3}`).border = thinBorder;
    ws.getCell(`J${r3}`).numFmt = '#,##,##0';
    ws.getCell(`J${r3}`).alignment = { horizontal: 'right', vertical: 'middle' };

    const r4 = reconRow + 3;
    ws.getCell(`I${r4}`).value = 'less adv';
    ws.getCell(`I${r4}`).border = thinBorder;
    ws.getCell(`I${r4}`).font = boldBlack11;
    ws.getCell(`J${r4}`).value = advSum;
    ws.getCell(`J${r4}`).fill = yellowFill;
    ws.getCell(`J${r4}`).font = boldBlack11;
    ws.getCell(`J${r4}`).border = thinBorder;
    ws.getCell(`J${r4}`).numFmt = '#,##,##0';
    ws.getCell(`J${r4}`).alignment = { horizontal: 'right', vertical: 'middle' };

    const r6 = reconRow + 5;
    ws.getCell(`H${r6}`).value = `${latestDate}${latestAdvDate ? ` / adv ${latestAdvDate}` : ''} (out standing)`;
    ws.getCell(`H${r6}`).border = thinBorder;
    ws.getCell(`H${r6}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(`H${r6}`).font = boldBlack11;
    ws.getCell(`I${r6}`).value = 'TotalB-Less Adv';
    ws.getCell(`I${r6}`).border = thinBorder;
    ws.getCell(`I${r6}`).font = boldBlack11;
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

  exportWithSheetJS(tRecords, aRecords, sectionFilter = null) {
    if (typeof XLSX === 'undefined') {
      alert("Spreadsheet engines are loading, please try again in a moment.");
      return;
    }
    try {
      let filteredT = tRecords;
      let filteredA = aRecords;
      let fileName = "Shinex_Transport_Full_Report.xlsx";
      let toastMsg = "Full Excel report downloaded successfully!";

      if (sectionFilter && sectionFilter !== 'FULL') {
        const norm = String(sectionFilter).trim().toUpperCase().replace(/\s+/g, '_');
        if (norm === 'SECTION_1') {
          filteredT = tRecords.filter(r => (typeof window.isSection1Trip === 'function' ? window.isSection1Trip(r) : !r.section?.includes('NEW')));
          filteredA = aRecords.filter(a => (typeof window.isSection1Advance === 'function' ? window.isSection1Advance(a) : a.section !== 'Section 2'));
          fileName = "Shinex_Transport_Section_1_Report.xlsx";
          toastMsg = "Section 1 (Archive) Excel report downloaded successfully!";
        } else {
          const targetName = norm.replace(/_/g, ' ');
          filteredT = tRecords.filter(r => (window.getTripSection ? window.getTripSection(r) : r.section || '').toUpperCase() === targetName);
          filteredA = aRecords.filter(a => (window.getAdvanceSection ? window.getAdvanceSection(a) : a.section || '').toUpperCase() === targetName);
          fileName = `Shinex_Transport_${norm}_Report.xlsx`;
          toastMsg = `${targetName} Excel report downloaded successfully!`;
        }
      }

      const wb = XLSX.utils.book_new();

      const wsTransport = XLSX.utils.json_to_sheet(filteredT.map(r => ({
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
        "ToPay-paid": this.paidAmountOf(r) || 0,
        "ToPay-Balc": Number(r.balance) || 0,
        "Note": r.note || '',
        "Failed Amt.": this.failedAmountOf(r) || 0
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
        { wch: 52 }, // Note
        { wch: 14 }  // Failed Amt.
      ];
      XLSX.utils.book_append_sheet(wb, wsTransport, "Transport Records");

      const wsAdvances = XLSX.utils.json_to_sheet(filteredA.map((a, i) => ({
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

      XLSX.writeFile(wb, fileName);
      if (window.App?.showToast) {
        window.App.showToast(toastMsg, "success");
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
