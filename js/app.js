/**
 * app.js - Main Controller and Orchestrator
 */

window.App = {
  transportRecords: [],
  advanceRecords: [],
  openingBalance: 120000,

  async init() {
    this.setupEventListeners();
    this.initRealtimeSync();
    if (window.BackupModule) {
      window.BackupModule.init();
    }
    this.checkAuth();
  },

  initRealtimeSync() {
    // 1. BroadcastChannel across all open tabs/windows
    if (window.shinexSyncChannel) {
      window.shinexSyncChannel.onmessage = async (event) => {
        const type = event.data?.type || 'Data updated';
        console.log("⚡ Real-time broadcast event received:", type);
        await this.refreshData(true);
        if (type !== 'sync_ping') {
          this.showToast(`⚡ Live update: ${type.replace(/_/g, ' ')}`, 'info');
        }
      };
    }

    // 2. Storage event listener fallback (for multi-tab / incognito)
    window.addEventListener('storage', async (e) => {
      if (e.key && (e.key.startsWith('transport_') || e.key.includes('auth_'))) {
        await this.refreshData(true);
      }
    });

    // 3. Tab focus auto-sync (when user switches back to this tab)
    window.addEventListener('focus', () => {
      this.refreshData(true);
    });

    // 4. Background cloud polling every 3 seconds if connected (ensures instant visibility)
    setInterval(() => {
      if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
        this.refreshData(true);
      }
    }, 3000);
  },

  selectLoginUser(username) {
    const input = document.getElementById('loginSelectedUser');
    if (input) input.value = username;

    const btnAdmin = document.getElementById('userBtnAdmin');
    const btnRudra = document.getElementById('userBtnRudra') || document.getElementById('userBtnSarika');
    const pwdInput = document.getElementById('loginPassword');
    if (username.toLowerCase() === 'rudra' || username.toLowerCase() === 'sarika') {
      btnAdmin?.classList.remove('active');
      btnRudra?.classList.add('active');
      if (pwdInput) pwdInput.placeholder = 'Enter password for Rudra';
    } else {
      btnRudra?.classList.remove('active');
      btnAdmin?.classList.add('active');
      if (pwdInput) pwdInput.placeholder = 'Enter password for Admin';
    }

    if (pwdInput) {
      pwdInput.value = '';
      setTimeout(() => pwdInput.focus(), 100);
    }
  },

  async syncNow() {
    this.showToast("🔄 Syncing latest cloud database...", "info");
    await this.refreshData();
    this.showToast("✅ Synced with latest database!", "success");
  },

  openChangePasswordModal() {
    const user = AuthService.getCurrentUser();
    if (!user) return;
    const form = document.getElementById('changePasswordForm');
    if (form) form.reset();
    const userTargetEl = document.getElementById('changePwdTargetUser');
    if (userTargetEl) userTargetEl.innerText = `${user.name} (${user.role})`;
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('currentPasswordInput')?.focus();
    }, 150);
  },

  closeChangePasswordModal() {
    document.getElementById('changePasswordModal')?.classList.remove('active');
  },

  async handleChangePasswordSubmit(e) {
    e.preventDefault();
    const user = AuthService.getCurrentUser();
    if (!user) return;

    const currentPass = document.getElementById('currentPasswordInput').value;
    const newPass = document.getElementById('newPasswordInput').value;
    const confirmPass = document.getElementById('confirmPasswordInput').value;

    if (!newPass || newPass.length < 6) {
      this.showToast("New password must be at least 6 characters long.", "error");
      return;
    }

    if (newPass !== confirmPass) {
      this.showToast("New passwords do not match!", "error");
      return;
    }

    const res = await AuthService.updatePassword(user.name, newPass, currentPass);
    if (res.success) {
      this.showToast(`✅ ${res.message}`, "success");
      this.closeChangePasswordModal();
    } else {
      this.showToast(res.message, "error");
    }
  },

  checkAuth() {
    const user = AuthService.getCurrentUser();
    const authWrapper = document.getElementById('authWrapper');
    const mainApp = document.getElementById('mainApp');

    if (!user) {
      authWrapper.style.display = 'flex';
      mainApp.style.display = 'none';
      document.body.classList.remove('employee-mode');

      const lastUser = localStorage.getItem('last_logged_in_user') || 'Admin';
      this.selectLoginUser(lastUser);
    } else {
      authWrapper.style.display = 'none';
      mainApp.style.display = 'flex';
      document.getElementById('currentUserName').innerText = user.name;
      document.getElementById('currentUserRole').innerText = user.role.toUpperCase();
      
      const dashGreeting = document.getElementById('dashWelcomeTitle');
      if (dashGreeting) {
        dashGreeting.innerText = `👋 Hello, ${user.name}! Welcome to Shinex Transport Ledger & Dashboard`;
      }
      
      const isAdmin = user.role === 'Admin';
      // Toggle admin-only elements (e.g. changing Admin password, Settings & API tab)
      const adminOnlyElements = document.querySelectorAll('.admin-only');
      adminOnlyElements.forEach(el => {
        el.style.display = isAdmin ? '' : 'none';
      });

      if (!isAdmin) {
        const currentActive = document.querySelector('.nav-tab.active');
        if (currentActive && currentActive.getAttribute('data-tab') === 'settings') {
          document.querySelector('.nav-tab[data-tab="dashboard"]')?.click();
        }
      }

      this.refreshData();
    }
  },

  async refreshData(isSilent = false) {
    if (!isSilent) this.updateCloudStatus('Syncing...', 'online');
    try {
      const result = await ApiService.fetchAll();
      this.transportRecords = result.transport || [];
      this.advanceRecords = result.advances || [];
      this.openingBalance = ApiService.getOpeningBalance();

      TransportModule.setRecords(this.transportRecords);
      AdvancesModule.setAdvances(this.advanceRecords);
      this.updateMetrics();
      if (typeof SheetViewModule !== 'undefined') {
        SheetViewModule.render();
      }
      if (typeof BackupModule !== 'undefined') {
        BackupModule.renderUI();
      }

      const isOnline = window.navigator.onLine !== false;
      const banner = document.getElementById('cloudSyncAlertBanner');
      const isAdmin = typeof AuthService !== 'undefined' && AuthService.isAdmin();

      if (!isOnline) {
        this.updateCloudStatus('Offline (Device Storage)', 'offline');
        if (banner) banner.style.display = 'none';
      } else if (result.source === 'cloud') {
        this.updateCloudStatus('Online • Cloud Synced (Google Sheets)', 'cloud');
        if (banner) banner.style.display = 'none';
      } else if (this.cloudSyncWarning && isAdmin) {
        this.updateCloudStatus(this.cloudSyncWarning, 'offline');
        if (banner) banner.style.display = 'block';
      } else {
        this.updateCloudStatus('Online • Live Database Active', 'online');
        if (banner) banner.style.display = 'none';
      }
    } catch (err) {
      console.error("refreshData error:", err);
      this.updateCloudStatus('Online • Live Database Active', 'online');
    }

    // Populate Settings fields
    const apiUrlInput = document.getElementById('settingsApiUrl');
    if (apiUrlInput) apiUrlInput.value = ApiService.getApiUrl();
    const openBalInput = document.getElementById('settingsOpeningBal');
    if (openBalInput) openBalInput.value = this.openingBalance;
  },

  async testCloudConnectionUI() {
    const url = (document.getElementById('settingsApiUrl')?.value || ApiService.getApiUrl() || '').trim();
    const resultBox = document.getElementById('apiTestResultBox');
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.className = 'api-test-box loading';
      resultBox.innerHTML = '🔄 Testing connection to Google Apps Script cloud database...';
    }

    const testRes = await ApiService.testConnection(url);
    if (resultBox) {
      if (testRes.success) {
        resultBox.className = 'api-test-box success';
        resultBox.innerHTML = `
          <strong>🟢 Cloud Database Online & Multi-User Sync Active!</strong><br>
          ${testRes.message}<br>
          <small style="color: #166534;">Admin and Rudra will see live changes synchronously across devices.</small>
        `;
        this.cloudSyncWarning = null;
        this.updateCloudStatus('Online • Cloud Synced (Google Sheets)', 'cloud');
        const banner = document.getElementById('cloudSyncAlertBanner');
        if (banner) banner.style.display = 'none';
      } else {
        resultBox.className = 'api-test-box error';
        resultBox.innerHTML = `
          <strong style="color: #991b1b;">🔴 Multi-User Cloud Sync Notice (Google Permission):</strong><br>
          <div style="margin: 0.5rem 0; color: #7f1d1d;">${testRes.message}</div>
          <div style="background: rgba(255,255,255,0.7); border: 1px solid #fca5a5; padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; line-height: 1.6; color: #450a0a;">
            <strong>Quick 30-Second Fix in Google Sheets:</strong><br>
            1. Open your Google Spreadsheet ➔ <strong>Extensions</strong> ➔ <strong>Apps Script</strong>.<br>
            2. Click the blue <strong>Deploy</strong> button (top right) ➔ <strong>Manage deployments</strong>.<br>
            3. Click the <strong>Pencil icon ✏️</strong> next to the Web App deployment.<br>
            4. Under <strong>"Who has access"</strong>, change from <em>"Only myself"</em> to <strong>"Anyone"</strong>.<br>
            5. Click <strong>Deploy</strong>, then return here and click "Test Cloud Connection" again!
          </div>
        `;
      }
    }
  },

  openSettingsTab() {
    const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
    if (!user || user.role !== 'Admin') return;

    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const settingsTab = document.querySelector('.nav-tab[data-tab="settings"]');
    if (settingsTab) settingsTab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-settings')?.classList.add('active');
    
    setTimeout(() => {
      this.testCloudConnectionUI();
    }, 150);
  },

  async restoreExactExcelSheetData() {
    if (confirm("Reset data to the exact 34 transport records (27 in Section 1 + 7 in Section 2) and 15 advances from your Shinex Excel file?")) {
      await ApiService.resetToExactExcelData();
      await this.refreshData();
      this.showToast("Exact 34 Shinex records synchronized across all devices!", "success");
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

  openAddTransportModal() {
    if (typeof TransportModule !== 'undefined') {
      TransportModule.openAddModal();
    }
  },

  openAddAdvanceModal() {
    if (typeof AdvancesModule !== 'undefined') {
      AdvancesModule.openAddModal();
    }
  },

  updateCloudStatus(label, type) {
    const dot = document.getElementById('cloudStatusDot');
    const text = document.getElementById('cloudStatusText');
    if (!dot || !text) return;

    text.innerText = label;
    if (type === 'cloud') {
      dot.className = 'status-dot cloud';
    } else if (type === 'offline') {
      dot.className = 'status-dot offline';
    } else {
      dot.className = 'status-dot online';
    }
  },

  updateMetrics() {
    try {
      const allSecs = typeof SheetViewModule !== 'undefined' 
        ? SheetViewModule.computeAllSectionsData() 
        : [];

      const s1 = allSecs[0] || { section: { name: 'Section 1', title: 'April – August 2026' }, totalAmount: 0, toPayBal: 0, totalPayable: 0, advSum: 0, netOutstanding: 0, latestDate: '14-08-2026' };
      const s2 = allSecs[1] || { section: { name: 'Section 2', title: 'Active Period' }, totalAmount: 0, oldBal: 10000, oldBalDate: '14-08-2026', totalPayable: 0, advSum: 0, netOutstanding: 0, latestDate: '16-09-2026' };

      if (!s1.section) s1.section = { name: 'Section 1', title: 'April – August 2026' };
      if (!s2.section) s2.section = { name: 'Section 2', title: 'Active Period' };

      // The final active section is the newest section
      const activeSec = (allSecs && allSecs.length > 1) ? allSecs[allSecs.length - 1] : s2;
      if (!activeSec.section) {
        activeSec.section = { name: 'Section 2', title: 'Active Period' };
      }

      const activeName = activeSec.section.name || 'Section 2';

      const totalFreightBilled = allSecs.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
      const totalCompanyAdvances = allSecs.reduce((sum, s) => sum + (Number(s.advSum) || 0), 0);
      const totalToPayRemaining = allSecs.reduce((sum, s) => sum + (Number(s.toPayBal) || 0), 0);
      const totalPayableDebt = totalFreightBilled + totalToPayRemaining;
      const finalNetOutstanding = Number(activeSec.netOutstanding) || 0;

      // Populate compact transport stats bar (on Transport tab)
      const tripCountEl = document.getElementById('tripCount');
      if (tripCountEl) tripCountEl.innerText = TransportModule?.filteredRecords ? TransportModule.filteredRecords.length : (this.transportRecords?.length || 0);
      const s2BilledStat = document.getElementById('s2BilledStat');
      if (s2BilledStat) s2BilledStat.innerText = '₹' + (Number(activeSec.totalAmount) || 0).toLocaleString('en-IN');
      const s2AdvStat = document.getElementById('s2AdvStat');
      if (s2AdvStat) s2AdvStat.innerText = '₹' + (Number(activeSec.advSum) || 0).toLocaleString('en-IN');
      const s2OutStat = document.getElementById('s2OutStat');
      if (s2OutStat) s2OutStat.innerText = '₹' + finalNetOutstanding.toLocaleString('en-IN');

      // Populate Dashboard Metric Cards
      const mAmount = document.getElementById('metricTotalAmount');
      if (mAmount) mAmount.innerText = '₹' + totalFreightBilled.toLocaleString('en-IN');
      const mBal = document.getElementById('metricTransportBal');
      if (mBal) mBal.innerText = '₹' + totalToPayRemaining.toLocaleString('en-IN');
      const mDebt = document.getElementById('metricTotalDebt');
      if (mDebt) mDebt.innerText = '₹' + totalPayableDebt.toLocaleString('en-IN');
      const mAdv = document.getElementById('metricTotalAdvances');
      if (mAdv) mAdv.innerText = '₹' + totalCompanyAdvances.toLocaleString('en-IN');
      const mS1 = document.getElementById('metricS1Outstanding');
      if (mS1) mS1.innerText = '₹' + (Number(s1.netOutstanding) || 0).toLocaleString('en-IN');

      // Active Section Advances card (dynamically titled)
      const mActiveAdvTitle = document.getElementById('metricActiveAdvTitle');
      if (mActiveAdvTitle) mActiveAdvTitle.innerText = `${activeName} Advances`;
      const mActiveAdv = document.getElementById('metricActiveAdvances');
      if (mActiveAdv) mActiveAdv.innerText = '₹' + (Number(activeSec.advSum) || 0).toLocaleString('en-IN');

      const outEl = document.getElementById('metricNetOutstanding');
      if (outEl) {
        outEl.innerText = '₹' + finalNetOutstanding.toLocaleString('en-IN');
        outEl.parentElement.className = finalNetOutstanding > 0 ? 'metric-card danger' : 'metric-card success';
      }

      // Dynamic Titles
      const mS1Title = document.getElementById('metricS1Title');
      if (mS1Title) mS1Title.innerText = `${s1.latestDate || '14-08-2026'} Old Balance (S1)`;
      const mNetOutTitle = document.getElementById('metricNetOutTitle');
      if (mNetOutTitle) mNetOutTitle.innerText = `${activeSec.latestDate || '23-09-2026'} Net Outstanding`;

      // Dynamically render all Section Reconciliation Cards in #financialSectionReconGrid
      const reconGrid = document.getElementById('financialSectionReconGrid');
      if (reconGrid) {
        reconGrid.innerHTML = allSecs.map((secData, idx) => {
          const sec = secData.section || { name: `Section ${idx + 1}` };
          const isS1 = idx === 0;
          const badgeClass = sec.isArchive ? 'badge-secondary' : 'badge-success';
          const badgeText = sec.isArchive ? 'Archive' : 'Active';

          return `
            <div style="background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 1.5rem; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem;">
                  <div>
                    <h4 style="color: var(--primary); font-size: 1.05rem; margin-bottom: 2px;">${sec.name} Reconciliation</h4>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${sec.title || (isS1 ? 'April – August 2026' : 'Active Period')}</div>
                  </div>
                  <span class="badge ${badgeClass}">${badgeText}</span>
                </div>

                <div style="line-height: 1.9; font-size: 0.92rem;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.35rem 0;">
                    <span>To Billed (Freight Amount)</span>
                    <strong>₹${(Number(secData.totalAmount) || 0).toLocaleString('en-IN')}</strong>
                  </div>

                  ${!isS1 ? `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.35rem 0; color: #92400e;">
                      <span>(+) ${secData.oldBalDate || 'Previous'} Old Balance</span>
                      <strong>₹${(Number(secData.oldBal) || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  ` : ''}

                  ${(Number(secData.toPayBal) || 0) > 0 ? `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.35rem 0; color: #b45309;">
                      <span>(+) ToPay Balance Remaining</span>
                      <strong>₹${(Number(secData.toPayBal) || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  ` : ''}

                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.35rem 0; color: var(--primary); font-weight: 600;">
                    <span>(=) Total Payable</span>
                    <strong>₹${(Number(secData.totalPayable) || 0).toLocaleString('en-IN')}</strong>
                  </div>

                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 0.35rem 0; color: var(--warning);">
                    <span>(-) Less Advances</span>
                    <strong>₹${(Number(secData.advSum) || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 2px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; color: #0284c7; font-weight: 700; font-size: 1.05rem;">
                <span>(=) ${secData.latestDate || ''} (out standing)</span>
                <span style="font-size: 1.15rem; color: ${(Number(secData.netOutstanding) || 0) > 0 ? 'var(--danger)' : 'var(--success)'};">₹${(Number(secData.netOutstanding) || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error("updateMetrics error:", err);
    }
  },

  openSectionModal() {
    if (!AuthService.getCurrentUser()) {
      alert("Please log in to create new sections.");
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
    if (!AuthService.getCurrentUser()) {
      alert("Please log in to create new sections.");
      return;
    }
    const name = document.getElementById('newSectionName').value.trim();
    const title = document.getElementById('newSectionTitle').value.trim();
    if (!name) return;

    try {
      ApiService.addSection(name, title);
      this.closeSectionModal();
      this.showToast(`✅ ${name} created successfully!`, 'success');
      
      TransportModule.populateSectionFilters();
      TransportModule.populateSectionDropdown(name);
      AdvancesModule.populateSectionFilters();
      AdvancesModule.populateSectionDropdown(name);
      
      const viewKey = name.toUpperCase().replace(/\s+/g, '_');
      if (typeof SheetViewModule !== 'undefined') {
        SheetViewModule.setView(viewKey);
      }

      this.updateMetrics();
      this.refreshData();
    } catch (err) {
      alert(err.message || 'Error creating section');
    }
  },

  openManageSectionModal() {
    if (!AuthService.getCurrentUser()) {
      alert("Please log in to manage sections.");
      return;
    }
    const container = document.getElementById('sectionManageList');
    if (!container) return;

    const sections = ApiService.getSections();
    const trips = this.transportRecords || [];
    const advs = this.advanceRecords || [];

    const isAdmin = typeof AuthService !== 'undefined' && AuthService.isAdmin();
    let html = '';
    sections.forEach(s => {
      const isS1 = s.name === 'Section 1';
      const isS2 = s.name === 'Section 2';
      const isCore = isS1 || isS2;
      const tripCount = trips.filter(t => window.getTripSection(t) === s.name).length;
      const advCount = advs.filter(a => window.getAdvanceSection(a) === s.name).length;

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong>${s.name}</strong>
              <span class="badge ${s.isArchive ? 'badge-secondary' : 'badge-success'}" style="font-size: 0.72rem;">${s.isArchive ? 'Archive' : 'Active'}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              ${s.title || 'Standard Section'} • ${tripCount} trips, ${advCount} advances
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-sm btn-secondary" onclick="App.promptEditSection('${s.name}')" title="Edit Section Title">✏️ Edit</button>
            ${(!isCore && isAdmin) ? `
              <button class="btn btn-sm btn-danger" onclick="App.confirmDeleteSection('${s.name}')" title="Delete Section">🗑️ Delete</button>
            ` : (isCore ? `<span style="font-size: 0.75rem; color: #94a3b8; padding: 0.25rem 0.5rem;">Protected</span>` : '')}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    document.getElementById('manageSectionModal')?.classList.add('active');
  },

  closeManageSectionModal() {
    document.getElementById('manageSectionModal')?.classList.remove('active');
  },

  promptEditSection(sectionName) {
    if (!AuthService.getCurrentUser()) {
      alert("Please log in to edit sections.");
      return;
    }
    const sections = ApiService.getSections();
    const sec = sections.find(s => s.name.toLowerCase() === sectionName.toLowerCase());
    if (!sec) return;

    const isCore = sec.name === 'Section 1' || sec.name === 'Section 2';
    let newName = sec.name;
    if (!isCore) {
      const inputName = prompt(`Enter new name for "${sec.name}":`, sec.name);
      if (inputName === null) return;
      if (!inputName.trim()) {
        alert("Section name cannot be empty.");
        return;
      }
      newName = inputName.trim();
    }

    const inputTitle = prompt(`Enter period or subtitle for "${newName}":`, sec.title || '');
    if (inputTitle === null) return;

    try {
      ApiService.updateSection(sec.name, newName, inputTitle);
      this.showToast(`Updated "${newName}" successfully!`, 'success');
      this.openManageSectionModal(); // Refresh modal view
      TransportModule.populateSectionFilters();
      AdvancesModule.populateSectionFilters();
      this.refreshData();
    } catch (err) {
      alert(err.message || 'Error updating section');
    }
  },

  confirmDeleteSection(sectionName) {
    if (!AuthService.isAdmin()) {
      alert('Permission denied: Only Admin can delete a section!');
      return;
    }
    const normalized = window.normalizeSection(sectionName);
    if (normalized === 'Section 1' || normalized === 'Section 2') {
      alert('Default Section 1 and Section 2 are protected and cannot be deleted.');
      return;
    }
    const trips = this.transportRecords.filter(r => window.getTripSection(r) === sectionName);
    const advs = this.advanceRecords.filter(a => window.getAdvanceSection(a) === sectionName);
    if (trips.length > 0 || advs.length > 0) {
      if (!confirm(`Warning: "${sectionName}" contains ${trips.length} trips and ${advs.length} advances. Deleting this section will delete this section grouping. Are you sure you want to proceed?`)) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete "${sectionName}"?`)) return;
    }

    try {
      ApiService.deleteSection(sectionName);
      this.showToast(`Deleted ${sectionName}.`, 'info');
      this.closeManageSectionModal();
      if (typeof SheetViewModule !== 'undefined') {
        SheetViewModule.setView('SECTION_2');
      }
      TransportModule.populateSectionFilters();
      AdvancesModule.populateSectionFilters();
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

    // Login submit (Select User / Username + Password)
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Determine username: check active card first, then hidden input
      let username = 'Admin';
      const btnRudra = document.getElementById('userBtnRudra');
      const btnAdmin = document.getElementById('userBtnAdmin');
      const selectedUserInput = document.getElementById('loginSelectedUser');
      
      if (btnRudra && btnRudra.classList.contains('active')) {
        username = 'Rudra';
      } else if (btnAdmin && btnAdmin.classList.contains('active')) {
        username = 'Admin';
      } else if (selectedUserInput && selectedUserInput.value) {
        username = selectedUserInput.value.trim();
      }

      const password = (document.getElementById('loginPassword')?.value || '').trim();
      const errorMsg = document.getElementById('loginErrorMsg');
      const submitBtn = document.getElementById('loginSubmitBtn');

      if (submitBtn) submitBtn.disabled = true;
      if (errorMsg) errorMsg.style.display = 'none';

      const res = await AuthService.login(username, password);
      if (submitBtn) submitBtn.disabled = false;

      if (res.success) {
        localStorage.setItem('last_logged_in_user', username);
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

    // Change Password Trigger (Sidebar User Card)
    document.getElementById('btnOpenChangePassword')?.addEventListener('click', () => {
      this.openChangePasswordModal();
    });

    // Change Password Form Submit
    document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
      this.handleChangePasswordSubmit(e);
    });

    // Manual Cloud Sync button
    document.getElementById('manualSyncBtn')?.addEventListener('click', () => {
      this.syncNow();
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
        const target = tab.dataset.tab;
        const user = typeof AuthService !== 'undefined' ? AuthService.getCurrentUser() : null;
        if (target === 'settings' && user && user.role !== 'Admin') {
          return;
        }

        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

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

    // Add Transport Modal Triggers (Dual-guarantee execution)
    document.getElementById('btnHeroAddTransport')?.addEventListener('click', () => TransportModule.openAddModal());
    document.getElementById('btnTabAddTransport')?.addEventListener('click', () => TransportModule.openAddModal());
    document.getElementById('btnSheetAddTransport')?.addEventListener('click', () => TransportModule.openAddModal());

    // Add Advance Modal Triggers (Dual-guarantee execution)
    document.getElementById('btnHeroAddAdvance')?.addEventListener('click', () => AdvancesModule.openAddModal());
    document.getElementById('btnTabAddAdvance')?.addEventListener('click', () => AdvancesModule.openAddModal());
    document.getElementById('btnSheetAddAdvance')?.addEventListener('click', () => AdvancesModule.openAddModal());

    // Add Section Modal Triggers
    document.getElementById('btnTabAddSection')?.addEventListener('click', () => this.openSectionModal());
    document.getElementById('btnAddSectionSheet')?.addEventListener('click', () => this.openSectionModal());

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

    // Test Cloud Connection button
    document.getElementById('btnTestApiConnection')?.addEventListener('click', () => {
      this.testCloudConnectionUI();
    });

    // Passwords update (Admin only settings panel)
    document.getElementById('savePasswordsBtn')?.addEventListener('click', async () => {
      const adminPass = document.getElementById('settingsAdminPass')?.value;
      const empPass = document.getElementById('settingsEmpPass')?.value;

      let updated = false;
      if (adminPass && adminPass.trim()) {
        const res1 = await AuthService.updatePassword('Admin', adminPass);
        if (res1.success) {
          this.showToast("Admin password updated successfully!", "success");
          document.getElementById('settingsAdminPass').value = '';
          updated = true;
        } else {
          this.showToast(res1.message, "error");
        }
      }

      if (empPass && empPass.trim()) {
        const res2 = await AuthService.updatePassword('Rudra', empPass);
        if (res2.success) {
          this.showToast("Rudra password updated successfully!", "success");
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

    // Browser Online/Offline Event Listeners
    window.addEventListener('online', () => {
      this.refreshData();
    });
    window.addEventListener('offline', () => {
      this.updateCloudStatus('Offline (Device Storage)', 'offline');
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

window.downloadShinexExcel = async function(btn, sectionFilter = null) {
  const originalText = btn ? btn.innerText : '';
  if (btn) {
    btn.innerText = '⏳ Generating Excel...';
    btn.disabled = true;
  }
  try {
    const transport = window.App?.transportRecords || [];
    const advances = window.App?.advanceRecords || [];
    const openBal = window.App?.openingBalance || 120000;

    // Detect sectionFilter if called from Live Excel Sheet View button
    let filter = sectionFilter;
    if (!filter && btn && (btn.id === 'btnDownloadSheetView' || (btn.closest && btn.closest('#tab-sheetview')))) {
      filter = (typeof SheetViewModule !== 'undefined' && SheetViewModule.activeView)
        ? SheetViewModule.activeView
        : 'FULL';
    }

    await ExcelModule.exportToExcel(transport, advances, openBal, filter);
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

