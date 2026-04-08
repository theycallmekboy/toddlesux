// modules/taf-utils.js
// toddlesux - Utility functions with OpenAI API
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
      return true;
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  };

  // OpenAI API call
  const callOpenAI = async (questionsText, onChunk) => {
    const apiKey = TAF.Settings.get('openaiApiKey');
    if (!apiKey) {
      log('❌ OpenAI API key not set. Add it in Settings → General.', 'err');
      return null;
    }

    const prompt = `${TAF.Settings.get('aiPrompt')}\n\nQuestions:\n${questionsText}\n\nProvide ONLY the answers:`;
    const model = TAF.Settings.get('aiModel');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          stream: !!onChunk
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'API error');
      }

      if (onChunk) {
        // Streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              fullText += content;
              onChunk(content, fullText);
            } catch (e) {}
          }
        }
        return fullText;
      } else {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (err) {
      log(`❌ OpenAI error: ${err.message}`, 'err');
      return null;
    }
  };

  return {
    sleep,
    escHtml,
    log,
    clearLog,
    setStatus,
    highlight,
    setNativeValue,
    copyToClipboard,
    callOpenAI
  };
})();
