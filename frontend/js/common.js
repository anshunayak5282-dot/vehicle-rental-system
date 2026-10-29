/**
 * COMMON UI UTILITIES & DEMO ROLE BAR INJECTOR
 */

// Show animated Toast Notification
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.1rem;">
      ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
    </span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Handlers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Format Currency in Indian Rupees (INR)
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: num % 1 === 0 ? 0 : 2
  }).format(num);
}

// Inject Floating/Sticky Demo Role Switcher Bar on every page
function injectDemoRoleBanner() {
  const currentPath = window.location.pathname.replace(/\\/g, '/');
  if (currentPath.endsWith('/login.html') || currentPath.endsWith('/register.html')) {
    document.documentElement.style.setProperty('--demo-banner-height', '0px');
    return;
  }

  if (document.querySelector('.demo-role-banner')) return;

  const isMinimized = localStorage.getItem('apex_demo_banner_minimized') === 'true';
  const user = auth.getUser() || { name: 'Visitor', role: 'customer' };

  if (isMinimized) {
    document.documentElement.style.setProperty('--demo-banner-height', '0px');
  } else {
    document.documentElement.style.setProperty('--demo-banner-height', '48px');
  }

  const banner = document.createElement('div');
  banner.id = 'demoRoleBanner';
  banner.className = `demo-role-banner ${isMinimized ? 'minimized' : ''}`;
  banner.innerHTML = `
    <div class="banner-left">
      <span class="badge-pill">4-ROLE SYSTEM</span>
      <span class="badge-pill" id="dbStatusPill" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.75rem;">🍃 MongoDB Engine</span>
      <span>Current Role: <strong style="color: var(--accent-gold); text-transform: capitalize;">${user.role || 'Visitor'}</strong> (${user.full_name || user.name})</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <label for="demoRoleSelect" style="font-size: 0.8rem; color: #94a3b8; margin: 0;">Switch Role:</label>
      <select id="demoRoleSelect" class="role-select">
        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>1. System Admin</option>
        <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>2. Customer</option>
        <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>3. Rental Manager</option>
        <option value="driver" ${user.role === 'driver' ? 'selected' : ''}>4. Driver / Chauffeur</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="handleRoleSwitch()">Switch</button>
      <button class="btn btn-secondary btn-sm" onclick="auth.logout()">Logout</button>
      <button class="btn btn-secondary btn-sm" onclick="toggleDemoBanner(true)" title="Minimize top testing bar" style="padding: 4px 8px; font-size: 0.75rem;">✕ Hide</button>
    </div>
  `;

  document.body.prepend(banner);

  // Probe live database status
  if (typeof api !== 'undefined' && api.system && typeof api.system.getDatabaseStatus === 'function') {
    api.system.getDatabaseStatus().then(st => {
      const pill = document.getElementById('dbStatusPill');
      if (!pill) return;
      if (st && st.mongodb && st.mongodb.connected) {
        pill.innerHTML = '🍃 MongoDB: Online';
        pill.style.background = 'rgba(16, 185, 129, 0.2)';
        pill.style.color = '#34d399';
        pill.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        pill.innerHTML = '⚠️ MongoDB: Offline';
        pill.style.background = 'rgba(239, 68, 68, 0.2)';
        pill.style.color = '#f87171';
        pill.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }
    }).catch(() => {
      const pill = document.getElementById('dbStatusPill');
      if (pill) {
        pill.innerHTML = '⚡ Server: Offline';
        pill.style.background = 'rgba(245, 158, 11, 0.2)';
        pill.style.color = '#fbbf24';
        pill.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      }
    });
  }

  // Floating pill if minimized
  let floatingBadge = document.getElementById('demoFloatingBadge');
  if (!floatingBadge) {
    floatingBadge = document.createElement('div');
    floatingBadge.id = 'demoFloatingBadge';
    floatingBadge.className = 'demo-floating-badge';
    floatingBadge.style.display = isMinimized ? 'flex' : 'none';
    floatingBadge.innerHTML = `
      <span>⚡</span>
      <span>Role: <strong style="color: var(--accent-gold); text-transform: capitalize;">${user.role || 'Customer'}</strong></span>
      <span style="font-size: 0.75rem; color: var(--accent-gold); margin-left: 4px;">▲ Switch</span>
    `;
    floatingBadge.onclick = () => toggleDemoBanner(false);
    document.body.appendChild(floatingBadge);
  }
}

function toggleDemoBanner(minimize) {
  const banner = document.getElementById('demoRoleBanner');
  const floating = document.getElementById('demoFloatingBadge');

  if (minimize) {
    if (banner) banner.classList.add('minimized');
    if (floating) floating.style.display = 'flex';
    document.documentElement.style.setProperty('--demo-banner-height', '0px');
    localStorage.setItem('apex_demo_banner_minimized', 'true');
  } else {
    if (banner) banner.classList.remove('minimized');
    if (floating) floating.style.display = 'none';
    document.documentElement.style.setProperty('--demo-banner-height', '48px');
    localStorage.setItem('apex_demo_banner_minimized', 'false');
  }
}

function handleRoleSwitch() {
  const select = document.getElementById('demoRoleSelect');
  if (select) {
    const role = select.value;
    auth.switchDemoRole(role);
  }
}

// Auto-run banner and profile sync on DOM load
document.addEventListener('DOMContentLoaded', () => {
  injectDemoRoleBanner();

  // Populate user names and avatars in dashboard elements if they exist
  const user = auth.getUser();
  if (user) {
    document.querySelectorAll('.js-user-name').forEach(el => el.textContent = user.full_name || user.name);
    document.querySelectorAll('.js-user-role').forEach(el => el.textContent = user.role);
    document.querySelectorAll('.js-user-email').forEach(el => el.textContent = user.email);
    if (user.avatar_url) {
      document.querySelectorAll('.js-user-avatar').forEach(img => img.src = user.avatar_url);
    }
  }

  // Bind close buttons in modals
  document.querySelectorAll('.modal-close, .js-modal-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });
});
