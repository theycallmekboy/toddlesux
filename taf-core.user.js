// ==UserScript==
// @name         toddlesux
// @namespace    http://tampermonkey.net/
// @version      6.2
// @description  Optimized Toddle autofill with AI, human simulation, and advanced features
// @author       theycallmekboy - made with DS
// @match        https://web.toddleapp.com/*
// @match        https://*.toddleapp.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-utils.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-styles.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-settings.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-scanner.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-filler.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/test/modules/taf-ui.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  let lastHotkeyTime = 0;
  const DOUBLE_TAP_MS = 300;

  document.addEventListener('keydown', (e) => {
    if (!window.TAF || !TAF.Settings) return;
    const hotkey = TAF.Settings.get('hotkey') || 'Delete';
    
    if (e.key === hotkey) {
      e.preventDefault();
      const root = document.getElementById('taf-root');
      if (!root) return;

      const now = Date.now();
      const isDoubleTap = (now - lastHotkeyTime) < DOUBLE_TAP_MS;
      lastHotkeyTime = now;

      // Double-tap only resets position if panel is currently visible
      if (isDoubleTap && root.classList.contains('taf-visible') && !root.classList.contains('taf-emergency-hidden')) {
        // Reset saved position to default centered
        Settings.set('panelX', null);
        Settings.set('panelY', null);
        Settings.set('panelWidth', 360);
        Settings.set('panelHeight', null);
        
        // Reset inline styles to CSS defaults
        root.style.left = '';
        root.style.top = '50%';
        root.style.right = '20px';
        root.style.transform = 'translateY(-50%)';
        root.style.width = '360px';
        root.style.height = '';
        
        if (TAF.Utils) TAF.Utils.toast('Panel position reset', 'info');
        return; // Don't toggle visibility
      }

      // Single tap: toggle visibility
      root.classList.toggle('taf-emergency-hidden');
      if (TAF.Utils) {
        TAF.Utils.toast(`Panel ${root.classList.contains('taf-emergency-hidden') ? 'hidden' : 'shown'}`, 'info');
      }
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      if (TAF.Scanner) TAF.Scanner.scanPage();
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
      const root = document.getElementById('taf-root');
      if (root && !root.classList.contains('taf-emergency-hidden')) {
        e.preventDefault();
        const btn = document.getElementById('taf-btn-run');
        if (btn) btn.click();
      }
    }
  });

  let observer = null;
  function initObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (TAF.Scanner) TAF.Scanner.invalidateCache();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    if (typeof window.TAF === 'undefined' || !TAF.UI) {
      console.error('[toddlesux] Modules not loaded.');
      return;
    }
    initObserver();
    TAF.UI.buildSidebar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
