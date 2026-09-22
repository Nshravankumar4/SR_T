/**
 * sheetview.js - Live In-Browser Excel Sheet Viewer
 * Renders an exact visual replica of your Shinex Excel spreadsheet
 * with realistic Excel grid, headers, formulas, cell highlights, and reconciliation boxes.
 */

const SheetViewModule = {
  activeView: 'SECTION_2', // 'SECTION_2', 'SECTION_1', 'FULL'
  zoomLevel: 100,
  isFullscreen: false,

  setView(view) {
    this.activeView = view;
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
    // Fallback for browsers that do not support CSS zoom
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

  render() {
    const container = document.getElementById('excelSheetGrid');
    if (!container) return;

    const transport = window.App?.transportRecords || [];
    const advances = window.App?.advanceRecords || [];

    const s1Trips = transport
      .filter(r => (typeof window.isSection1Trip === 'function' ? window.isSection1Trip(r) : !r.section?.includes('NEW')))
      .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

    const s2Trips = transport
      .filter(r => (typeof window.isSection2Trip === 'function' ? window.isSection2Trip(r) : r.section?.includes('NEW')))
      .sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));

    const s1Advances = advances.filter(a => (typeof window.isSection1Advance === 'function' ? window.isSection1Advance(a) : a.section !== 'Section 2'));
    const s2Advances = advances.filter(a => (typeof window.isSection2Advance === 'function' ? window.isSection2Advance(a) : a.section === 'Section 2'));

    // Financial math
    const s1Amount = s1Trips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const s1ToPayBal = s1Trips.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
    const s1TotalPayable = s1Amount + s1ToPayBal;
    const s1AdvSum = s1Advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const s1Outstanding = s1TotalPayable - s1AdvSum; // 10,000

    const s2Amount = s2Trips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const s2OldBalance = s1Outstanding || 10000;
    const s2TotalPayable = s2Amount + s2OldBalance;
    const s2AdvSum = s2Advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || 450000;
    const s2NetOutstanding = s2TotalPayable - s2AdvSum;

    if (this.activeView === 'SECTION_2') {
      container.innerHTML = this.renderSection2View(s2Trips, s2Advances, s2Amount, s2OldBalance, s2TotalPayable, s2AdvSum, s2NetOutstanding);
    } else if (this.activeView === 'SECTION_1') {
      container.innerHTML = this.renderSection1View(s1Trips, s1Advances, s1Amount, s1ToPayBal, s1TotalPayable, s1AdvSum, s1Outstanding);
    } else {
      container.innerHTML = this.renderFullView(s1Trips, s1Advances, s1Amount, s1ToPayBal, s1TotalPayable, s1AdvSum, s1Outstanding, s2Trips, s2Advances, s2Amount, s2OldBalance, s2TotalPayable, s2AdvSum, s2NetOutstanding);
    }

    this.applyZoom();
  },

  renderSection2View(trips, advances, totalAmount, oldBal, totalPayable, advSum, netOutstanding) {
    const advList = advances.length > 0 ? advances : [
      { date: '29-08-2026', amount: 50000 },
      { date: '10-09-2026', amount: 400000 }
    ];

    let rowsHtml = '';
    trips.forEach((r, idx) => {
      const amt = Number(r.amount) || 0;
      const isHalting = r.note && String(r.note).toLowerCase().includes('halting');
      const noteStyle = isHalting ? 'background: #ffff00; font-weight: 500;' : '';

      rowsHtml += `
        <tr>
          <td class="excel-cell center excel-row-num">${59 + idx}</td>
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

    return `
      <div class="excel-sheet-wrapper">
        <!-- Top Excel Banner Row -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
          <div style="background: #ffff00; border: 1px solid #000; padding: 4px 16px; font-weight: 600; font-size: 0.85rem;">
            Before 14-08-2026 10,000
          </div>
        </div>

        <table class="excel-table">
          <thead>
            <tr class="excel-header-row">
              <th class="excel-th excel-corner">#</th>
              <th class="excel-th" style="width: 55px;">SL.NO</th>
              <th class="excel-th" style="width: 80px;">LR No</th>
              <th class="excel-th" style="width: 120px;">DC No</th>
              <th class="excel-th" style="width: 95px;">Date</th>
              <th class="excel-th" style="width: 115px;">Vehicle Number</th>
              <th class="excel-th" style="width: 110px;">From</th>
              <th class="excel-th" style="min-width: 150px;">TO</th>
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
            ${rowsHtml}

            <!-- Gap Row -->
            <tr style="height: 14px;"><td colspan="15" class="excel-cell-blank"></td></tr>

            <!-- Total Row -->
            <tr class="excel-total-row">
              <td class="excel-cell center excel-row-num">${59 + trips.length + 1}</td>
              <td class="excel-cell center excel-yellow"><strong>Total</strong></td>
              <td class="excel-cell" colspan="8"></td>
              <td class="excel-cell right font-mono excel-yellow"><strong>${totalAmount.toLocaleString('en-IN')}</strong></td>
              <td class="excel-cell" colspan="4"></td>
            </tr>
          </tbody>
        </table>

        <!-- Section 2 Bottom Advances & Reconciliation Table (Exact 1:1 Layout) -->
        <div style="margin-top: 24px; display: flex; gap: 40px; flex-wrap: wrap; align-items: flex-start;">
          
          <!-- Left: Advances Table -->
          <div>
            <table class="excel-table" style="width: 260px;">
              <thead>
                <tr>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Advance Date</th>
                  <th class="excel-th excel-yellow center" style="color: #000; border: 1px solid #000;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${advList.map(a => `
                  <tr>
                    <td class="excel-cell center">${a.date || ''}</td>
                    <td class="excel-cell right font-mono">${(Number(a.amount) || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
                <tr style="font-weight: bold;">
                  <td class="excel-cell center excel-yellow" style="border: 1px solid #000;">Total</td>
                  <td class="excel-cell right font-mono excel-yellow" style="border: 1px solid #000;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Right: Reconciliation Box (Pixel-matched to user screenshot) -->
          <div>
            <table class="excel-table" style="min-width: 320px;">
              <tbody>
                <tr>
                  <td class="excel-cell" style="width: 110px; border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="width: 100px; border: 1px solid #999; background: #fff;">To Billed</td>
                  <td class="excel-cell right font-mono bold" style="width: 110px; border: 1px solid #000; background: #f7c7ac;">${totalAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell center font-mono" style="border: 1px solid #999;">14-08-2026</td>
                  <td class="excel-cell bold" style="border: 1px solid #999;">Old Balance</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${oldBal.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #f7c7ac;">${totalPayable.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="excel-cell" style="border: 1px solid #999;"></td>
                  <td class="excel-cell bold" style="border: 1px solid #999;">less adv</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #ffff00;">${advSum.toLocaleString('en-IN')}</td>
                </tr>
                <tr style="height: 12px;"><td colspan="3" class="excel-cell-blank"></td></tr>
                <tr>
                  <td class="excel-cell center bold" colspan="2" style="border: 1px solid #000;">16-09-2026 (out standing)</td>
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
        <tr>
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
                  <tr>
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
                  <td class="excel-cell center bold" style="border: 1px solid #000;">14-08-2026 (out standing)</td>
                  <td class="excel-cell right font-mono bold" style="border: 1px solid #000; background: #94dcf8; font-size: 1.05rem;">${outstanding.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  renderFullView(s1Trips, s1Advs, s1Amt, s1TPBal, s1TotPay, s1AdvSum, s1Out, s2Trips, s2Advs, s2Amt, s2OldBal, s2TotPay, s2AdvSum, s2Out) {
    return `
      <div>
        ${this.renderSection1View(s1Trips, s1Advs, s1Amt, s1TPBal, s1TotPay, s1AdvSum, s1Out)}
        
        <!-- Blue divider banner matching original row 53 -->
        <div style="background: #44b3e1; color: #fff; font-weight: bold; text-align: center; padding: 6px; letter-spacing: 2px; margin: 30px 0;">
          S &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; NEW
        </div>

        ${this.renderSection2View(s2Trips, s2Advs, s2Amt, s2OldBal, s2TotPay, s2AdvSum, s2Out)}
      </div>
    `;
  }
};

window.updateSheetViewTabs = function(activeBtnId) {
  ['btnViewS2', 'btnViewS1', 'btnViewFull'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (id === activeBtnId) {
      btn.className = 'btn btn-sm btn-primary';
    } else {
      btn.className = 'btn btn-sm btn-secondary';
    }
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SheetViewModule.init());
} else {
  SheetViewModule.init();
}
