/**
 * AUTHENTICATION & ROLE MANAGEMENT MODULE
 * Handles user sessions, route guards, and 1-click demo role switching
 */

const ROLE_DASHBOARDS = {
  admin: 'pages/admin/dashboard.html',
  customer: 'pages/customer/dashboard.html',
  manager: 'pages/manager/dashboard.html',
  driver: 'pages/driver/dashboard.html'
};

// Demo user presets for 1-click role testing (4 Core Roles)
const DEMO_USERS = {
  admin: { id: 1, name: 'Alexander Vance', full_name: 'Alexander Vance', email: 'admin@apexrentals.com', role: 'admin', phone: '+91 98201 00001', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  customer: { id: 'customer_demo', name: 'Demo Customer', full_name: 'Demo Customer', email: 'customer.demo@apexrentals.com', role: 'customer', phone: '+91 98201 10102', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', license_number: 'MH-02-20260012345', verification_status: 'verified' },
  manager: { id: 2, name: 'Eleanor Cross', full_name: 'Eleanor Cross', email: 'manager@apexrentals.com', role: 'manager', phone: '+91 98111 00004', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150' },
  driver: { id: 3, name: 'David Rodriguez', full_name: 'David Rodriguez', email: 'driver@apexrentals.com', role: 'driver', phone: '+91 98450 00005', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', rating: 4.95, total_trips: 148 }
};

const auth = {
  getToken() {
    return localStorage.getItem('apex_token');
  },

  getUser() {
    const raw = localStorage.getItem('apex_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  setSession(token, user) {
    localStorage.setItem('apex_token', token);
    localStorage.setItem('apex_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_user');
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    let redirect = 'index.html';
    if (currentPath.includes('/pages/admin/') || currentPath.includes('/pages/customer/') ||
        currentPath.includes('/pages/manager/') || currentPath.includes('/pages/driver/')) {
      redirect = '../../index.html';
    } else if (currentPath.includes('/pages/')) {
      redirect = '../index.html';
    }
    window.location.href = redirect;
  },

  // 1-Click Role Switcher for instant testing of 4 core roles
  switchDemoRole(roleName) {
    const target = roleName.toLowerCase();
    const demoUser = DEMO_USERS[target];
    if (!demoUser) return;

    this.setSession(`demo_jwt_${target}_session`, demoUser);
    
    // Resolve relative path to target dashboard
    const targetPath = ROLE_DASHBOARDS[target];
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    
    // Determine relative directory jump
    let prefix = '';
    if (currentPath.includes('/pages/admin/') || currentPath.includes('/pages/customer/') ||
        currentPath.includes('/pages/manager/') || currentPath.includes('/pages/driver/')) {
      prefix = '../../';
    } else if (currentPath.includes('/pages/')) {
      prefix = '../';
    } else {
      prefix = './';
    }

    window.location.href = `${prefix}${targetPath}`;
  },

  checkProfileCompleteness(user) {
    if (!user) return { percentage: 0, isComplete: false, missing: ['User Profile'] };
    const missing = [];
    const name = (user.full_name || user.name || (user.profile && (user.profile.full_name || user.profile.name)) || '').trim();
    if (!name) missing.push('Full Name');

    const phone = (user.phone || '').trim();
    if (!phone) missing.push('Contact Phone');

    const license = (user.license_number || (user.profile && user.profile.license_number) || '').trim();
    if (!license) missing.push('Driving License Number');

    const city = (user.city || (user.profile && user.profile.city) || '').trim();
    if (!city) missing.push('City');

    const zip = (user.postal_code || user.zip || (user.profile && user.profile.postal_code) || '').trim();
    if (!zip) missing.push('Postal Code / PIN');

    const address = (user.address || (user.profile && user.profile.address) || '').trim();
    if (!address) missing.push('Street Address');

    const avatar = (user.avatar_url || (user.profile && user.profile.avatar_url) || '').trim();
    if (!avatar) missing.push('Profile Photo');

    const totalFields = 7;
    const completedFields = totalFields - missing.length;
    const percentage = Math.round((completedFields / totalFields) * 100);

    return {
      percentage,
      isComplete: missing.length === 0,
      missing
    };
  },

  // Route guard
  guard(allowedRoles = []) {
    const user = this.getUser();
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    let loginPrefix = '';
    if (currentPath.includes('/pages/admin/') || currentPath.includes('/pages/customer/') ||
        currentPath.includes('/pages/manager/') || currentPath.includes('/pages/driver/')) {
      loginPrefix = '../../';
    } else if (currentPath.includes('/pages/')) {
      loginPrefix = '../';
    }

    if (!user) {
      window.location.href = `${loginPrefix}login.html`;
      return false;
    }

    if (allowedRoles.length > 0 && user.role !== 'admin' && !allowedRoles.includes(user.role)) {
      if (typeof showToast === 'function') {
        showToast(`Redirecting to portal for your active role: [${user.role}]`, 'info');
      }
      const targetPath = ROLE_DASHBOARDS[user.role] || 'pages/customer/dashboard.html';
      setTimeout(() => {
        window.location.href = `${loginPrefix}${targetPath}`;
      }, 300);
      return false;
    }

    return true;
  }
};
