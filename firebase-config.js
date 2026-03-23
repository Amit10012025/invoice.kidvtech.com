/**
 * KIDV Invoice — Firebase Config v3
 * 3-Layer Cache: Memory → localStorage → Firestore
 */

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDFx2hxhTo2HJKbNK-FUgBiMgvHDzCVmoE",
  authDomain:        "kidv-tech-project.firebaseapp.com",
  projectId:         "kidv-tech-project",
  storageBucket:     "kidv-tech-project.firebasestorage.app",
  messagingSenderId: "168663801953",
  appId:             "1:168663801953:web:af953338df12480b4fca20",
  measurementId:     "G-KY98RSCW77"
};

// ── Load Firebase SDKs ────────────────────────────────────
(function loadSDKs(){
  const sdks = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  ];
  let loaded = 0;
  sdks.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { if(++loaded === sdks.length) initApp(); };
    s.onerror = () => {
      window.KIDV._ready = false;
      document.dispatchEvent(new Event('kidv:db-ready'));
    };
    document.head.appendChild(s);
  });
})();

window.KIDV = {
  _ready: false,
  _auth:  null,
  _db:    null,
  _user:  null,
  _uid:   null,
  isAdmin: false,
  adminEmails: ['amit@kidvtech.com'],

  // ── In-memory cache (fastest) ──
  _mem: {},
  _memTs: {},
  MEM_TTL: 60000, // 1 min in memory

  // ── localStorage TTL ──
  LS_TTL: 5 * 60 * 1000, // 5 min

  _col(name){ return 'users/' + this._uid + '/' + name; },

  currentUser(){ return this._auth?.currentUser || null; },
  async logout(){ await this._auth?.signOut(); location.href = 'login.html'; },

  // ────────────────────────────────────────────────────────
  // LIST — 3-layer: Memory → localStorage → Firestore
  // ────────────────────────────────────────────────────────
  async list(col){
    const uid = this._uid;
    const memKey = uid + '/' + col;
    const lsKey  = 'kidv-cache-' + uid + '-' + col;
    const lsTsKey = lsKey + '-ts';

    // Layer 1: Memory (< 1 min old) — instant, 0ms
    if(this._mem[memKey] && (Date.now() - this._memTs[memKey]) < this.MEM_TTL){
      return this._mem[memKey];
    }

    // Layer 2: localStorage (< 5 min old) — ~1ms
    const lsData = localStorage.getItem(lsKey);
    const lsTs   = parseInt(localStorage.getItem(lsTsKey) || '0');
    if(lsData && (Date.now() - lsTs) < this.LS_TTL){
      const data = JSON.parse(lsData);
      // Save to memory
      this._mem[memKey] = data;
      this._memTs[memKey] = lsTs;
      // Background refresh from Firestore if > 30s old
      if(this._ready && (Date.now() - lsTs) > 30000){
        this._bgRefresh(col, memKey, lsKey, lsTsKey);
      }
      return data;
    }

    // Layer 3: Firestore — network call
    if(this._ready && uid){
      try{
        const snap = await this._db
          .collection(this._col(col))
          .orderBy('createdAt', 'desc')
          .get();
        const data = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        this._saveCache(memKey, lsKey, lsTsKey, data);
        return data;
      } catch(e){
        console.warn('[KIDV] Firestore error, using stale cache:', e);
        if(lsData) return JSON.parse(lsData);
      }
    }

    // Fallback: stale localStorage
    if(lsData) return JSON.parse(lsData);
    return [];
  },

  // Background refresh — don't block UI
  _bgRefresh(col, memKey, lsKey, lsTsKey){
    const uid = this._uid;
    this._db.collection(this._col(col))
      .orderBy('createdAt', 'desc')
      .get()
      .then(snap => {
        const data = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
        this._saveCache(memKey, lsKey, lsTsKey, data);
        console.log('[KIDV] BG refresh:', col, data.length, 'records');
      })
      .catch(() => {});
  },

  _saveCache(memKey, lsKey, lsTsKey, data){
    this._mem[memKey] = data;
    this._memTs[memKey] = Date.now();
    try{
      localStorage.setItem(lsKey, JSON.stringify(data));
      localStorage.setItem(lsTsKey, Date.now().toString());
    }catch(e){
      // localStorage full — clear old cache
      this._clearOldCache();
    }
  },

  _clearOldCache(){
    const keys = Object.keys(localStorage).filter(k => k.startsWith('kidv-cache-'));
    keys.forEach(k => localStorage.removeItem(k));
  },

  _clearCache(col){
    const uid = this._uid;
    if(!uid) return;
    const memKey = uid + '/' + col;
    const lsKey  = 'kidv-cache-' + uid + '-' + col;
    delete this._mem[memKey];
    delete this._memTs[memKey];
    localStorage.removeItem(lsKey);
    localStorage.removeItem(lsKey + '-ts');
  },

  // ── ADD ──────────────────────────────────────────────────
  async add(col, data){
    const clean = { ...data, createdAt: data.createdAt || new Date().toISOString() };
    delete clean._id;
    let id;
    if(this._ready && this._uid){
      try{
        const ref = await this._db.collection(this._col(col)).add(clean);
        id = ref.id;
        this._clearCache(col);
        return id;
      } catch(e){ console.warn('[KIDV] add error:', e); }
    }
    // Offline fallback
    id = Date.now().toString();
    this._clearCache(col);
    return id;
  },

  // ── SET ──────────────────────────────────────────────────
  async set(col, id, data){
    const clean = { ...data }; delete clean._id;
    if(this._ready && this._uid){
      try{
        await this._db.collection(this._col(col)).doc(String(id)).set(clean, { merge: true });
        this._clearCache(col);
        return;
      } catch(e){ console.warn('[KIDV] set error:', e); }
    }
    this._clearCache(col);
  },

  // ── DELETE ───────────────────────────────────────────────
  async delete(col, id){
    if(this._ready && this._uid){
      try{
        await this._db.collection(this._col(col)).doc(String(id)).delete();
        this._clearCache(col);
        return;
      } catch(e){ console.warn('[KIDV] delete error:', e); }
    }
    this._clearCache(col);
  },

  // ── SETTINGS (with memory cache) ─────────────────────────
  async getSettings(key){
    const memKey = 'settings/' + key;
    // Memory cache
    if(this._mem[memKey] && (Date.now() - this._memTs[memKey]) < this.MEM_TTL){
      return this._mem[memKey];
    }
    // localStorage
    const lsVal = localStorage.getItem('kidv-' + key) || localStorage.getItem('kidv-cache-' + key);
    if(this._ready && this._uid){
      try{
        const doc = await this._db
          .collection('users/' + this._uid + '/settings')
          .doc(key).get();
        const data = doc.exists ? doc.data() : {};
        this._mem[memKey] = data;
        this._memTs[memKey] = Date.now();
        localStorage.setItem('kidv-' + key, JSON.stringify(data));
        localStorage.setItem('kidv-cache-' + key, JSON.stringify(data));
        return data;
      } catch(e){
        if(lsVal) return JSON.parse(lsVal);
      }
    }
    return lsVal ? JSON.parse(lsVal) : {};
  },

  async saveSettings(key, data){
    // Always save to localStorage + memory immediately
    localStorage.setItem('kidv-' + key, JSON.stringify(data));
    localStorage.setItem('kidv-cache-' + key, JSON.stringify(data));
    this._mem['settings/' + key] = data;
    this._memTs['settings/' + key] = Date.now();
    if(this._ready && this._uid){
      try{
        await this._db
          .collection('users/' + this._uid + '/settings')
          .doc(key).set(data, { merge: true });
      } catch(e){ console.warn('[KIDV] saveSettings error:', e); }
    }
  },

  async nextInvoiceNo(){
    const s = await this.getSettings('invoice-settings');
    const prefix = s.prefix || 'INV-';
    const invoices = await this.list('invoices');
    return prefix + String(invoices.length + 1).padStart(3, '0');
  },

  shareWhatsApp(invoice, phone = ''){
    const comp = JSON.parse(localStorage.getItem('kidv-company') || '{}');
    const amt  = parseFloat(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const msg  = `*Invoice: ${invoice.invoiceNo}*\nClient: ${invoice.clientName}\nAmount: ₹${amt}\nDate: ${invoice.date || '—'}\nDue: ${invoice.due || '—'}\nStatus: ${invoice.status || 'Pending'}\n\n_${comp.name || 'KIDV Invoice'} · ${comp.phone || ''}_`;
    const url  = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  // Admin: list all users' data
  adminListAll: async function(col){
    if(!this._ready || !this.isAdmin) return [];
    try{
      const usersSnap = await this._db.collection('users').get();
      let all = [];
      for(const u of usersSnap.docs){
        const snap = await this._db.collection('users/' + u.id + '/' + col).get();
        snap.docs.forEach(d => all.push({ _id: d.id, _userId: u.id, _userEmail: u.data().email || '', ...d.data() }));
      }
      return all;
    } catch(e){ return []; }
  },
};

window.DB = window.KIDV;

// ── Init ──────────────────────────────────────────────────
function initApp(){
  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    window.KIDV._auth = firebase.auth();
    window.KIDV._db   = firebase.firestore();

    // Enable Firestore offline persistence — loads from local cache instantly!
    window.KIDV._db.enablePersistence({ synchronizeTabs: true })
      .then(() => console.log('[KIDV] Firestore offline persistence enabled ✅'))
      .catch(err => {
        if(err.code === 'failed-precondition'){
          // Multiple tabs — ok
        } else if(err.code === 'unimplemented'){
          console.log('[KIDV] Persistence not supported');
        }
      });

    firebase.auth().onAuthStateChanged(user => {
      const page = location.pathname.split('/').pop() || 'index.html';
      const isPublic = ['login.html','subscribe.html','expired.html'].some(p => page.includes(p));
      if(!user && !isPublic){ location.href = 'login.html'; return; }
      if(user){
        window.KIDV._user  = user;
        window.KIDV._uid   = user.uid;
        window.KIDV._ready = true;
        window.KIDV.isAdmin = window.KIDV.adminEmails.includes(user.email.toLowerCase());
        console.log('[KIDV] ✅ Auth:', user.email, window.KIDV.isAdmin ? '| ADMIN' : '');
        updateNavUser(user);
        updateFirebaseBadge(true);
      }
      document.dispatchEvent(new Event('kidv:db-ready'));
    });
  } catch(e){
    console.error('[KIDV] Init error:', e);
    document.dispatchEvent(new Event('kidv:db-ready'));
  }
}

function updateNavUser(user){
  document.querySelectorAll('.avatar').forEach(el => {
    const name = user.displayName || user.email || 'U';
    el.textContent = name.charAt(0).toUpperCase();
    el.title = (user.displayName || user.email) + ' — Click to logout';
    el.style.cursor = 'pointer';
    el.onclick = () => { if(confirm('Logout?\n\n' + user.email)) window.KIDV.logout(); };
  });
}

function updateFirebaseBadge(ok){
  const badge = document.getElementById('fbBadge');
  if(!badge) return;
  badge.className = ok ? 'firebase-badge connected' : 'firebase-badge';
  badge.innerHTML = ok
    ? '<div class="dot"></div> Firebase: Connected'
    : '<div class="dot"></div> Firebase: Offline';
}
