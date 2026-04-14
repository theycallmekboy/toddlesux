// ==UserScript==
// @name         toddlesux
// @namespace    http://tampermonkey.net/
// @version      6.3
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

  // --- Execution mutex ---
  let isFilling = false;
  window.TAF = window.TAF || {};
  TAF.__isFilling = () => isFilling;
  TAF.__setFilling = (v) => { isFilling = v; };

  // --- Hotkey safety ---
  const isTyping = () => {
    const el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute('role') === 'textbox');
  };

  let lastHotkeyTime = 0;
  const DOUBLE_TAP_MS = 300;

  document.addEventListener('keydown', (e) => {
    if (!window.TAF || !TAF.Settings) return;
    
    // Don't trigger while user is typing
    const active = document.activeElement;
    const isTyping = active && (
      active.tagName === 'INPUT' || 
      active.tagName === 'TEXTAREA' || 
      active.isContentEditable || 
      active.getAttribute('role') === 'textbox'
    );
    if (isTyping) return;

    const hotkey = TAF.Settings.get('hotkey') || 'Delete';
    
    if (e.key === hotkey) {
      e.preventDefault();
      const root = document.getElementById('taf-root');
      if (!root) return;

      const now = Date.now();
      const isDoubleTap = (now - lastHotkeyTime) < DOUBLE_TAP_MS;
      lastHotkeyTime = now;

      if (isDoubleTap && root.classList.contains('taf-visible') && !root.classList.contains('taf-emergency-hidden')) {
        TAF.Settings.set('panelX', null);
        TAF.Settings.set('panelY', null);
        TAF.Settings.set('panelWidth', 360);
        TAF.Settings.set('panelHeight', null);
        root.style.left = ''; root.style.top = '50%'; root.style.right = '20px'; root.style.transform = 'translateY(-50%)'; root.style.width = '360px'; root.style.height = '';
        if (TAF.Utils) TAF.Utils.toast('Panel position reset', 'info');
        return;
      }

      root.classList.toggle('taf-emergency-hidden');
      if (TAF.Utils) TAF.Utils.toast(`Panel ${root.classList.contains('taf-emergency-hidden') ? 'hidden' : 'shown'}`, 'info');
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      if (!isTyping() && TAF.Scanner) TAF.Scanner.scanPage();
    }
    if (e.ctrlKey && e.key === 'Enter') {
      const root = document.getElementById('taf-root');
      if (root && !root.classList.contains('taf-emergency-hidden') && !isTyping()) {
        e.preventDefault();
        const btn = document.getElementById('taf-btn-run');
        if (btn && !isFilling) btn.click();
      }
    }
  });

  // --- MutationObserver with debounce ---
  let observer = null, debounceTimer = null;
  function initObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (TAF.Scanner) TAF.Scanner.invalidateCache();
      }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --- SPA navigation detection ---
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  history.pushState = function(...args) {
    originalPush.apply(this, args);
    handleNavigation();
  };
  history.replaceState = function(...args) {
    originalReplace.apply(this, args);
    handleNavigation();
  };
  window.addEventListener('popstate', handleNavigation);
  function handleNavigation() {
    if (TAF.Scanner) TAF.Scanner.invalidateCache();
    if (TAF.UI && typeof TAF.UI.resetForNavigation === 'function') TAF.UI.resetForNavigation();
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