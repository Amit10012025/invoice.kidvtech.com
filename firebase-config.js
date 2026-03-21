/**
 * KIDV Invoice — Firebase + Firestore Integration
 * Include this script in every HTML page BEFORE page scripts
 * <script src="firebase-config.js"></script>
 */

// ── Firebase Config ──────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDFx2hxhTo2HJKbNK-FUgBiMgvHDzCVmoE",
  authDomain:        "kidv-tech-project.firebaseapp.com",
  projectId:         "kidv-tech-project",
  storageBucket:     "kidv-tech-project.firebasestorage.app",
  messagingSenderId: "168663801953",
  appId:             "1:168663801953:web:af953338df12480b4fca20",
  measurementId:     "G-KY98RSCW77"
};

// ── Collection names ──────────────────────────────────────
const COLLECTIONS = {
  clients:    'clients',
  products:   'products',
  invoices:   'invoices',
  quotations: 'quotations',
  payments:   'payments',
  einvoices:  'einvoices',
  ewbs:       'ewbs',
  company:    'settings',   // doc id: 'company'
  gst:        'settings',   // doc id: 'gst'
  bank:       'settings',   // doc id: 'bank'
};

// ── Load Firebase SDK dynamically ─────────────────────────
(function loadFirebaseSDK() {
  const scripts = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  ];
  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => {
      loaded++;
      if (loaded === scripts.length) initFirebase();
    };
    s.onerror = () => {
      console.warn('[KIDV] Firebase SDK load failed — using localStorage fallback');
      window.DB._firebaseReady = false;
      document.dispatchEvent(new Event('kidv:db-ready'));
    };
    document.head.appendChild(s);
  });
})();

