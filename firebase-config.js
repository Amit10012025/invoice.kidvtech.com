/**
 * KIDV Invoice — Firebase Config & Core JS v3
 * Smart caching: instant load from localStorage, background Firestore refresh
 */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDFx2hxhTo2HJKbNK-FUgBiMgvHDzCVmoE",
  authDomain:        "kidv-tech-project.firebaseapp.com",
  projectId:         "kidv-tech-project",
  storageBucket:     "kidv-tech-project.firebasestorage.app",
  messagingSenderId: "168663801953",
  appId:             "1:168663801953:web:af953338df12480b4fca20"
};

if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

const _fbAuth = firebase.auth();
const _fbDb   = firebase.firestore();

// ── Cache helpers ─────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function _cacheKey(uid, col) { return `kidv_cache_${uid}_${col}`; }

function _getCache(uid, col) {
  try {
    const raw = localStorage.getItem(_cacheKey(uid, col));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null; // expired
    return data;
  } catch(e) { return null; }
}

function _setCache(uid, col, data) {
  try {
    localStorage.setItem(_cacheKey(uid, col), JSON.stringify({ data, ts: Date.now() }));
  } catch(e) {}
}

function _clearCache(uid, col) {
  try { localStorage.removeItem(_cacheKey(uid, col)); } catch(e) {}
}

