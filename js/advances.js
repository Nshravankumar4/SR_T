/**
 * advances.js - Handles Advance payments tracking and financial adjustments
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
      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${a.date || '-'}</strong></td>
          <td style="color: var(--primary); font-weight: 700;">₹${formattedAmount}</td>
          <td>${a.description || 'Advance Payment'}</td>
          <td><code>${a.reference || '-'}</code></td>
          <td><span class="badge badge-success">${a.createdBy || 'Admin'}</span></td>
          <td>
            ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="AdvancesModule.confirmDelete('${a.id}')" title="Delete">🗑️</button>` : '-'}
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    document.getElementById('advanceForm').reset();
    document.getElementById('advanceDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('advanceModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('advanceModal').classList.remove('active');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const user = AuthService.getCurrentUser();
    const amount = Number(document.getElementById('advanceAmount').value) || 0;
    if (amount <= 0) {
      alert("Please enter a valid advance amount");
      return;
    }

    const advance = {
      date: document.getElementById('advanceDate').value,
      amount: amount,
      description: document.getElementById('advanceDescription').value.trim(),
      reference: document.getElementById('advanceReference').value.trim(),
      createdBy: user ? user.role : 'Admin'
    };

    try {
      await ApiService.saveAdvance(advance);
      this.closeModal();
      window.App.showToast("Advance record added successfully!", "success");
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

