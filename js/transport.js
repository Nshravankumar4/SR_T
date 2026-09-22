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

  applyFilters() {
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('statusFilter')?.value || 'ALL';
    const monthVal = document.getElementById('monthFilter')?.value || 'ALL';

    this.filteredRecords = this.records.filter(item => {
      // Search matches LR, Vehicle, From, To, DC
      const matchesSearch = !searchVal || 
        (item.lrNo && String(item.lrNo).toLowerCase().includes(searchVal)) ||
        (item.vehicleNumber && String(item.vehicleNumber).toLowerCase().includes(searchVal)) ||
        (item.dcNo && String(item.dcNo).toLowerCase().includes(searchVal)) ||
        (item.fromCity && String(item.fromCity).toLowerCase().includes(searchVal)) ||
        (item.toCity && String(item.toCity).toLowerCase().includes(searchVal));

      // Status filter
      const matchesStatus = (statusVal === 'ALL') || (item.status === statusVal);

      // Month filter (YYYY-MM)
      let matchesMonth = true;
      if (monthVal !== 'ALL' && item.date) {
        matchesMonth = item.date.startsWith(monthVal);
      }

      return matchesSearch && matchesStatus && matchesMonth;
    });

    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('transportTableBody');
    if (!tbody) return;

    if (this.filteredRecords.length === 0) {
      tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 2rem; color: var(--text-muted);">No transport records found.</td></tr>`;
      return;
    }

    const isAdmin = AuthService.isAdmin();

    tbody.innerHTML = this.filteredRecords.map((r, index) => {
      const badgeClass = r.status === 'Paid' ? 'badge-success' : (r.status === 'Partially Paid' ? 'badge-warning' : 'badge-danger');
      const formattedAmount = (Number(r.amount) || 0).toLocaleString('en-IN');
      const formattedToPay = (Number(r.toPay) || 0).toLocaleString('en-IN');
      const formattedPaid = (Number(r.paid) || 0).toLocaleString('en-IN');
      const formattedBalance = (Number(r.balance) || 0).toLocaleString('en-IN');

      return `
        <tr>
          <td>${r.slNo || (index + 1)}</td>
          <td><strong>${r.lrNo || '-'}</strong></td>
          <td>${r.dcNo || '-'}</td>
          <td>${r.date || '-'}</td>
          <td><code>${r.vehicleNumber || '-'}</code></td>
          <td>${r.fromCity || '-'}</td>
          <td>${r.toCity || '-'}</td>
          <td>${r.quantity || '-'}</td>
          <td>${r.mTax || '-'}</td>
          <td>₹${formattedAmount}</td>
          <td><strong>₹${formattedToPay}</strong></td>
          <td style="color: var(--success);">₹${formattedPaid}</td>
          <td style="color: ${r.balance > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight: bold;">₹${formattedBalance}</td>
          <td><span class="badge ${badgeClass}">${r.status}</span></td>
          <td>
            ${r.note ? (
              r.note.toLowerCase().includes('shortage') 
                ? `<span style="background: #fee2e2; color: #b91c1c; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.8rem;">⚠️ ${r.note}</span>`
                : (r.note.toLowerCase().includes('halting') || r.note.toLowerCase().includes('cancel')
                    ? `<span style="background: #fef3c7; color: #b45309; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">⏱️ ${r.note}</span>`
                    : `<span style="color: var(--text-muted); font-size: 0.85rem;">${r.note}</span>`
                  )
            ) : '-'}
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="TransportModule.openEditModal('${r.id}')" title="Edit">✏️</button>
              ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="TransportModule.confirmDelete('${r.id}')" title="Delete">🗑️</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    document.getElementById('transportForm').reset();
    document.getElementById('transportId').value = '';
    document.getElementById('transportModalTitle').innerText = 'Add Transport Record';
    document.getElementById('transportDate').value = new Date().toISOString().split('T')[0];
    
    // Auto-calculate default SL NO
    const nextSlNo = (this.records.length > 0) 
      ? Math.max(...this.records.map(r => Number(r.slNo) || 0)) + 1 
      : 1;
    document.getElementById('transportSlNo').value = nextSlNo;
    
    document.getElementById('transportModal').classList.add('active');
  },

  openEditModal(id) {
    const record = this.records.find(r => r.id === id);
    if (!record) return;

    document.getElementById('transportId').value = record.id;
    document.getElementById('transportSlNo').value = record.slNo || '';
    document.getElementById('transportLrNo').value = record.lrNo || '';
    document.getElementById('transportDcNo').value = record.dcNo || '';
    document.getElementById('transportDate').value = record.date || '';
    document.getElementById('transportVehicle').value = record.vehicleNumber || '';
    document.getElementById('transportFrom').value = record.fromCity || '';
    document.getElementById('transportTo').value = record.toCity || '';
    document.getElementById('transportQuantity').value = record.quantity || '';
    document.getElementById('transportMTax').value = record.mTax || '';
    document.getElementById('transportAmount').value = record.amount || '';
    document.getElementById('transportToPay').value = record.toPay || '';
    document.getElementById('transportPaid').value = record.paid || 0;
    document.getElementById('transportBalance').value = record.balance || 0;
    document.getElementById('transportNote').value = record.note || '';

    document.getElementById('transportModalTitle').innerText = `Edit Record (LR: ${record.lrNo || id})`;
    document.getElementById('transportModal').classList.add('active');
  },

  closeModal() {
    document.getElementById('transportModal').classList.remove('active');
  },

  // Recalculates balance on input change
  onPaymentInputChange() {
    const toPay = Number(document.getElementById('transportToPay').value) || 0;
    const paidInput = document.getElementById('transportPaid');
    const balanceInput = document.getElementById('transportBalance');

    let paidVal = Number(paidInput.value) || 0;
    if (paidVal > toPay) {
      paidVal = toPay;
      paidInput.value = toPay;
    }

    const bal = toPay - paidVal;
    balanceInput.value = bal;
  },

  // Helper button: Quick Mark as Paid
  markFullyPaid() {
    const toPay = Number(document.getElementById('transportToPay').value) || 0;
    document.getElementById('transportPaid').value = toPay;
    document.getElementById('transportBalance').value = 0;
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const user = AuthService.getCurrentUser();
    const id = document.getElementById('transportId').value;
    const toPay = Number(document.getElementById('transportToPay').value) || 0;
    const paid = Number(document.getElementById('transportPaid').value) || 0;
    const balance = toPay - paid;

    let status = 'Pending';
    if (balance <= 0 && toPay > 0) status = 'Paid';
    else if (paid > 0 && balance > 0) status = 'Partially Paid';

    const record = {
      id: id || undefined,
      slNo: Number(document.getElementById('transportSlNo').value) || 1,
      lrNo: document.getElementById('transportLrNo').value.trim(),
      dcNo: document.getElementById('transportDcNo').value.trim(),
      date: document.getElementById('transportDate').value,
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
      createdBy: user ? user.role : 'User'
    };

    try {
      await ApiService.saveTransport(record);
      this.closeModal();
      window.App.showToast("Transport record saved successfully!", "success");
      await window.App.refreshData();
    } catch (err) {
      console.error(err);
      window.App.showToast("Error saving record.", "error");
    }
  },

  async confirmDelete(id) {
    if (!confirm("Are you sure you want to delete this transport record?")) return;
    try {
      await ApiService.deleteTransport(id);
      window.App.showToast("Record deleted.", "info");
      await window.App.refreshData();
    } catch (err) {
      console.error(err);
      window.App.showToast("Error deleting record.", "error");
    }
  }
};

