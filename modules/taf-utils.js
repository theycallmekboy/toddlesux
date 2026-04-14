// modules/taf-utils.js
// toddlesux - Shared utilities with consolidated streaming
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Utils = (function() {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const escHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'taf-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toastEl = document.createElement('div');
    toastEl.className = `taf-toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
    toastEl.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${escHtml(message)}`;
    container.appendChild(toastEl);
    requestAnimationFrame(() => requestAnimationFrame(() => toastEl.classList.add('taf-toast-in')));
    const removeToast = () => {
      if (toastEl.isConnected) {
        toastEl.classList.add('hiding');
        const onEnd = () => { if (toastEl.isConnected) toastEl.remove(); toastEl.removeEventListener('transitionend', onEnd); };
        toastEl.addEventListener('transitionend', onEnd);
        setTimeout(() => { if (toastEl.isConnected) toastEl.remove(); }, 500);
      }
    };
    setTimeout(removeToast, duration);
  }

  const log = (msg, type = 'info') => {
    const el = document.getElementById('taf-log');
    if (!el) return;
    el.classList.add('visible');
    const line = document.createElement('div');
    line.className = `taf-log-line taf-${type}`;
    const tagMap = { ok:'DONE', warn:'WARN', err:'FAIL', info:'INFO' };
    line.innerHTML = `<span class="taf-tag">${tagMap[type]||'INFO'}</span><span class="taf-msg">${escHtml(msg)}</span>`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    if (type === 'ok') showToast(msg, 'success', 2000);
    else if (type === 'err') showToast(msg, 'error', 4000);
  };

  const clearLog = () => { const el = document.getElementById('taf-log'); if (el) { el.innerHTML = ''; el.classList.remove('visible'); } };
  const setStatus = (text, active = true) => {
    const badge = document.getElementById('taf-status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = active ? '' : 'inactive';
  };

  const highlight = (el) => { if (el) el.classList.add('taf-filled-ok'); };
  const clearHighlights = () => { document.querySelectorAll('.taf-filled-ok').forEach(el => el.classList.remove('taf-filled-ok')); };

  const setNativeValue = (element, value) => {
    const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
  };

  const copyToClipboard = async (text) => {
    try { await navigator.clipboard.writeText(text); showToast('Copied', 'success'); return true; }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); showToast(ok ? 'Copied' : 'Failed', ok ? 'success' : 'error'); return ok; }
  };

  async function streamCompat(response, onChunk) {
    const reader = response.body.getReader(), decoder = new TextDecoder(); let full = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const data = line.slice(6); if (data === '[DONE]') continue;
        try { const p = JSON.parse(data); const c = p.choices?.[0]?.delta?.content || ''; full += c; onChunk(c, full); } catch {}
      }
    }
    return full;
  }

  async function callAI(prompt, onChunk) {
    const provider = TAF.Settings.get('aiProvider'), model = TAF.Settings.get(provider + 'Model') || (provider === 'github' ? 'gpt-4o' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');
    const configs = {
      openai: { url: 'https://api.openai.com/v1/chat/completions', key: TAF.Settings.get('openaiApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }) },
      gemini: { url: () => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${TAF.Settings.get('geminiApiKey')}`, key: TAF.Settings.get('geminiApiKey'), headers: () => ({ 'Content-Type': 'application/json' }), body: () => ({ contents: [{ parts: [{ text: prompt }] }] }), parse: (d) => d.candidates?.[0]?.content?.parts?.[0]?.text || '' },
      claude: { url: 'https://api.anthropic.com/v1/messages', key: TAF.Settings.get('claudeApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.3, stream: !!onChunk }), parseStream: (d) => d.type === 'content_block_delta' ? d.delta?.text || '' : '' },
      github: { url: 'https://models.inference.ai.azure.com/chat/completions', key: TAF.Settings.get('githubToken'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }) },
      groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: TAF.Settings.get('groqApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }) }
    };
    const cfg = configs[provider];
    if (!cfg) { showToast(`Unknown provider: ${provider}`, 'error'); return null; }
    if (!cfg.key) { showToast(`${provider} API key not set`, 'error'); return null; }
    try {
      const url = typeof cfg.url === 'function' ? cfg.url() : cfg.url;
      const res = await fetch(url, { method: 'POST', headers: cfg.headers(cfg.key), body: JSON.stringify(cfg.body(model)) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'API error'); }
      if (provider === 'gemini') { const d = await res.json(); const t = cfg.parse(d); if (onChunk) onChunk(t, t); return t; }
      if (onChunk) {
        if (provider === 'claude') {
          const reader = res.body.getReader(), decoder = new TextDecoder(); let full = '';
          while (true) { const { done, value } = await reader.read(); if (done) break; const chunk = decoder.decode(value); const lines = chunk.split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); const c = cfg.parseStream(d); full += c; onChunk(c, full); } catch {} } }
          return full;
        }
        return await streamCompat(res, onChunk);
      } else { const d = await res.json(); return d.choices?.[0]?.message?.content || d.content?.[0]?.text || ''; }
    } catch (err) { showToast(`AI error: ${err.message}`, 'error'); return null; }
  }

  return { sleep, escHtml, log, clearLog, setStatus, highlight, clearHighlights, setNativeValue, copyToClipboard, callAI, toast: showToast };
})();