/**
 * Shinex Transport Management System - Cloud & Web-Native Backup Module
 * Hosted on Vercel & Synchronized with Google Sheets & Google Drive
 * 
 * Capabilities:
 * 1. Automatic Snapshot creation after every successful submit (Add/Edit/Delete).
 * 2. Point-in-Time Recovery: 1-click database restore to any previous snapshot directly in Vercel.
 * 3. Dated Full Workbook Download (e.g. Shinex_Backup_2026-09-24_22-45-31.xlsx).
 * 4. Google Drive Cloud Snapshot integration via Google Apps Script (backend/Code.gs).
 */

const BackupModule = {
  storageKeySnapshots: 'shinex_backup_snapshots_v1',
  storageKeySettings: 'shinex_backup_settings_v1',
  snapshots: [],
  isAutoBackupEnabled: true,
  isAutoDownloadEnabled: false,

  init() {
    this.loadSettings();
    this.loadSnapshots();
    this.renderUI();
  },

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKeySettings);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.isAutoBackupEnabled = parsed.autoBackup !== false;
        this.isAutoDownloadEnabled = !!parsed.autoDownload;
      }
    } catch (e) {
      console.warn("Failed to load backup settings:", e);
    }
  },

  saveSettings() {
    try {
      localStorage.setItem(this.storageKeySettings, JSON.stringify({
        autoBackup: this.isAutoBackupEnabled,
        autoDownload: this.isAutoDownloadEnabled
      }));
    } catch (e) {
      console.warn("Failed to save backup settings:", e);
    }
  },

  loadSnapshots() {
    try {
      const raw = localStorage.getItem(this.storageKeySnapshots);
      this.snapshots = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to load snapshots:", e);
      this.snapshots = [];
    }
  },

  saveSnapshots() {
    try {
      // Keep up to 25 latest snapshots
      if (this.snapshots.length > 25) {
        this.snapshots = this.snapshots.slice(0, 25);
      }
      localStorage.setItem(this.storageKeySnapshots, JSON.stringify(this.snapshots));
    } catch (e) {
      console.warn("Failed to save snapshots:", e);
    }
  },

  getFormattedTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    const fileStamp = `${yyyy}-${MM}-${dd}_${hh}-${mm}-${ss}`;
    const displayStamp = now.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return { fileStamp, displayStamp };
  },

  /**
   * Called automatically after every record submit or deletion
   */
  async onRecordMutated(reason = 'Record Mutation') {
    if (!this.isAutoBackupEnabled) return;
    try {
      await this.createBackup(reason, this.isAutoDownloadEnabled);
    } catch (err) {
      console.error("Auto-backup failed:", err);
      if (window.App?.showToast) {
        window.App.showToast("Record saved, but backup snapshot encountered an error.", "warning");
      }
    }
  },

  /**
   * Creates a full workbook snapshot across all sections
   */
  async createBackup(reason = 'Manual Snapshot', triggerDownload = false) {
    const transport = window.App?.transportRecords || (typeof REAL_SHINEX_TRANSPORT !== 'undefined' ? REAL_SHINEX_TRANSPORT : []);
    const advances = window.App?.advanceRecords || (typeof REAL_SHINEX_ADVANCES !== 'undefined' ? REAL_SHINEX_ADVANCES : []);
    const openingBal = window.App?.openingBalance || (typeof ApiService !== 'undefined' ? ApiService.getOpeningBalance() : 120000);
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];

    const { fileStamp, displayStamp } = this.getFormattedTimestamp();
    const fileName = `Shinex_Backup_${fileStamp}.xlsx`;

    // Compute current Net Outstanding for the snapshot summary
    let netOutVal = '₹0';
    try {
      if (typeof SheetViewModule !== 'undefined') {
        const computed = SheetViewModule.computeAllSectionsData(transport, advances);
        if (computed && computed.length > 0) {
          const active = computed[computed.length - 1];
          netOutVal = '₹' + (Number(active.netOutstanding) || 0).toLocaleString('en-IN');
        }
      }
    } catch (e) {
      console.warn("Error computing snapshot balance:", e);
    }

    const snapshot = {
      id: 'SNAP-' + Date.now(),
      timestamp: new Date().toISOString(),
      displayDate: displayStamp,
      fileName: fileName,
      reason: reason,
      tripCount: transport.length,
      advanceCount: advances.length,
      netOutstanding: netOutVal,
      data: {
        transport: JSON.parse(JSON.stringify(transport)),
        advances: JSON.parse(JSON.stringify(advances)),
        openingBal: openingBal,
        sections: JSON.parse(JSON.stringify(sections))
      }
    };

    // Prepend to snapshot list
    this.snapshots.unshift(snapshot);
    this.saveSnapshots();
    this.renderUI();

    // 1. Client-side Download if requested or enabled
    if (triggerDownload && typeof ExcelModule !== 'undefined') {
      await ExcelModule.exportToExcel(transport, advances, openingBal, 'FULL', fileName);
    }

    // 2. Google Apps Script Cloud Snapshot to Google Drive
    const apiUrl = typeof ApiService !== 'undefined' ? ApiService.getApiUrl() : '';
    if (apiUrl && apiUrl.startsWith('http')) {
      try {
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'createBackup',
            reason: reason,
            timestamp: fileStamp
          })
        }).catch(err => console.warn("Background cloud backup notification:", err));
      } catch (e) {}
    }

    return snapshot;
  },

  /**
   * 1-Click Restore Point-in-Time Database State on Vercel
   */
  async restoreSnapshot(snapshotId) {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (!snap || !snap.data) {
      alert("Snapshot data not found!");
      return;
    }

    const confirmMsg = `⚠️ RESTORE POINT-IN-TIME SNAPSHOT?\n\n` +
      `Date & Time: ${snap.displayDate}\n` +
      `Reason: ${snap.reason}\n` +
      `Total Trips: ${snap.tripCount}\n` +
      `Total Advances: ${snap.advanceCount}\n` +
      `Net Outstanding: ${snap.netOutstanding}\n\n` +
      `This will restore the database to this exact state. Any unsaved changes since this snapshot will be replaced. Continue?`;

    if (!confirm(confirmMsg)) return;

    try {
      const { transport, advances, openingBal, sections } = snap.data;

      // 1. Update localStorage
      if (typeof API_CONFIG !== 'undefined') {
        localStorage.setItem(API_CONFIG.storageKeyTransport, JSON.stringify(transport || []));
        localStorage.setItem(API_CONFIG.storageKeyAdvances, JSON.stringify(advances || []));
        if (openingBal !== undefined) {
          localStorage.setItem(API_CONFIG.storageKeyOpeningBal, String(openingBal));
        }
        if (sections && sections.length > 0) {
          localStorage.setItem(API_CONFIG.storageKeySections, JSON.stringify(sections));
        }
      }

      // 2. Synchronize to Google Sheets Cloud if connected
      const apiUrl = typeof ApiService !== 'undefined' ? ApiService.getApiUrl() : '';
      if (apiUrl && apiUrl.startsWith('http') && window.navigator.onLine) {
        if (window.App?.showToast) {
          window.App.showToast("Restoring database to cloud Google Sheets...", "info");
        }
        try {
          await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'restoreFullDataset',
              data: {
                transport: transport,
                advances: advances,
                openingBal: openingBal,
                sections: sections
              }
            })
          });
        } catch (cloudErr) {
          console.warn("Cloud restore sync error:", cloudErr);
        }
      }

      // 3. Refresh application in-memory state and UI
      if (window.App?.refreshData) {
        await window.App.refreshData();
      }

      if (window.App?.showToast) {
        window.App.showToast(`🎉 Database successfully restored to snapshot from ${snap.displayDate}!`, "success");
      }
      this.renderUI();
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore snapshot: " + err.message);
    }
  },

  /**
   * Downloads exact .xlsx from historical snapshot
   */
  async downloadSnapshotExcel(snapshotId) {
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (!snap || !snap.data) {
      alert("Snapshot data not found!");
      return;
    }
    const { transport, advances, openingBal } = snap.data;
    if (typeof ExcelModule !== 'undefined') {
      await ExcelModule.exportToExcel(transport, advances, openingBal, 'FULL', snap.fileName);
    }
  },

  deleteSnapshot(snapshotId) {
    if (!confirm("Are you sure you want to remove this backup snapshot from history?")) return;
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    this.saveSnapshots();
    this.renderUI();
  },

  toggleAutoBackup(checked) {
    this.isAutoBackupEnabled = !!checked;
    this.saveSettings();
    this.renderUI();
  },

  toggleAutoDownload(checked) {
    this.isAutoDownloadEnabled = !!checked;
    this.saveSettings();
    this.renderUI();
  },

  renderUI() {
    // 1. Last Backup Indicator & Badge
    const lastSnap = this.snapshots.length > 0 ? this.snapshots[0] : null;
    const lastBackupTimeEl = document.getElementById('backupLastTime');
    if (lastBackupTimeEl) {
      lastBackupTimeEl.innerText = lastSnap ? lastSnap.displayDate : 'No backups yet';
    }

    const backupStatusBadge = document.getElementById('backupStatusBadge');
    if (backupStatusBadge) {
      if (lastSnap) {
        backupStatusBadge.className = 'badge badge-success';
        backupStatusBadge.innerText = '🟢 Backup Available';
      } else {
        backupStatusBadge.className = 'badge badge-secondary';
        backupStatusBadge.innerText = '⚪ Ready';
      }
    }

    // 2. Checkboxes
    const autoBackupChk = document.getElementById('chkAutoBackup');
    if (autoBackupChk) autoBackupChk.checked = this.isAutoBackupEnabled;
    const autoDownloadChk = document.getElementById('chkAutoDownload');
    if (autoDownloadChk) autoDownloadChk.checked = this.isAutoDownloadEnabled;

    // 3. Render History Table
    const tbody = document.getElementById('backupHistoryTableBody');
    if (!tbody) return;

    if (this.snapshots.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No backup snapshots recorded yet. Click "BACKUP FULL DATABASE NOW" or submit a transport record to create your first snapshot.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.snapshots.map((s) => `
      <tr>
        <td><strong>${s.displayDate}</strong></td>
        <td><code style="font-size: 0.78rem;">${s.fileName}</code><br><span style="font-size: 0.74rem; color: var(--text-muted);">${s.reason || 'Snapshot'}</span></td>
        <td><span class="badge badge-primary">${s.tripCount} Trips</span> <span class="badge badge-secondary">${s.advanceCount} Adv</span></td>
        <td style="font-weight: 700; color: #dc2626;">${s.netOutstanding || '-'}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-secondary btn-sm" onclick="BackupModule.downloadSnapshotExcel('${s.id}')" title="Download this exact Excel snapshot">📥 Download</button>
            <button class="btn btn-primary btn-sm" onclick="BackupModule.restoreSnapshot('${s.id}')" title="Restore entire database to this point in time" style="background: #0284c7; border-color: #0284c7;">🔄 Restore</button>
            <button class="btn btn-danger btn-sm" onclick="BackupModule.deleteSnapshot('${s.id}')" title="Remove snapshot from history">✕</button>
          </div>
        </td>
      </tr>
    `).join('');
  }
};

window.BackupModule = BackupModule;
