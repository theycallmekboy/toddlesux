// modules/taf-utils.js
// toddlesux - Utility functions with multi-AI provider support and toasts
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Utils = (function() {
  'use strict';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const escHtml = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Toast container
  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'taf-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `taf-toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${escHtml(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

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
    // Also show toast for important messages
    if (type === 'ok') toast(msg, 'success', 2000);
    else if (type === 'err') toast(msg, 'error', 4000);
  };

  const clearLog = () => {
    const el = document.getElementById('taf-log');
    if (el) { el.innerHTML = ''; el.classList.remove('visible'); }
  };

  const setStatus = (text, active = true) => {
    const badge = document.getElementById('taf-status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = active ? '' : 'inactive';
  };

  const highlight = (el) => {
    if (!el) return;
    el.classList.add('taf-filled-ok');
    setTimeout(() => el.classList.remove('taf-filled-ok'), 2500);
  };

  const setNativeValue = (element, value) => {
    const proto = element.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard', 'success');
      return true;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) toast('Copied to clipboard', 'success');
      else toast('Failed to copy', 'error');
      return success;
    }
  };

  // Multi-provider AI (same as before, omitted for brevity but unchanged)
  const callAI = async (questionsText, onChunk) => {
    const provider = TAF.Settings.get('aiProvider');
    const prompt = `${TAF.Settings.get('aiPrompt')}\n\nQuestions:\n${questionsText}\n\nProvide ONLY the answers:`;

    switch (provider) {
      case 'openai':
        return await callOpenAI(prompt, onChunk);
      case 'gemini':
        return await callGemini(prompt, onChunk);
      case 'claude':
        return await callClaude(prompt, onChunk);
      case 'github':
        return await callGitHubModels(prompt, onChunk);
      case 'groq':
        return await callGroq(prompt, onChunk);
      default:
        log(`❌ Unknown AI provider: ${provider}`, 'err');
        return null;
    }
  };

  // OpenAI
  async function callOpenAI(prompt, onChunk) {
    const apiKey = TAF.Settings.get('openaiApiKey');
    if (!apiKey) { log('❌ OpenAI API key not set.', 'err'); return null; }
    const model = TAF.Settings.get('openaiModel');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message); }
      if (onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try { const p = JSON.parse(data); const c = p.choices[0]?.delta?.content || ''; full += c; onChunk(c, full); } catch {}
          }
        }
        return full;
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (err) {
      log(`❌ OpenAI: ${err.message}`, 'err');
      return null;
    }
  }

  // Google Gemini
  async function callGemini(prompt, onChunk) {
    const apiKey = TAF.Settings.get('geminiApiKey');
    if (!apiKey) { log('❌ Gemini API key not set.', 'err'); return null; }
    const model = TAF.Settings.get('geminiModel');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message); }
      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text || '';
      if (onChunk) { onChunk(text, text); } // Gemini doesn't support streaming in free tier well
      return text;
    } catch (err) {
      log(`❌ Gemini: ${err.message}`, 'err');
      return null;
    }
  }

  // Anthropic Claude
  async function callClaude(prompt, onChunk) {
    const apiKey = TAF.Settings.get('claudeApiKey');
    if (!apiKey) { log('❌ Claude API key not set.', 'err'); return null; }
    const model = TAF.Settings.get('claudeModel');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.3 })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message); }
      const data = await response.json();
      const text = data.content[0]?.text || '';
      if (onChunk) onChunk(text, text);
      return text;
    } catch (err) {
      log(`❌ Claude: ${err.message}`, 'err');
      return null;
    }
  }

  // GitHub Models
  async function callGitHubModels(prompt, onChunk) {
    const token = TAF.Settings.get('githubToken');
    if (!token) { log('❌ GitHub token not set.', 'err'); return null; }
    const model = TAF.Settings.get('githubModel');

    try {
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message); }
      if (onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try { const p = JSON.parse(data); const c = p.choices[0]?.delta?.content || ''; full += c; onChunk(c, full); } catch {}
          }
        }
        return full;
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (err) {
      log(`❌ GitHub Models: ${err.message}`, 'err');
      return null;
    }
  }

  // Groq
  async function callGroq(prompt, onChunk) {
    const apiKey = TAF.Settings.get('groqApiKey');
    if (!apiKey) { log('❌ Groq API key not set.', 'err'); return null; }
    const model = TAF.Settings.get('groqModel');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, stream: !!onChunk })
      });
      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message); }
      if (onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try { const p = JSON.parse(data); const c = p.choices[0]?.delta?.content || ''; full += c; onChunk(c, full); } catch {}
          }
        }
        return full;
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (err) {
      log(`❌ Groq: ${err.message}`, 'err');
      return null;
    }
  }

  return {
    sleep, escHtml, log, clearLog, setStatus, highlight, setNativeValue, copyToClipboard, callAI
  };
})();
