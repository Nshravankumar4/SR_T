/**
 * transport.js - Handles Transport entries, filtering, and table interactions
 */

const TransportModule = {
  records: [],
  filteredRecords: [],

  setRecords(list) {
    this.records = list || [];
    this.applyFilters();
  },

  populateSectionFilters() {
    const filterEl = document.getElementById('sectionFilter');
    if (!filterEl) return;
    const currentVal = filterEl.value;
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];
    let opts = '<option value="ALL">📋 All Sections (Complete 2026-2027)</option>';
    sections.forEach(s => {
      const isAct = !s.isArchive;
      opts += `<option value="${s.name}">${isAct ? '🟢' : '📁'} ${s.name}: ${s.title || (isAct ? 'Active' : 'Archive')}</option>`;
    });
    filterEl.innerHTML = opts;
    if (currentVal && Array.from(filterEl.options).some(o => o.value === currentVal)) {
      filterEl.value = currentVal;
    } else {
      const active = sections.filter(s => !s.isArchive);
      filterEl.value = active.length > 0 ? active[active.length - 1].name : 'Section 2';
    }
  },

  applyFilters() {
    this.populateSectionFilters();
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('statusFilter')?.value || 'ALL';
    const monthVal = document.getElementById('monthFilter')?.value || 'ALL';
    const sectionVal = document.getElementById('sectionFilter')?.value || 'ALL';

    this.filteredRecords = this.records.filter(item => {
      // Dynamic Section filter
      if (sectionVal !== 'ALL') {
        const itemSec = window.getTripSection(item);
        if (itemSec.toLowerCase() !== sectionVal.toLowerCase()) return false;
      }

      // Search matches LR, Vehicle, From, To, DC
      const matchesSearch = !searchVal || 
        (item.lrNo && String(item.lrNo).toLowerCase().includes(searchVal)) ||
        (item.vehicleNumber && String(item.vehicleNumber).toLowerCase().includes(searchVal)) ||
        (item.dcNo && String(item.dcNo).toLowerCase().includes(searchVal)) ||
        (item.fromCity && String(item.fromCity).toLowerCase().includes(searchVal)) ||
        (item.toCity && String(item.toCity).toLowerCase().includes(searchVal));

      // Status filter
      const matchesStatus = (statusVal === 'ALL') || (item.status === statusVal);

      // Month filter (selects YYYY-MM; dates are stored DD-MM-YYYY)
      let matchesMonth = true;
      if (monthVal !== 'ALL' && item.date) {
        const ts = typeof window.parseDateToTimestamp === 'function' ? window.parseDateToTimestamp(item.date) : 0;
        if (ts > 0) {
          const d = new Date(ts);
          matchesMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === monthVal;
        } else {
          matchesMonth = false;
        }
      }

      return matchesSearch && matchesStatus && matchesMonth;
    });

    // Sort order: Section 1, Section 2, Section 3... then by slNo
    this.filteredRecords.sort((a, b) => {
      const aSec = window.getTripSection(a);
      const bSec = window.getTripSection(b);
      const aNum = Number(aSec.replace(/\D+/g, '')) || 0;
      const bNum = Number(bSec.replace(/\D+/g, '')) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return (Number(a.slNo) || 0) - (Number(b.slNo) || 0);
    });

    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('transportTableBody');
    if (!tbody) return;
    const isAdmin = typeof AuthService !== 'undefined' && AuthService.isAdmin();

    if (this.filteredRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="17" style="text-align: center; padding: 2rem; color: var(--text-muted);">No transport records found for this section.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.filteredRecords.map((r, index) => {
      const secName = window.getTripSection(r);
      const isS1 = secName === 'Section 1';
      const isS2 = secName === 'Section 2';
      const badgeBg = isS1 ? '#f1f5f9' : (isS2 ? '#dbeafe' : '#fef3c7');
      const badgeColor = isS1 ? '#475569' : (isS2 ? '#1e40af' : '#92400e');

      let status = r.status;
      if (!status || status === 'undefined' || status === 'null') {
        if (Number(r.toPay) > 0 && Number(r.balance) <= 0) status = 'Paid';
        else if (Number(r.paid) > 0 && Number(r.balance) > 0) status = 'Partially Paid';
        else if (Number(r.amount) > 0 && Number(r.toPay) === 0) status = 'Billed';
        else status = 'Pending';
      }
      if (r.paid === 'Paid' || String(r.paid).toLowerCase() === 'paid') {
        status = 'Paid';
      }
      const badgeClass = status === 'Paid' ? 'badge-success' : (status === 'Partially Paid' ? 'badge-warning' : (status === 'Billed' ? 'badge-primary' : 'badge-danger'));
      const formattedAmount = (Number(r.amount) || 0).toLocaleString('en-IN');
      const formattedToPay = (Number(r.toPay) || 0).toLocaleString('en-IN');
      // paid is either a number or the literal string 'Paid' (fully settled trips).
      // Number('Paid') is NaN, which used to render as a misleading ₹0 in this column.
      const isPaidFlag = (status === 'Paid' || r.paid === 'Paid' || String(r.paid).toLowerCase() === 'paid' || (Number(r.toPay) > 0 && Number(r.balance) === 0 && (r.status === 'Paid' || Number(r.paid) >= Number(r.toPay))));
      const paidNum = isPaidFlag ? (Number(r.toPay) || 0) : (Number(r.paid) || 0);
      const formattedPaid = isPaidFlag ? 'Paid' : paidNum.toLocaleString('en-IN');
      const formattedBalance = (Number(r.balance) || 0).toLocaleString('en-IN');

      return `
        <tr>
          <td><strong>${r.slNo || (index + 1)}</strong></td>
          <td><span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.72rem; font-weight: 600;">${window.escapeHtml(secName)}</span></td>
          <td><strong>${window.escapeHtml(r.lrNo || '-')}</strong></td>
          <td>${window.escapeHtml(r.dcNo || '-')}</td>
          <td>${window.escapeHtml(window.formatDateForDisplay(r.date) || '-')}</td>
          <td><code>${window.escapeHtml(r.vehicleNumber || '-')}</code></td>
          <td>${window.escapeHtml(r.fromCity || '-')}</td>
          <td>${window.escapeHtml(r.toCity || '-')}</td>
          <td>${window.escapeHtml(r.quantity || '-')}</td>
          <td>${window.escapeHtml(r.mTax || '-')}</td>
          <td>₹${formattedAmount}</td>
          <td><strong>₹${formattedToPay}</strong></td>
          <td style="color: var(--success); font-weight: ${isPaidFlag ? '700' : '400'};">${isPaidFlag ? formattedPaid : `₹${formattedPaid}`}</td>
          <td style="color: ${r.balance > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: bold;">₹${formattedBalance}</td>
          <td><span class="badge ${badgeClass}">${window.escapeHtml(status)}</span></td>
          <td>
            ${(typeof window.getNoteBadgeHtml === 'function') ? window.getNoteBadgeHtml(r.note) : window.escapeHtml(r.note || '-')}
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="TransportModule.openEditModal('${window.escapeAttr(r.id)}')" title="Edit">✏️</button>
              ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="TransportModule.confirmDelete('${window.escapeAttr(r.id)}')" title="Delete">🗑️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  populateSectionDropdown(selectedSection) {
    const secSelect = document.getElementById('transportSection');
    if (!secSelect) return;
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];
    const activeSections = sections.filter(s => !s.isArchive);
    const defaultSec = activeSections.length > 0 ? activeSections[activeSections.length - 1].name : 'Section 2';
    let target = selectedSection || defaultSec;
    // Never keep a stale/deleted section selected — fall back to the active one
    if (!sections.some(s => s.name.toLowerCase() === String(target).toLowerCase())) {
      target = defaultSec;
    }

    secSelect.innerHTML = sections.map(s => `
      <option value="${s.name}" ${s.name.toLowerCase() === target.toLowerCase() ? 'selected' : ''}>
        ${s.name} (${s.title || (s.isArchive ? 'Archive' : 'Active')})
      </option>
    `).join('');
  },

  onSectionChange() {
    const secSelect = document.getElementById('transportSection');
    if (!secSelect) return;
    const chosen = secSelect.value;
    const secTrips = this.records.filter(r => window.getTripSection(r) === chosen);
    const nextSl = secTrips.length > 0
      ? Math.max(...secTrips.map(r => Number(r.slNo) || 0)) + 1
      : (chosen === 'Section 1' ? 34 : 1);
    
    // Only auto-update SL NO and default date if it's a new record
    if (!document.getElementById('transportId').value) {
      document.getElementById('transportSlNo').value = nextSl;
      this.setDefaultDate(chosen);
    }
    const hint = document.getElementById('transportSectionHint');
    if (hint) {
      hint.innerText = `Trip will be logged sequentially under ${chosen} (Next SL.NO: ${nextSl}).`;
    }
  },

  // Default date for NEW trips = latest trip date (chosen section first, then overall), else today.
  setDefaultDate(sectionName = null) {
    const dateEl = document.getElementById('transportDate');
    if (!dateEl) return;
    let trips = this.records || [];
    if (sectionName) {
      const inSec = trips.filter(r => window.getTripSection(r) === sectionName);
      if (inSec.length > 0) trips = inSec;
    }
    const latest = typeof window.getLatestTripDate === 'function' ? window.getLatestTripDate(trips, '') : '';
    const inputVal = (latest && window.formatDateForInput) ? window.formatDateForInput(latest) : '';
    dateEl.value = inputVal || new Date().toISOString().split('T')[0];
  },

  openAddModal(preselectedSection = null) {
    document.getElementById('transportForm').reset();
    document.getElementById('transportId').value = '';
    document.getElementById('transportModalTitle').innerText = '➕ Add Transport Record';

    // Never leave the Save button stuck disabled from a previous failed submit
    const submitBtn = document.querySelector('#transportForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Save Transport Record';
    }
    
    let sec = preselectedSection;
    if (!sec && typeof SheetViewModule !== 'undefined' && SheetViewModule.activeView && SheetViewModule.activeView !== 'FULL') {
      sec = SheetViewModule.activeView.replace(/_/g, ' ');
    }

    this.populateSectionDropdown(sec);
    this.onSectionChange(); // also auto-fills the date from the section's last trip
    
    document.getElementById('transportModal').classList.add('active');
  },

  openEditModal(id) {
    const record = this.records.find(r => String(r.id) === String(id) || (r.slNo && String(r.slNo) === String(id)));
    if (!record) {
      console.warn("Could not find record for id:", id);
      return;
    }

    this.populateSectionDropdown(window.getTripSection(record));
    const setVal = (elemId, val) => {
      const el = document.getElementById(elemId);
      if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    setVal('transportId', record.id);
    setVal('transportSlNo', record.slNo || '');
    setVal('transportLrNo', record.lrNo || '');
    setVal('transportDcNo', record.dcNo || '');
    setVal('transportDate', window.formatDateForInput ? window.formatDateForInput(record.date) : record.date);
    setVal('transportVehicle', record.vehicleNumber || '');
    setVal('transportFrom', record.fromCity || '');
    setVal('transportTo', record.toCity || '');
    setVal('transportQuantity', record.quantity || '');
    setVal('transportMTax', record.mTax || '');
    setVal('transportAmount', record.amount || '');
    setVal('transportToPay', record.toPay || '');

    const isPaid = record.paid === 'Paid' || record.status === 'Paid' || (Number(record.toPay) > 0 && Number(record.balance) === 0);
    const paidVal = isPaid ? (Number(record.toPay) || 0) : (Number(record.paid) || 0);
    setVal('transportPaid', paidVal);
    setVal('transportBalance', isPaid ? 0 : (Number(record.balance) || 0));
    setVal('transportNote', record.note || '');

    const titleEl = document.getElementById('transportModalTitle');
    if (titleEl) titleEl.innerText = `✏️ Edit Record (LR: ${record.lrNo || id})`;
    const modalEl = document.getElementById('transportModal');
    if (modalEl) modalEl.classList.add('active');
  },

  closeModal() {
    document.getElementById('transportModal').classList.remove('active');
  },

  // Recalculates balance on input change
  onPaymentInputChange() {
    const toPay = window.parseAmount(document.getElementById('transportToPay').value);
    const paidInput = document.getElementById('transportPaid');
    const balanceInput = document.getElementById('transportBalance');

    let paidVal = window.parseAmount(paidInput.value);
    if (paidVal > toPay) {
      paidVal = toPay;
      paidInput.value = toPay;
    }

    const bal = Math.max(0, toPay - paidVal);
    balanceInput.value = bal;
  },

  // Helper button: Quick Mark as Paid
  markFullyPaid() {
    const toPay = window.parseAmount(document.getElementById('transportToPay').value);
    document.getElementById('transportPaid').value = toPay;
    document.getElementById('transportBalance').value = 0;
  },

  isSubmitting: false,
  async handleFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (this.isSubmitting) {
      window.App?.showToast?.('⏳ Still saving the previous request…', 'info');
      return;
    }

    // Defense-in-depth: programmatic submits bypass native HTML5 validation,
    // which previously let an empty record reach Google Sheets. Block junk here.
    const guardForm = document.getElementById('transportForm');
    if (guardForm && typeof guardForm.checkValidity === 'function' && !guardForm.checkValidity()) {
      // reportValidity() highlights the first bad field and fires the shared
      // "fill required fields" toast listener — no duplicate toast from here.
      if (typeof guardForm.reportValidity === 'function') guardForm.reportValidity();
      return;
    }

    this.isSubmitting = true;

    // Instant visual feedback so the first tap never feels "dead"
    const submitBtn = document.querySelector('#transportForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = '⏳ Saving to Google Sheets…';
    }

    try {
      const user = AuthService.getCurrentUser();
      const id = document.getElementById('transportId').value;
      const toPay = Number(document.getElementById('transportToPay').value) || 0;
      const paidInputVal = Number(document.getElementById('transportPaid').value) || 0;
      const balance = Math.max(0, toPay - paidInputVal);

      let status = 'Pending';
      let paid = paidInputVal;
      if (toPay > 0 && balance <= 0) {
        status = 'Paid';
        paid = 'Paid';
      } else if (paid > 0 && balance > 0) {
        status = 'Partially Paid';
      } else if (toPay === 0 && Number(document.getElementById('transportAmount').value) > 0) {
        status = 'Billed';
      }

      // Get section from section dropdown
      const secSelect = document.getElementById('transportSection');
      const existing = id ? this.records.find(r => r.id === id) : null;
      const chosenSection = secSelect ? secSelect.value : (existing ? (existing.section || 'Section 2') : 'Section 2');
      const dateVal = document.getElementById('transportDate').value;
      const formattedDate = window.formatDateForDisplay(dateVal);

      const record = {
        id: id || undefined,
        slNo: Number(document.getElementById('transportSlNo').value) || 1,
        lrNo: document.getElementById('transportLrNo').value.trim(),
        dcNo: document.getElementById('transportDcNo').value.trim(),
        date: formattedDate,
        vehicleNumber: document.getElementById('transportVehicle').value.trim().toUpperCase(),
        fromCity: document.getElementById('transportFrom').value.trim(),
        toCity: document.getElementById('transportTo').value.trim(),
        quantity: document.getElementById('transportQuantity').value.trim(),
        mTax: document.getElementById('transportMTax').value.trim(),
        amount: Number(document.getElementById('transportAmount').value) || 0,
        toPay,
        paid,
        balance,
        status,
        note: document.getElementById('transportNote').value.trim(),
        section: chosenSection,
        createdBy: existing?.createdBy || (user ? user.role : 'User')
      };

      await ApiService.saveTransport(record);
      this.closeModal();
      window.App.showToast("✅ Transport record saved to Google Sheets!", "success");
      await window.App.refreshData();
      if (window.BackupModule) {
        setTimeout(() => {
          window.BackupModule.onRecordMutated(`Save Transport LR: ${record.lrNo || record.id}`).catch(console.error);
        }, 100);
      }
    } catch (err) {
      console.error(err);
      window.App.showToast("Cloud Notice: " + (err.message || "Failed to save transport record."), "error");
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Save Transport Record';
      }
    }
  },

  async confirmDelete(id) {
    if (!AuthService.isAdmin()) {
      alert("Delete operation not permitted.\n\nRudra can add and edit records but cannot delete them.");
      return;
    }
    if (!confirm("Are you sure you want to permanently delete this transport record? Google Sheets will recalculate automatically.")) return;
    window.App?.showToast?.('⏳ Deleting transport record…', 'info');
    try {
      await ApiService.deleteTransport(id);
      window.App.showToast("🗑️ Transport record deleted from Google Sheets.", "info");
      await window.App.refreshData();
      if (window.BackupModule) {
        setTimeout(() => {
          window.BackupModule.onRecordMutated(`Delete Transport: ${id}`).catch(console.error);
        }, 100);
      }
    } catch (err) {
      console.error(err);
      window.App.showToast("Cloud Error: " + (err.message || "Failed to delete transport record."), "error");
    }
  }
};

// Export TransportModule globally on window
window.TransportModule = TransportModule;
window.openAddTransportModal = () => TransportModule.openAddModal();

