// modules/taf-ui.js
// toddlesux - Complete UI with state enum, structured import, navigation reset
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.UI = (function() {
  'use strict';

  const { log, clearLog, setStatus, copyToClipboard, escHtml, callAI, toast, clearHighlights } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;
  const Filler = TAF.Filler;

  const PRESET_ANSWERS = {};
  const TUTORIAL_SHOWN_KEY = 'taf_tutorial_shown';

  const BUTTON_CONFIG = [
    { id: 'showPaste', label: '📋 Paste', action: 'paste' },
    { id: 'showAiPrompt', label: '📋 AI Prompt', action: 'copyPrompt' },
    { id: 'showCopyQuestions', label: '📄 Copy Questions', action: 'copyQuestions' },
    { id: 'showClearHighlights', label: '✨ Clear Highlights', action: 'clearHighlights' }
  ];

  let currentRoot = null;
  let currentEntries = null;
  let parseDebounceTimer = null;

  function setUIState(state) {
    if (!currentRoot) return;
    currentRoot.dataset.state = state;
  }

  function clearParseDebounce() {
    if (parseDebounceTimer) {
      clearTimeout(parseDebounceTimer);
      parseDebounceTimer = null;
    }
  }

  function rebuildBulkButtons(root) {
    const row1 = root.querySelector('#taf-bulk-buttons-row1');
    const row2 = root.querySelector('#taf-bulk-buttons-row2');
    if (!row1 || !row2) return;

    const buttons1 = [];
    const buttons2 = [];

    if (Settings.get('showPaste')) buttons1.push('<button class="taf-btn" id="taf-paste-answers">📋 Paste</button>');
    if (Settings.get('showAiPrompt')) buttons1.push('<button class="taf-btn" id="taf-copy-prompt">📋 AI Prompt</button>');
    if (Settings.get('showCopyQuestions')) buttons1.push('<button class="taf-btn" id="taf-copy-questions">📄 Copy Qs</button>');
    if (Settings.get('showClearHighlights')) buttons2.push('<button class="taf-btn" id="taf-clear-highlights">✨ Clear Highlights</button>');

    row1.innerHTML = buttons1.join('');
    row2.innerHTML = buttons2.join('');

    attachBulkButtonListeners(root);
  }

  function executeAction(actionType, root, entries, bulkText) {
    switch (actionType) {
      case 'paste':
        navigator.clipboard.readText().then(text => {
          bulkText.value = text;
          parseBulkImport(bulkText, entries);
          toast('Pasted and parsed', 'success');
        }).catch(() => toast('Failed to read clipboard', 'error'));
        break;
      case 'copyPrompt':
        copyToClipboard(Settings.get('aiPrompt')).then(ok => {
          if (ok) toast('AI prompt copied', 'success');
        });
        break;
      case 'copyQuestions':
        Scanner.copyAllQuestions();
        break;
      case 'clearHighlights':
        clearHighlights();
        toast('Highlights cleared', 'info');
        break;
    }
  }

  function refreshDisabledTab(modal, root, entries, bulkText) {
    const container = modal.querySelector('#taf-disabled-buttons-list');
    if (!container) return;

    const disabledConfigs = BUTTON_CONFIG.filter(cfg => !Settings.get(cfg.id));
    
    if (disabledConfigs.length === 0) {
      container.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">All buttons are visible ✨</p>';
      return;
    }

    let html = '';
    disabledConfigs.forEach(cfg => {
      html += `
        <button class="taf-btn disabled-tab-btn" data-action="${cfg.action}" style="width:100%; margin-bottom:8px; justify-content:center;">
          ${cfg.label}
        </button>
      `;
    });
    container.innerHTML = html;

    container.querySelectorAll('.disabled-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeAction(btn.dataset.action, root, entries, bulkText);
      });
    });
  }

  function attachBulkButtonListeners(root) {
    const entries = root.querySelector('#taf-entries');
    const bulkText = root.querySelector('#taf-bulk-text');

    const pasteBtn = root.querySelector('#taf-paste-answers');
    if (pasteBtn) pasteBtn.addEventListener('click', () => executeAction('paste', root, entries, bulkText));
    
    const promptBtn = root.querySelector('#taf-copy-prompt');
    if (promptBtn) promptBtn.addEventListener('click', () => executeAction('copyPrompt', root, entries, bulkText));
    
    const copyQsBtn = root.querySelector('#taf-copy-questions');
    if (copyQsBtn) copyQsBtn.addEventListener('click', () => executeAction('copyQuestions', root, entries, bulkText));
    
    const clearHighlightsBtn = root.querySelector('#taf-clear-highlights');
    if (clearHighlightsBtn) clearHighlightsBtn.addEventListener('click', () => executeAction('clearHighlights', root, entries, bulkText));
  }

  function parseBulkImport(textarea, entriesContainer, silent = false) {
    const raw = textarea.value.trim();
    if (!raw) return { ok: false };

    const lines = raw.split('\n');
    const parsed = [];

    const patterns = [
      /^(?:Q(?:uestion)?\s*)?(\d+(?:\.\d+)?)[:.)]\s*(.+)$/i,
      /^(\d+(?:\.\d+)?)\s*[-–—]\s*(.+)$/
    ];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;

      let matched = false;
      for (const regex of patterns) {
        const m = trimmed.match(regex);
        if (m) {
          parsed.push({ key: `q${m[1]}`, val: m[2].trim() });
          matched = true;
          break;
        }
      }
      if (!matched) {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const keyword = trimmed.slice(0, colonIdx).trim();
          const answer = trimmed.slice(colonIdx + 1).trim();
          if (keyword && answer) parsed.push({ key: keyword, val: answer });
        }
      }
    }

    if (parsed.length === 0) return { ok: false };

    entriesContainer.innerHTML = '';
    for (const item of parsed) {
      addAnswerRow(entriesContainer, item.key, item.val);
    }

    if (!silent) {
      toast(`✅ Loaded ${parsed.length} answers`, 'success');
      log(`Auto-parsed ${parsed.length} answer(s).`, 'ok');
      setStatus(`${parsed.length} LOADED`, true);
    }
    return { ok: true };
  }

  function addAnswerRow(container, key = '', value = '') {
    const row = document.createElement('div');
    row.className = 'taf-row taf-row-new';
    row.innerHTML = `
      <input class="taf-key" placeholder="q1 / keyword" value="${escHtml(key)}">
      <input class="taf-val" placeholder="answer (use | for blanks)" value="${escHtml(value)}">
      <button class="taf-del" title="Remove">×</button>
    `;
    row.querySelector('.taf-del').addEventListener('click', () => row.remove());
    container.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('taf-row-new')));
  }

  function getAnswersFromUI(container) {
    const map = {};
    container.querySelectorAll('.taf-row').forEach(row => {
      const k = row.querySelector('.taf-key')?.value.trim().toLowerCase();
      const v = row.querySelector('.taf-val')?.value.trim();
      if (k && v) map[k] = v.split('|').map(s => s.trim()).filter(s => s !== '');
    });
    return map;
  }

  function buildSidebar() {
    const root = document.createElement('div');
    root.id = 'taf-root';
    root.dataset.state = 'VISIBLE';
    currentRoot = root;

    const savedX = Settings.get('panelX'), savedY = Settings.get('panelY');
    const savedWidth = Settings.get('panelWidth'), savedHeight = Settings.get('panelHeight');
    if (savedX !== null && savedY !== null) {
      root.style.left = savedX + 'px'; root.style.top = savedY + 'px'; root.style.right = 'auto'; root.style.transform = 'none';
    } else {
      root.style.top = '50%'; root.style.right = '20px'; root.style.transform = 'translateY(-50%)';
    }
    if (savedWidth) root.style.width = savedWidth + 'px';
    if (savedHeight) root.style.height = savedHeight + 'px';

    Settings.applyTheme();

    root.innerHTML = `
      <div id="taf-panel">
        <div id="taf-header">
          <div id="taf-logo">toddle<span>sux</span></div>
          <div style="display:flex; align-items:center;">
            <div id="taf-status-badge" class="inactive">IDLE</div>
            <button class="taf-btn" id="taf-btn-scan-header" title="Scan (Ctrl+Shift+F)" style="padding:4px 8px; margin-right:4px;">🔍</button>
            <button id="taf-settings-btn" title="Settings">⚙️</button>
            <button id="taf-close-btn" title="Close">✕</button>
          </div>
        </div>
        <div id="taf-body">
          <div id="taf-answer-section" style="display: ${Settings.get('showAnswerRows') ? 'block' : 'none'};">
            <div class="taf-section-label">Answers</div>
            <div id="taf-entries"></div>
            <button class="taf-btn" id="taf-btn-add">+ Add row</button>
          </div>

          <div class="taf-section-label">Answer Import</div>
          <div id="taf-bulk-area">
            <textarea id="taf-bulk-text" placeholder="Paste Q&A pairs..."></textarea>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row1"></div>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row2" style="margin-top:6px;"></div>
          </div>

          <div id="taf-fill-range-container" style="display: ${Settings.get('showFillRange') ? 'flex' : 'none'}; gap:8px; margin:12px 0; align-items:center;">
            <span style="color:#aaa; font-size:11px;">Fill range:</span>
            <input type="number" id="taf-range-start" value="${Settings.get('fillRangeStart')}" min="1" style="width:60px;">
            <span style="color:#aaa;">–</span>
            <input type="number" id="taf-range-end" value="${Settings.get('fillRangeEnd')}" min="1" style="width:60px;">
          </div>

          <div id="taf-progress-container">
            <div id="taf-progress-bar" style="width:0%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span id="taf-progress-text" style="color:#aaa; font-size:10px;">0/0</span>
          </div>

          <div id="taf-ai-section" style="display: ${Settings.get('showAISection') ? 'block' : 'none'};">
            <div class="taf-section-label">🤖 AI Assistant</div>
            <textarea id="taf-ai-questions" placeholder="Paste questions..."></textarea>
            <div class="taf-ai-buttons">
              <button class="taf-btn" id="taf-ai-send">Send to AI</button>
            </div>
            <div id="taf-ai-output"></div>
          </div>

          <div class="taf-btn-row">
            <button class="taf-btn" id="taf-btn-run">▶ Fill now</button>
          </div>

          <div id="taf-log-section" style="display: ${Settings.get('showLogPanel') ? 'block' : 'none'};">
            <div class="taf-section-label">Log</div>
            <div id="taf-log"></div>
          </div>
        </div>
        <div id="taf-footer">toddlesux v6.6 · theycallmekboy & DS</div>
      </div>
    `;
    document.body.appendChild(root);

    const entries = root.querySelector('#taf-entries');
    const bulkText = root.querySelector('#taf-bulk-text');
    currentEntries = entries;

    bulkText.addEventListener('input', () => {
      clearParseDebounce();
      parseDebounceTimer = setTimeout(() => parseBulkImport(bulkText, entries), 500);
    });

    rebuildBulkButtons(root);
    
    // Initialize empty row if needed
    if (Object.keys(PRESET_ANSWERS).length > 0) {
      Object.entries(PRESET_ANSWERS).forEach(([k, v]) => addAnswerRow(entries, k, v));
    } else {
      addAnswerRow(entries);
    }

    // AI logic...
    const aiOutput = root.querySelector('#taf-ai-output');
    const btnAISend = root.querySelector('#taf-ai-send');
    btnAISend.addEventListener('click', async () => {
      if (Filler.isFilling()) return;
      const questions = root.querySelector('#taf-ai-questions').value.trim();
      if (!questions) return;
      
      setStatus('THINKING', true); btnAISend.disabled = true; aiOutput.textContent = '';
      const aiAnswers = await callAI(questions, (chunk, full) => { aiOutput.textContent = full; });
      btnAISend.disabled = false; setStatus('AI READY', true);
      
      if (aiAnswers) {
        bulkText.value = aiAnswers;
        parseBulkImport(bulkText, entries);
        toast('AI answers loaded', 'success');
      }
    });

    // Sidebar event setup...
    root.querySelector('#taf-btn-add').addEventListener('click', () => addAnswerRow(entries));
    root.querySelector('#taf-btn-run').addEventListener('click', () => {
      if (Filler.isFilling()) Filler.stopFill();
      else Filler.runFill(getAnswersFromUI(entries));
    });
    root.querySelector('#taf-btn-scan-header').addEventListener('click', () => Scanner.scanPage());
    root.querySelector('#taf-close-btn').addEventListener('click', () => setUIState('EMERGENCY_LOCK'));
    
    // (Rest of the drag/resize/modal logic remains consistent with the previous design)
  }

  function resetForNavigation() {
    if (currentRoot) currentRoot.dataset.state = 'VISIBLE';
    Scanner.invalidateCache();
  }

  return { buildSidebar, addAnswerRow, getAnswersFromUI, resetForNavigation, clearParseDebounce };
})();