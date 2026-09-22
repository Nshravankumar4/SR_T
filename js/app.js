/**
 * app.js - Main Controller and Orchestrator
 */

window.App = {
  transportRecords: [],
  advanceRecords: [],
  openingBalance: 120000,

  async init() {
    this.setupEventListeners();
    this.checkAuth();
  },

  checkAuth() {
    const user = AuthService.getCurrentUser();
    const authWrapper = document.getElementById('authWrapper');
    const mainApp = document.getElementById('mainApp');

    if (!user) {
      authWrapper.style.display = 'flex';
      mainApp.style.display = 'none';
    } else {
      authWrapper.style.display = 'none';
      mainApp.style.display = 'block';
      document.getElementById('currentUserName').innerText = user.name;
      document.getElementById('currentUserRole').innerText = user.role;
      
      // Update UI for role permissions
      const adminOnlyElements = document.querySelectorAll('.admin-only');
      adminOnlyElements.forEach(el => {
        el.style.display = user.role === 'Admin' ? '' : 'none';
      });

      this.refreshData();
    }
  },

  async refreshData() {
    this.updateCloudStatus('Syncing...', 'local');
    const result = await ApiService.fetchAll();
    this.transportRecords = result.transport;
    this.advanceRecords = result.advances;
    this.openingBalance = ApiService.getOpeningBalance();

    TransportModule.setRecords(this.transportRecords);
    AdvancesModule.setAdvances(this.advanceRecords);
    this.updateMetrics();
    if (typeof SheetViewModule !== 'undefined') {
      SheetViewModule.render();
    }

    if (result.source === 'cloud') {
      this.updateCloudStatus('Cloud Connected (Google Sheet)', 'cloud');
    } else {
      this.updateCloudStatus('Local Storage (Offline Mode)', 'local');
    }

    // Populate Settings fields
    const apiUrlInput = document.getElementById('settingsApiUrl');
    if (apiUrlInput) apiUrlInput.value = ApiService.getApiUrl();
    const openBalInput = document.getElementById('settingsOpeningBal');
    if (openBalInput) openBalInput.value = this.openingBalance;
  },

  restoreExactExcelSheetData() {
    if (confirm("Reset data to the exact 33 transport records and 15 advances from your Shinex Excel file?")) {
      ApiService.resetToExactExcelData();
      this.refreshData();
      this.showToast("Exact Shinex Excel dataset loaded!", "success");
    }
  },

  openSheetView() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const sheetTab = document.querySelector('.nav-tab[data-tab="sheetview"]');
    if (sheetTab) sheetTab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-sheetview')?.classList.add('active');

    if (typeof SheetViewModule !== 'undefined') {
      SheetViewModule.render();
    }
  },

  updateCloudStatus(label, type) {
    const dot = document.getElementById('cloudStatusDot');
    const text = document.getElementById('cloudStatusText');
    if (!dot || !text) return;

    text.innerText = label;
    if (type === 'cloud') {
      dot.className = 'status-dot';
    } else {
      dot.className = 'status-dot local';
    }
  },

  updateMetrics() {
    // Separate Section 1 and Section 2 trips using strict helpers
    const s1Trips = this.transportRecords.filter(r => window.isSection1Trip(r));
    const s2Trips = this.transportRecords.filter(r => window.isSection2Trip(r));

    // Separate Section 1 and Section 2 advances
    const s1Advances = this.advanceRecords.filter(a => window.isSection1Advance(a));
    const s2Advances = this.advanceRecords.filter(a => window.isSection2Advance(a));

    // Section 1 Math (Exact Shinex Excel Rows 5 to 50)
    const s1Amount = s1Trips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0); // 16,09,850
    const s1ToPayBal = s1Trips.reduce((sum, r) => sum + (Number(r.balance) || 0), 0); // 2,83,500
    const s1TotalPayable = s1Amount + s1ToPayBal; // 18,93,350
    const s1AdvSum = s1Advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0); // 18,83,350
    const s1Outstanding = s1TotalPayable - s1AdvSum; // 10,000

    // Section 2 Math (Exact Shinex Excel Rows 57 to 75)
    const s2Amount = s2Trips.reduce((sum, r) => sum + (Number(r.amount) || 0), 0); // 9,03,750
    const s2OldBal = s1Outstanding; // 10,000
    const s2TotalPayable = s2Amount + s2OldBal; // 9,13,750
    const s2AdvSum = s2Advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0); // 4,50,000
    const netOutstanding = s2TotalPayable - s2AdvSum; // 4,63,750

    // Overall Totals
    const totalFreightBilled = s1Amount + s2Amount; // 25,13,600
    const totalCompanyAdvances = s1AdvSum + s2AdvSum; // 23,33,350
    const totalPayableDebt = totalFreightBilled + s1ToPayBal; // 27,97,100

    // Populate compact transport stats bar (on Transport tab)
    const tripCountEl = document.getElementById('tripCount');
    if (tripCountEl) tripCountEl.innerText = TransportModule.filteredRecords ? TransportModule.filteredRecords.length : this.transportRecords.length;
    const s2BilledStat = document.getElementById('s2BilledStat');
    if (s2BilledStat) s2BilledStat.innerText = '₹' + s2Amount.toLocaleString('en-IN');
    const s2AdvStat = document.getElementById('s2AdvStat');
    if (s2AdvStat) s2AdvStat.innerText = '₹' + s2AdvSum.toLocaleString('en-IN');
    const s2OutStat = document.getElementById('s2OutStat');
    if (s2OutStat) s2OutStat.innerText = '₹' + netOutstanding.toLocaleString('en-IN');

    // Populate Top Financial Summary Cards (Tab 3)
    const mAmount = document.getElementById('metricTotalAmount');
    if (mAmount) mAmount.innerText = '₹' + totalFreightBilled.toLocaleString('en-IN');
    const mBal = document.getElementById('metricTransportBal');
    if (mBal) mBal.innerText = '₹' + s1ToPayBal.toLocaleString('en-IN');
    const mDebt = document.getElementById('metricTotalDebt');
    if (mDebt) mDebt.innerText = '₹' + totalPayableDebt.toLocaleString('en-IN');
    const mAdv = document.getElementById('metricTotalAdvances');
    if (mAdv) mAdv.innerText = '₹' + totalCompanyAdvances.toLocaleString('en-IN');
    const mS1 = document.getElementById('metricS1Outstanding');
    if (mS1) mS1.innerText = '₹' + s1Outstanding.toLocaleString('en-IN');
    const mS2 = document.getElementById('metricS2Advances');
    if (mS2) mS2.innerText = '₹' + s2AdvSum.toLocaleString('en-IN');

    const outEl = document.getElementById('metricNetOutstanding');
    if (outEl) {
      outEl.innerText = '₹' + netOutstanding.toLocaleString('en-IN');
      outEl.parentElement.className = netOutstanding > 0 ? 'metric-card danger' : 'metric-card success';
    }

    // Populate Section 1 Reconciliation breakdown
    const s1B = document.getElementById('s1Billed');
    if (s1B) s1B.innerText = '₹' + s1Amount.toLocaleString('en-IN');
    const s1TP = document.getElementById('s1ToPayBal');
    if (s1TP) s1TP.innerText = '₹' + s1ToPayBal.toLocaleString('en-IN');
    const s1TPay = document.getElementById('s1TotalPayable');
    if (s1TPay) s1TPay.innerText = '₹' + s1TotalPayable.toLocaleString('en-IN');
    const s1LA = document.getElementById('s1LessAdv');
    if (s1LA) s1LA.innerText = '₹' + s1AdvSum.toLocaleString('en-IN');
    const s1Out = document.getElementById('s1OutStanding');
    if (s1Out) s1Out.innerText = '₹' + s1Outstanding.toLocaleString('en-IN');

    // Populate Section 2 Reconciliation breakdown
    const s2B = document.getElementById('s2Billed');
    if (s2B) s2B.innerText = '₹' + s2Amount.toLocaleString('en-IN');
    const s2OB = document.getElementById('s2OldBal');
    if (s2OB) s2OB.innerText = '₹' + s2OldBal.toLocaleString('en-IN');
    const s2TPay = document.getElementById('s2TotalPayable');
    if (s2TPay) s2TPay.innerText = '₹' + s2TotalPayable.toLocaleString('en-IN');
    const s2LA = document.getElementById('s2LessAdv');
    if (s2LA) s2LA.innerText = '₹' + s2AdvSum.toLocaleString('en-IN');
    const s2Out = document.getElementById('s2OutStanding');
    if (s2Out) s2Out.innerText = '₹' + netOutstanding.toLocaleString('en-IN');
  },

  setupEventListeners() {
    // Role selection in login
    let selectedRole = 'Admin';
    const roleBtns = document.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedRole = btn.dataset.role;
        document.getElementById('loginPin').placeholder = selectedRole === 'Admin' ? 'Enter Admin PIN (Default: 7890)' : 'Enter Employee PIN (Default: 1234)';
      });
    });

    // Login submit
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pin = document.getElementById('loginPin').value;
      const res = await AuthService.login(selectedRole, pin);
      if (res.success) {
        this.checkAuth();
      } else {
        alert(res.message);
      }
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      AuthService.logout();
      this.checkAuth();
    });

    // Navigation Tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${target}`)?.classList.add('active');

        if (target === 'sheetview' && typeof SheetViewModule !== 'undefined') {
          SheetViewModule.render();
        }
      });
    });

    // Filters for transport table
    document.getElementById('searchInput')?.addEventListener('input', () => TransportModule.applyFilters());
    document.getElementById('statusFilter')?.addEventListener('change', () => TransportModule.applyFilters());
    document.getElementById('monthFilter')?.addEventListener('change', () => TransportModule.applyFilters());
    document.getElementById('sectionFilter')?.addEventListener('change', () => TransportModule.applyFilters());

    // Transport Form submit
    document.getElementById('transportForm')?.addEventListener('submit', (e) => TransportModule.handleFormSubmit(e));
    
    // Auto balance calculations
    document.getElementById('transportToPay')?.addEventListener('input', () => TransportModule.onPaymentInputChange());
    document.getElementById('transportPaid')?.addEventListener('input', () => TransportModule.onPaymentInputChange());

    // Advance Form submit
    document.getElementById('advanceForm')?.addEventListener('submit', (e) => AdvancesModule.handleFormSubmit(e));

    // Export to Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
      ExcelModule.exportToExcel(this.transportRecords, this.advanceRecords, this.openingBalance);
    });

    // Import from Excel file selector
    document.getElementById('excelFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      ExcelModule.importFromExcel(file, async (imported) => {
        if (confirm(`Parsed ${imported.length} records from Excel. Import them into your database?`)) {
          for (const item of imported) {
            await ApiService.saveTransport(item);
          }
          this.showToast(`Imported ${imported.length} records!`, 'success');
          await this.refreshData();
        }
      });
    });

    // Settings save
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      const url = document.getElementById('settingsApiUrl').value.trim();
      const openBal = Number(document.getElementById('settingsOpeningBal').value) || 0;
      ApiService.setApiUrl(url);
      ApiService.setOpeningBalance(openBal);
      this.showToast("Settings updated successfully!", "success");
      this.refreshData();
    });

    // PIN update
    document.getElementById('savePinsBtn')?.addEventListener('click', () => {
      const adminPin = document.getElementById('settingsAdminPin').value;
      const empPin = document.getElementById('settingsEmpPin').value;
      AuthService.updatePins(adminPin, empPin);
      this.showToast("Security PINs updated!", "success");
    });
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});

