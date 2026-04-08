// modules/taf-ui.js
// toddlesux - Sidebar UI and interaction
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.UI = (function() {
  'use strict';

  const { log, clearLog, setStatus, copyToClipboard, escHtml } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;
  const Filler = TAF.Filler;

  const PRESET_ANSWERS = {};

  function parseBulkImport(textarea, entriesContainer) {
    const raw = textarea.value.trim();
    if (!raw) {
      log('Paste some Q&A pairs first.', 'warn');
      return;
    }

    const lines = raw.split('\n');
    const parsed = [];

    const patterns = [
      /^(?:Q(?:uestion)?\s*)?(\d+(?:\.\d+)?)[:.)]\s*(.+)$/i,
      /^(\d+(?:\.\d+)?)\s*[-–—]\s*(.+)$/,
      /^(\d+(?:\.\d+)?)\s+(.+)$/
    ];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let matched = false;
      for (const regex of patterns) {
        const m = trimmed.match(regex);
        if (m) {
          const num = m[1];
          const answer = m[2].trim();
          if (num && answer) {
            parsed.push({ key: `q${num}`, val: answer });
            matched = true;
            break;
          }
        }
      }
      if (!matched) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const keyword = trimmed.slice(0, colonIdx).trim();
          const answer = trimmed.slice(colonIdx + 1).trim();
          if (keyword && answer) {
            parsed.push({ key: keyword, val: answer });
            matched = true;
          }
        }
      }
      if (!matched) {
        log(`Skipped line: "${trimmed.slice(0, 40)}"`, 'warn');
      }
    }

    if (parsed.length === 0) {
      log('No valid Q&A pairs found. Use format "Q1: answer" or "1. answer".', 'warn');
      return;
    }

    entriesContainer.innerHTML = '';
    let added = 0;
    for (const item of parsed) {
      addAnswerRow(entriesContainer, item.key, item.val);
      added++;
    }

    log(`✅ Imported ${added} answer(s).`, 'ok');
    setStatus(`${added} LOADED`, true);
    textarea.value = '';
  }

  function addAnswerRow(container, key = '', value = '') {
    const row = document.createElement('div');
    row.className = 'taf-row';
    row.innerHTML = `
      <input class="taf-key" placeholder="q1 / keyword" value="${escHtml(key)}">
      <input class="taf-val" placeholder="answer (use | for blanks)" value="${escHtml(value)}">
      <button class="taf-del" title="Remove">×</button>
    `;
    row.querySelector('.taf-del').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  function getAnswersFromUI(container) {
    const map = {};
    container.querySelectorAll('.taf-row').forEach(row => {
      const keyInput = row.querySelector('.taf-key');
      const valInput = row.querySelector('.taf-val');
      if (!keyInput || !valInput) return;
      const k = keyInput.value.trim().toLowerCase();
      const v = valInput.value.trim();
      if (k && v) {
        map[k] = v.split('|').map(s => s.trim()).filter(s => s !== '');
      }
    });
    return map;
  }

  function buildSidebar() {
    const root = document.createElement('div');
    root.id = 'taf-root';
    root.classList.add('taf-hidden');

    const showAnswerRows = Settings.get('showAnswerRows');
    const showLogPanel = Settings.get('showLogPanel');

    root.innerHTML = `
      <div id="taf-panel">
        <div id="taf-header">
          <div id="taf-logo">toddle<span>sux</span></div>
          <div style="display:flex; align-items:center;">
            <div id="taf-status-badge" class="inactive">IDLE</div>
            <button id="taf-settings-btn" title="Settings">⚙️</button>
          </div>
        </div>
        <div id="taf-body">
          <div id="taf-answer-section" style="display: ${showAnswerRows ? 'block' : 'none'};">
            <div class="taf-section-label">Answers (use | for blanks)</div>
            <div id="taf-entries"></div>
            <button class="taf-btn" id="taf-btn-add">+ add answer row</button>
          </div>

          <div class="taf-section-label">Bulk Import</div>
          <div id="taf-bulk-area">
            <textarea id="taf-bulk-text" placeholder="Paste Q&A pairs like:&#10;Q1: Britain, France, Russia&#10;Q2: Agreements to support...&#10;Q3: Treaty of Versailles | hyperinflation | worthless"></textarea>
            <div class="taf-bulk-buttons">
              <button class="taf-btn" id="taf-bulk-parse">Parse & Add</button>
              <button class="taf-btn" id="taf-bulk-clear">Clear All</button>
              <button class="taf-btn" id="taf-paste-answers">📋 Paste</button>
              <button class="taf-btn" id="taf-copy-prompt">📋 AI Prompt</button>
              <button class="taf-btn" id="taf-copy-questions">📄 Copy Questions</button>
            </div>
          </div>

          <div class="taf-btn-row">
            <button class="taf-btn" id="taf-btn-scan">⟳ scan page</button>
            <button class="taf-btn" id="taf-btn-run">▶ fill now</button>
          </div>

          <div class="taf-section-label">Log</div>
          <div id="taf-log" style="display: ${showLogPanel ? 'block' : 'none'};"></div>
        </div>
        <div id="taf-footer">toddlesux v4.2 · theycallmekboy & DS</div>
      </div>
    `;
    document.body.appendChild(root);

    // Draggable header
    const header = root.querySelector('#taf-header');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      const rect = root.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      root.style.transition = 'none';
      root.style.right = 'auto';
      root.style.transform = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      root.style.left = (startLeft + dx) + 'px';
      root.style.top = (startTop + dy) + 'px';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      root.style.transition = '';
    });

    // Settings modal
    const modal = document.createElement('div');
    modal.id = 'taf-settings-modal';
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="taf-modal-content">
        <div class="taf-modal-header">
          <h3>⚙️ Settings</h3>
          <button class="taf-modal-close">&times;</button>
        </div>
        <div class="taf-setting-item">
          <label>
            <input type="checkbox" id="taf-setting-delay" ${Settings.get('enableRandomDelays') ? 'checked' : ''}>
            Enable random delays between answers
          </label>
          <div class="taf-range-row">
            <span style="color:#888;">Min (ms):</span>
            <input type="number" id="taf-setting-minDelay" value="${Settings.get('minDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''}>
            <span style="color:#888; margin-left:8px;">Max:</span>
            <input type="number" id="taf-setting-maxDelay" value="${Settings.get('maxDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''}>
          </div>
        </div>
        <div class="taf-setting-item">
          <label>
            <input type="checkbox" id="taf-setting-human" ${Settings.get('enableHumanTyping') ? 'checked' : ''}>
            Simulate human mistakes (backspace & retype)
          </label>
          <div class="taf-range-row">
            <span style="color:#888;">Chance (0-1):</span>
            <input type="number" id="taf-setting-humanChance" value="${Settings.get('humanTypingChance')}" min="0" max="1" step="0.05" ${!Settings.get('enableHumanTyping') ? 'disabled' : ''}>
          </div>
        </div>
        <div class="taf-setting-item">
          <label>
            <input type="checkbox" id="taf-setting-charTyping" ${Settings.get('enableCharTyping') ? 'checked' : ''}>
            Type characters one by one (realistic)
          </label>
          <div class="taf-range-row">
            <span style="color:#888;">Delay per char (ms):</span>
            <input type="number" id="taf-setting-charDelay" value="${Settings.get('charTypingDelay')}" min="10" max="500" step="10" ${!Settings.get('enableCharTyping') ? 'disabled' : ''}>
          </div>
        </div>
        <div class="taf-setting-item">
          <label style="justify-content: space-between;">
            <span>Delay after question (ms):</span>
            <input type="number" id="taf-setting-questionDelay" value="${Settings.get('questionDelay')}" min="0" max="5000" step="100" style="width:100px;">
          </label>
        </div>
        <div class="taf-setting-item">
          <label>
            <input type="checkbox" id="taf-setting-showAnswers" ${Settings.get('showAnswerRows') ? 'checked' : ''}>
            Show answer rows section
          </label>
        </div>
        <div class="taf-setting-item">
          <label>
            <input type="checkbox" id="taf-setting-showLog" ${Settings.get('showLogPanel') ? 'checked' : ''}>
            Show log panel
          </label>
        </div>
        <div class="taf-setting-item">
          <label style="display:block; margin-bottom:6px;">AI Prompt (used by 📋 AI Prompt button)</label>
          <textarea id="taf-setting-aiPrompt" style="width:100%; height:150px; background:#18182a; border:1px solid #2c2c42; color:#d8d8e8; font-size:10px; padding:6px; resize:vertical;">${escHtml(Settings.get('aiPrompt'))}</textarea>
        </div>
        <div class="taf-modal-footer">
          <button class="taf-modal-close">Cancel</button>
          <button class="primary" id="taf-save-settings">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Elements
    const entries = root.querySelector('#taf-entries');
    const btnAdd = root.querySelector('#taf-btn-add');
    const btnScan = root.querySelector('#taf-btn-scan');
    const btnRun = root.querySelector('#taf-btn-run');
    const bulkText = root.querySelector('#taf-bulk-text');
    const btnParse = root.querySelector('#taf-bulk-parse');
    const btnClear = root.querySelector('#taf-bulk-clear');
    const btnPaste = root.querySelector('#taf-paste-answers');
    const btnCopyPrompt = root.querySelector('#taf-copy-prompt');
    const btnCopyQuestions = root.querySelector('#taf-copy-questions');
    const settingsBtn = root.querySelector('#taf-settings-btn');
    const modalClose = modal.querySelectorAll('.taf-modal-close');
    const btnSaveSettings = modal.querySelector('#taf-save-settings');
    const delayCheck = modal.querySelector('#taf-setting-delay');
    const minDelay = modal.querySelector('#taf-setting-minDelay');
    const maxDelay = modal.querySelector('#taf-setting-maxDelay');
    const humanCheck = modal.querySelector('#taf-setting-human');
    const humanChance = modal.querySelector('#taf-setting-humanChance');
    const charTypingCheck = modal.querySelector('#taf-setting-charTyping');
    const charDelay = modal.querySelector('#taf-setting-charDelay');
    const questionDelay = modal.querySelector('#taf-setting-questionDelay');
    const showAnswersCheck = modal.querySelector('#taf-setting-showAnswers');
    const showLogCheck = modal.querySelector('#taf-setting-showLog');
    const aiPromptTextarea = modal.querySelector('#taf-setting-aiPrompt');

    // Initialize answer rows
    Object.entries(PRESET_ANSWERS).forEach(([k, v]) => addAnswerRow(entries, k, v));
    if (!Object.keys(PRESET_ANSWERS).length) {
      addAnswerRow(entries);
      addAnswerRow(entries);
    }

    // Event listeners
    btnAdd.addEventListener('click', () => addAnswerRow(entries));
    btnScan.addEventListener('click', Scanner.scanPage);
    btnRun.addEventListener('click', () => {
      if (Filler.isRunning()) {
        Filler.stopFill();
      } else {
        const answers = getAnswersFromUI(entries);
        Filler.runFill(answers);
      }
    });
    btnParse.addEventListener('click', () => parseBulkImport(bulkText, entries));
    btnClear.addEventListener('click', () => {
      entries.innerHTML = '';
      addAnswerRow(entries); addAnswerRow(entries);
      clearLog();
      log('Answer rows cleared.', 'info');
    });
    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        bulkText.value = text;
        log('✅ Pasted from clipboard', 'ok');
      } catch (err) {
        log('❌ Failed to read clipboard', 'err');
      }
    });
    btnCopyPrompt.addEventListener('click', async () => {
      const success = await copyToClipboard(Settings.get('aiPrompt'));
      log(success ? '✅ AI prompt copied!' : '❌ Failed to copy', success ? 'ok' : 'err');
    });
    btnCopyQuestions.addEventListener('click', Scanner.copyAllQuestions);

    settingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    modalClose.forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));

    delayCheck.addEventListener('change', () => {
      minDelay.disabled = !delayCheck.checked;
      maxDelay.disabled = !delayCheck.checked;
    });
    humanCheck.addEventListener('change', () => {
      humanChance.disabled = !humanCheck.checked;
    });
    charTypingCheck.addEventListener('change', () => {
      charDelay.disabled = !charTypingCheck.checked;
    });

    btnSaveSettings.addEventListener('click', () => {
      Settings.set('enableRandomDelays', delayCheck.checked);
      Settings.set('minDelay', parseInt(minDelay.value, 10) || 300);
      Settings.set('maxDelay', parseInt(maxDelay.value, 10) || 900);
      Settings.set('enableHumanTyping', humanCheck.checked);
      Settings.set('humanTypingChance', parseFloat(humanChance.value) || 0.2);
      Settings.set('enableCharTyping', charTypingCheck.checked);
      Settings.set('charTypingDelay', parseInt(charDelay.value, 10) || 50);
      Settings.set('questionDelay', parseInt(questionDelay.value, 10) || 500);
      Settings.set('showAnswerRows', showAnswersCheck.checked);
      Settings.set('showLogPanel', showLogCheck.checked);
      Settings.set('aiPrompt', aiPromptTextarea.value);

      document.getElementById('taf-answer-section').style.display = showAnswersCheck.checked ? 'block' : 'none';
      document.getElementById('taf-log').style.display = showLogCheck.checked ? 'block' : 'none';

      modal.classList.add('hidden');
      log('Settings saved.', 'ok');
    });
  }

  return { buildSidebar, addAnswerRow, getAnswersFromUI };
})();
