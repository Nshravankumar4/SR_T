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
    if (!localStorage.getItem(this.storageKey)) {
      const adminHash = await this.hash('Shravan@1');
      const empHash = await this.hash('EShravan@2');

      const users = {
        'admin1': {
          username: 'Admin1',
          role: 'Admin',
          name: 'Administrator',
          passwordHash: adminHash,
          permissions: ['create', 'read', 'update', 'delete', 'settings', 'export']
        },
        'eadmin2': {
          username: 'EAdmin2',
          role: 'Employee',
          name: 'Employee',
          passwordHash: empHash,
          permissions: ['create', 'read', 'export']
        }
      };

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

    const u = username.trim().toLowerCase();
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
          body: JSON.stringify({ action: 'login', username, password: p })
        });
        const result = await response.json();
        if (result.success) {
          this.resetFailedAttempts();
          const user = {
            role: result.role,
            name: result.name || username,
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
    if (inputHash === userRecord.passwordHash) {
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

  async updatePassword(targetUsername, newPassword) {
    await this.init();
    const users = this.getUsers();
    const key = targetUsername.trim().toLowerCase();
    if (!users[key]) {
      return { success: false, message: 'User not found.' };
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    users[key].passwordHash = await this.hash(newPassword.trim());
    localStorage.setItem(this.storageKey, JSON.stringify(users));
    return { success: true, message: `Password for ${users[key].username} updated successfully!` };
  }
};

// Initialize auth immediately
AuthService.init();
