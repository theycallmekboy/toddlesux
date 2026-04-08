// ==UserScript==
// @name         toddlesux
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Auto-fills Toddle forms with human-like delays, sub-question support, settings & emergency hide
// @author       theycallmekboy - made with DS
// @match        https://web.toddleapp.com/*
// @match        https://*.toddleapp.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-utils.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-styles.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-settings.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-scanner.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-filler.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/main/modules/taf-ui.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  // Dynamic hotkey toggle (uses saved setting, defaults to 'Delete')
  document.addEventListener('keydown', (e) => {
    if (!window.TAF || !TAF.Settings) return;
    const hotkey = TAF.Settings.get('hotkey') || 'Delete';
    // Normalize case and handle special keys like 'Delete', 'Escape', 'F1', etc.
    if (e.key === hotkey || e.code === hotkey || e.key.toLowerCase() === hotkey.toLowerCase()) {
      e.preventDefault();
      const root = document.getElementById('taf-root');
      if (root) {
        root.classList.toggle('taf-emergency-hidden');
        if (TAF.Utils) {
          TAF.Utils.log(root.classList.contains('taf-emergency-hidden') ? 'Panel hidden (press ' + hotkey + ' to show)' : 'Panel shown', 'info');
        }
      }
    }
  });

  function init() {
    if (typeof window.TAF === 'undefined' || !TAF.UI) {
      console.error('[toddlesux] Modules not loaded. Check @require paths.');
      return;
    }
    TAF.UI.buildSidebar();
    setTimeout(() => {
      const root = document.getElementById('taf-root');
      if (root) root.classList.remove('taf-hidden');
    }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
