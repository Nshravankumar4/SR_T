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
    const allSecs = typeof SheetViewModule !== 'undefined' 
      ? SheetViewModule.computeAllSectionsData() 
      : [];

    const s1 = allSecs[0] || { totalAmount: 0, toPayBal: 0, totalPayable: 0, advSum: 0, netOutstanding: 0, latestDate: '14-08-2026' };
    const s2 = allSecs[1] || { totalAmount: 0, oldBal: 10000, oldBalDate: '14-08-2026', totalPayable: 0, advSum: 0, netOutstanding: 0, latestDate: '16-09-2026' };

    // The final active section is the newest section
    const activeSec = allSecs.length > 1 ? allSecs[allSecs.length - 1] : s2;

    const totalFreightBilled = allSecs.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalCompanyAdvances = allSecs.reduce((sum, s) => sum + s.advSum, 0);
    const totalPayableDebt = totalFreightBilled + s1.toPayBal;
    const finalNetOutstanding = activeSec.netOutstanding;

    // Populate compact transport stats bar (on Transport tab)
    const tripCountEl = document.getElementById('tripCount');
    if (tripCountEl) tripCountEl.innerText = TransportModule.filteredRecords ? TransportModule.filteredRecords.length : this.transportRecords.length;
    const s2BilledStat = document.getElementById('s2BilledStat');
    if (s2BilledStat) s2BilledStat.innerText = '₹' + activeSec.totalAmount.toLocaleString('en-IN');
    const s2AdvStat = document.getElementById('s2AdvStat');
    if (s2AdvStat) s2AdvStat.innerText = '₹' + activeSec.advSum.toLocaleString('en-IN');
    const s2OutStat = document.getElementById('s2OutStat');
    if (s2OutStat) s2OutStat.innerText = '₹' + finalNetOutstanding.toLocaleString('en-IN');

    // Populate Top Financial Summary Cards (Tab 3)
    const mAmount = document.getElementById('metricTotalAmount');
    if (mAmount) mAmount.innerText = '₹' + totalFreightBilled.toLocaleString('en-IN');
    const mBal = document.getElementById('metricTransportBal');
    if (mBal) mBal.innerText = '₹' + s1.toPayBal.toLocaleString('en-IN');
    const mDebt = document.getElementById('metricTotalDebt');
    if (mDebt) mDebt.innerText = '₹' + totalPayableDebt.toLocaleString('en-IN');
    const mAdv = document.getElementById('metricTotalAdvances');
    if (mAdv) mAdv.innerText = '₹' + totalCompanyAdvances.toLocaleString('en-IN');
    const mS1 = document.getElementById('metricS1Outstanding');
    if (mS1) mS1.innerText = '₹' + s1.netOutstanding.toLocaleString('en-IN');
    const mS2 = document.getElementById('metricS2Advances');
    if (mS2) mS2.innerText = '₹' + activeSec.advSum.toLocaleString('en-IN');

    const outEl = document.getElementById('metricNetOutstanding');
    if (outEl) {
      outEl.innerText = '₹' + finalNetOutstanding.toLocaleString('en-IN');
      outEl.parentElement.className = finalNetOutstanding > 0 ? 'metric-card danger' : 'metric-card success';
    }

    // Dynamic Titles
    const mS1Title = document.getElementById('metricS1Title');
    if (mS1Title) mS1Title.innerText = `${s1.latestDate} Old Balance (S1)`;
    const mNetOutTitle = document.getElementById('metricNetOutTitle');
    if (mNetOutTitle) mNetOutTitle.innerText = `${activeSec.latestDate} Net Outstanding (${activeSec.section.name})`;

    // Populate Section 1 Reconciliation breakdown
    const s1B = document.getElementById('s1Billed');
    if (s1B) s1B.innerText = '₹' + s1.totalAmount.toLocaleString('en-IN');
    const s1TP = document.getElementById('s1ToPayBal');
    if (s1TP) s1TP.innerText = '₹' + s1.toPayBal.toLocaleString('en-IN');
    const s1TPay = document.getElementById('s1TotalPayable');
    if (s1TPay) s1TPay.innerText = '₹' + s1.totalPayable.toLocaleString('en-IN');
    const s1LA = document.getElementById('s1LessAdv');
    if (s1LA) s1LA.innerText = '₹' + s1.advSum.toLocaleString('en-IN');
    const s1Out = document.getElementById('s1OutStanding');
    if (s1Out) s1Out.innerText = '₹' + s1.netOutstanding.toLocaleString('en-IN');
    const s1OutLabel = document.getElementById('s1OutStandingLabel');
    if (s1OutLabel) s1OutLabel.innerText = `(=) ${s1.latestDate} (out standing)`;

    // Populate Section 2 Reconciliation breakdown
    const s2B = document.getElementById('s2Billed');
    if (s2B) s2B.innerText = '₹' + s2.totalAmount.toLocaleString('en-IN');
    const s2OB = document.getElementById('s2OldBal');
    if (s2OB) s2OB.innerText = '₹' + s2.oldBal.toLocaleString('en-IN');
    const s2TPay = document.getElementById('s2TotalPayable');
    if (s2TPay) s2TPay.innerText = '₹' + s2.totalPayable.toLocaleString('en-IN');
    const s2LA = document.getElementById('s2LessAdv');
    if (s2LA) s2LA.innerText = '₹' + s2.advSum.toLocaleString('en-IN');
    const s2Out = document.getElementById('s2OutStanding');
    if (s2Out) s2Out.innerText = '₹' + s2.netOutstanding.toLocaleString('en-IN');
    const s2OldBalLabel = document.getElementById('s2OldBalLabel');
    if (s2OldBalLabel) s2OldBalLabel.innerText = `(+) ${s2.oldBalDate} Old Balance`;
    const s2OutLabel = document.getElementById('s2OutStandingLabel');
    if (s2OutLabel) s2OutLabel.innerText = `(=) ${s2.latestDate} (out standing)`;
  },

  openSectionModal() {
    const user = AuthService.getCurrentUser();
    if (!user) {
      this.showToast('Please log in first.', 'error');
      return;
    }
    const sections = ApiService.getSections();
    const nextNum = sections.length + 1;
    const nameInput = document.getElementById('newSectionName');
    if (nameInput) nameInput.value = `Section ${nextNum}`;
    const titleInput = document.getElementById('newSectionTitle');
    if (titleInput) titleInput.value = `NEW`;
    document.getElementById('sectionModal')?.classList.add('active');
  },

  closeSectionModal() {
    document.getElementById('sectionModal')?.classList.remove('active');
  },

  handleSectionSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('newSectionName').value.trim();
    const title = document.getElementById('newSectionTitle').value.trim();
    if (!name) return;

    try {
      ApiService.addSection(name, title);
      this.closeSectionModal();
      this.showToast(`✅ ${name} created successfully!`, 'success');
      
      TransportModule.populateSectionFilters();
      TransportModule.populateSectionDropdown(name);
      AdvancesModule.populateSectionDropdown(name);
      
      const viewKey = name.toUpperCase().replace(/\s+/g, '_');
      if (typeof SheetViewModule !== 'undefined') {
        SheetViewModule.setView(viewKey);
      }

      this.updateMetrics();
    } catch (err) {
      alert(err.message || 'Error creating section');
    }
  },

  confirmDeleteSection(sectionName) {
    if (!AuthService.isAdmin()) {
      alert('Permission denied: Only Admin can delete a section!');
      return;
    }
    const trips = this.transportRecords.filter(r => window.getTripSection(r) === sectionName);
    const advs = this.advanceRecords.filter(a => window.getAdvanceSection(a) === sectionName);
    if (trips.length > 0 || advs.length > 0) {
      if (!confirm(`Warning: "${sectionName}" contains ${trips.length} trips and ${advs.length} advances. Are you sure you want to delete this section?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${sectionName}"?`)) return;
    }

    try {
      ApiService.deleteSection(sectionName);
      this.showToast(`Deleted ${sectionName}.`, 'info');
      if (typeof SheetViewModule !== 'undefined') {
        SheetViewModule.setView('SECTION_2');
      }
      TransportModule.populateSectionFilters();
      this.refreshData();
    } catch (err) {
      alert(err.message || 'Error deleting section');
    }
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

