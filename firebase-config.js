/**
 * KIDV Invoice — Firebase Config v2
 * Auth + Firestore + Multi-tenant + WhatsApp
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
      console.warn('[KIDV] SDK load failed — offline mode');
      window.KIDV._ready = false;
      document.dispatchEvent(new Event('kidv:db-ready'));
    };
    document.head.appendChild(s);
  });
})();

window.KIDV = {
  _ready:false, _auth:null, _db:null, _user:null, _uid:null,
  _col(name){ return 'users/'+this._uid+'/'+name; },
  currentUser(){ return this._auth?.currentUser||null; },
  async logout(){ await this._auth?.signOut(); location.href='login.html'; },

  async list(col){
    const cacheKey = 'kidv-cache-'+col;
    const cacheTimeKey = 'kidv-cache-ts-'+col;

    // ── Step 1: Return cache INSTANTLY if available ──
    const cached = localStorage.getItem(cacheKey);
    const cacheTs = parseInt(localStorage.getItem(cacheTimeKey)||'0');
    const cacheAge = Date.now() - cacheTs; // ms

    if(cached && cacheAge < 5*60*1000){ // < 5 min = use as-is
      // If Firebase ready, refresh in background silently
      if(this._ready && this._uid && cacheAge > 30000){
        this._db.collection(this._col(col)).orderBy('createdAt','desc').get()
          .then(snap=>{
            const fresh=snap.docs.map(d=>({_id:d.id,...d.data()}));
            localStorage.setItem(cacheKey, JSON.stringify(fresh));
            localStorage.setItem(cacheTimeKey, Date.now().toString());
            console.log('[KIDV] Background refresh: '+col);
          }).catch(()=>{});
      }
      return JSON.parse(cached);
    }

    // ── Step 2: Load from Firestore ──
    if(this._ready&&this._uid){
      try{
        const snap=await this._db.collection(this._col(col)).orderBy('createdAt','desc').get();
        const data=snap.docs.map(d=>({_id:d.id,...d.data()}));
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        return data;
      }catch(e){
        console.warn('[KIDV] list error, using cache:',e);
        if(cached) return JSON.parse(cached);
      }
    }

    // ── Step 3: Fallback ──
    if(cached) return JSON.parse(cached);
    return JSON.parse(localStorage.getItem('kidv-'+col)||'[]');
  },

  _clearCache(col){
    localStorage.removeItem('kidv-cache-'+col);
    localStorage.removeItem('kidv-cache-ts-'+col);
  },
  async add(col,data){
    const clean={...data,createdAt:data.createdAt||new Date().toISOString()};
    delete clean._id;
    if(this._ready&&this._uid){
      try{ const ref=await this._db.collection(this._col(col)).add(clean); this._clearCache(col); return ref.id; }
      catch(e){console.warn('[KIDV] add error:',e);}
    }
    const arr=JSON.parse(localStorage.getItem('kidv-'+col)||'[]');
    const id=Date.now().toString();
    arr.unshift({_id:id,...clean});
    localStorage.setItem('kidv-'+col,JSON.stringify(arr));
    return id;
  },

  async set(col,id,data){
    const clean={...data}; delete clean._id;
    if(this._ready&&this._uid){
      try{ await this._db.collection(this._col(col)).doc(String(id)).set(clean,{merge:true}); this._clearCache(col); return; }
      catch(e){console.warn('[KIDV] set error:',e);}
    }
    const arr=JSON.parse(localStorage.getItem('kidv-'+col)||'[]');
    const idx=arr.findIndex(x=>x._id===id);
    if(idx>=0) arr[idx]={_id:id,...clean}; else arr.unshift({_id:id,...clean});
    localStorage.setItem('kidv-'+col,JSON.stringify(arr));
  },

  async delete(col,id){
    if(this._ready&&this._uid){
      try{ await this._db.collection(this._col(col)).doc(String(id)).delete(); this._clearCache(col); return; }
      catch(e){console.warn('[KIDV] delete error:',e);}
    }
    const arr=JSON.parse(localStorage.getItem('kidv-'+col)||'[]');
    localStorage.setItem('kidv-'+col,JSON.stringify(arr.filter(x=>x._id!==id)));
  },

  async getSettings(key){
    if(this._ready&&this._uid){
      try{
        const doc=await this._db.collection('users/'+this._uid+'/settings').doc(key).get();
        const data = doc.exists?doc.data():{};
        // Cache for instant load
        localStorage.setItem('kidv-cache-'+key, JSON.stringify(data));
        return data;
      }catch(e){
        // Return cache on error
        const cached = localStorage.getItem('kidv-cache-'+key);
        if(cached) return JSON.parse(cached);
      }
    }
    return JSON.parse(localStorage.getItem('kidv-cache-'+key)||localStorage.getItem('kidv-'+key)||'{}');
  },

  async saveSettings(key,data){
    // Always update cache immediately
    localStorage.setItem('kidv-cache-'+key, JSON.stringify(data));
    if(this._ready&&this._uid){
      try{ await this._db.collection('users/'+this._uid+'/settings').doc(key).set(data,{merge:true}); return; }
      catch(e){}
    }
    localStorage.setItem('kidv-'+key,JSON.stringify(data));
  },

  async nextInvoiceNo(){
    const s=await this.getSettings('invoice-settings');
    const prefix=s.prefix||'INV-';
    const invoices=await this.list('invoices');
    return prefix+String(invoices.length+1).padStart(3,'0');
  },

  shareWhatsApp(invoice,phone=''){
    const comp=JSON.parse(localStorage.getItem('kidv-company')||'{}');
    const amt=parseFloat(invoice.total||0).toLocaleString('en-IN',{minimumFractionDigits:2});
    const msg='*Invoice: '+invoice.invoiceNo+'*\nClient: '+invoice.clientName+'\nAmount: \u20b9'+amt+'\nDate: '+(invoice.date||'--')+'\nDue: '+(invoice.due||'--')+'\nStatus: '+(invoice.status||'Pending')+'\n\n_'+(comp.name||'KIDV Invoice')+' \u00b7 '+(comp.phone||'')+'_';
    const url=phone?'https://wa.me/91'+phone.replace(/\D/g,'')+'?text='+encodeURIComponent(msg):'https://wa.me/?text='+encodeURIComponent(msg);
    window.open(url,'_blank');
  },
};

window.DB = window.KIDV;

function initApp(){
  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    window.KIDV._auth=firebase.auth();
    window.KIDV._db=firebase.firestore();

    firebase.auth().onAuthStateChanged(user=>{
      const page=location.pathname.split('/').pop()||'index.html';
      const isPublic=page.includes('login.html');
      if(!user&&!isPublic){ location.href='login.html'; return; }
      if(user){
        window.KIDV._user=user;
        window.KIDV._uid=user.uid;
        window.KIDV._ready=true;
        // Check admin
        const adminEmails=['amit@kidvtech.com'];
        window.KIDV.isAdmin = adminEmails.includes(user.email.toLowerCase());
        if(window.KIDV.isAdmin) console.log('[KIDV] ADMIN MODE ✅');
        console.log('[KIDV] Logged in: '+user.email);
        updateNavUser(user);
        updateFirebaseBadge(true);
      }
      document.dispatchEvent(new Event('kidv:db-ready'));
    });
  }catch(e){
    console.error('[KIDV] Init error:',e);
    document.dispatchEvent(new Event('kidv:db-ready'));
  }
}

function updateNavUser(user){
  document.querySelectorAll('.avatar').forEach(el=>{
    const name=user.displayName||user.email||'U';
    el.textContent=name.charAt(0).toUpperCase();
    el.title=(user.displayName||user.email)+' — Click to logout';
    el.style.cursor='pointer';
    el.onclick=()=>{ if(confirm('Logout?\n\n'+user.email)) window.KIDV.logout(); };
  });
}

function updateFirebaseBadge(ok){
  const badge=document.getElementById('fbBadge');
  if(!badge) return;
  badge.className=ok?'firebase-badge connected':'firebase-badge';
  badge.innerHTML=ok?'<div class="dot"></div> Firebase: Connected':'<div class="dot"></div> Firebase: Offline';
}

// ── Admin helpers ─────────────────────────────────────────
window.KIDV.isAdmin = false;
window.KIDV.adminEmails = ['amit@kidvtech.com']; // tamaro email

// Admin: list ALL users' data
window.KIDV.adminListAll = async function(col){
  if(!this._ready||!this.isAdmin) return [];
  try{
    // Get all user IDs from users collection
    const usersSnap = await this._db.collection('users').get();
    let allDocs = [];
    for(const userDoc of usersSnap.docs){
      const snap = await this._db.collection('users/'+userDoc.id+'/'+col).get();
      const docs = snap.docs.map(d=>({
        _id:d.id,
        _userId:userDoc.id,
        _userEmail:userDoc.data().email||'',
        ...d.data()
      }));
      allDocs = allDocs.concat(docs);
    }
    return allDocs;
  }catch(e){ console.warn('[KIDV] adminListAll error:',e); return []; }
};

// Override initApp to check admin
const _origInit = window.initApp || function(){};
