/**
 * KIDV Invoice — Common Shared JS Utilities
 * Include LAST on every page: <script src="kidv-common.js"></script>
 */

// ── Number to Words (Indian format) ──────────────────────────
const _ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const _TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function numToWords(n) {
  n = Math.floor(n);
  if (n === 0) return 'Zero';
  if (n < 20) return _ONES[n];
  if (n < 100) return _TENS[Math.floor(n/10)] + (n%10 ? ' ' + _ONES[n%10] : '');
  if (n < 1000) return _ONES[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + numToWords(n%100) : '');
  if (n < 100000) return numToWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numToWords(n%1000) : '');
  if (n < 10000000) return numToWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numToWords(n%100000) : '');
  return numToWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numToWords(n%10000000) : '');
}
window.numToWords = numToWords;

// ── Currency Formatter ────────────────────────────────────────
function fmtCur(n) {
  return '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
window.fmtCur = fmtCur;

// ── Date Formatter ────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
window.fmtDate = fmtDate;

// ── Toast Notification ────────────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('_kidvToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = '_kidvToast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:10px;font-family:Outfit,sans-serif;font-size:14px;font-weight:500;color:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.2);transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#dc2626' : type === 'warning' ? '#d97706' : '#16a34a';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
window.showToast = showToast;

// ── Logo Load Helper ──────────────────────────────────────────
function loadLogoInBox(boxId, companyName) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const img = new Image();
  img.onload = () => {
    box.innerHTML = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit;';
    box.appendChild(img);
  };
  img.onerror = () => {
    const initials = (companyName || 'KI').slice(0, 2).toUpperCase();
    box.textContent = initials;
  };
  img.src = 'logo.jpg?' + Date.now();
}
window.loadLogoInBox = loadLogoInBox;

// ── Confirm Delete Helper ─────────────────────────────────────
function confirmDelete(msg) {
  return confirm('⚠️ Delete Confirmation\n\n' + msg + '\n\nThis cannot be undone.');
}
window.confirmDelete = confirmDelete;

// ── Format GST Number ─────────────────────────────────────────
function fmtGST(gstin) {
  if (!gstin) return '';
  return gstin.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
window.fmtGST = fmtGST;

// ── Active Rail Item ──────────────────────────────────────────
(function markActiveRailItem() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.rail-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
    else el.classList.remove('active');
  });
})();
