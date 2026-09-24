/**
 * sheetview.js - Dynamic Multi-Section Live Excel Spreadsheet Viewer
 * Renders an exact visual replica of your Shinex Excel spreadsheet
 * with realistic Excel grid, headers, formulas, cell highlights, and chained reconciliation boxes.
 * Dynamically supports Section 1, Section 2, Section 3, Section 4... indefinitely.
 */

const SheetViewModule = {
  activeView: 'SECTION_2', // 'SECTION_1', 'SECTION_2', 'SECTION_3'..., or 'FULL'
  zoomLevel: 100,
  isFullscreen: false,

  setView(view) {
    this.activeView = view;
    this.renderTabs();
    this.render();
  },

  setZoom(percent) {
    this.zoomLevel = percent;
    ['zoom80', 'zoom90', 'zoom100', 'zoom115'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (id === 'zoom' + percent) {
        btn.className = 'btn btn-sm btn-primary';
      } else {
        btn.className = 'btn btn-sm btn-secondary';
      }
    });
    this.applyZoom();
  },

  applyZoom() {
    const grid = document.getElementById('excelSheetGrid');
    if (!grid) return;
    const scale = this.zoomLevel / 100;
    grid.style.zoom = scale;
    if (grid.style.zoom === undefined || grid.style.zoom === '') {
      grid.style.transform = `scale(${scale})`;
      grid.style.transformOrigin = 'top left';
      grid.style.width = `${100 / scale}%`;
    }
  },

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const tab = document.getElementById('tab-sheetview');
    const btn = document.getElementById('btnToggleFullscreen');
    
    if (this.isFullscreen) {
      tab?.classList.add('sheet-fullscreen-mode');
      document.body.classList.add('in-sheet-fullscreen');
      if (btn) {
        btn.innerHTML = '✕ Exit Full Screen';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-danger');
      }
      try {
        if (!document.fullscreenElement && tab?.requestFullscreen) {
          tab.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    } else {
      tab?.classList.remove('sheet-fullscreen-mode');
      document.body.classList.remove('in-sheet-fullscreen');
      if (btn) {
        btn.innerHTML = '⛶ Full Screen';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-secondary');
      }
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
  },

  init() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFullscreen) {
        this.toggleFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.isFullscreen) {
        this.isFullscreen = false;
        const tab = document.getElementById('tab-sheetview');
        const btn = document.getElementById('btnToggleFullscreen');
        tab?.classList.remove('sheet-fullscreen-mode');
        document.body.classList.remove('in-sheet-fullscreen');
        if (btn) {
          btn.innerHTML = '⛶ Full Screen';
          btn.classList.remove('btn-danger');
          btn.classList.add('btn-secondary');
        }
      }
    });
  },

  // Sequentially calculates chained reconciliation metrics across all sections
  computeAllSectionsData() {
    const transport = window.App?.transportRecords || [];
    const advances = window.App?.advanceRecords || [];
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [
      { id: 'section-1', name: 'Section 1', num: 1, isArchive: true },
      { id: 'section-2', name: 'Section 2', num: 2, isArchive: false }
    ];

    let prevOutBal = 0;
    let prevOutDate = '14-08-2026';
    const results = [];

    sections.forEach((sec, idx) => {
      const secTrips = transport.filter(r => window.getTripSection(r) === sec.name)
        .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

      const secAdvs = advances.filter(a => window.getAdvanceSection(a) === sec.name);

      const totalAmount = secTrips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const toPayBal = secTrips.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
      const advSum = secAdvs.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

      let oldBal = 0;
      let oldBalDate = '';
      let totalPayable = 0;
      let netOutstanding = 0;
      let latestDate = '';

      if (idx === 0) {
        // Section 1 (April - August 2026)
        oldBal = typeof ApiService !== 'undefined' ? ApiService.getOpeningBalance() : 120000;
        oldBalDate = 'Before March 2026';
        totalPayable = totalAmount + toPayBal; // 18,93,350
        netOutstanding = totalPayable - advSum; // 10,000
        // Section 1 cut-off date in Shinex Excel was 14-08-2026
        latestDate = '14-08-2026';
      } else {
        // Section 2, Section 3, Section 4... chained from previous section's Net Outstanding!
        oldBal = prevOutBal;
        oldBalDate = prevOutDate;
        totalPayable = totalAmount + oldBal + toPayBal;
        netOutstanding = totalPayable - advSum;
        const allItems = [...secTrips, ...secAdvs];
        const defaultDate = (sec.name === 'Section 2') ? '16-09-2026' : (prevOutDate || new Date().toISOString().split('T')[0]);
        latestDate = window.getLatestTripDate(allItems, defaultDate);
      }

      prevOutBal = netOutstanding;
      prevOutDate = latestDate;

      results.push({
        section: sec,
        trips: secTrips,
        advances: secAdvs,
        totalAmount,
        toPayBal,
        oldBal,
        oldBalDate,
        totalPayable,
        advSum,
        netOutstanding,
        latestDate
      });
    });

    return results;
  },

  renderTabs() {
    const tabGroup = document.getElementById('sheetViewTabGroup');
    if (!tabGroup) return;
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];
    
    let html = '';
    sections.forEach(s => {
      const isAct = !s.isArchive;
      const viewKey = s.name.toUpperCase().replace(/\s+/g, '_');
      const isSelected = this.activeView === viewKey;
      const btnClass = isSelected ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
      const icon = isAct ? '🟢' : '📁';
      html += `<button class="${btnClass}" onclick="SheetViewModule.setView('${viewKey}')">${icon} ${s.name} ${isAct ? '(Active)' : '(Archive)'}</button>`;
    });

    const isFullSelected = this.activeView === 'FULL';
    html += `<button class="${isFullSelected ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'}" onclick="SheetViewModule.setView('FULL')">📋 Full Sheet (All Sections)</button>`;
    tabGroup.innerHTML = html;
  },

  render() {
    const container = document.getElementById('excelSheetGrid');
    if (!container) return;

    this.renderTabs();
    const allSecs = this.computeAllSectionsData();

    if (this.activeView === 'FULL') {
      container.innerHTML = this.renderFullView(allSecs);
    } else if (this.activeView === 'SECTION_1') {
      const s1 = allSecs[0] || { trips: [], advances: [], totalAmount: 0, toPayBal: 0, totalPayable: 0, advSum: 0, netOutstanding: 0 };
      container.innerHTML = this.renderSection1View(s1.trips, s1.advances, s1.totalAmount, s1.toPayBal, s1.totalPayable, s1.advSum, s1.netOutstanding);
    } else {
      // Find matching section by view key (e.g. 'SECTION_2', 'SECTION_3')
      const targetName = this.activeView.replace(/_/g, ' ');
      const match = allSecs.find(s => s.section.name.toUpperCase() === targetName) || allSecs[1] || allSecs[0];
      if (match && match.section.name === 'Section 1') {
        container.innerHTML = this.renderSection1View(match.trips, match.advances, match.totalAmount, match.toPayBal, match.totalPayable, match.advSum, match.netOutstanding);
      } else if (match) {
        container.innerHTML = this.renderGenericSectionView(match, false);
      }
    }

    this.applyZoom();
  },

  // Renders any Section >= 2 with exact Shinex structure, advances on left, and reconciliation on right
  renderGenericSectionView(secData, isFullView = false) {
    const { section, trips, advances, totalAmount, oldBal, oldBalDate, totalPayable, advSum, netOutstanding, latestDate, toPayBal = 0 } = secData;

    let rowsHtml = '';
    trips.forEach((r, idx) => {
      const amt = Number(r.amount) || 0;
      const isHalting = r.note && String(r.note).toLowerCase().includes('halting');
      const noteStyle = isHalting ? 'background: #ffff00; font-weight: 500;' : '';

      rowsHtml += `
        <tr onclick="TransportModule.openEditModal('${r.id}')" style="cursor: pointer;" title="✏️ Click to edit trip (LR: ${r.lrNo || r.id})">
          <td class="excel-cell center excel-row-num">${(section.num * 25) + idx + 1}</td>
          <td class="excel-cell center">${r.slNo || (idx + 1)}</td>
          <td class="excel-cell center"><strong>${r.lrNo || ''}</strong></td>
          <td class="excel-cell center">${r.dcNo || ''}</td>
          <td class="excel-cell center">${r.date || ''}</td>
          <td class="excel-cell center font-mono">${r.vehicleNumber || ''}</td>
          <td class="excel-cell left">${r.fromCity || ''}</td>
          <td class="excel-cell left"><strong>${r.toCity || ''}</strong></td>
          <td class="excel-cell center">${r.quantity || ''}</td>
          <td class="excel-cell center">${r.mTax || ''}</td>
          <td class="excel-cell right font-mono">${amt > 0 ? amt.toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell center">${r.toPay ? Number(r.toPay).toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell center">${r.paid || ''}</td>
          <td class="excel-cell center">${r.balance ? Number(r.balance).toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell left" style="${noteStyle}">${r.note || ''}</td>
        </tr>
      `;
    });

    const isCustomSec = section.num >= 3;
    const isAdmin = typeof AuthService !== 'undefined' && AuthService.isAdmin();

    return `
      <div class="excel-sheet-wrapper" style="margin-bottom: ${isFullView ? '40px' : '0'};">
        ${isFullView ? `
          <!-- Blue divider banner matching original row 53 & media_1790101750869 -->
          <div style="background: #44b3e1; color: #fff; font-weight: bold; text-align: center; padding: 7px 12px; letter-spacing: 2px; margin: 25px 0 15px 0; font-size: 1.05rem; display: flex; justify-content: space-between; align-items: center; border-radius: 4px;">
            <span>${section.name} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW</span>
            ${isAdmin && isCustomSec ? `
              <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteSection('${section.name}')" style="font-size: 0.72rem; padding: 2px 8px;" title="Delete this section">🗑️ Delete ${section.name}</button>
            ` : ''}
          </div>
        ` : ''}

        <!-- Section Header Bar with Admin Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; background: #e0f2fe; padding: 6px 12px; border-radius: 6px; border: 1px solid #bae6fd;">
          <div style="font-weight: 700; color: #0369a1; font-size: 0.95rem;">
            📑 ${section.name}: ${section.title || (section.isArchive ? 'Archive' : 'Active Ledger')}
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <div style="background: #ffff00; border: 1px solid #000; padding: 3px 12px; font-weight: 600; font-size: 0.82rem;">
              Before ${oldBalDate || '14-08-2026'}: ₹${oldBal.toLocaleString('en-IN')}
            </div>
            ${isAdmin ? `
              <button class="btn btn-sm btn-secondary" onclick="App.promptEditSection('${section.name}')" style="font-size: 0.75rem; padding: 2px 8px;" title="Edit Section Title">✏️ Edit</button>
            ` : ''}
            ${isAdmin && isCustomSec ? `
              <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteSection('${section.name}')" style="font-size: 0.75rem; padding: 2px 8px;" title="Delete this Section">🗑️ Delete</button>
            ` : ''}
          </div>
        </div>

        <table class="excel-table">
          <thead>
            <tr class="excel-header-row">
              <th class="excel-th excel-corner">#</th>
              <th class="excel-th" style="width: 55px;">SL.NO</th>
              <th class="excel-th" style="width: 80px;">LR No</th>
              <th class="excel-th" style="width: 110px;">DC No</th>
              <th class="excel-th" style="width: 95px;">Date</th>
              <th class="excel-th" style="width: 115px;">Vehicle Number</th>
              <th class="excel-th" style="width: 110px;">From</th>
              <th class="excel-th" style="min-width: 140px;">TO</th>
              <th class="excel-th" style="width: 75px;">Quantity</th>
              <th class="excel-th" style="width: 65px;">M/TAX</th>
              <th class="excel-th" style="width: 100px;">Amount</th>
              <th class="excel-th excel-th-red" style="width: 85px;">ToPay</th>
              <th class="excel-th excel-th-red" style="width: 90px;">ToPay-paid</th>
              <th class="excel-th excel-th-red" style="width: 90px;">ToPay-Balc</th>
              <th class="excel-th" style="min-width: 280px;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="15" class="excel-cell center" style="padding: 1.5rem; color: #64748b;">No trips logged in ${section.name} yet. Click "+ Add Transport Record" to add trips to this section.</td></tr>`}

            <!-- Gap Row -->
            <tr style="height: 14px;"><td colspan="15" class="excel-cell-blank"></td></tr>

            <!-- Total Row -->
            <tr class="excel-total-row">
              <td class="excel-cell center excel-row-num">#</td>
              <td class="excel-cell center excel-yellow"><strong>Total</strong></td>
              <td class="excel-cell" colspan="8"></td>
              <td class="excel-cell right font-mono excel-yellow"><strong>${totalAmount.toLocaleString('en-IN')}</strong></td>
              <td class="excel-cell" colspan="4"></td>
            </tr>
          </tbody>
        </table>

        <!-- Section Bottom: Advances & Reconciliation Box (Matching screenshot media_1790101750869) -->
        <div style="margin-top: 24px; display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start;">
          
          <!-- Left: Advances Table for this Section -->
          <div>
            <table class="excel-table" style="width: 260px;">
              <thead>
                <tr>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Advance Date</th>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${advances.map(a => `
                  <tr onclick="AdvancesModule.openEditModal('${a.id}')" style="cursor: pointer;" title="✏️ Click to edit advance">
                    <td class="excel-cell center">${a.date || ''}</td>
                    <td class="excel-cell right font-mono">${(Number(a.amount) || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
                ${advances.length === 0 ? `
                  <tr>
                    <td class="excel-cell center" style="color: #94a3b8; font-size: 0.8rem;">No advances</td>
                    <td class="excel-cell right font-mono">0</td>
                  </tr>
                ` : ''}
                <tr style="font-weight: bold;">
                  <td class="excel-cell center excel-yellow" style="border: 1px solid #000;">Total</td>
                  <td class="excel-cell right font-mono excel-yellow" style="border: 1px solid #000;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Right: Reconciliation Box (Chained from previous section) -->
          <div>
            <table class="excel-table" style="min-width: 320px;">
              <tbody>
                <tr>
                  <td class="excel-cell" style="width: 110px; border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="width: 100px; border: 1px solid #999; background: #fff;">To Billed</td>
                  <td class="excel-cell right font-mono bold" style="width: 110px; border: 1px solid #000; background: #f7c7ac;">${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell center font-mono" style="border: 1px solid #999;">${oldBalDate || '14-08-2026'}</td>
                  <td class="excel-cell bold" style="border: 1px solid #999;">Old Balance</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${oldBal.toLocaleString('en-IN')}</td>
                </tr>
                ${toPayBal > 0 ? `
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="border: 1px solid #999; font-size: 0.85rem;">ToPay Bal</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #fee2e2;">${toPayBal.toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="border: 1px solid #999;">(=) Total</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #f7c7ac;">${totalPayable.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="border: 1px solid #999;">less adv</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
                <tr style="height: 12px;"><td colspan="3" class="excel-cell-blank"></td></tr>
                <tr>
                  <td class="excel-cell center bold" colspan="2" style="border: 1px solid #000;">${latestDate} (out standing)</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #94dcf8; font-size: 1.05rem;">${netOutstanding.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    `;
  },

  renderSection1View(trips, advances, totalAmount, toPayBal, totalPayable, advSum, outstanding) {
    const s1LatestDate = (typeof window.getLatestTripDate === 'function')
      ? window.getLatestTripDate(trips, '14-08-2026')
      : '14-08-2026';
    let rowsHtml = '';
    trips.forEach((r, idx) => {
      const amt = Number(r.amount) || 0;
      const toPay = Number(r.toPay) || 0;
      const bal = Number(r.balance) || 0;
      const paid = r.paid;

      let noteStyle = '';
      if (r.note && r.note.toLowerCase().includes('shortage')) noteStyle = 'background: #ffc7ce; color: #9c0006; font-weight: bold;';
      else if (r.note && (r.note.toLowerCase().includes('halting') || r.note.toLowerCase().includes('cancel'))) noteStyle = 'background: #ffff00;';

      rowsHtml += `
        <tr onclick="TransportModule.openEditModal('${r.id}')" style="cursor: pointer;" title="✏️ Click to edit trip (LR: ${r.lrNo || r.id})">
          <td class="excel-cell center excel-row-num">${5 + idx}</td>
          <td class="excel-cell center">${r.slNo || (idx + 1)}</td>
          <td class="excel-cell center"><strong>${r.lrNo || ''}</strong></td>
          <td class="excel-cell center">${r.dcNo || ''}</td>
          <td class="excel-cell center">${r.date || ''}</td>
          <td class="excel-cell center font-mono">${r.vehicleNumber || ''}</td>
          <td class="excel-cell left">${r.fromCity || ''}</td>
          <td class="excel-cell left">${r.toCity || ''}</td>
          <td class="excel-cell center">${r.quantity || ''}</td>
          <td class="excel-cell center">${r.mTax || ''}</td>
          <td class="excel-cell right font-mono">${amt > 0 ? amt.toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell right font-mono">${toPay > 0 ? toPay.toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell center" style="${paid === 'Paid' ? 'background: #c6efce; color: #006100; font-weight: bold;' : ''}">${paid || ''}</td>
          <td class="excel-cell right font-mono">${bal > 0 ? bal.toLocaleString('en-IN') : ''}</td>
          <td class="excel-cell left" style="${noteStyle}">${r.note || ''}</td>
        </tr>
      `;
    });

    return `
      <div class="excel-sheet-wrapper">
        <!-- Titles -->
        <div style="text-align: center; margin-bottom: 8px;">
          <h2 style="font-size: 1.25rem; font-weight: bold; margin: 0;">Shinex UQ Genetic Seeds Pvt.Ltd.,</h2>
          <div style="background: #ffff00; display: inline-block; padding: 2px 20px; font-weight: bold; border: 1px solid #000; margin-top: 4px;">
            April 2026 to March 2027
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
          <div style="background: #ffff00; border: 1px solid #000; padding: 2px 12px; font-size: 0.85rem;">
            Before March 2026 1,20,000
          </div>
        </div>

        <table class="excel-table">
          <thead>
            <tr class="excel-header-row">
              <th class="excel-th excel-corner">#</th>
              <th class="excel-th" style="width: 55px;">SL.NO</th>
              <th class="excel-th" style="width: 80px;">LR No</th>
              <th class="excel-th" style="width: 110px;">DC No</th>
              <th class="excel-th" style="width: 95px;">Date</th>
              <th class="excel-th" style="width: 115px;">Vehicle Number</th>
              <th class="excel-th" style="width: 110px;">From</th>
              <th class="excel-th" style="min-width: 140px;">TO</th>
              <th class="excel-th" style="width: 75px;">Quantity</th>
              <th class="excel-th" style="width: 65px;">M/TAX</th>
              <th class="excel-th" style="width: 100px;">Amount</th>
              <th class="excel-th excel-th-red" style="width: 85px;">ToPay</th>
              <th class="excel-th excel-th-red" style="width: 90px;">ToPay-paid</th>
              <th class="excel-th excel-th-red" style="width: 90px;">ToPay-Balc</th>
              <th class="excel-th" style="min-width: 260px;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <!-- Section 1 Total -->
            <tr class="excel-total-row">
              <td class="excel-cell center excel-row-num">33</td>
              <td class="excel-cell center excel-yellow"><strong>Total</strong></td>
              <td class="excel-cell" colspan="8"></td>
              <td class="excel-cell right font-mono excel-yellow"><strong>${totalAmount.toLocaleString('en-IN')}</strong></td>
              <td class="excel-cell" colspan="2"></td>
              <td class="excel-cell right font-mono excel-yellow"><strong>${toPayBal.toLocaleString('en-IN')}</strong></td>
              <td class="excel-cell"></td>
            </tr>
          </tbody>
        </table>

        <!-- Section 1 Bottom Advances and Reconciliation -->
        <div style="margin-top: 24px; display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start;">
          <div>
            <table class="excel-table" style="width: 280px;">
              <thead>
                <tr>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Advance</th>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${advances.map((a, i) => `
                  <tr onclick="AdvancesModule.openEditModal('${a.id}')" style="cursor: pointer;" title="✏️ Click to edit advance">
                    <td class="excel-cell center">${a.date || ''}</td>
                    <td class="excel-cell right font-mono">${(Number(a.amount) || 0) > 0 ? (Number(a.amount) || 0).toLocaleString('en-IN') : ''}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold;">
                  <td class="excel-cell center excel-yellow" style="border: 1px solid #000;">Total</td>
                  <td class="excel-cell right font-mono excel-yellow" style="border: 1px solid #000;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <table class="excel-table" style="min-width: 320px;">
              <tbody>
                <tr>
                  <td class="excel-cell bold" style="border: 1px solid #999;">To Billed</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #f7c7ac;">${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell bold" style="border: 1px solid #999;">ToPay bal</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${toPayBal.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #f7c7ac;">${totalPayable.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell bold" style="border: 1px solid #999;">less adv</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
                <tr style="height: 12px;"><td colspan="2" class="excel-cell-blank"></td></tr>
                <tr>
                  <td class="excel-cell center bold" style="border: 1px solid #000;">${s1LatestDate} (out standing)</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #94dcf8; font-size: 1.05rem;">${outstanding.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderFullView(allSectionsData) {
    if (!allSectionsData || allSectionsData.length === 0) return '';
    const s1 = allSectionsData[0];
    let html = this.renderSection1View(s1.trips, s1.advances, s1.totalAmount, s1.toPayBal, s1.totalPayable, s1.advSum, s1.netOutstanding);

    // Loop through all subsequent sections (Section 2, Section 3, Section 4...)
    for (let i = 1; i < allSectionsData.length; i++) {
      html += this.renderGenericSectionView(allSectionsData[i], true);
    }

    return html;
  }
};

window.SheetViewModule = SheetViewModule;

window.updateSheetViewTabs = function(activeBtnId) {
  // Handled dynamically by SheetViewModule.renderTabs()
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SheetViewModule.init());
} else {
  SheetViewModule.init();
}
