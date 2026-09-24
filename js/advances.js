/**
 * advances.js - Handles Advance payments tracking and financial adjustments
 * Full Edit and Delete permissions for Administrator; Employee restricted from deleting.
 * Section-divided filtering and dedicated section selection.
 */

const AdvancesModule = {
  advances: [],
  filteredAdvances: [],

  setAdvances(list) {
    this.advances = list || [];
    this.populateSectionFilters();
    this.applyFilters();
  },

  populateSectionFilters() {
    const filterEl = document.getElementById('advFilterSection');
    if (!filterEl) return;
    const currentVal = filterEl.value;
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];
    
    let opts = '<option value="ALL">📋 All Sections (Combined)</option>';
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
    const filterEl = document.getElementById('advFilterSection');
    const searchVal = (document.getElementById('advSearchInput')?.value || '').toLowerCase().trim();
    const sectionVal = filterEl ? filterEl.value : 'ALL';

    this.filteredAdvances = this.advances.filter(a => {
      // Section filter
      if (sectionVal !== 'ALL') {
        const aSec = window.getAdvanceSection(a);
        if (aSec.toLowerCase() !== sectionVal.toLowerCase()) return false;
      }

      // Search filter (Description, Reference, UTR, Note)
      if (searchVal) {
        const desc = (a.description || a.note || '').toLowerCase();
        const ref = (a.reference || '').toLowerCase();
        const amt = String(a.amount || '');
        if (!desc.includes(searchVal) && !ref.includes(searchVal) && !amt.includes(searchVal)) {
          return false;
        }
      }

      return true;
    });

    // Sort order: Section then by date or index
    this.filteredAdvances.sort((a, b) => {
      const aSec = window.getAdvanceSection(a);
      const bSec = window.getAdvanceSection(b);
      const aNum = Number(aSec.replace(/\D+/g, '')) || 0;
      const bNum = Number(bSec.replace(/\D+/g, '')) || 0;
      if (aNum !== bNum) return aNum - bNum;
      return (b.date || '').localeCompare(a.date || '');
    });

    // Update summary stats
    this.updateStats(sectionVal);
    this.renderTable();
  },

  updateStats(selectedSection) {
    const countEl = document.getElementById('advCountStat');
    if (countEl) countEl.innerText = this.filteredAdvances.length;

    const filteredTotal = this.filteredAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const totalEl = document.getElementById('advTotalStat');
    if (totalEl) totalEl.innerText = '₹' + filteredTotal.toLocaleString('en-IN');

    // Section 1 advances total
    const s1Total = this.advances
      .filter(a => window.getAdvanceSection(a) === 'Section 1')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const s1El = document.getElementById('advS1Stat');
    if (s1El) s1El.innerText = '₹' + s1Total.toLocaleString('en-IN');

    // Section 2 advances total
    const s2Total = this.advances
      .filter(a => window.getAdvanceSection(a) === 'Section 2')
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    const s2El = document.getElementById('advS2Stat');
    if (s2El) s2El.innerText = '₹' + s2Total.toLocaleString('en-IN');
  },

  renderTable() {
    const tbody = document.getElementById('advancesTableBody');
    if (!tbody) return;

    if (this.filteredAdvances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-muted);">No advance records found for this section.</td></tr>`;
      return;
    }

    const isAdmin = AuthService.isAdmin();

    tbody.innerHTML = this.filteredAdvances.map((a, index) => {
      const formattedAmount = (Number(a.amount) || 0).toLocaleString('en-IN');
      const secName = window.getAdvanceSection(a);
      const isS1 = secName === 'Section 1';
      const isS2 = secName === 'Section 2';
      const badgeBg = isS1 ? '#f1f5f9' : (isS2 ? '#dbeafe' : '#fef3c7');
      const badgeColor = isS1 ? '#475569' : (isS2 ? '#1e40af' : '#92400e');

      return `
        <tr>
          <td><strong>${index + 1}</strong></td>
          <td><span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.72rem; font-weight: 600;">${secName}</span></td>
          <td><strong>${a.date || '-'}</strong></td>
          <td style="color: var(--primary); font-weight: 700;">₹${formattedAmount}</td>
          <td>${a.description || a.note || 'Advance Payment'}</td>
          <td><code>${a.reference || '-'}</code></td>
          <td><span class="badge ${a.createdBy === 'Admin' ? 'badge-primary' : 'badge-success'}">${a.createdBy || 'User'}</span></td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="AdvancesModule.openEditModal('${a.id}')" title="Edit Advance">✏️</button>
              ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="AdvancesModule.confirmDelete('${a.id}')" title="Delete Advance">🗑️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  populateSectionDropdown(selectedSection) {
    const secSelect = document.getElementById('advanceSection');
    if (!secSelect) return;
    const sections = typeof ApiService !== 'undefined' ? ApiService.getSections() : [];
    const activeSections = sections.filter(s => !s.isArchive);
    const defaultSec = activeSections.length > 0 ? activeSections[activeSections.length - 1].name : 'Section 2';
    const target = selectedSection || defaultSec;

    secSelect.innerHTML = sections.map(s => `
      <option value="${s.name}" ${s.name.toLowerCase() === target.toLowerCase() ? 'selected' : ''}>
        ${s.name} (${s.title || (s.isArchive ? 'Archive' : 'Active')})
      </option>
    `).join('');
  },

  openAddModal(preselectedSection = null) {
    document.getElementById('advanceForm').reset();
    document.getElementById('advanceId').value = '';
    document.getElementById('advanceModalTitle').innerText = '➕ Record Advance Payment';
    document.getElementById('advanceDate').value = new Date().toISOString().split('T')[0];

    // If preselectedSection not specified, check currently active section filter
    let targetSec = preselectedSection;
    if (!targetSec) {
      const activeFilter = document.getElementById('advFilterSection')?.value;
      if (activeFilter && activeFilter !== 'ALL') {
        targetSec = activeFilter;
      }
    }

    this.populateSectionDropdown(targetSec);
    document.getElementById('advanceModal').classList.add('active');
  },

  openEditModal(id) {
    const adv = this.advances.find(a => String(a.id) === String(id));
    if (!adv) return;

    this.populateSectionDropdown(window.getAdvanceSection(adv));
    document.getElementById('advanceId').value = adv.id;
    document.getElementById('advanceModalTitle').innerText = '✏️ Edit Advance Payment';
    document.getElementById('advanceDate').value = window.formatDateForInput(adv.date);
    document.getElementById('advanceAmount').value = adv.amount || '';
    document.getElementById('advanceDescription').value = adv.description || adv.note || '';
    document.getElementById('advanceReference').value = adv.reference || '';
    document.getElementById('advanceModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('advanceModal').classList.remove('active');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const user = AuthService.getCurrentUser();
    const id = document.getElementById('advanceId').value;
    const amount = Number(document.getElementById('advanceAmount').value) || 0;
    if (amount <= 0) {
      alert("Please enter a valid advance amount");
      return;
    }

    const secSelect = document.getElementById('advanceSection');
    const existing = id ? this.advances.find(a => a.id === id) : null;
    const chosenSection = secSelect ? secSelect.value : (existing ? (existing.section || 'Section 2') : 'Section 2');
    const dateVal = document.getElementById('advanceDate').value;
    const formattedDate = window.formatDateForDisplay(dateVal);

    const advance = {
      id: id || undefined,
      date: formattedDate,
      amount: amount,
      description: document.getElementById('advanceDescription').value.trim(),
      note: document.getElementById('advanceDescription').value.trim(),
      reference: document.getElementById('advanceReference').value.trim(),
      section: chosenSection,
      createdBy: existing?.createdBy || (user ? user.role : 'Admin')
    };

    try {
      await ApiService.saveAdvance(advance);
      this.closeModal();
      window.App.showToast(id ? "Advance updated successfully!" : "Advance added successfully!", "success");
      await window.App.refreshData();
    } catch (err) {
      console.error(err);
      window.App.showToast("Failed to save advance record.", "error");
    }
  },

  async confirmDelete(id) {
    if (!AuthService.isAdmin()) {
      alert("Permission denied: Only Admin can delete advances!");
      return;
    }
    if (!confirm("Are you sure you want to delete this advance entry?")) return;
    try {
      await ApiService.deleteAdvance(id);
      window.App.showToast("Advance record deleted.", "info");
      await window.App.refreshData();
    } catch (err) {
      console.error(err);
      window.App.showToast("Failed to delete advance.", "error");
    }
  }
};

// Export AdvancesModule globally on window
window.AdvancesModule = AdvancesModule;
window.openAddAdvanceModal = () => AdvancesModule.openAddModal();
