/**
 * KIDV Invoice — Common Footer & Logo Injector
 * Include this in ALL HTML pages before </body>
 * <script src="kidv-common.js"></script>
 */

(function () {
  'use strict';

  // ── 1. Inject Footer on every page ───────────────────────
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
    enhanceTitle();
    // addLegalRailItems(); // Uncomment if you want an "About" icon in the rail
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
