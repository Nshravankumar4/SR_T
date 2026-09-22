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
    // Toggle password visibility
    document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
      const pwdInput = document.getElementById('loginPassword');
      if (!pwdInput) return;
      pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
    });

    // Login submit (Username + Password)
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errorMsg = document.getElementById('loginErrorMsg');
      const submitBtn = document.getElementById('loginSubmitBtn');

      if (submitBtn) submitBtn.disabled = true;
      if (errorMsg) errorMsg.style.display = 'none';

      const res = await AuthService.login(username, password);
      if (submitBtn) submitBtn.disabled = false;

      if (res.success) {
        this.checkAuth();
        this.showToast(`Welcome back, ${res.user.name}!`, 'success');
      } else {
        if (errorMsg) {
          errorMsg.innerText = res.message || 'Login failed';
          errorMsg.style.display = 'block';
        } else {
          alert(res.message);
        }
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
    document.getElementById('exportExcelBtn')?.addEventListener('click', (e) => {
      window.downloadShinexExcel(e.currentTarget);
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

    // Passwords update
    document.getElementById('savePasswordsBtn')?.addEventListener('click', async () => {
      const adminPass = document.getElementById('settingsAdminPass')?.value;
      const empPass = document.getElementById('settingsEmpPass')?.value;

      let updated = false;
      if (adminPass && adminPass.trim()) {
        const res1 = await AuthService.updatePassword('Admin1', adminPass);
        if (res1.success) {
          this.showToast("Admin1 password updated successfully!", "success");
          document.getElementById('settingsAdminPass').value = '';
          updated = true;
        } else {
          this.showToast(res1.message, "error");
        }
      }

      if (empPass && empPass.trim()) {
        const res2 = await AuthService.updatePassword('EAdmin2', empPass);
        if (res2.success) {
          this.showToast("EAdmin2 password updated successfully!", "success");
          document.getElementById('settingsEmpPass').value = '';
          updated = true;
        } else {
          this.showToast(res2.message, "error");
        }
      }

      if (!updated && (!adminPass || !adminPass.trim()) && (!empPass || !empPass.trim())) {
        this.showToast("Please enter a new password to update.", "info");
      }
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

window.downloadShinexExcel = async function(btn) {
  const originalText = btn ? btn.innerText : '';
  if (btn) {
    btn.innerText = '⏳ Generating Excel...';
    btn.disabled = true;
  }
  try {
    const transport = window.App?.transportRecords || [];
    const advances = window.App?.advanceRecords || [];
    const openBal = window.App?.openingBalance || 120000;
    await ExcelModule.exportToExcel(transport, advances, openBal);
  } catch (err) {
    console.error("Excel download error:", err);
    alert("Excel Export failed: " + err.message);
  } finally {
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});

