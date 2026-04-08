/**
 * KIDV Invoice — Firebase Config & Core JS
 * Include on EVERY page (after firebase SDK scripts):
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
 *   <script src="firebase-config.js"></script>
 */

// ── Firebase Init ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFx2hxhTo2HJKbNK-FUgBiMgvHDzCVmoE",
  authDomain: "kidv-tech-project.firebaseapp.com",
  projectId: "kidv-tech-project",
  storageBucket: "kidv-tech-project.firebasestorage.app",
  messagingSenderId: "168663801953",
  appId: "1:168663801953:web:af953338df12480b4fca20"
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
  _token:  null,
  _ready:  false,
  isAdmin: false,
  adminEmails: ['amit@kidvtech.com'],

  currentUser() { return this._user; },

  async logout() {
    await _fbAuth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    location.href = 'login.html';
  },

  async getToken() {
    if (!this._user) return null;
    try { return await this._user.getIdToken(); } catch(e) { return null; }
  },

  // ── Firestore CRUD (per-user subcollections) ──────────────
  async list(col) {
    if (!this._uid) return [];
    try {
      const snap = await _fbDb.collection('users').doc(this._uid)
        .collection(col).orderBy('createdAt','desc').get();
      return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch(e) {
      try {
        const snap = await _fbDb.collection('users').doc(this._uid).collection(col).get();
        return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      } catch(e2) { console.error('[KIDV] list error:', e2); return []; }
    }
  },

  async add(col, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await _fbDb.collection('users').doc(this._uid).collection(col).add(doc);
    return { _id: ref.id, ...doc };
  },

  async set(col, id, data) {
    if (!this._uid) throw new Error('Not logged in');
    const doc = { ...data, updatedAt: new Date().toISOString() };
    await _fbDb.collection('users').doc(this._uid).collection(col).doc(id).set(doc, { merge: true });
    return { _id: id, ...doc };
  },

  async delete(col, id) {
    if (!this._uid) throw new Error('Not logged in');
    await _fbDb.collection('users').doc(this._uid).collection(col).doc(id).delete();
    return { deleted: true };
  },

  // ── Settings stored in user doc ───────────────────────────
  async getSettings(key) {
    const cached = localStorage.getItem('kidv-' + key);
    if (cached) { try { return JSON.parse(cached); } catch(e) {} }
    if (!this._uid) return {};
    try {
      const doc = await _fbDb.collection('users').doc(this._uid).get();
      const d = doc.exists ? (doc.data()[key] || {}) : {};
      if (Object.keys(d).length) localStorage.setItem('kidv-' + key, JSON.stringify(d));
      return d;
    } catch(e) { return {}; }
  },

  async saveSettings(key, data) {
    localStorage.setItem('kidv-' + key, JSON.stringify(data));
    if (!this._uid) return;
    try {
      await _fbDb.collection('users').doc(this._uid).set(
        { [key]: data, updatedAt: new Date().toISOString() }, { merge: true }
      );
    } catch(e) { console.error('[KIDV] saveSettings error:', e); }
  },

  async nextInvoiceNo() {
    try {
      const s = await this.getSettings('company');
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
        const colSnap = await _fbDb.collection('users').doc(userDoc.id).collection(col).get();
        colSnap.docs.forEach(d => results.push({ _uid: userDoc.id, _id: d.id, ...d.data() }));
      }
      return results;
    } catch(e) { return []; }
  },
};

window.DB = window.KIDV;

// ── Auth State Listener ───────────────────────────────────────
_fbAuth.onAuthStateChanged(async (user) => {
  const page     = location.pathname.split('/').pop() || 'index.html';
  const isPublic = ['login.html','subscribe.html','expired.html','suspended.html']
    .some(p => page.includes(p));

  if (!user) {
    window.KIDV._ready = false;
    if (!isPublic) { location.href = 'login.html'; return; }
    document.dispatchEvent(new Event('kidv:db-ready'));
    return;
  }

  window.KIDV._user   = user;
  window.KIDV._uid    = user.uid;
  window.KIDV._ready  = true;
  window.KIDV.isAdmin = window.KIDV.adminEmails.includes((user.email || '').toLowerCase());

  // Update lastLogin
  try {
    await _fbDb.collection('users').doc(user.uid).set({
      email: user.email || '',
      name: user.displayName || localStorage.getItem('kidv-userName') || '',
      isAdmin: window.KIDV.isAdmin,
      lastLogin: new Date().toISOString(),
    }, { merge: true });
  } catch(e) {}

  _updateNavUser(user);
  _updateStatusBadge(true);
  document.dispatchEvent(new Event('kidv:db-ready'));
});

function _updateNavUser(user) {
  const name    = user.displayName || localStorage.getItem('kidv-userName') || user.email || 'U';
  const initial = name.charAt(0).toUpperCase();
  const onLogout = () => { if(confirm('Logout?\n\n' + (user.email || name))) window.KIDV.logout(); };

  document.querySelectorAll('.avatar').forEach(el => {
    el.textContent = initial;
    el.title = name + ' — Click to logout';
    el.style.cursor = 'pointer';
    el.onclick = onLogout;
  });

  const avatarBtn = document.getElementById('avatarBtn');
  if (avatarBtn) {
    avatarBtn.innerHTML = initial + '<div class="rail-tooltip">Profile / Logout</div>';
    avatarBtn.onclick = onLogout;
  }

  if (window.KIDV.isAdmin) {
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) adminBtn.style.display = '';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
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
