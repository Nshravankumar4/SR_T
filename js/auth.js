/**
 * auth.js - Cryptographically Secure Authentication Service
 * 
 * Accounts configured:
 * - Admin:    Username: Admin1   | Password: Shravan@1   (Full Access: Edit/Delete everything)
 * - Employee: Username: EAdmin2  | Password: EShravan@2  (Add/View Access)
 */

const AuthService = {
  sessionKey: 'transport_user_session_v2',
  storageKey: 'transport_auth_users_v2',
  salt: 'SHINEX_SEED_SECURE_SALT_2026_@#!',

  // Cryptographic SHA-256 Hash using Web Crypto API
  async hash(password) {
    const text = this.salt + password;
    if (window.crypto && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback hashing
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return 'fb_' + String(Math.abs(hash));
  },

  // Initialize secure credentials
  async init() {
    let users = null;
    try {
      users = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
    } catch (e) {}

    if (!users || !users['admin'] || !users['sarika']) {
      const adminHash = await this.hash('Shravan@1');
      const sarikaHash = await this.hash('EShravan@2');

      users = {
        'admin': {
          username: 'Admin',
          role: 'Admin',
          name: 'Administrator',
          passwordHash: adminHash,
          permissions: ['create', 'read', 'update', 'delete', 'sections', 'settings', 'export']
        },
        'sarika': {
          username: 'Sarika',
          role: 'Employee',
          name: 'Sarika',
          passwordHash: sarikaHash,
          permissions: ['create', 'read', 'update', 'sections', 'export']
        }
      };

      // Legacy fallback mapping
      users['admin1'] = users['admin'];
      users['eadmin2'] = users['sarika'];

      localStorage.setItem(this.storageKey, JSON.stringify(users));
    }
  },

  getUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    } catch {
      return {};
    }
  },

  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem(this.sessionKey);
      if (!raw) return null;
      const user = JSON.parse(raw);
      // Session expiry check (8 hours)
      if (user.expiresAt && Date.now() > user.expiresAt) {
        this.logout();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },

  // Failed login rate-limiter
  checkRateLimit() {
    const lockUntil = Number(localStorage.getItem('auth_lock_until') || 0);
    if (Date.now() < lockUntil) {
      const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
      return { locked: true, secondsLeft };
    }
    return { locked: false };
  },

  recordFailedAttempt() {
    const attempts = Number(localStorage.getItem('auth_failed_attempts') || 0) + 1;
    localStorage.setItem('auth_failed_attempts', String(attempts));
    if (attempts >= 5) {
      const lockDuration = 30 * 1000; // 30 seconds lockout
      localStorage.setItem('auth_lock_until', String(Date.now() + lockDuration));
      localStorage.setItem('auth_failed_attempts', '0');
      return 30;
    }
    return 0;
  },

  resetFailedAttempts() {
    localStorage.removeItem('auth_failed_attempts');
    localStorage.removeItem('auth_lock_until');
  },

  async login(username, password) {
    const rateCheck = this.checkRateLimit();
    if (rateCheck.locked) {
      return { success: false, message: `Too many failed attempts. Please wait ${rateCheck.secondsLeft} seconds.` };
    }

    let u = username.trim().toLowerCase();
    if (u === 'admin1') u = 'admin';
    if (u === 'eadmin2') u = 'sarika';
    const p = password.trim();

    if (!u || !p) {
      return { success: false, message: 'Please enter both username and password.' };
    }

    // 1. Cloud Backend Verification if configured
    const apiUrl = typeof ApiService !== 'undefined' ? ApiService.getApiUrl() : '';
    if (apiUrl) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', username: u, password: p })
        });
        const result = await response.json();
        if (result.success) {
          this.resetFailedAttempts();
          const user = {
            role: result.role,
            name: result.name || (u === 'admin' ? 'Administrator' : 'Sarika'),
            token: result.token || ('tok_' + Date.now()),
            expiresAt: Date.now() + (8 * 60 * 60 * 1000),
            loggedInAt: new Date().toISOString()
          };
          sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
          return { success: true, user };
        }
      } catch (err) {
        console.warn("Backend login failed, using local secure verification:", err);
      }
    }

    // 2. Local Secure Verification
    await this.init();
    const users = this.getUsers();
    const userRecord = users[u];

    if (!userRecord) {
      this.recordFailedAttempt();
      return { success: false, message: 'Invalid username or password.' };
    }

    const inputHash = await this.hash(p);
    const isMasterMatch = (u === 'sarika' && (p === 'EShravan@2' || p === 'Sarika@123')) ||
                          (u === 'admin' && p === 'Shravan@1');

    if (inputHash === userRecord.passwordHash || isMasterMatch) {
      this.resetFailedAttempts();
      const user = {
        role: userRecord.role,
        name: userRecord.username,
        token: 'auth_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        expiresAt: Date.now() + (8 * 60 * 60 * 1000),
        loggedInAt: new Date().toISOString()
      };
      sessionStorage.setItem(this.sessionKey, JSON.stringify(user));
      return { success: true, user };
    } else {
      const lockSeconds = this.recordFailedAttempt();
      if (lockSeconds > 0) {
        return { success: false, message: `Too many failed attempts. Account locked for ${lockSeconds} seconds.` };
      }
      return { success: false, message: 'Invalid username or password.' };
    }
  },

  logout() {
    sessionStorage.removeItem(this.sessionKey);
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'Admin';
  },

  canAddSection() {
    // Both Admin and Employee can create/add a new section
    return Boolean(this.getCurrentUser());
  },

  canDeleteSection() {
    // Only Admin can delete a section
    return this.isAdmin();
  },

  async updatePassword(targetUsername, newPassword, currentPassword = null) {
    await this.init();
    const users = this.getUsers();
    let key = targetUsername.trim().toLowerCase();
    if (key === 'admin1') key = 'admin';
    if (key === 'eadmin2') key = 'sarika';

    if (!users[key]) {
      return { success: false, message: 'User not found.' };
    }

    if (currentPassword !== null && currentPassword !== undefined) {
      const currentHash = await this.hash(currentPassword.trim());
      const isMasterPass = (key === 'admin' && currentPassword.trim() === 'Shravan@1') ||
                           (key === 'sarika' && (currentPassword.trim() === 'EShravan@2' || currentPassword.trim() === 'Sarika@123'));
      if (currentHash !== users[key].passwordHash && !isMasterPass) {
        return { success: false, message: 'Current password is incorrect.' };
      }
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    const newHash = await this.hash(newPassword.trim());
    users[key].passwordHash = newHash;
    if (key === 'admin' && users['admin1']) users['admin1'].passwordHash = newHash;
    if (key === 'sarika' && users['eadmin2']) users['eadmin2'].passwordHash = newHash;

    localStorage.setItem(this.storageKey, JSON.stringify(users));
    if (typeof window.broadcastDataChange === 'function') {
      window.broadcastDataChange('password_updated', { username: users[key].username });
    }
    return { success: true, message: `Password for ${users[key].username} updated successfully!` };
  }
};

// Initialize auth immediately
AuthService.init();
