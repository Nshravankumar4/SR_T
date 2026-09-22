/**
 * advances.js - Handles Advance payments tracking and financial adjustments
 * Full Edit and Delete permissions for Administrator.
 */

const AdvancesModule = {
  advances: [],

  setAdvances(list) {
    this.advances = list || [];
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('advancesTableBody');
    if (!tbody) return;

    if (this.advances.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No advance records found.</td></tr>`;
      return;
    }

    const isAdmin = AuthService.isAdmin();

    tbody.innerHTML = this.advances.map((a, index) => {
      const formattedAmount = (Number(a.amount) || 0).toLocaleString('en-IN');
      const secName = window.getAdvanceSection(a);
      const isS1 = secName === 'Section 1';
      const isS2 = secName === 'Section 2';
      const badgeBg = isS1 ? '#f1f5f9' : (isS2 ? '#dbeafe' : '#fef3c7');
      const badgeColor = isS1 ? '#475569' : (isS2 ? '#1e40af' : '#92400e');

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${a.date || '-'}</strong></td>
          <td style="color: var(--primary); font-weight: 700;">₹${formattedAmount}</td>
          <td>
            <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.72rem; font-weight: 600; margin-right: 6px;">${secName}</span>
            ${a.description || a.note || 'Advance Payment'}
          </td>
          <td><code>${a.reference || '-'}</code></td>
          <td><span class="badge ${a.createdBy === 'Admin' ? 'badge-primary' : 'badge-success'}">${a.createdBy || 'Admin'}</span></td>
          <td>
            ${isAdmin ? `
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm" onclick="AdvancesModule.openEditModal('${a.id}')" title="Edit Advance">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="AdvancesModule.confirmDelete('${a.id}')" title="Delete Advance">🗑️</button>
              </div>
            ` : '-'}
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
    this.populateSectionDropdown(preselectedSection);
    document.getElementById('advanceModal').classList.add('active');
  },

  openEditModal(id) {
    const adv = this.advances.find(a => a.id === id);
    if (!adv) return;

    this.populateSectionDropdown(window.getAdvanceSection(adv));
    document.getElementById('advanceId').value = adv.id;
    document.getElementById('advanceModalTitle').innerText = '✏️ Edit Advance Payment';
    document.getElementById('advanceDate').value = adv.date || '';
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

    const advance = {
      id: id || undefined,
      date: document.getElementById('advanceDate').value,
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
