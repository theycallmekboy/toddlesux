// modules/taf-utils.js
// toddlesux - Utility functions
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Utils = (function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  //  Sleep / delay
  // ─────────────────────────────────────────────────────────────
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ─────────────────────────────────────────────────────────────
  //  Escape HTML (for log messages)
  // ─────────────────────────────────────────────────────────────
  const escHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // ─────────────────────────────────────────────────────────────
  //  Logging to the sidebar panel
  // ─────────────────────────────────────────────────────────────
  const log = (msg, type = 'info') => {
    const el = document.getElementById('taf-log');
    if (!el) return;
    el.classList.add('visible');
    const line = document.createElement('div');
    line.className = `taf-log-line taf-${type}`;
    const tagMap = { ok: 'DONE', warn: 'WARN', err: 'FAIL', info: 'INFO' };
    line.innerHTML = `<span class="taf-tag">${tagMap[type] || 'INFO'}</span><span class="taf-msg">${escHtml(msg)}</span>`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  };

  const clearLog = () => {
    const el = document.getElementById('taf-log');
    if (el) {
      el.innerHTML = '';
      el.classList.remove('visible');
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Status badge
  // ─────────────────────────────────────────────────────────────
  const setStatus = (text, active = true) => {
    const badge = document.getElementById('taf-status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = active ? '' : 'inactive';
  };

  // ─────────────────────────────────────────────────────────────
  //  Highlight element (visual feedback)
  // ─────────────────────────────────────────────────────────────
  const highlight = (el) => {
    if (!el) return;
    el.classList.add('taf-filled-ok');
    setTimeout(() => el.classList.remove('taf-filled-ok'), 2500);
  };

  // ─────────────────────────────────────────────────────────────
  //  React‑safe value setter (bypasses React's synthetic events)
  // ─────────────────────────────────────────────────────────────
  const setNativeValue = (element, value) => {
    const proto = element.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Clipboard write with fallback
  // ─────────────────────────────────────────────────────────────
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  Public API
  // ─────────────────────────────────────────────────────────────
  return {
    sleep,
    escHtml,
    log,
    clearLog,
    setStatus,
    highlight,
    setNativeValue,
    copyToClipboard
  };

})();
