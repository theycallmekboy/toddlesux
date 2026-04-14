// modules/taf-utils.js
// toddlesux - Shared utilities with safe content handling and updated APIs
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Utils = (function() {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const escHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  // --- Unified log/toast dispatcher ---
  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer) { toastContainer = document.createElement('div'); toastContainer.id = 'taf-toast-container'; document.body.appendChild(toastContainer); }
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toastEl = document.createElement('div');
    toastEl.className = `taf-toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
    toastEl.textContent = `${icons[type] || 'ℹ️'} ${message}`; // Safe
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
    line.innerHTML = `<span class="taf-tag">${tagMap[type]||'INFO'}</span><span class="taf-msg"></span>`;
    line.querySelector('.taf-msg').textContent = msg; // Safe
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    if (type === 'ok') showToast(msg, 'success', 2000);
    else if (type === 'err') showToast(msg, 'error', 4000);
  };

  const clearLog = () => { const el = document.getElementById('taf-log'); if (el) { el.innerHTML = ''; el.classList.remove('visible'); } };
  const setStatus = (text, active = true) => {
    const badge = document.getElementById('taf-status-badge');
    if (!badge) return;
    badge.textContent = text; // Safe
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
    catch { showToast('Clipboard failed', 'error'); return false; }
  };

  // --- SSE Parsing with Buffer (Fixes duplication and fragmentation) ---
  let sseBuffer = '';
  function parseSSE(textPart, onChunk, format) {
    sseBuffer += textPart;
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop(); // Keep partial line

    let fullText = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      const dataStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed;
      try {
        const p = JSON.parse(dataStr);
        let chunk = '';
        if (format === 'openai') {
          chunk = p.choices?.[0]?.delta?.content || '';
        } else if (format === 'anthropic') {
          if (p.type === 'content_block_delta') chunk = p.delta?.text || '';
        } else if (format === 'gemini') {
          chunk = p.candidates?.[0]?.content?.parts?.[0]?.text || p.content?.parts?.[0]?.text || '';
        }
        if (chunk) {
          fullText += chunk;
          if (onChunk) onChunk(chunk, fullText);
        }
      } catch (e) {}
    }
    return fullText;
  }

  async function callAI(prompt, onChunk) {
    const provider = TAF.Settings.get('aiProvider');
    const model = TAF.Settings.get(provider + 'Model') || (provider === 'github' ? 'gpt-4o' : provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const configs = {
      openai: { url: 'https://api.openai.com/v1/chat/completions', key: TAF.Settings.get('openaiApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }), format: 'openai' },
      gemini: { url: () => `https://generativelanguage.googleapis.com/v1beta/models/${model}:${onChunk ? 'streamGenerateContent?alt=sse&' : 'generateContent?'}key=${TAF.Settings.get('geminiApiKey')}`, key: TAF.Settings.get('geminiApiKey'), headers: () => ({ 'Content-Type': 'application/json' }), body: () => ({ contents: [{ parts: [{ text: prompt }] }] }), format: 'gemini' },
      claude: { url: 'https://api.anthropic.com/v1/messages', key: TAF.Settings.get('claudeApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'x-api-key': k, 'anthropic-version': '2023-06-01' }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.3, stream: !!onChunk }), format: 'anthropic' },
      github: { url: 'https://models.inference.ai.azure.com/chat/completions', key: TAF.Settings.get('githubToken'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }), format: 'openai' },
      groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: TAF.Settings.get('groqApiKey'), headers: (k) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` }), body: (m) => ({ model: m, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk }), format: 'openai' }
    };
    
    const cfg = configs[provider];
    if (!cfg || !cfg.key) { showToast(`${provider} API key not set`, 'error'); return null; }

    return new Promise((resolve) => {
      const url = typeof cfg.url === 'function' ? cfg.url() : cfg.url;
      const body = JSON.stringify(cfg.body(model));
      let lastIndex = 0;
      let totalCaptured = '';
      sseBuffer = ''; 

      GM_xmlhttpRequest({
        method: 'POST', url: url, headers: cfg.headers(cfg.key), data: body,
        onprogress: (response) => {
          if (!onChunk || !response.responseText) return;
          const newPart = response.responseText.slice(lastIndex);
          lastIndex = response.responseText.length;
          totalCaptured += parseSSE(newPart, onChunk, cfg.format);
        },
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            if (lastIndex < response.responseText.length) {
              totalCaptured += parseSSE(response.responseText.slice(lastIndex), null, cfg.format);
            }
            resolve(totalCaptured || parseSSE(response.responseText, null, cfg.format));
          } else {
            let errorMsg = 'API error';
            try { const e = JSON.parse(response.responseText); errorMsg = e.error?.message || errorMsg; } catch {}
            showToast(`AI error: ${errorMsg}`, 'error'); resolve(null);
          }
        },
        onerror: () => { showToast('AI request failed (CORS/Network)', 'error'); resolve(null); }
      });
    });
  }

  return { sleep, escHtml, log, clearLog, setStatus, highlight, clearHighlights, setNativeValue, copyToClipboard, callAI, toast: showToast };
})();