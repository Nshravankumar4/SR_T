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
    const totalAmount = this.transportRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalToPay = this.transportRecords.reduce((sum, r) => sum + (Number(r.toPay) || 0), 0);
    const totalPaid = this.transportRecords.reduce((sum, r) => sum + (Number(r.paid) || 0), 0);
    const transportBalance = this.transportRecords.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
    const totalAdvances = this.advanceRecords.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // Populate compact transport stats bar (on Transport tab)
    const tripCountEl = document.getElementById('tripCount');
    if (tripCountEl) tripCountEl.innerText = this.transportRecords.length;
    const tripFreightEl = document.getElementById('tripTotalFreight');
    if (tripFreightEl) tripFreightEl.innerText = '₹' + totalAmount.toLocaleString('en-IN');
    const tripToPayEl = document.getElementById('tripTotalToPay');
    if (tripToPayEl) tripToPayEl.innerText = '₹' + totalToPay.toLocaleString('en-IN');
    const tripPaidEl = document.getElementById('tripTotalPaid');
    if (tripPaidEl) tripPaidEl.innerText = '₹' + totalPaid.toLocaleString('en-IN');
    const tripBalEl = document.getElementById('tripTotalBal');
    if (tripBalEl) tripBalEl.innerText = '₹' + transportBalance.toLocaleString('en-IN');

    // Financial Reconciliation Formula:
    // Total Debt = Opening Balance + Total ToPay
    // Total Payments Received/Settled = Direct Paid + Total Advances
    // Net Outstanding = Total Debt - Total Payments
    const totalDebt = this.openingBalance + totalToPay;
    const totalSettled = totalPaid + totalAdvances;
    const netOutstanding = totalDebt - totalSettled;

    // Financial Summary Cards
    const mAmount = document.getElementById('metricTotalAmount');
    if (mAmount) mAmount.innerText = '₹' + totalAmount.toLocaleString('en-IN');
    const mToPay = document.getElementById('metricTotalToPay');
    if (mToPay) mToPay.innerText = '₹' + totalToPay.toLocaleString('en-IN');
    const mPaid = document.getElementById('metricTotalPaid');
    if (mPaid) mPaid.innerText = '₹' + totalPaid.toLocaleString('en-IN');
    const mBal = document.getElementById('metricTransportBal');
    if (mBal) mBal.innerText = '₹' + transportBalance.toLocaleString('en-IN');
    const mAdv = document.getElementById('metricTotalAdvances');
    if (mAdv) mAdv.innerText = '₹' + totalAdvances.toLocaleString('en-IN');
    const mOpen = document.getElementById('metricOpeningBal');
    if (mOpen) mOpen.innerText = '₹' + this.openingBalance.toLocaleString('en-IN');
    
    const outEl = document.getElementById('metricNetOutstanding');
    if (outEl) {
      outEl.innerText = (netOutstanding < 0 ? '-₹' + Math.abs(netOutstanding).toLocaleString('en-IN') : '₹' + netOutstanding.toLocaleString('en-IN'));
      if (netOutstanding > 0) {
        outEl.parentElement.className = 'metric-card danger';
      } else {
        outEl.parentElement.className = 'metric-card success';
      }
    }

    // Breakdown list in Tab 3
    const sOpen = document.getElementById('summaryOpeningBal');
    if (sOpen) sOpen.innerText = '₹' + this.openingBalance.toLocaleString('en-IN');
    const sToPay = document.getElementById('summaryToPay');
    if (sToPay) sToPay.innerText = '₹' + totalToPay.toLocaleString('en-IN');
    const sPaid = document.getElementById('summaryPaid');
    if (sPaid) sPaid.innerText = '₹' + totalPaid.toLocaleString('en-IN');
    const sAdv = document.getElementById('summaryAdvances');
    if (sAdv) sAdv.innerText = '₹' + totalAdvances.toLocaleString('en-IN');
    const sOut = document.getElementById('summaryOutstanding');
    if (sOut) {
      sOut.innerText = (netOutstanding < 0 ? '-₹' + Math.abs(netOutstanding).toLocaleString('en-IN') : '₹' + netOutstanding.toLocaleString('en-IN'));
      sOut.style.color = netOutstanding > 0 ? 'var(--danger)' : 'var(--success)';
    }
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
      });
    });

    // Filters for transport table
    document.getElementById('searchInput')?.addEventListener('input', () => TransportModule.applyFilters());
    document.getElementById('statusFilter')?.addEventListener('change', () => TransportModule.applyFilters());
    document.getElementById('monthFilter')?.addEventListener('change', () => TransportModule.applyFilters());

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

