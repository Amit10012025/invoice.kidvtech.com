/**
 * KIDV Invoice — Common Logo & Branding Utility
 * Include this file in ALL pages AFTER firebase-config.js
 * Replaces .rail-logo "KI" text with actual logo.jpg
 */

(function applyLogo() {
  const LOGO_PATH = 'logo.jpg'; // logo file same folder ma hovu joiye

  function setLogos() {
    // ── 1. Rail logo (sidebar top) ──
    document.querySelectorAll('.rail-logo').forEach(el => {
      el.innerHTML = '';
      el.style.cssText += 'padding:0;overflow:hidden;border-radius:12px;background:transparent;box-shadow:none;';
      const img = document.createElement('img');
      img.src = LOGO_PATH;
      img.alt = 'KIDV Logo';
      img.style.cssText = 'width:42px;height:42px;object-fit:cover;border-radius:12px;display:block;';
      img.onerror = () => { el.textContent = 'KI'; el.style.background = 'linear-gradient(135deg,#2f81f7,#39d0d8)'; };
      el.appendChild(img);
    });

    // ── 2. Login page logo box ──
    document.querySelectorAll('.lp-logo-box').forEach(el => {
      el.innerHTML = '';
      el.style.cssText += 'padding:0;overflow:hidden;background:transparent;box-shadow:none;';
      const img = document.createElement('img');
      img.src = LOGO_PATH;
      img.alt = 'KIDV Logo';
      img.style.cssText = 'width:46px;height:46px;object-fit:cover;border-radius:13px;display:block;';
      img.onerror = () => { el.textContent = 'KI'; el.style.background='linear-gradient(135deg,#2f81f7,#39d0d8)'; };
      el.appendChild(img);
    });

    // ── 3. Subscribe page logo box ──
    document.querySelectorAll('.logo-box').forEach(el => {
      el.innerHTML = '';
      el.style.cssText += 'padding:0;overflow:hidden;background:transparent;box-shadow:none;';
      const img = document.createElement('img');
      img.src = LOGO_PATH;
      img.alt = 'KIDV Logo';
      img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:12px;display:block;';
      img.onerror = () => { el.textContent = 'KI'; el.style.background='linear-gradient(135deg,#2f81f7,#39d0d8)'; };
      el.appendChild(img);
    });

    // ── 4. Invoice theme — company logo box ──
    document.querySelectorAll('.logo-box[id="logoBox"]').forEach(el => {
      el.innerHTML = '';
      el.style.cssText += 'padding:0;overflow:hidden;background:transparent;border:none;';
      const img = document.createElement('img');
      img.src = LOGO_PATH;
      img.alt = 'Company Logo';
      img.style.cssText = 'width:62px;height:62px;object-fit:contain;display:block;';
      img.onerror = () => { el.textContent = 'KI'; el.style.background='linear-gradient(135deg,#1a3a6b,#2f81f7)'; };
      el.appendChild(img);
    });

    // ── 5. Invoice theme v1 — company-logo-text ──
    document.querySelectorAll('.company-logo-text').forEach(el => {
      // Only replace if it contains plain text (not already an image)
      if(!el.querySelector('img')) {
        const compName = el.textContent.trim();
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:10px;';
        const img = document.createElement('img');
        img.src = LOGO_PATH;
        img.alt = 'Logo';
        img.style.cssText = 'width:48px;height:48px;object-fit:contain;border-radius:8px;';
        img.onerror = () => img.remove();
        const nameEl = document.createElement('span');
        nameEl.textContent = compName;
        nameEl.style.cssText = 'font-family:\'DM Serif Display\',serif;font-size:28px;color:#fff;letter-spacing:-0.5px;';
        wrapper.appendChild(img);
        wrapper.appendChild(nameEl);
        el.innerHTML = '';
        el.appendChild(wrapper);
      }
    });

    // ── 6. Admin topbar logo ──
    document.querySelectorAll('.logo').forEach(el => {
      if(el.textContent.trim() === 'KI') {
        el.innerHTML = '';
        el.style.cssText += 'padding:0;overflow:hidden;background:transparent;box-shadow:none;';
        const img = document.createElement('img');
        img.src = LOGO_PATH;
        img.alt = 'Logo';
        img.style.cssText = 'width:36px;height:36px;object-fit:cover;border-radius:9px;display:block;';
        img.onerror = () => { el.textContent='KI'; el.style.background='linear-gradient(135deg,#2f81f7,#39d0d8)'; };
        el.appendChild(img);
      }
    });
  }

  // Run on DOM ready
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setLogos);
  } else {
    setLogos();
  }

  // Also run after a short delay (for dynamic content)
  setTimeout(setLogos, 500);
  setTimeout(setLogos, 1500);

})();
