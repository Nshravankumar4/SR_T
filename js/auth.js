/**
 * auth.js - Role-based authentication (Admin vs Employee)
 */

const AuthService = {
  sessionKey: 'transport_user_session',

  // Configurable credentials (stored in localStorage, default PINs provided)
  getCredentials() {
    return {
      adminPin: localStorage.getItem('transport_admin_pin') || '7890',
      employeePin: localStorage.getItem('transport_employee_pin') || '1234'
    };
  },

  getCurrentUser() {
    const raw = sessionStorage.getItem(this.sessionKey);
    return raw ? JSON.parse(raw) : null;
  },

  async login(role, pin) {
    const trimmedPin = pin.trim();
    const apiUrl = ApiService.getApiUrl();

    // 1. If Cloud Backend is configured, verify with Google Apps Script
    if (apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', role, pin: trimmedPin })
        });
        const result = await response.json();
        if (result.success) {
          const user = { role: result.role, name: result.name, token: result.token, loggedInAt: new Date().toISOString() };
          sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
          return { success: true, user };
        } else {
          return { success: false, message: result.message || 'Authentication failed' };
        }
      } catch (err) {
        console.warn("Backend auth unavailable, falling back to local verification:", err);
      }
    }

    // 2. Local Fallback when running completely offline
    const creds = this.getCredentials();
    if (role === 'Admin') {
      if (trimmedPin === creds.adminPin) {
        const user = { role: 'Admin', name: 'Administrator', loggedInAt: new Date().toISOString() };
        sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: 'Invalid Admin PIN' };
    } else {
      if (trimmedPin === creds.employeePin) {
        const user = { role: 'Employee', name: 'Employee', loggedInAt: new Date().toISOString() };
        sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: 'Invalid Employee PIN' };
    }
  },

  logout() {
    sessionStorage.removeItem(this.sessionKey);
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'Admin';
  },

  updatePins(newAdminPin, newEmployeePin) {
    if (newAdminPin && newAdminPin.trim()) {
      localStorage.setItem('transport_admin_pin', newAdminPin.trim());
    }
    if (newEmployeePin && newEmployeePin.trim()) {
      localStorage.setItem('transport_employee_pin', newEmployeePin.trim());
    }
  }
};

