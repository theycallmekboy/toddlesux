// modules/taf-ui.js
// toddlesux - Sidebar UI and interaction
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.UI = (function() {
  'use strict';

  const { log, clearLog, setStatus, copyToClipboard } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;
  const Filler = TAF.Filler;

  // AI prompt template (for copy button)
  const AI_PROMPT = `Format your answers exactly like this for toddlesux:

- Start each line with Q followed by the question number, then a colon, then the answer.
  Example: Q1: Britain, France, Russia

- For multiple‑choice questions, just write the correct option text.
- For questions with **multiple blanks**, separate each answer with a pipe symbol (|) with spaces around it.
  Example: Q3: Britain | France | Russia

- If a question has the same answer repeated, just repeat the text.
- Provide ONLY the Q&A lines, one per line, no extra commentary.`;

  // Preset answers (optional)
  const PRESET_ANSWERS = {};

  // ─────────────────────────────────────────────────────────────
  //  Parse bulk import textarea and populate answer rows
  // ─────────────────────────────────────────────────────────────
  function parseBulkImport(textarea, entriesContainer) {
    const raw = textarea.value.trim();
    if (!raw) {
      log('Paste some Q&A pairs first.', 'warn');
      return;
    }

    const lines = raw.split('\n');
    const parsed = [];

    const patterns = [
      /^(?:Q(?:uestion)?\s*)?(\d+(?:\.\d+)?)[:.)]\s*(.+)$/i,  // Q1.1: answer
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

    // Clear existing rows and add new ones
    entriesContainer.innerHTML = '';
    let added = 0;
    for (const item of parsed) {
      addAnswerRow(entriesContainer, item.key, item.val);
      added++;
    }

    log(`Imported ${added} answer(s).`, 'ok');
    setStatus(`${added} LOADED`, true);
    textarea.value = '';
  }

  // ─────────────────────────────────────────────────────────────
  //  Add a single answer row to the container
  // ─────────────────────────────────────────────────────────────
  function addAnswerRow(container, key = '', value = '') {
    const row = document.createElement('div');
    row.className = 'taf-row';
    row.innerHTML = `
      <input class="taf-key" placeholder="q1" value="${TAF.Utils.escHtml(key)}">
      <input class="taf-val" placeholder="answer" value="${TAF.Utils.escHtml(value)}">
      <button class="taf-del" title="Remove">×</button>
    `;
    row.querySelector('.taf-del').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  // ─────────────────────────────────────────────────────────────
  //  Get answers object from UI rows (key -> array of answers)
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  //  Build the entire sidebar UI
  // ─────────────────────────────────────────────────────────────
  function buildSidebar() {
    const root = document.createElement('div');
    root.id = 'taf-root';
    root.classList.add('taf-hidden');

    root.innerHTML = `
      <div id="taf-tab">
        <div id="taf-tab-dot"></div>
        FILL
      </div>
      <div id="taf-panel">
        <div id="taf-header">
          <div id="taf-logo">toddle<span>sux</span></div>
          <div style="display:flex; align-items:center;">
            <div id="taf-status-badge" class="inactive">IDLE</div>
            <button id="taf-settings-btn" title="Settings">⚙️</button>
          </div>
        </div>
        <div id="taf-body">
          <div class="taf-section-label">Answers</div>
          <div id="taf-entries"></div>
          <button class="taf-btn" id="taf-btn-add">+ add answer row</button>

          <div class="taf-section-label">Bulk Import</div>
          <div id="taf-bulk-area">
            <textarea id="taf-bulk-text" placeholder="Paste Q&A pairs like:&#10;Q1: Britain, France, Russia&#10;Q2: Agreements to support...&#10;Q3: Britain | France | Russia"></textarea>
            <div class="taf-bulk-buttons">
              <button class="taf-btn" id="taf-bulk-parse">Parse & Add</button>
              <button class="taf-btn" id="taf-bulk-clear">Clear All</button>
              <button class="taf-btn" id="taf-copy-prompt">📋 AI Prompt</button>
              <button class="taf-btn" id="taf-copy-questions">📄 Copy Questions</button>
            </div>
          </div>

          <div class="taf-btn-row">
            <button class="taf-btn" id="taf-btn-scan">⟳ scan page</button>
            <button class="taf-btn" id="taf-btn-run">▶ fill now</button>
          </div>

          <div class="taf-section-label">Log</div>
          <div id="taf-log"></div>
        </div>
        <div id="taf-footer">toddlesux v4.0 · theycallmekboy & DS</div>
      </div>
    `;
    document.body.appendChild(root);

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
            Simulate human typing (occasional backspace)
          </label>
          <div class="taf-range-row">
            <span style="color:#888;">Chance (0-1):</span>
            <input type="number" id="taf-setting-humanChance" value="${Settings.get('humanTypingChance')}" min="0" max="1" step="0.05" ${!Settings.get('enableHumanTyping') ? 'disabled' : ''}>
          </div>
        </div>
        <div class="taf-modal-footer">
          <button class="taf-modal-close">Cancel</button>
          <button class="primary" id="taf-save-settings">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Get elements
    const tab = root.querySelector('#taf-tab');
    const entries = root.querySelector('#taf-entries');
    const btnAdd = root.querySelector('#taf-btn-add');
    const btnScan = root.querySelector('#taf-btn-scan');
    const btnRun = root.querySelector('#taf-btn-run');
    const bulkText = root.querySelector('#taf-bulk-text');
    const btnParse = root.querySelector('#taf-bulk-parse');
    const btnClear = root.querySelector('#taf-bulk-clear');
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

    // Initialize answer rows
    Object.entries(PRESET_ANSWERS).forEach(([k, v]) => addAnswerRow(entries, k, v));
    if (!Object.keys(PRESET_ANSWERS).length) {
      addAnswerRow(entries);
      addAnswerRow(entries);
    }

    // Toggle sidebar
    tab.addEventListener('click', () => {
      root.classList.toggle('taf-hidden');
    });

    // Add row
    btnAdd.addEventListener('click', () => addAnswerRow(entries));

    // Scan page
    btnScan.addEventListener('click', Scanner.scanPage);

    // Run fill
    btnRun.addEventListener('click', () => {
      const answers = getAnswersFromUI(entries);
      Filler.runFill(answers);
    });

    // Bulk import
    btnParse.addEventListener('click', () => parseBulkImport(bulkText, entries));
    btnClear.addEventListener('click', () => {
      entries.innerHTML = '';
      addAnswerRow(entries);
      addAnswerRow(entries);
      clearLog();
      log('Answer rows cleared.', 'info');
    });

    // Copy AI prompt
    btnCopyPrompt.addEventListener('click', async () => {
      const success = await copyToClipboard(AI_PROMPT);
      log(success ? '✅ AI prompt copied!' : '❌ Failed to copy', success ? 'ok' : 'err');
    });

    // Copy questions
    btnCopyQuestions.addEventListener('click', Scanner.copyAllQuestions);

    // Settings modal
    settingsBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    modalClose.forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));
    
    delayCheck.addEventListener('change', () => {
      minDelay.disabled = !delayCheck.checked;
      maxDelay.disabled = !delayCheck.checked;
    });
    humanCheck.addEventListener('change', () => {
      humanChance.disabled = !humanCheck.checked;
    });

    btnSaveSettings.addEventListener('click', () => {
      Settings.set('enableRandomDelays', delayCheck.checked);
      Settings.set('minDelay', parseInt(minDelay.value, 10) || 300);
      Settings.set('maxDelay', parseInt(maxDelay.value, 10) || 900);
      Settings.set('enableHumanTyping', humanCheck.checked);
      Settings.set('humanTypingChance', parseFloat(humanChance.value) || 0.2);
      modal.classList.add('hidden');
      log('Settings saved.', 'ok');
    });

    // Emergency hide (F1) already handled in core
  }

  return { buildSidebar, addAnswerRow, getAnswersFromUI };

})();
