/**
 * KIDV Invoice — Common Footer & Logo Injector
 * Include this in ALL HTML pages before </body>
 * <script src="kidv-common.js"></script>
 */

(function () {
  'use strict';

  // ── 1. Inject Footer on every page ───────────────────────
  function injectFooter() {
    // Don't inject on login page
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page.includes('login.html')) return;

    const footer = document.createElement('div');
    footer.id = 'kidv-global-footer';
    footer.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 68px; /* rail width */
      right: 0;
      background: rgba(30, 41, 59, 0.95);
      backdrop-filter: blur(8px);
      border-top: 1px solid rgba(255,255,255,0.07);
      padding: 10px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 150;
      font-family: 'Outfit', sans-serif;
      transition: opacity 0.3s;
    `;

    footer.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:28px;height:28px;background:linear-gradient(135deg,#2f81f7,#39d0d8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;cursor:pointer" onclick="location.href='index.html'" title="Dashboard">KI</div>
        <span style="font-size:11.5px;color:rgba(255,255,255,0.35);">© 2026 KIDV Tech. All rights reserved.</span>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <a href="about.html"    style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;transition:color .15s" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.45)'">About</a>
        <a href="privacy.html"  style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;transition:color .15s" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.45)'">Privacy Policy</a>
        <a href="terms.html"    style="font-size:12px;color:rgba(255,255,255,0.45);text-decoration:none;transition:color .15s" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.45)'">Terms</a>
        <a href="https://wa.me/917984486885" target="_blank" style="font-size:12px;color:#25d366;text-decoration:none;display:flex;align-items:center;gap:4px;" title="WhatsApp Support">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Support
        </a>
      </div>
    `;

    document.body.appendChild(footer);

    // Add bottom padding to main content so footer doesn't overlap
    const main = document.getElementById('main') || document.querySelector('main') || document.querySelector('.main');
    if (main) {
      main.style.paddingBottom = '60px';
    }
  }

  // ── 2. Add logo tooltip to rail-logo ─────────────────────
  function enhanceRailLogo() {
    const logo = document.querySelector('.rail-logo');
    if (logo && !logo.title) {
      logo.title = 'KIDV Invoice — Dashboard';
      logo.style.cursor = 'pointer';
      if (!logo.onclick) {
        logo.addEventListener('click', () => location.href = 'index.html');
      }
    }
  }

  // ── 3. Add About/Privacy/Terms to rail bottom ────────────
  function addLegalRailItems() {
    const rail = document.querySelector('.rail');
    const page = location.pathname.split('/').pop() || '';
    if (!rail) return;

    // Check if already added
    if (document.getElementById('rail-legal-group')) return;

    const group = document.createElement('div');
    group.id = 'rail-legal-group';
    group.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding-bottom:4px;';
    group.innerHTML = `
      <div onclick="location.href='about.html'" class="rail-item" title="About KIDV" style="width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative;color:rgba(255,255,255,0.4);transition:background .18s,color .18s;border:1.5px solid transparent;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='';this.style.color='rgba(255,255,255,0.4)'">
        <span class="material-icons-round" style="font-size:20px">info</span>
      </div>
    `;

    // Insert before last spacer/last item
    const spacer = rail.querySelector('.rail-spacer');
    if (spacer) {
      rail.insertBefore(group, spacer);
    } else {
      rail.appendChild(group);
    }
  }

  // ── 4. Update page title with KIDV branding ──────────────
  function enhanceTitle() {
    if (!document.title.includes('KIDV')) {
      document.title = 'KIDV Invoice — ' + document.title;
    }
  }

  // ── Run after DOM ready ───────────────────────────────────
  function init() {
    enhanceRailLogo();
    injectFooter();
    enhanceTitle();
    // addLegalRailItems(); // Uncomment if you want an "About" icon in the rail
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
