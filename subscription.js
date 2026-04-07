/**
 * KIDV Invoice — Subscription & Access Control
 * Include AFTER firebase-config.js on every page
 */

window.SUB = {
  TRIAL_DAYS: 14,
  plan: null, // 'trial' | 'active' | 'expired' | 'suspended'
  daysLeft: 0,

  async check() {
    if (!KIDV._ready || !KIDV._uid) return;
    const page = location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['login.html', 'subscribe.html', 'expired.html', 'suspended.html'];
    if (publicPages.some(p => page.includes(p))) return;

    try {
      const db = KIDV._db;
      const uid = KIDV._uid;
      const userDoc = await db.collection('users').doc(uid).get();
      const data = userDoc.exists ? userDoc.data() : {};

      const now = new Date();

      // Admin = always full access
      if (KIDV.isAdmin) {
        this.plan = 'admin';
        this._showBadge('admin');
        return;
      }

      // 1. Check if suspended
      if (data.subscriptionStatus === 'suspended') {
        this.plan = 'suspended';
        this._redirectSuspended();
        return;
      }

      // 2. Check subscription status
      if (data.subscriptionStatus === 'active') {
        const expiry = data.subscriptionExpiry ? new Date(data.subscriptionExpiry) : null;
        if (!expiry || expiry > now) {
          this.plan = 'active';
          this._showBadge('active', expiry);
          return;
        }
      }

      // Check trial
      const registeredAt = data.createdAt ? new Date(data.createdAt) : now;
      const trialEnd = new Date(registeredAt.getTime() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const msLeft = trialEnd - now;
      this.daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

      if (this.daysLeft > 0) {
        // Still in trial — allow access
        this.plan = 'trial';
        this._showBadge('trial', trialEnd);
        return;
      }

      // Trial expired
      this.plan = 'expired';
      this._redirectExpired();

    } catch (e) {
      console.warn('[SUB] Check error:', e);
    }
  },

  _showBadge(type, expiry) {
    const existing = document.getElementById('subBadge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'subBadge';

    if (type === 'admin') {
      badge.innerHTML = `<span class="material-icons-round" style="font-size:14px">admin_panel_settings</span> Admin`;
      badge.style.cssText = `position:fixed;bottom:16px;left:80px;background:#7c3aed;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;display:flex;align-items:center;gap:5px;z-index:9999;font-family:Outfit,sans-serif;box-shadow:0 4px 12px rgba(124,58,237,0.35)`;
    } else if (type === 'active') {
      badge.innerHTML = `<span class="material-icons-round" style="font-size:14px">verified</span> Active`;
      badge.style.cssText = `position:fixed;bottom:16px;left:80px;background:#16a34a;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;display:flex;align-items:center;gap:5px;z-index:9999;font-family:Outfit,sans-serif;box-shadow:0 4px 12px rgba(22,163,74,0.35)`;
    } else if (type === 'trial') {
      badge.innerHTML = `<span class="material-icons-round" style="font-size:14px">hourglass_top</span> Trial: ${this.daysLeft} days left`;
      badge.style.cssText = `position:fixed;bottom:16px;left:80px;background:#d97706;color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;display:flex;align-items:center;gap:5px;z-index:9999;font-family:Outfit,sans-serif;box-shadow:0 4px 12px rgba(217,119,6,0.35);cursor:pointer`;
      badge.onclick = () => location.href = 'subscribe.html';
    }

    document.body.appendChild(badge);
  },

  _showTrialWarning() {
    if (localStorage.getItem('kidv-trial-warning-shown-today') === new Date().toDateString()) return;
    localStorage.setItem('kidv-trial-warning-shown-today', new Date().toDateString());

    const banner = document.createElement('div');
    banner.style.cssText = `position:fixed;top:0;left:0;right:0;background:linear-gradient(135deg,#d97706,#ea580c);color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;z-index:10000;font-family:Outfit,sans-serif;font-size:13px;font-weight:500`;
    banner.innerHTML = `
      <span><span style="font-weight:700">⚠️ Trial expires in ${this.daysLeft} day${this.daysLeft===1?'':'s'}!</span> Upgrade now to keep your data.</span>
      <div style="display:flex;gap:10px;align-items:center">
        <button onclick="location.href='subscribe.html'" style="background:#fff;color:#d97706;border:none;border-radius:6px;padding:5px 14px;font-weight:700;cursor:pointer;font-size:12px">Upgrade Now</button>
        <button onclick="this.closest('div').parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1">×</button>
      </div>`;
    document.body.prepend(banner);
  },

  _redirectExpired() {
    const page = location.pathname.split('/').pop() || '';
    const safe = ['expired.html','subscribe.html','login.html','suspended.html'];
    if (!safe.some(p => page.includes(p))) {
      location.href = 'expired.html';
    }
  },

  _redirectSuspended() {
    const page = location.pathname.split('/').pop() || '';
    const safe = ['suspended.html','login.html'];
    if (!safe.some(p => page.includes(p))) {
      location.href = 'suspended.html';
    }
  }
};

// Run check after Firebase auth is ready
document.addEventListener('kidv:db-ready', () => {
  if (KIDV._ready) setTimeout(() => SUB.check(), 100);
});
