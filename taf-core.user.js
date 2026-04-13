// ==UserScript==
// @name         toddlesux
// @namespace    http://tampermonkey.net/
// @version      0.0.16
// @description  Auto-fills Toddle forms with human-like delays, ChatGPT integration, and sleek UI
// @author       theycallmekboy - made with DS
// @match        https://web.toddleapp.com/*
// @match        https://*.toddleapp.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @downloadURL  https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/taf-core.user.js
// @updateURL    https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/taf-core.user.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-utils.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-styles.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-settings.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-scanner.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-filler.js
// @require      https://raw.githubusercontent.com/theycallmekboy/toddlesux/refs/heads/gpt/modules/taf-ui.js
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  document.addEventListener('keydown', (e) => {
    if (!window.TAF || !TAF.Settings) return;
    const hotkey = TAF.Settings.get('hotkey') || 'Delete';
    if (e.key === hotkey || e.code === hotkey) {
      e.preventDefault();
      const root = document.getElementById('taf-root');
      if (root) {
        root.classList.toggle('taf-emergency-hidden');
        if (TAF.Utils) {
          TAF.Utils.log(root.classList.contains('taf-emergency-hidden') ? 'Panel hidden' : 'Panel shown', 'info');
        }
      }
    }
  });

  function init() {
    if (typeof window.TAF === 'undefined' || !TAF.UI) {
      console.error('[toddlesux] Modules not loaded.');
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
