/**
 * KIDV Invoice — Firebase Config & Core JS v2
 * Include on EVERY page after Firebase SDK scripts.
 */

// ── Firebase Init ─────────────────────────────────────────────
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

  // ── Logout ────────────────────────────────────────────────
  async logout() {
    try {
      await _fbAuth.signOut();
    } catch(e) { console.warn('[KIDV] signOut error:', e); }
    localStorage.clear();
    sessionStorage.clear();
    location.href = 'login.html';
  },

  async getToken() {
    if (!this._user) return null;
    try { return await this._user.getIdToken(true); } catch(e) { return null; }
  },

  // ── Firestore CRUD — path: users/{uid}/{col}/{docId} ──────
  async list(col) {
    if (!this._uid) {
      console.warn('[KIDV] list() called but _uid is null');
      return [];
    }
    const path = `users/${this._uid}/${col}`;
    try {
      let snap;
      try {
        snap = await _fbDb.collection('users').doc(this._uid)
          .collection(col).orderBy('createdAt', 'desc').get();
      } catch(e) {
        // orderBy needs index — fallback without sort
        snap = await _fbDb.collection('users').doc(this._uid)
          .collection(col).get();
      }
      const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      console.log(`[KIDV] list(${col}): ${docs.length} docs`);
      return docs;
    } catch(e) {
      console.error(`[KIDV] list(${col}) ERROR:`, e.code, e.message);
      if (e.code === 'permission-denied') {
        console.error('[KIDV] ❌ FIRESTORE PERMISSION DENIED — Check your Firestore Rules in Firebase Console');
        _showPermissionError();
      }
      return [];
    }
  },

  async add(col, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const ref = await _fbDb.collection('users').doc(this._uid)
      .collection(col).add(doc);
    console.log(`[KIDV] add(${col}):`, ref.id);
    return { _id: ref.id, ...doc };
  },

  async set(col, id, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = { ...data, updatedAt: new Date().toISOString() };
    await _fbDb.collection('users').doc(this._uid)
      .collection(col).doc(id).set(doc, { merge: true });
    return { _id: id, ...doc };
  },

  async delete(col, id) {
    if (!this._uid) throw new Error('Not logged in');
    await _fbDb.collection('users').doc(this._uid)
      .collection(col).doc(id).delete();
    return { deleted: true };
  },

  // ── Settings stored as fields on user doc ─────────────────
  async getSettings(key) {
    const cached = localStorage.getItem('kidv-' + key);
    if (cached) { try { return JSON.parse(cached); } catch(e) {} }
    if (!this._uid) return {};
    try {
      const doc = await _fbDb.collection('users').doc(this._uid).get();
      const d   = doc.exists ? (doc.data()[key] || {}) : {};
      if (Object.keys(d).length) {
        localStorage.setItem('kidv-' + key, JSON.stringify(d));
      }
      return d;
    } catch(e) {
      console.error('[KIDV] getSettings error:', e.code, e.message);
      return {};
    }
  },

  async saveSettings(key, data) {
    localStorage.setItem('kidv-' + key, JSON.stringify(data));
    if (!this._uid) return;
    try {
      await _fbDb.collection('users').doc(this._uid).set(
        { [key]: data, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch(e) { console.error('[KIDV] saveSettings error:', e); }
  },

  // ── Next Invoice Number ───────────────────────────────────
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

  // ── WhatsApp Share ────────────────────────────────────────
  shareWhatsApp(invoice, phone = '') {
    const comp = JSON.parse(localStorage.getItem('kidv-company') || '{}');
    const amt  = parseFloat(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const msg  = `*Invoice: ${invoice.invoiceNo || invoice.invoice_no}*\nClient: ${invoice.clientName || invoice.client_name}\nAmount: \u20b9${amt}\nDate: ${invoice.date || '\u2014'}\nStatus: ${invoice.status || 'Pending'}\n\n_${comp.name || 'KIDV Invoice'} \u00b7 ${comp.phone || ''}_`;
    const url  = phone
      ? `https://wa.me/91${phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  // ── Admin: read all users' subcollections ─────────────────
  async adminListAll(col) {
    if (!this.isAdmin) return [];
    try {
      const snap = await _fbDb.collection('users').get();
      let results = [];
      for (const userDoc of snap.docs) {
        try {
          const colSnap = await _fbDb.collection('users').doc(userDoc.id)
            .collection(col).get();
          colSnap.docs.forEach(d =>
            results.push({ _uid: userDoc.id, _id: d.id, ...d.data() })
          );
        } catch(e) {}
      }
      return results;
    } catch(e) { return []; }
  },
};

window.DB = window.KIDV;

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
    if (!isPublic) {
      location.href = 'login.html';
      return;
    }
    document.dispatchEvent(new Event('kidv:db-ready'));
    return;
  }

  // ── Logged In ──────────────────────────────────────────────
  window.KIDV._user   = user;
  window.KIDV._uid    = user.uid;
  window.KIDV._ready  = true;
  window.KIDV.isAdmin = window.KIDV.adminEmails
    .includes((user.email || '').toLowerCase());

  console.log('[KIDV] ✅ Auth:', user.email, window.KIDV.isAdmin ? '| ADMIN' : '');

  // Update lastLogin (non-blocking)
  _fbDb.collection('users').doc(user.uid).set({
    email:     user.email || '',
    name:      user.displayName || localStorage.getItem('kidv-userName') || '',
    isAdmin:   window.KIDV.isAdmin,
    lastLogin: new Date().toISOString(),
  }, { merge: true }).catch(e => console.warn('[KIDV] lastLogin update failed:', e.code));

  _updateNavUser(user);
  _updateStatusBadge(true);

  document.dispatchEvent(new Event('kidv:db-ready'));
});

// ── Nav Helpers ───────────────────────────────────────────────
function _updateNavUser(user) {
  const name    = user.displayName
    || localStorage.getItem('kidv-userName')
    || user.email
    || 'U';
  const initial = name.charAt(0).toUpperCase();
  const onLogout = (e) => {
    e.stopPropagation();
    if (confirm('Logout karvanu che?\n\n' + (user.email || name))) {
      window.KIDV.logout();
    }
  };

  // Update all .avatar elements
  document.querySelectorAll('.avatar').forEach(el => {
    el.textContent = initial;
    el.title       = name + ' — Click to logout';
    el.style.cursor = 'pointer';
    el.onclick     = onLogout;
  });

  // Update rail avatarBtn
  const avatarBtn = document.getElementById('avatarBtn');
  if (avatarBtn) {
    avatarBtn.innerHTML = initial + '<div class="rail-tooltip">Profile / Logout</div>';
    avatarBtn.onclick   = onLogout;
  }

  // Show admin button
  if (window.KIDV.isAdmin) {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) adminBtn.style.display = '';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }

  // Store name in localStorage for future use
  if (name && name !== 'U') {
    localStorage.setItem('kidv-userName', name);
  }
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
  // Show a visible error banner if Firestore permission is denied
  const existing = document.getElementById('_kidvPermErr');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = '_kidvPermErr';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:10px 20px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;z-index:99999;text-align:center;';
  banner.innerHTML = '⚠️ Firestore Permission Denied — Firebase Console → Firestore → Rules tab ma rules update karo. <button onclick="this.parentElement.remove()" style="margin-left:12px;background:rgba(255,255,255,0.2);border:none;color:#fff;padding:2px 10px;border-radius:4px;cursor:pointer">✕</button>';
  document.body.prepend(banner);
}