// ── DB Object — unified API ───────────────────────────────
window.DB = {
  _firebaseReady: false,
  _db: null,

  // ── List all docs in a collection ──
  async list(collection) {
    if (this._firebaseReady) {
      try {
        const snap = await this._db.collection(collection).get();
        return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('[KIDV] Firestore list error, using localStorage:', e);
      }
    }
    // Fallback
    return JSON.parse(localStorage.getItem('kidv-' + collection) || '[]');
  },

  // ── Save/update a doc by custom id ──
  async set(collection, id, data) {
    const clean = { ...data };
    delete clean._id;
    if (this._firebaseReady) {
      try {
        await this._db.collection(collection).doc(String(id)).set(clean, { merge: true });
        return;
      } catch (e) {
        console.warn('[KIDV] Firestore set error, using localStorage:', e);
      }
    }
    // Fallback — store array in localStorage
    const arr = JSON.parse(localStorage.getItem('kidv-' + collection) || '[]');
    const idx = arr.findIndex(x => x._id === id || x.id === id);
    if (idx >= 0) arr[idx] = { _id: id, ...clean };
    else arr.push({ _id: id, ...clean });
    localStorage.setItem('kidv-' + collection, JSON.stringify(arr));
  },

  // ── Add new doc (auto ID) ──
  async add(collection, data) {
    const clean = { ...data, createdAt: new Date().toISOString() };
    delete clean._id;
    if (this._firebaseReady) {
      try {
        const ref = await this._db.collection(collection).add(clean);
        return ref.id;
      } catch (e) {
        console.warn('[KIDV] Firestore add error, using localStorage:', e);
      }
    }
    // Fallback
    const arr = JSON.parse(localStorage.getItem('kidv-' + collection) || '[]');
    const id = Date.now().toString();
    arr.push({ _id: id, ...clean });
    localStorage.setItem('kidv-' + collection, JSON.stringify(arr));
    return id;
  },

  // ── Delete a doc ──
  async delete(collection, id) {
    if (this._firebaseReady) {
      try {
        await this._db.collection(collection).doc(String(id)).delete();
        return;
      } catch (e) {
        console.warn('[KIDV] Firestore delete error, using localStorage:', e);
      }
    }
    const arr = JSON.parse(localStorage.getItem('kidv-' + collection) || '[]');
    const filtered = arr.filter(x => x._id !== id && x.id !== id);
    localStorage.setItem('kidv-' + collection, JSON.stringify(filtered));
  },

  // ── Get single settings doc ──
  async getSettings(docId) {
    if (this._firebaseReady) {
      try {
        const doc = await this._db.collection('settings').doc(docId).get();
        return doc.exists ? doc.data() : {};
      } catch (e) {
        console.warn('[KIDV] Firestore getSettings error:', e);
      }
    }
    return JSON.parse(localStorage.getItem('kidv-' + docId) || '{}');
  },

  // ── Save settings doc ──
  async saveSettings(docId, data) {
    if (this._firebaseReady) {
      try {
        await this._db.collection('settings').doc(docId).set(data, { merge: true });
        return;
      } catch (e) {
        console.warn('[KIDV] Firestore saveSettings error:', e);
      }
    }
    localStorage.setItem('kidv-' + docId, JSON.stringify(data));
  },

  // ── Migrate localStorage → Firestore (run once) ──
  async migrate() {
    if (!this._firebaseReady) return;
    const migrated = localStorage.getItem('kidv-firebase-migrated');
    if (migrated) return;

    console.log('[KIDV] Starting localStorage → Firestore migration...');
    const collections = ['clients', 'products', 'invoices', 'quotations', 'payments', 'einvoices', 'ewbs'];

    for (const col of collections) {
      const arr = JSON.parse(localStorage.getItem('kidv-' + col) || '[]');
      if (arr.length === 0) continue;
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        const id = item._id || item.invoiceNo || item.id || ('migrated-' + i);
        await this.set(col, id, item);
      }
      console.log(`[KIDV] Migrated ${arr.length} records → ${col}`);
    }

    // Settings
    const settingsKeys = ['company', 'gst', 'bank', 'invoice-settings'];
    for (const key of settingsKeys) {
      const val = localStorage.getItem('kidv-' + key);
      if (val) await this.saveSettings(key, JSON.parse(val));
    }

    localStorage.setItem('kidv-firebase-migrated', 'true');
    console.log('[KIDV] Migration complete ✅');
    showFirebaseToast('✅ Data migrated to Firebase Cloud!');
  }
};

// ── Init Firebase ─────────────────────────────────────────
function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    window.DB._db = firebase.firestore();
    window.DB._firebaseReady = true;
    console.log('[KIDV] Firebase connected ✅ — Project: invoice-6046a');
    updateFirebaseBadge(true);
    // Migrate localStorage data on first connect
    window.DB.migrate();
  } catch (e) {
    console.error('[KIDV] Firebase init error:', e);
    window.DB._firebaseReady = false;
    updateFirebaseBadge(false);
  }
  document.dispatchEvent(new Event('kidv:db-ready'));
}

// ── Update Firebase status badge (dashboard) ─────────────
function updateFirebaseBadge(connected) {
  const badge = document.getElementById('fbBadge');
  if (!badge) return;
  if (connected) {
    badge.className = 'firebase-badge connected';
    badge.innerHTML = '<div class="dot"></div> Firebase: Connected';
  } else {
    badge.className = 'firebase-badge';
    badge.innerHTML = '<div class="dot"></div> Firebase: Offline (localStorage)';
  }
}

// ── Toast ─────────────────────────────────────────────────
function showFirebaseToast(msg) {
  let t = document.getElementById('fb-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'fb-toast';
    t.style.cssText = `
      position:fixed;bottom:30px;right:30px;
      background:#1c2230;border:1px solid rgba(63,185,80,0.3);
      color:#3fb950;padding:12px 20px;border-radius:12px;
      font-size:14px;font-family:Outfit,sans-serif;
      z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.4);
      display:flex;align-items:center;gap:8px;
      transition:opacity .3s;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => t.style.opacity = '0', 3000);
}
