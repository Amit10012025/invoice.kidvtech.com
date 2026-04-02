/**
 * KIDV Invoice — Supabase Config v1
 * Firebase config replace karo aa file thi
 * Include: <script src="supabase-config.js"></script>
 */

// ── Supabase Keys — supabase.com/dashboard → Settings → API ──
const SUPABASE_URL  = 'https://ikuldkmkikfbyazabiuq.supabase.co';   // <-- apano URL mukho
const SUPABASE_ANON = 'sb_publishable_01xbMAC_t35frmIbiOdglQ_Um3GchYg'; // <-- anon/public key

// ── FastAPI Backend URL ───────────────────────────────────────
const API_BASE = 'https://sb_publishable_01xbMAC_t35frmIbiOdglQ_Um3GchYg';  // <-- deploy karyo pachi URL mukho
// Development ma: const API_BASE = 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────

// Load Supabase JS SDK
(function loadSupabase() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  s.onload = initKIDV;
  s.onerror = () => console.error('[KIDV] Supabase SDK load failed');
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────
window.KIDV = {
  _supabase: null,
  _user: null,
  _uid: null,
  _token: null,
  isAdmin: false,
  adminEmails: ['amit@kidvtech.com'],

  // ── Auth helpers ──────────────────────────────────────────
  currentUser() { return this._user; },

  async logout() {
    await this._supabase.auth.signOut();
    localStorage.clear();
    location.href = 'login.html';
  },

  async getToken() {
    if (this._token) return this._token;
    const { data } = await this._supabase.auth.getSession();
    this._token = data.session?.access_token || null;
    return this._token;
  },

  // ── API call helper ───────────────────────────────────────
  async api(method, path, body = null) {
    const token = await this.getToken();
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `API error ${res.status}`);
    }
    return res.json();
  },

  // ── CRUD shortcuts ────────────────────────────────────────
  async list(col)           { return this.api('GET',    `/api/${col}`); },
  async add(col, data)      { return this.api('POST',   `/api/${col}`, data); },
  async set(col, id, data)  { return this.api('PUT',    `/api/${col}/${id}`, data); },
  async delete(col, id)     { return this.api('DELETE', `/api/${col}/${id}`); },

  // ── Settings ──────────────────────────────────────────────
  async getSettings(key) {
    const ls = localStorage.getItem('kidv-' + key);
    if (ls) return JSON.parse(ls);
    try {
      if (key === 'company') {
        const d = await this.api('GET', '/api/company');
        localStorage.setItem('kidv-company', JSON.stringify(d));
        return d;
      }
    } catch(e) {}
    return {};
  },

  async saveSettings(key, data) {
    localStorage.setItem('kidv-' + key, JSON.stringify(data));
    if (key === 'company') {
      await this.api('POST', '/api/company', data);
    }
  },

  async nextInvoiceNo() {
    try {
      const r = await this.api('GET', '/api/invoices/next-number');
      return r.invoice_no;
    } catch(e) {
      const s = await this.getSettings('company');
      const prefix = s.invoice_prefix || 'INV-';
      const n = (s.invoice_next_no || 1);
      return prefix + String(n).padStart(3, '0');
    }
  },

  shareWhatsApp(invoice, phone = '') {
    const comp = JSON.parse(localStorage.getItem('kidv-company') || '{}');
    const amt  = parseFloat(invoice.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const msg  = `*Invoice: ${invoice.invoiceNo || invoice.invoice_no}*\nClient: ${invoice.clientName || invoice.client_name}\nAmount: ₹${amt}\nDate: ${invoice.date || '—'}\nStatus: ${invoice.status || 'Pending'}\n\n_${comp.name || 'KIDV Invoice'} · ${comp.phone || ''}_`;
    const url  = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  },

  // Admin
  async adminListAll(col) {
    if (!this.isAdmin) return [];
    return this.api('GET', `/api/admin/${col}`);
  },
};

window.DB = window.KIDV;

// ─────────────────────────────────────────────────────────────
function initKIDV() {
  try {
    const { createClient } = window.supabase;
    window.KIDV._supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

    // Auth state listen
    window.KIDV._supabase.auth.onAuthStateChange(async (event, session) => {
      const page = location.pathname.split('/').pop() || 'index.html';
      const isPublic = ['login.html', 'subscribe.html', 'expired.html'].some(p => page.includes(p));

      if (!session && !isPublic) {
        location.href = 'login.html';
        return;
      }

      if (session?.user) {
        window.KIDV._user  = session.user;
        window.KIDV._uid   = session.user.id;
        window.KIDV._token = session.access_token;
        window.KIDV.isAdmin = window.KIDV.adminEmails.includes(
          (session.user.email || '').toLowerCase()
        );
        console.log('[KIDV] ✅ Auth:', session.user.email, window.KIDV.isAdmin ? '| ADMIN' : '');
        updateNavUser(session.user);
        updateStatusBadge(true);
      }

      document.dispatchEvent(new Event('kidv:db-ready'));
    });

  } catch(e) {
    console.error('[KIDV] Init error:', e);
    document.dispatchEvent(new Event('kidv:db-ready'));
  }
}

function updateNavUser(user) {
  document.querySelectorAll('.avatar').forEach(el => {
    const name = user.user_metadata?.name || user.email || 'U';
    el.textContent = name.charAt(0).toUpperCase();
    el.title = name + ' — Click to logout';
    el.style.cursor = 'pointer';
    el.onclick = () => { if (confirm('Logout?\n\n' + user.email)) window.KIDV.logout(); };
  });
}

function updateStatusBadge(ok) {
  const badge = document.getElementById('fbBadge');
  if (!badge) return;
  badge.className = ok ? 'firebase-badge connected' : 'firebase-badge';
  badge.innerHTML = ok
    ? '<div class="dot"></div> Supabase: Connected'
    : '<div class="dot"></div> Supabase: Offline';
}