// ── KIDV Global Object ────────────────────────────────────────
window.KIDV = {
  _auth:   _fbAuth,
  _db:     _fbDb,
  _user:   null,
  _uid:    null,
  _ready:  false,
  isAdmin: false,
  adminEmails: ['amit@kidvtech.com'],

  currentUser() { return this._user; },

  async logout() {
    try { await _fbAuth.signOut(); } catch(e) {}
    // Clear all caches on logout
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('kidv')) localStorage.removeItem(k);
    });
    location.href = '/login/';
  },

  async getToken() {
    if (!this._user) return null;
    try { return await this._user.getIdToken(true); } catch(e) { return null; }
  },

  // ── list() — instant from cache, refresh in background ──────
  async list(col, { forceRefresh = false } = {}) {
    if (!this._uid) return [];

    // 1. Return cached data instantly if available
    if (!forceRefresh) {
      const cached = _getCache(this._uid, col);
      if (cached) {
        // Trigger background refresh without waiting
        this._refreshInBackground(col);
        return cached;
      }
    }

    // 2. Fetch from Firestore
    return this._fetchFromFirestore(col);
  },

  async _fetchFromFirestore(col) {
    try {
      let snap;
      try {
        snap = await _fbDb.collection('users').doc(this._uid)
          .collection(col).orderBy('createdAt', 'desc').get();
      } catch(e) {
        snap = await _fbDb.collection('users').doc(this._uid)
          .collection(col).get();
      }
      const data = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      _setCache(this._uid, col, data);
      console.log(`[KIDV] list(${col}): ${data.length} docs (fresh)`);
      return data;
    } catch(e) {
      console.error(`[KIDV] list(${col}) error:`, e.code, e.message);
      if (e.code === 'permission-denied') _showPermissionError();
      // Return stale cache if available
      const stale = _getCache(this._uid, col);
      return stale || [];
    }
  },

  // Background refresh - updates cache silently, then re-renders if page has handler
  _bgRefreshTimers: {},
  _refreshInBackground(col) {
    if (this._bgRefreshTimers[col]) return; // already pending
    this._bgRefreshTimers[col] = setTimeout(async () => {
      delete this._bgRefreshTimers[col];
      const fresh = await this._fetchFromFirestore(col);
      // Dispatch event so pages can update their UI
      document.dispatchEvent(new CustomEvent('kidv:data-refreshed', { detail: { col, data: fresh } }));
    }, 500);
  },

  async add(col, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await _fbDb.collection('users').doc(this._uid).collection(col).add(doc);
    _clearCache(this._uid, col); // Invalidate cache
    return { _id: ref.id, ...doc };
  },

  async set(col, id, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = { ...data, updatedAt: new Date().toISOString() };
    await _fbDb.collection('users').doc(this._uid).collection(col).doc(id).set(doc, { merge: true });
    _clearCache(this._uid, col); // Invalidate cache
    return { _id: id, ...doc };
  },

  async delete(col, id) {
    if (!this._uid) throw new Error('Not logged in');
    await _fbDb.collection('users').doc(this._uid).collection(col).doc(id).delete();
    _clearCache(this._uid, col); // Invalidate cache
    return { deleted: true };
  },

  // ── Settings ─────────────────────────────────────────────────
  async getSettings(key) {
    const cached = localStorage.getItem('kidv-' + key);
    if (cached) { try { return JSON.parse(cached); } catch(e) {} }
    if (!this._uid) return {};
    try {
      // Primary: settings subcollection (reliable, separate from auth doc)
      const doc = await _fbDb.collection('users').doc(this._uid)
        .collection('settings').doc(key).get();
      if (doc.exists) {
        const d = doc.data() || {};
        if (Object.keys(d).length) localStorage.setItem('kidv-' + key, JSON.stringify(d));
        return d;
      }
      // Fallback: top-level user doc fields (backward compat)
      const userDoc = await _fbDb.collection('users').doc(this._uid).get();
      const d = userDoc.exists ? (userDoc.data()[key] || {}) : {};
      if (Object.keys(d).length) {
        localStorage.setItem('kidv-' + key, JSON.stringify(d));
        // Migrate to subcollection
        _fbDb.collection('users').doc(this._uid).collection('settings').doc(key)
          .set({ ...d, updatedAt: new Date().toISOString() }, { merge: true }).catch(()=>{});
      }
      return d;
    } catch(e) { console.error('[KIDV] getSettings error:', e); return {}; }
  },

  async saveSettings(key, data) {
    localStorage.setItem('kidv-' + key, JSON.stringify(data));
    if (!this._uid) return;
    try {
      await _fbDb.collection('users').doc(this._uid)
        .collection('settings').doc(key)
        .set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch(e) { console.error('[KIDV] saveSettings error:', e); }
  },

  async nextInvoiceNo() {
    try {
      const s    = await this.getSettings('company');
      const prefix = s.invoice_prefix || 'INV-';
      const invs = await this.list('invoices');
      const maxNo = invs.reduce((mx, inv) => {
        const n = parseInt((inv.invoiceNo || '').replace(/\D/g, '')) || 0;
        return n > mx ? n : mx;
      }, 0);
      return prefix + String(maxNo + 1).padStart(3, '0');
    } catch(e) { return 'INV-001'; }
  },

  shareWhatsApp(invoice, phone = '') {
    const comp = JSON.parse(localStorage.getItem('kidv-company') || '{}');
    const amt  = parseFloat(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const msg  = `*Invoice: ${invoice.invoiceNo || invoice.invoice_no}*\nClient: ${invoice.clientName || invoice.client_name}\nAmount: \u20b9${amt}\nDate: ${invoice.date || '\u2014'}\nStatus: ${invoice.status || 'Pending'}\n\n_${comp.name || 'KIDV Invoice'} \u00b7 ${comp.phone || ''}_`;
    const url  = phone
      ? `https://wa.me/91${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  async adminListAll(col) {
    if (!this.isAdmin) return [];
    try {
      const snap = await _fbDb.collection('users').get();
      let results = [];
      for (const userDoc of snap.docs) {
        try {
          const colSnap = await _fbDb.collection('users').doc(userDoc.id).collection(col).get();
          colSnap.docs.forEach(d => results.push({ _uid: userDoc.id, _id: d.id, ...d.data() }));
        } catch(e) {}
      }
      return results;
    } catch(e) { return []; }
  },
};

window.DB = window.KIDV;

// ── Page Transition ───────────────────────────────────────────
(function() {
  const style = document.createElement('style');
  style.textContent = `
    body { animation: _kidvFadeIn 0.18s ease-out; }
    @keyframes _kidvFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    a[href$=".html"], .rail-item { transition: opacity 0.12s; }
  `;
  document.head.appendChild(style);

  // Smooth navigation - fade out before navigating
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto') || href.startsWith('tel')) return;
    e.preventDefault();
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(-3px)';
    document.body.style.transition = 'opacity 0.12s, transform 0.12s';
    setTimeout(() => { location.href = href; }, 120);
  });
})();

// ── Auth State Listener ───────────────────────────────────────
_fbAuth.onAuthStateChanged(async (user) => {
  const page     = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isPublic = ['login.html','subscribe.html','expired.html','suspended.html']
    .some(p => page.includes(p));

  if (!user) {
    window.KIDV._ready = false;
    window.KIDV._uid   = null;
    window.KIDV._user  = null;
    _updateStatusBadge(false);
    if (!isPublic) { location.href = '/login/'; return; }
    document.dispatchEvent(new Event('kidv:db-ready'));
    return;
  }

  window.KIDV._user   = user;
  window.KIDV._uid    = user.uid;
  window.KIDV._ready  = true;
  window.KIDV.isAdmin = window.KIDV.adminEmails.includes((user.email || '').toLowerCase());

  console.log('[KIDV] ✅ Auth:', user.email, window.KIDV.isAdmin ? '| ADMIN' : '');

  // Update lastLogin (non-blocking)
  _fbDb.collection('users').doc(user.uid).set({
    email:     user.email || '',
    name:      user.displayName || localStorage.getItem('kidv-userName') || '',
    isAdmin:   window.KIDV.isAdmin,
    lastLogin: new Date().toISOString(),
  }, { merge: true }).catch(() => {});

  _updateNavUser(user);
  _updateStatusBadge(true);
  document.dispatchEvent(new Event('kidv:db-ready'));
});

function _updateNavUser(user) {
  const name    = user.displayName || localStorage.getItem('kidv-userName') || user.email || 'U';
  const initial = name.charAt(0).toUpperCase();
  const onLogout = (e) => {
    e.stopPropagation();
    if (confirm('Logout karvanu che?\n\n' + (user.email || name))) window.KIDV.logout();
  };

  document.querySelectorAll('.avatar').forEach(el => {
    el.textContent = initial;
    el.title = name + ' — Logout';
    el.style.cursor = 'pointer';
    el.onclick = onLogout;
  });

  const avatarBtn = document.getElementById('avatarBtn');
  if (avatarBtn) {
    avatarBtn.innerHTML = initial + '<div class="rail-tooltip">Profile / Logout</div>';
    avatarBtn.onclick = onLogout;
  }

  const avatarTop = document.getElementById('avatarTop');
  if (avatarTop) {
    avatarTop.textContent = initial;
    avatarTop.title = name + ' — Logout';
    avatarTop.style.cursor = 'pointer';
    avatarTop.onclick = onLogout;
  }

  if (window.KIDV.isAdmin) {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) adminBtn.style.display = '';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }

  if (name && name !== 'U') localStorage.setItem('kidv-userName', name);
}

function _updateStatusBadge(ok) {
  const badge = document.getElementById('fbBadge');
  if (!badge) return;
  badge.className = ok ? 'firebase-badge connected' : 'firebase-badge';
  badge.innerHTML = ok
    ? '<div class="dot"></div> Firebase: Connected'
    : '<div class="dot"></div> Firebase: Offline';
}

function _showPermissionError() {
  if (document.getElementById('_kidvPermErr')) return;
  const b = document.createElement('div');
  b.id = '_kidvPermErr';
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:10px 20px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;z-index:99999;text-align:center;';
  b.innerHTML = '⚠️ Firestore Permission Denied — Firebase Console → Firestore → Rules tab ma rules update karo. <button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;padding:2px 10px;border-radius:4px;cursor:pointer">✕</button>';
  document.body.prepend(b);
}
