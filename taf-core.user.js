// ==UserScript==
// @name         toddlesux
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Optimized Toddle autofill with AI, human simulation, and advanced features
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

  document.addEventListener('keydown', (e) => {
    if (!window.TAF || !TAF.Settings) return;
    const hotkey = TAF.Settings.get('hotkey') || 'Delete';
    
    if (e.key === hotkey) {
      e.preventDefault();
      const root = document.getElementById('taf-root');
      if (root) {
        root.classList.toggle('taf-emergency-hidden');
        if (TAF.Utils) TAF.Utils.toast(`Panel ${root.classList.contains('taf-emergency-hidden') ? 'hidden' : 'shown'}`, 'info');
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