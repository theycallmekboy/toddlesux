// modules/taf-ui.js
// toddlesux - Apple-inspired UI with dynamic settings, close button, functional Disabled tab, and resizable modal
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.UI = (function() {
  'use strict';

  const { log, clearLog, setStatus, copyToClipboard, escHtml } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;
  const Filler = TAF.Filler;

  const PRESET_ANSWERS = {};
  const TUTORIAL_SHOWN_KEY = 'taf_tutorial_shown';

  const BUTTON_CONFIG = [
    { id: 'showParseAdd', label: 'Parse & Add', action: 'parse' },
    { id: 'showClearAll', label: 'Clear All', action: 'clearEntries' },
    { id: 'showPaste', label: '📋 Paste', action: 'paste' },
    { id: 'showAiPrompt', label: '📋 AI Prompt', action: 'copyPrompt' },
    { id: 'showCopyQuestions', label: '📄 Copy Questions', action: 'copyQuestions' },
    { id: 'showClearHighlights', label: '✨ Clear Highlights', action: 'clearHighlights' },
    { id: 'showClearAllAnswers', label: '🧹 Clear All Answers', action: 'clearAllAnswers' }
  ];

  let currentRoot = null;
  let currentEntries = null;

  function rebuildBulkButtons(root) {
    const row1 = root.querySelector('#taf-bulk-buttons-row1');
    const row2 = root.querySelector('#taf-bulk-buttons-row2');
    if (!row1 || !row2) return;

    const buttons1 = [];
    const buttons2 = [];

    if (Settings.get('showParseAdd')) buttons1.push('<button class="taf-btn" id="taf-bulk-parse">Parse & Add</button>');
    if (Settings.get('showClearAll')) buttons1.push('<button class="taf-btn" id="taf-bulk-clear">Clear All</button>');
    if (Settings.get('showPaste')) buttons1.push('<button class="taf-btn" id="taf-paste-answers">📋 Paste</button>');
    if (Settings.get('showAiPrompt')) buttons1.push('<button class="taf-btn" id="taf-copy-prompt">📋 AI Prompt</button>');
    if (Settings.get('showCopyQuestions')) buttons1.push('<button class="taf-btn" id="taf-copy-questions">📄 Copy Qs</button>');
    if (Settings.get('showClearHighlights')) buttons2.push('<button class="taf-btn" id="taf-clear-highlights">✨ Clear Highlights</button>');
    if (Settings.get('showClearAllAnswers')) buttons2.push('<button class="taf-btn" id="taf-clear-all-answers">🧹 Clear All Answers</button>');

    row1.innerHTML = buttons1.join('');
    row2.innerHTML = buttons2.join('');

    attachBulkButtonListeners(root);
  }

  function executeAction(actionType, root, entries, bulkText) {
    switch (actionType) {
      case 'parse':
        parseBulkImport(bulkText, entries);
        break;
      case 'clearEntries':
        entries.innerHTML = '';
        addAnswerRow(entries); addAnswerRow(entries);
        clearLog();
        log('Answer rows cleared.', 'info');
        break;
      case 'paste':
        navigator.clipboard.readText().then(text => {
          bulkText.value = text;
          log('✅ Pasted from clipboard', 'ok');
        }).catch(() => log('❌ Failed to read clipboard', 'err'));
        break;
      case 'copyPrompt':
        copyToClipboard(Settings.get('aiPrompt')).then(ok => {
          log(ok ? '✅ AI prompt copied!' : '❌ Failed to copy', ok ? 'ok' : 'err');
        });
        break;
      case 'copyQuestions':
        Scanner.copyAllQuestions();
        break;
      case 'clearHighlights':
        document.querySelectorAll('.taf-filled-ok').forEach(el => el.classList.remove('taf-filled-ok'));
        log('✨ Highlights cleared', 'info');
        break;
      case 'clearAllAnswers':
        document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => { if (i.checked) { i.checked = false; i.dispatchEvent(new Event('change', {bubbles:true})); } });
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea').forEach(i => { if (i.value) { TAF.Utils.setNativeValue(i, ''); i.dispatchEvent(new Event('input', {bubbles:true})); i.dispatchEvent(new Event('change', {bubbles:true})); } });
        document.querySelectorAll('[contenteditable="true"]').forEach(el => { el.innerHTML = ''; el.dispatchEvent(new Event('input', {bubbles:true})); });
        document.querySelectorAll('select').forEach(sel => { sel.selectedIndex = 0; sel.dispatchEvent(new Event('change', {bubbles:true})); });
        log('🧹 All answers cleared', 'ok');
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
        const action = btn.dataset.action;
        executeAction(action, root, entries, bulkText);
      });
    });
  }

  function attachBulkButtonListeners(root) {
    const entries = root.querySelector('#taf-entries');
    const bulkText = root.querySelector('#taf-bulk-text');

    const parseBtn = root.querySelector('#taf-bulk-parse');
    if (parseBtn) {
      parseBtn.replaceWith(parseBtn.cloneNode(true));
      root.querySelector('#taf-bulk-parse').addEventListener('click', () => executeAction('parse', root, entries, bulkText));
    }

    const clearBtn = root.querySelector('#taf-bulk-clear');
    if (clearBtn) {
      clearBtn.replaceWith(clearBtn.cloneNode(true));
      root.querySelector('#taf-bulk-clear').addEventListener('click', () => executeAction('clearEntries', root, entries, bulkText));
    }

    const pasteBtn = root.querySelector('#taf-paste-answers');
    if (pasteBtn) {
      pasteBtn.replaceWith(pasteBtn.cloneNode(true));
      root.querySelector('#taf-paste-answers').addEventListener('click', () => executeAction('paste', root, entries, bulkText));
    }

    const promptBtn = root.querySelector('#taf-copy-prompt');
    if (promptBtn) {
      promptBtn.replaceWith(promptBtn.cloneNode(true));
      root.querySelector('#taf-copy-prompt').addEventListener('click', () => executeAction('copyPrompt', root, entries, bulkText));
    }

    const copyQsBtn = root.querySelector('#taf-copy-questions');
    if (copyQsBtn) {
      copyQsBtn.replaceWith(copyQsBtn.cloneNode(true));
      root.querySelector('#taf-copy-questions').addEventListener('click', () => executeAction('copyQuestions', root, entries, bulkText));
    }

    const clearHighlightsBtn = root.querySelector('#taf-clear-highlights');
    if (clearHighlightsBtn) {
      clearHighlightsBtn.replaceWith(clearHighlightsBtn.cloneNode(true));
      root.querySelector('#taf-clear-highlights').addEventListener('click', () => executeAction('clearHighlights', root, entries, bulkText));
    }

    const clearAnswersBtn = root.querySelector('#taf-clear-all-answers');
    if (clearAnswersBtn) {
      clearAnswersBtn.replaceWith(clearAnswersBtn.cloneNode(true));
      root.querySelector('#taf-clear-all-answers').addEventListener('click', () => executeAction('clearAllAnswers', root, entries, bulkText));
    }
  }

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
    currentRoot = root;

    const showAnswerRows = Settings.get('showAnswerRows');
    const showLogPanel = Settings.get('showLogPanel');

    Settings.applyTheme();

    root.innerHTML = `
      <div id="taf-panel">
        <div id="taf-header">
          <div id="taf-logo">toddle<span>sux</span></div>
          <div style="display:flex; align-items:center;">
            <div id="taf-status-badge" class="inactive">IDLE</div>
            <button id="taf-settings-btn" title="Settings">⚙️</button>
            <button id="taf-close-btn" title="Close panel">✕</button>
          </div>
        </div>
        <div id="taf-body">
          <div id="taf-answer-section" style="display: ${showAnswerRows ? 'block' : 'none'};">
            <div class="taf-section-label">Answers</div>
            <div id="taf-entries"></div>
            <button class="taf-btn" id="taf-btn-add">+ Add row</button>
          </div>

          <div class="taf-section-label">Bulk Import</div>
          <div id="taf-bulk-area">
            <textarea id="taf-bulk-text" placeholder="Paste Q&A pairs..."></textarea>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row1"></div>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row2" style="margin-top:6px;"></div>
          </div>

          <div class="taf-btn-row">
            <button class="taf-btn" id="taf-btn-scan">⟳ Scan page</button>
            <button class="taf-btn" id="taf-btn-run">▶ Fill now</button>
          </div>

          <div class="taf-section-label">Log</div>
          <div id="taf-log" style="display: ${showLogPanel ? 'block' : 'none'};"></div>
        </div>
        <div id="taf-footer">toddlesux v4.9 · theycallmekboy & DS</div>
      </div>
    `;
    document.body.appendChild(root);

    const entries = root.querySelector('#taf-entries');
    const bulkText = root.querySelector('#taf-bulk-text');
    currentEntries = entries;

    rebuildBulkButtons(root);

    // Resize handle for main panel
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'taf-resize-handle';
    root.querySelector('#taf-panel').appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = root.offsetWidth;
      startHeight = root.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newWidth = Math.max(280, startWidth + dx);
      const newHeight = Math.max(400, startHeight + dy);
      root.style.width = newWidth + 'px';
      root.style.height = newHeight + 'px';
    });

    window.addEventListener('mouseup', () => { isResizing = false; });

    // Draggable main panel header
    const header = root.querySelector('#taf-header');
    let isDragging = false, dragStartX, dragStartY, startLeft, startTop;
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      const rect = root.getBoundingClientRect();
      dragStartX = e.clientX; dragStartY = e.clientY;
      startLeft = rect.left; startTop = rect.top;
      root.style.transition = 'none';
      root.style.right = 'auto'; root.style.transform = 'none';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      root.style.left = (startLeft + e.clientX - dragStartX) + 'px';
      root.style.top = (startTop + e.clientY - dragStartY) + 'px';
    });
    window.addEventListener('mouseup', () => { isDragging = false; root.style.transition = ''; });

    // Settings modal
    const modal = document.createElement('div');
    modal.id = 'taf-settings-modal';
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="taf-modal-content">
        <div class="taf-modal-header">
          <button class="taf-tab-btn active" data-tab="general">General</button>
          <button class="taf-tab-btn" data-tab="humanize">Humanize</button>
          <button class="taf-tab-btn" data-tab="appearance">Appearance</button>
          <button class="taf-tab-btn" data-tab="buttons">Buttons</button>
          <button class="taf-tab-btn" data-tab="disabled">Disabled</button>
          <button class="taf-modal-close" style="margin-left:auto; background:none; border:none; color:#888; font-size:20px; cursor:pointer;">&times;</button>
        </div>
        
        <!-- General Tab -->
        <div class="taf-tab-pane active" data-tab="general">
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-showAnswers" ${Settings.get('showAnswerRows') ? 'checked' : ''}> Show answer rows</label>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-showLog" ${Settings.get('showLogPanel') ? 'checked' : ''}> Show log panel</label>
          </div>
          <div class="taf-setting-item">
            <label>Hotkey (toggle panel)</label>
            <div style="display:flex; gap:8px; margin-top:6px;">
              <input type="text" id="taf-setting-hotkey" value="${escHtml(Settings.get('hotkey'))}" readonly style="flex:1; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;">
              <button class="taf-btn" id="taf-capture-hotkey" style="flex:0;">Press key</button>
            </div>
          </div>
          <div class="taf-setting-item">
            <label>AI Prompt</label>
            <textarea id="taf-setting-aiPrompt" style="width:100%; height:120px; margin-top:6px; background:rgba(255,255,255,0.03); border:0.5px solid rgba(255,255,255,0.08); border-radius:12px; color:#fff; padding:10px; font-size:11px; resize:vertical;">${escHtml(Settings.get('aiPrompt'))}</textarea>
          </div>
        </div>

        <!-- Humanize Tab -->
        <div class="taf-tab-pane" data-tab="humanize">
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-delay" ${Settings.get('enableRandomDelays') ? 'checked' : ''}> Random delays</label>
            <div class="taf-range-row" style="margin-top:8px; margin-left:24px;">
              <span style="color:#888;">Min (ms):</span>
              <input type="number" id="taf-setting-minDelay" value="${Settings.get('minDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''} style="width:80px;">
              <span style="color:#888; margin-left:8px;">Max:</span>
              <input type="number" id="taf-setting-maxDelay" value="${Settings.get('maxDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-human" ${Settings.get('enableHumanTyping') ? 'checked' : ''}> Human mistakes</label>
            <div class="taf-range-row" style="margin-top:8px; margin-left:24px;">
              <span style="color:#888;">Chance (0-1):</span>
              <input type="number" id="taf-setting-humanChance" value="${Settings.get('humanTypingChance')}" min="0" max="1" step="0.05" ${!Settings.get('enableHumanTyping') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-charTyping" ${Settings.get('enableCharTyping') ? 'checked' : ''}> Type character by character</label>
            <div class="taf-range-row" style="margin-top:8px; margin-left:24px;">
              <span style="color:#888;">Delay per char (ms):</span>
              <input type="number" id="taf-setting-charDelay" value="${Settings.get('charTypingDelay')}" min="10" max="500" step="10" ${!Settings.get('enableCharTyping') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label style="justify-content: space-between;">Delay after question (ms):</label>
            <input type="number" id="taf-setting-questionDelay" value="${Settings.get('questionDelay')}" min="0" max="5000" step="100" style="width:100px; margin-top:6px;">
          </div>
        </div>

        <!-- Appearance Tab -->
        <div class="taf-tab-pane" data-tab="appearance">
          <div class="taf-setting-item">
            <label>Accent color</label>
            <div class="taf-color-picker">
              <input type="color" id="taf-setting-accentColor" value="${Settings.get('accentColor')}">
              <span style="color:#aaa;">${Settings.get('accentColor')}</span>
            </div>
          </div>
          <div class="taf-setting-item">
            <label>Background color</label>
            <div class="taf-color-picker">
              <input type="color" id="taf-setting-bgColor" value="${Settings.get('backgroundColor')}">
              <span style="color:#aaa;">${Settings.get('backgroundColor')}</span>
            </div>
          </div>
          <div class="taf-setting-item">
            <label>Blur intensity (px)</label>
            <input type="number" id="taf-setting-blur" value="${Settings.get('blurIntensity')}" min="0" max="50" step="2" style="width:80px;">
          </div>
        </div>

        <!-- Buttons Tab -->
        <div class="taf-tab-pane" data-tab="buttons">
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-parseAdd" ${Settings.get('showParseAdd') ? 'checked' : ''}> Parse & Add</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-clearAll" ${Settings.get('showClearAll') ? 'checked' : ''}> Clear All</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-paste" ${Settings.get('showPaste') ? 'checked' : ''}> Paste</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-aiPrompt" ${Settings.get('showAiPrompt') ? 'checked' : ''}> AI Prompt</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-copyQuestions" ${Settings.get('showCopyQuestions') ? 'checked' : ''}> Copy Questions</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-clearHighlights" ${Settings.get('showClearHighlights') ? 'checked' : ''}> Clear Highlights</label></div>
          <div class="taf-setting-item"><label><input type="checkbox" id="taf-show-clearAllAnswers" ${Settings.get('showClearAllAnswers') ? 'checked' : ''}> Clear All Answers</label></div>
        </div>

        <!-- Disabled Tab -->
        <div class="taf-tab-pane" data-tab="disabled">
          <p style="color:#aaa; font-size:12px; margin-bottom:16px;">Hidden buttons – click to use them directly.</p>
          <div id="taf-disabled-buttons-list"></div>
        </div>

        <div class="taf-modal-footer" style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button class="taf-btn" id="taf-save-settings">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Modal dragging
    const modalHeader = modal.querySelector('.taf-modal-header');
    let isModalDragging = false;
    let modalStartX, modalStartY, modalStartLeft, modalStartTop;

    modalHeader.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isModalDragging = true;
      const rect = modal.getBoundingClientRect();
      modalStartX = e.clientX;
      modalStartY = e.clientY;
      modalStartLeft = rect.left;
      modalStartTop = rect.top;
      modal.style.transition = 'none';
      modal.style.position = 'fixed';
      modal.style.left = modalStartLeft + 'px';
      modal.style.top = modalStartTop + 'px';
      modal.style.right = 'auto';
      modal.style.bottom = 'auto';
      modal.style.transform = 'none';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isModalDragging) return;
      const dx = e.clientX - modalStartX;
      const dy = e.clientY - modalStartY;
      modal.style.left = (modalStartLeft + dx) + 'px';
      modal.style.top = (modalStartTop + dy) + 'px';
    });

    window.addEventListener('mouseup', () => {
      isModalDragging = false;
      modal.style.transition = '';
    });

    // Modal resizing
    const modalContent = modal.querySelector('.taf-modal-content');
    const modalResizeHandle = document.createElement('div');
    modalResizeHandle.className = 'taf-modal-resize-handle';
    modalContent.appendChild(modalResizeHandle);

    let isModalResizing = false;
    let resizeStartX, resizeStartY, startModalWidth, startModalHeight;

    modalResizeHandle.addEventListener('mousedown', (e) => {
      isModalResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      startModalWidth = modal.offsetWidth;
      startModalHeight = modal.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isModalResizing) return;
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      const newWidth = Math.max(360, startModalWidth + dx);
      const newHeight = Math.max(400, startModalHeight + dy);
      modal.style.width = newWidth + 'px';
      modal.style.height = newHeight + 'px';
    });

    window.addEventListener('mouseup', () => {
      isModalResizing = false;
    });

    // Tab switching
    const tabBtns = modal.querySelectorAll('.taf-tab-btn');
    const panes = modal.querySelectorAll('.taf-tab-pane');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`.taf-tab-pane[data-tab="${tab}"]`).classList.add('active');
        if (tab === 'disabled') {
          refreshDisabledTab(modal, root, entries, bulkText);
        }
      });
    });

    // Elements
    const btnAdd = root.querySelector('#taf-btn-add');
    const btnScan = root.querySelector('#taf-btn-scan');
    const btnRun = root.querySelector('#taf-btn-run');
    const settingsBtn = root.querySelector('#taf-settings-btn');
    const closeBtn = root.querySelector('#taf-close-btn');
    const btnSaveSettings = modal.querySelector('#taf-save-settings');
    const modalClose = modal.querySelectorAll('.taf-modal-close');

    // Hotkey capture
    let capturing = false;
    const hotkeyInput = modal.querySelector('#taf-setting-hotkey');
    const captureBtn = modal.querySelector('#taf-capture-hotkey');
    captureBtn.addEventListener('click', () => {
      capturing = true;
      hotkeyInput.value = 'Press any key...';
      hotkeyInput.style.background = 'rgba(245,166,35,0.2)';
    });
    const keyHandler = (e) => {
      if (!capturing) return;
      e.preventDefault(); e.stopPropagation();
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      hotkeyInput.value = key;
      hotkeyInput.style.background = '';
      capturing = false;
    };
    modal.addEventListener('keydown', keyHandler);

    // Initialize answer rows
    Object.entries(PRESET_ANSWERS).forEach(([k, v]) => addAnswerRow(entries, k, v));
    if (!Object.keys(PRESET_ANSWERS).length) { addAnswerRow(entries); addAnswerRow(entries); }

    // Event listeners
    btnAdd.addEventListener('click', () => addAnswerRow(entries));
    btnScan.addEventListener('click', Scanner.scanPage);
    btnRun.addEventListener('click', () => {
      if (Filler.isRunning()) Filler.stopFill();
      else Filler.runFill(getAnswersFromUI(entries));
    });

    settingsBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      refreshDisabledTab(modal, root, entries, bulkText);
    });
    closeBtn.addEventListener('click', () => {
      root.classList.add('taf-emergency-hidden');
      log('Panel closed. Press ' + Settings.get('hotkey') + ' to reopen.', 'info');
    });
    modalClose.forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));

    // Enable/disable dependent inputs
    const delayCheck = modal.querySelector('#taf-setting-delay');
    const minDelay = modal.querySelector('#taf-setting-minDelay');
    const maxDelay = modal.querySelector('#taf-setting-maxDelay');
    delayCheck.addEventListener('change', () => { minDelay.disabled = !delayCheck.checked; maxDelay.disabled = !delayCheck.checked; });
    const humanCheck = modal.querySelector('#taf-setting-human');
    const humanChance = modal.querySelector('#taf-setting-humanChance');
    humanCheck.addEventListener('change', () => humanChance.disabled = !humanCheck.checked);
    const charCheck = modal.querySelector('#taf-setting-charTyping');
    const charDelay = modal.querySelector('#taf-setting-charDelay');
    charCheck.addEventListener('change', () => charDelay.disabled = !charCheck.checked);

    // Save settings
    btnSaveSettings.addEventListener('click', () => {
      Settings.set('showAnswerRows', modal.querySelector('#taf-setting-showAnswers').checked);
      Settings.set('showLogPanel', modal.querySelector('#taf-setting-showLog').checked);
      Settings.set('hotkey', modal.querySelector('#taf-setting-hotkey').value.trim() || 'Delete');
      Settings.set('aiPrompt', modal.querySelector('#taf-setting-aiPrompt').value);

      Settings.set('enableRandomDelays', delayCheck.checked);
      Settings.set('minDelay', parseInt(minDelay.value, 10) || 300);
      Settings.set('maxDelay', parseInt(maxDelay.value, 10) || 900);
      Settings.set('enableHumanTyping', humanCheck.checked);
      Settings.set('humanTypingChance', parseFloat(humanChance.value) || 0.2);
      Settings.set('enableCharTyping', charCheck.checked);
      Settings.set('charTypingDelay', parseInt(charDelay.value, 10) || 50);
      Settings.set('questionDelay', parseInt(modal.querySelector('#taf-setting-questionDelay').value, 10) || 500);

      Settings.set('accentColor', modal.querySelector('#taf-setting-accentColor').value);
      Settings.set('backgroundColor', modal.querySelector('#taf-setting-bgColor').value);
      Settings.set('blurIntensity', parseInt(modal.querySelector('#taf-setting-blur').value, 10) || 20);

      Settings.set('showParseAdd', modal.querySelector('#taf-show-parseAdd').checked);
      Settings.set('showClearAll', modal.querySelector('#taf-show-clearAll').checked);
      Settings.set('showPaste', modal.querySelector('#taf-show-paste').checked);
      Settings.set('showAiPrompt', modal.querySelector('#taf-show-aiPrompt').checked);
      Settings.set('showCopyQuestions', modal.querySelector('#taf-show-copyQuestions').checked);
      Settings.set('showClearHighlights', modal.querySelector('#taf-show-clearHighlights').checked);
      Settings.set('showClearAllAnswers', modal.querySelector('#taf-show-clearAllAnswers').checked);

      Settings.applyTheme();

      document.getElementById('taf-answer-section').style.display = Settings.get('showAnswerRows') ? 'block' : 'none';
      document.getElementById('taf-log').style.display = Settings.get('showLogPanel') ? 'block' : 'none';
      
      rebuildBulkButtons(root);
      refreshDisabledTab(modal, root, entries, bulkText);
      modal.classList.add('hidden');
      log('✅ Settings saved and applied.', 'ok');
    });

    // First-time tutorial
    if (!GM_getValue(TUTORIAL_SHOWN_KEY, false)) {
      const tutorial = document.createElement('div');
      tutorial.id = 'taf-tutorial-overlay';
      tutorial.innerHTML = `
        <div class="taf-tutorial-card">
          <h2>👋 Welcome to toddlesux</h2>
          <p>Auto‑fill Toddle forms with human‑like delays.<br>
          <strong>Drag</strong> the header to move, <strong>resize</strong> from the bottom‑right corner.<br>
          Press <strong>${Settings.get('hotkey')}</strong> to hide/show.<br>
          Use <strong>Bulk Import</strong> after pasting answers from AI.</p>
          <button class="taf-btn" id="taf-tutorial-skip">Skip</button>
          <button class="taf-btn" id="taf-tutorial-gotit" style="background:var(--taf-accent); color:#000;">Got it</button>
        </div>
      `;
      document.body.appendChild(tutorial);
      const closeTutorial = () => { tutorial.remove(); GM_setValue(TUTORIAL_SHOWN_KEY, true); };
      tutorial.querySelector('#taf-tutorial-skip').addEventListener('click', closeTutorial);
      tutorial.querySelector('#taf-tutorial-gotit').addEventListener('click', closeTutorial);
    }
  }

  return { buildSidebar, addAnswerRow, getAnswersFromUI };
})();
