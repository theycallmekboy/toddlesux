// modules/taf-ui.js
// toddlesux - Complete UI with speed chips, progress bar, optional fill range, and modal dragging fixes
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.UI = (function() {
  'use strict';

  const { log, clearLog, setStatus, copyToClipboard, escHtml, callAI, toast, clearHighlights, highlight } = TAF.Utils;
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
          toast('Pasted from clipboard', 'success');
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
  }

  function parseBulkImport(textarea, entriesContainer, silent = false) {
    const raw = textarea.value.trim();
    if (!raw) return;

    const lines = raw.split('\n');
    const parsed = [];

    const patterns = [
      /^(?:Q(?:uestion)?\s*)?(\d+(?:\.\d+)?)[:.)]\s*(.+)$/i,
      /^(\d+(?:\.\d+)?)\s*[-–—]\s*(.+)$/
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
          }
        }
      }
    }

    if (parsed.length === 0) return;

    entriesContainer.innerHTML = '';
    let added = 0;
    for (const item of parsed) {
      addAnswerRow(entriesContainer, item.key, item.val);
      added++;
    }

    if (!silent) {
      toast(`✅ Parsed ${added} answers`, 'success');
      log(`Auto-parsed ${added} answer(s).`, 'ok');
      setStatus(`${added} LOADED`, true);
    }
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        row.classList.remove('taf-row-new');
      });
    });
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
    root.classList.add('taf-visible');
    currentRoot = root;

    const showAnswerRows = Settings.get('showAnswerRows');
    const showLogPanel = Settings.get('showLogPanel');
    const showAISection = Settings.get('showAISection');
    const showFillRange = Settings.get('showFillRange');

    const savedX = Settings.get('panelX');
    const savedY = Settings.get('panelY');
    const savedWidth = Settings.get('panelWidth');
    const savedHeight = Settings.get('panelHeight');
    if (savedX !== null && savedY !== null) {
      root.style.left = savedX + 'px';
      root.style.top = savedY + 'px';
      root.style.right = 'auto';
      root.style.transform = 'none';
    } else {
      root.style.top = '50%';
      root.style.right = '20px';
      root.style.transform = 'translateY(-50%)';
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
            <button class="taf-btn" id="taf-btn-scan-header" title="Scan questions (Ctrl+Shift+F)" style="padding:4px 8px; margin-right:4px;">🔍</button>
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

          <div class="taf-section-label">Answer Import</div>
          <div id="taf-bulk-area">
            <textarea id="taf-bulk-text" placeholder="Paste Q&A pairs... (auto-parses)"></textarea>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row1"></div>
            <div class="taf-bulk-buttons" id="taf-bulk-buttons-row2" style="margin-top:6px;"></div>
          </div>

          <div id="taf-fill-range-container" style="display: ${showFillRange ? 'flex' : 'none'}; gap:8px; margin:12px 0; align-items:center;">
            <span style="color:#aaa; font-size:11px;">Fill range:</span>
            <input type="number" id="taf-range-start" value="${Settings.get('fillRangeStart')}" min="1" style="width:60px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; padding:4px 6px; font-size:11px;">
            <span style="color:#aaa;">–</span>
            <input type="number" id="taf-range-end" value="${Settings.get('fillRangeEnd')}" min="1" style="width:60px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:8px; color:#fff; padding:4px 6px; font-size:11px;">
          </div>

          <div id="taf-progress-container">
            <div id="taf-progress-bar" style="width:0%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span id="taf-progress-text" style="color:#aaa; font-size:10px;">0/0</span>
          </div>

          <div id="taf-ai-section" style="display: ${showAISection ? 'block' : 'none'};">
            <div class="taf-section-label">🤖 AI Assistant</div>
            <textarea id="taf-ai-questions" placeholder="Paste your questions here..."></textarea>
            <div class="taf-ai-buttons">
              <button class="taf-btn" id="taf-ai-send">Send to AI</button>
            </div>
            <div id="taf-ai-output" placeholder="AI answers will appear here..."></div>
          </div>

          <div class="taf-btn-row">
            <button class="taf-btn" id="taf-btn-run">▶ Fill now</button>
          </div>

          <div class="taf-section-label">Log</div>
          <div id="taf-log" class="${showLogPanel ? 'visible' : ''}"></div>
        </div>
        <div id="taf-footer">toddlesux v6.2 · theycallmekboy & DS</div>
      </div>
    `;
    document.body.appendChild(root);

    const entries = root.querySelector('#taf-entries');
    const bulkText = root.querySelector('#taf-bulk-text');
    currentEntries = entries;

    bulkText.addEventListener('input', () => {
      clearTimeout(parseDebounceTimer);
      parseDebounceTimer = setTimeout(() => parseBulkImport(bulkText, entries), 500);
    });

    rebuildBulkButtons(root);

    const aiQuestions = root.querySelector('#taf-ai-questions');
    const aiOutput = root.querySelector('#taf-ai-output');
    const btnAISend = root.querySelector('#taf-ai-send');

    btnAISend.addEventListener('click', async () => {
      const questions = aiQuestions.value.trim();
      if (!questions) { toast('Paste questions first', 'error'); return; }

      const provider = Settings.get('aiProvider');
      let hasKey = false;
      if (provider === 'openai') hasKey = !!Settings.get('openaiApiKey');
      else if (provider === 'gemini') hasKey = !!Settings.get('geminiApiKey');
      else if (provider === 'claude') hasKey = !!Settings.get('claudeApiKey');
      else if (provider === 'github') hasKey = !!Settings.get('githubToken');
      else if (provider === 'groq') hasKey = !!Settings.get('groqApiKey');

      if (!hasKey) { toast(`${provider} API key not set`, 'error'); return; }

      setStatus('THINKING', true);
      btnAISend.disabled = true;
      btnAISend.textContent = 'Thinking...';
      aiOutput.textContent = '';

      const aiAnswers = await callAI(questions, (chunk, full) => { aiOutput.textContent = full; });

      btnAISend.disabled = false;
      btnAISend.textContent = 'Send to AI';
      
      if (aiAnswers) {
        bulkText.value = aiAnswers;
        parseBulkImport(bulkText, entries);
        toast('AI answers loaded!', 'success');
        setStatus('AI READY', true);
      } else {
        toast('AI request failed', 'error');
        setStatus('ERROR', false);
      }
    });

    const rangeStart = root.querySelector('#taf-range-start');
    const rangeEnd = root.querySelector('#taf-range-end');
    if (rangeStart) rangeStart.addEventListener('change', () => Settings.set('fillRangeStart', parseInt(rangeStart.value) || 1));
    if (rangeEnd) rangeEnd.addEventListener('change', () => Settings.set('fillRangeEnd', parseInt(rangeEnd.value) || 999));

    root.querySelector('#taf-btn-scan-header').addEventListener('click', () => Scanner.scanPage());

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'taf-resize-handle';
    root.querySelector('#taf-panel').appendChild(resizeHandle);

    let isResizing = false, startX, startY, startWidth, startHeight;
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX; startY = e.clientY;
      startWidth = root.offsetWidth; startHeight = root.offsetHeight;
      e.preventDefault(); e.stopPropagation();
    });
    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(280, startWidth + e.clientX - startX);
      const newHeight = Math.max(400, startHeight + e.clientY - startY);
      root.style.width = newWidth + 'px';
      root.style.height = newHeight + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (isResizing) {
        Settings.set('panelWidth', parseInt(root.style.width));
        Settings.set('panelHeight', parseInt(root.style.height));
      }
      isResizing = false;
    });

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
    window.addEventListener('mouseup', () => {
      if (isDragging) {
        Settings.set('panelX', parseInt(root.style.left));
        Settings.set('panelY', parseInt(root.style.top));
      }
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
            <label><input type="checkbox" id="taf-setting-showAI" ${Settings.get('showAISection') ? 'checked' : ''}> Show AI Assistant</label>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-showFillRange" ${Settings.get('showFillRange') ? 'checked' : ''}> Show fill range inputs</label>
          </div>
          <div class="taf-setting-item">
            <label>Hotkey (toggle panel)</label>
            <div style="display:flex; gap:8px; margin-top:6px;">
              <input type="text" id="taf-setting-hotkey" value="${escHtml(Settings.get('hotkey'))}" readonly style="flex:1; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;">
              <button class="taf-btn" id="taf-capture-hotkey" style="flex:0;">Press key</button>
            </div>
          </div>
          
          <div class="taf-setting-item">
            <label>AI Provider</label>
            <select id="taf-setting-aiProvider" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;">
              <option value="openai" ${Settings.get('aiProvider') === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
              <option value="gemini" ${Settings.get('aiProvider') === 'gemini' ? 'selected' : ''}>Google Gemini</option>
              <option value="claude" ${Settings.get('aiProvider') === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
              <option value="github" ${Settings.get('aiProvider') === 'github' ? 'selected' : ''}>GitHub Models</option>
              <option value="groq" ${Settings.get('aiProvider') === 'groq' ? 'selected' : ''}>Groq</option>
            </select>
          </div>

          <div id="taf-ai-openai" style="display:${Settings.get('aiProvider') === 'openai' ? 'block' : 'none'};">
            <div class="taf-setting-item"><label>OpenAI API Key</label><input type="password" id="taf-setting-openaiKey" value="${escHtml(Settings.get('openaiApiKey'))}" placeholder="sk-..." style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
            <div class="taf-setting-item"><label>Model</label><input type="text" id="taf-setting-openaiModel" value="${escHtml(Settings.get('openaiModel'))}" placeholder="gpt-4o-mini" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
          </div>
          <div id="taf-ai-gemini" style="display:${Settings.get('aiProvider') === 'gemini' ? 'block' : 'none'};">
            <div class="taf-setting-item"><label>Gemini API Key</label><input type="password" id="taf-setting-geminiKey" value="${escHtml(Settings.get('geminiApiKey'))}" placeholder="AIza..." style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
            <div class="taf-setting-item"><label>Model</label><input type="text" id="taf-setting-geminiModel" value="${escHtml(Settings.get('geminiModel'))}" placeholder="gemini-2.0-flash" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
          </div>
          <div id="taf-ai-claude" style="display:${Settings.get('aiProvider') === 'claude' ? 'block' : 'none'};">
            <div class="taf-setting-item"><label>Claude API Key</label><input type="password" id="taf-setting-claudeKey" value="${escHtml(Settings.get('claudeApiKey'))}" placeholder="sk-ant-..." style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
            <div class="taf-setting-item"><label>Model</label><input type="text" id="taf-setting-claudeModel" value="${escHtml(Settings.get('claudeModel'))}" placeholder="claude-3-haiku-20240307" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
          </div>
          <div id="taf-ai-github" style="display:${Settings.get('aiProvider') === 'github' ? 'block' : 'none'};">
            <div class="taf-setting-item"><label>GitHub Token</label><input type="password" id="taf-setting-githubToken" value="${escHtml(Settings.get('githubToken'))}" placeholder="ghp_..." style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
            <div class="taf-setting-item"><label>Model</label><input type="text" id="taf-setting-githubModel" value="${escHtml(Settings.get('githubModel'))}" placeholder="gpt-4o" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
          </div>
          <div id="taf-ai-groq" style="display:${Settings.get('aiProvider') === 'groq' ? 'block' : 'none'};">
            <div class="taf-setting-item"><label>Groq API Key</label><input type="password" id="taf-setting-groqKey" value="${escHtml(Settings.get('groqApiKey'))}" placeholder="gsk_..." style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
            <div class="taf-setting-item"><label>Model</label><input type="text" id="taf-setting-groqModel" value="${escHtml(Settings.get('groqModel'))}" placeholder="llama-3.3-70b-versatile" style="width:100%; margin-top:6px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px;"></div>
          </div>

          <div class="taf-setting-item">
            <label>AI Prompt</label>
            <textarea id="taf-setting-aiPrompt" style="width:100%; height:100px; margin-top:6px; background:rgba(255,255,255,0.03); border:0.5px solid rgba(255,255,255,0.08); border-radius:12px; color:#fff; padding:10px; font-size:11px; resize:vertical;">${escHtml(Settings.get('aiPrompt'))}</textarea>
          </div>

          <div style="display:flex; gap:8px; margin-top:20px;">
            <button class="taf-btn" id="taf-export-settings">📤 Export</button>
            <button class="taf-btn" id="taf-import-settings">📥 Import</button>
          </div>
          
          <div class="taf-setting-item" style="margin-top:16px;">
            <button class="taf-btn" id="taf-reset-settings" style="background:rgba(255,80,80,0.15); border-color:rgba(255,80,80,0.3); color:#ff5f5f;">⚠️ Reset All Settings</button>
          </div>
        </div>

        <!-- Humanize Tab -->
        <div class="taf-tab-pane" data-tab="humanize">
          <div class="taf-setting-item">
            <label>Speed Presets</label>
            <div class="taf-speed-chips">
              <span class="taf-chip" data-preset="turbo">⚡ Turbo</span>
              <span class="taf-chip" data-preset="fast">🚀 Fast</span>
              <span class="taf-chip active" data-preset="normal">⚖️ Normal</span>
              <span class="taf-chip" data-preset="human">🧑 Human</span>
              <span class="taf-chip" data-preset="ghost">👻 Ghost</span>
            </div>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-delay" ${Settings.get('enableRandomDelays') ? 'checked' : ''}> Random delays</label>
            <div style="margin-top:8px; margin-left:24px; display:flex; gap:12px;">
              <span style="color:#888;">Min (ms):</span><input type="number" id="taf-setting-minDelay" value="${Settings.get('minDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''} style="width:80px;">
              <span style="color:#888;">Max:</span><input type="number" id="taf-setting-maxDelay" value="${Settings.get('maxDelay')}" min="100" max="5000" step="50" ${!Settings.get('enableRandomDelays') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-human" ${Settings.get('enableHumanTyping') ? 'checked' : ''}> Human mistakes</label>
            <div style="margin-top:8px; margin-left:24px;">
              <span style="color:#888;">Chance (0-1):</span><input type="number" id="taf-setting-humanChance" value="${Settings.get('humanTypingChance')}" min="0" max="1" step="0.05" ${!Settings.get('enableHumanTyping') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label><input type="checkbox" id="taf-setting-charTyping" ${Settings.get('enableCharTyping') ? 'checked' : ''}> Type character by character</label>
            <div style="margin-top:8px; margin-left:24px;">
              <span style="color:#888;">Delay per char (ms):</span><input type="number" id="taf-setting-charDelay" value="${Settings.get('charTypingDelay')}" min="10" max="500" step="10" ${!Settings.get('enableCharTyping') ? 'disabled' : ''} style="width:80px;">
            </div>
          </div>
          <div class="taf-setting-item">
            <label style="justify-content: space-between;">Delay after question (ms):</label>
            <input type="number" id="taf-setting-questionDelay" value="${Settings.get('questionDelay')}" min="0" max="5000" step="100" style="width:100px;">
          </div>
        </div>

        <!-- Appearance Tab -->
        <div class="taf-tab-pane" data-tab="appearance">
          <div class="taf-setting-item"><label>Accent color</label><div class="taf-color-picker"><input type="color" id="taf-setting-accentColor" value="${Settings.get('accentColor')}"><span>${Settings.get('accentColor')}</span></div></div>
          <div class="taf-setting-item"><label>Background color</label><div class="taf-color-picker"><input type="color" id="taf-setting-bgColor" value="${Settings.get('backgroundColor')}"><span>${Settings.get('backgroundColor')}</span></div></div>
          <div class="taf-setting-item"><label>Blur intensity (px)</label><input type="number" id="taf-setting-blur" value="${Settings.get('blurIntensity')}" min="0" max="50" step="2" style="width:80px;"></div>
        </div>

        <!-- Buttons Tab -->
        <div class="taf-tab-pane" data-tab="buttons">
          ${BUTTON_CONFIG.map(cfg => `
            <div class="taf-setting-item"><label><input type="checkbox" id="taf-${cfg.id}" ${Settings.get(cfg.id) ? 'checked' : ''}> ${cfg.label}</label></div>
          `).join('')}
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

    // Provider toggle
    const providerSelect = modal.querySelector('#taf-setting-aiProvider');
    const panels = {
      openai: modal.querySelector('#taf-ai-openai'),
      gemini: modal.querySelector('#taf-ai-gemini'),
      claude: modal.querySelector('#taf-ai-claude'),
      github: modal.querySelector('#taf-ai-github'),
      groq: modal.querySelector('#taf-ai-groq')
    };
    providerSelect.addEventListener('change', () => {
      const val = providerSelect.value;
      Object.keys(panels).forEach(k => { if (panels[k]) panels[k].style.display = k === val ? 'block' : 'none'; });
    });

    // Speed presets
    modal.querySelectorAll('.taf-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const preset = chip.dataset.preset;
        Settings.applyPreset(preset);
        modal.querySelector('#taf-setting-delay').checked = Settings.get('enableRandomDelays');
        modal.querySelector('#taf-setting-minDelay').value = Settings.get('minDelay');
        modal.querySelector('#taf-setting-maxDelay').value = Settings.get('maxDelay');
        modal.querySelector('#taf-setting-human').checked = Settings.get('enableHumanTyping');
        modal.querySelector('#taf-setting-humanChance').value = Settings.get('humanTypingChance');
        modal.querySelector('#taf-setting-charTyping').checked = Settings.get('enableCharTyping');
        modal.querySelector('#taf-setting-charDelay').value = Settings.get('charTypingDelay');
        modal.querySelector('#taf-setting-questionDelay').value = Settings.get('questionDelay');
        toast(`Speed preset: ${preset}`, 'success');
        modal.querySelectorAll('.taf-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Export/Import
    modal.querySelector('#taf-export-settings').addEventListener('click', () => {
      copyToClipboard(Settings.exportSettings());
      toast('Settings exported to clipboard', 'success');
    });
    modal.querySelector('#taf-import-settings').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (Settings.importSettings(text)) {
          toast('Settings imported! Reloading...', 'success');
          setTimeout(() => location.reload(), 500);
        } else {
          toast('Invalid settings JSON', 'error');
        }
      } catch { toast('Failed to read clipboard', 'error'); }
    });

    // Reset
    modal.querySelector('#taf-reset-settings').addEventListener('click', () => {
      if (confirm('Reset all settings?')) {
        Settings.reset();
        GM_setValue(TUTORIAL_SHOWN_KEY, false);
        toast('Settings reset. Reloading...', 'info');
        setTimeout(() => location.reload(), 500);
      }
    });

    // ========== IMPROVED MODAL DRAGGING (on card, with cleanup & boundary) ==========
    const modalCard = modal.querySelector('.taf-modal-content');
    const modalHeaderDrag = modal.querySelector('.taf-modal-header');
    
    let isModalDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let modalCardRect = null;
    
    const onModalMouseMove = (e) => {
      if (!isModalDragging) return;
      e.preventDefault();
      
      const newLeft = e.clientX - dragOffsetX;
      const newTop = e.clientY - dragOffsetY;
      
      const minX = 20 - modalCardRect.width;
      const maxX = window.innerWidth - 20;
      const minY = 20 - modalCardRect.height;
      const maxY = window.innerHeight - 20;
      
      modalCard.style.left = Math.min(maxX, Math.max(minX, newLeft)) + 'px';
      modalCard.style.top = Math.min(maxY, Math.max(minY, newTop)) + 'px';
    };
    
    const onModalMouseUp = () => {
      if (!isModalDragging) return;
      isModalDragging = false;
      modalCard.style.transition = '';
      modalCard.style.cursor = '';
      
      window.removeEventListener('mousemove', onModalMouseMove);
      window.removeEventListener('mouseup', onModalMouseUp);
    };
    
    modalHeaderDrag.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      
      e.preventDefault();
      isModalDragging = true;
      
      modalCardRect = modalCard.getBoundingClientRect();
      
      modalCard.style.position = 'fixed';
      modalCard.style.left = modalCardRect.left + 'px';
      modalCard.style.top = modalCardRect.top + 'px';
      modalCard.style.right = 'auto';
      modalCard.style.bottom = 'auto';
      modalCard.style.margin = '0';
      modalCard.style.transition = 'none';
      modalCard.style.cursor = 'grabbing';
      
      dragOffsetX = e.clientX - modalCardRect.left;
      dragOffsetY = e.clientY - modalCardRect.top;
      
      window.addEventListener('mousemove', onModalMouseMove);
      window.addEventListener('mouseup', onModalMouseUp);
    });
    
    const resetModalPosition = () => {
      modalCard.style.position = '';
      modalCard.style.left = '';
      modalCard.style.top = '';
      modalCard.style.right = '';
      modalCard.style.bottom = '';
      modalCard.style.margin = '';
      modalCard.style.cursor = '';
    };
    
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mut) => {
        if (mut.attributeName === 'class' && modal.classList.contains('hidden')) {
          resetModalPosition();
        }
      });
    });
    modalObserver.observe(modal, { attributes: true });

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
        if (tab === 'disabled') refreshDisabledTab(modal, root, entries, bulkText);
      });
    });

    // Hotkey capture
    let capturing = false;
    const hotkeyInput = modal.querySelector('#taf-setting-hotkey');
    modal.querySelector('#taf-capture-hotkey').addEventListener('click', () => {
      capturing = true;
      hotkeyInput.value = 'Press any key...';
      hotkeyInput.style.background = 'rgba(255,59,48,0.2)';
    });
    modal.addEventListener('keydown', (e) => {
      if (!capturing) return;
      e.preventDefault(); e.stopPropagation();
      hotkeyInput.value = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      hotkeyInput.style.background = '';
      capturing = false;
    });

    // Initialize answer rows
    Object.entries(PRESET_ANSWERS).forEach(([k, v]) => addAnswerRow(entries, k, v));
    if (!Object.keys(PRESET_ANSWERS).length) { addAnswerRow(entries); addAnswerRow(entries); }

    // Event listeners
    root.querySelector('#taf-btn-add').addEventListener('click', () => addAnswerRow(entries));
    root.querySelector('#taf-btn-run').addEventListener('click', () => {
      if (Filler.isRunning()) Filler.stopFill();
      else {
        const answers = getAnswersFromUI(entries);
        const start = rangeStart ? parseInt(rangeStart.value) || 1 : 1;
        const end = rangeEnd ? parseInt(rangeEnd.value) || 999 : 999;
        Filler.runFill(answers, start, end);
      }
    });
    root.querySelector('#taf-settings-btn').addEventListener('click', () => {
      modal.classList.remove('hidden');
      refreshDisabledTab(modal, root, entries, bulkText);
    });
    root.querySelector('#taf-close-btn').addEventListener('click', () => {
      root.classList.add('taf-emergency-hidden');
      toast(`Panel closed. Press ${Settings.get('hotkey')} to reopen.`, 'info');
    });
    modal.querySelectorAll('.taf-modal-close').forEach(btn => btn.addEventListener('click', () => modal.classList.add('hidden')));

    // Save settings
    modal.querySelector('#taf-save-settings').addEventListener('click', () => {
      Settings.set('showAnswerRows', modal.querySelector('#taf-setting-showAnswers').checked);
      Settings.set('showLogPanel', modal.querySelector('#taf-setting-showLog').checked);
      Settings.set('showAISection', modal.querySelector('#taf-setting-showAI').checked);
      Settings.set('showFillRange', modal.querySelector('#taf-setting-showFillRange').checked);
      Settings.set('hotkey', hotkeyInput.value.trim() || 'Delete');
      Settings.set('aiProvider', providerSelect.value);
      Settings.set('openaiApiKey', modal.querySelector('#taf-setting-openaiKey')?.value || '');
      Settings.set('openaiModel', modal.querySelector('#taf-setting-openaiModel')?.value || 'gpt-4o-mini');
      Settings.set('geminiApiKey', modal.querySelector('#taf-setting-geminiKey')?.value || '');
      Settings.set('geminiModel', modal.querySelector('#taf-setting-geminiModel')?.value || 'gemini-2.0-flash');
      Settings.set('claudeApiKey', modal.querySelector('#taf-setting-claudeKey')?.value || '');
      Settings.set('claudeModel', modal.querySelector('#taf-setting-claudeModel')?.value || 'claude-3-haiku-20240307');
      Settings.set('githubToken', modal.querySelector('#taf-setting-githubToken')?.value || '');
      Settings.set('githubModel', modal.querySelector('#taf-setting-githubModel')?.value || 'gpt-4o');
      Settings.set('groqApiKey', modal.querySelector('#taf-setting-groqKey')?.value || '');
      Settings.set('groqModel', modal.querySelector('#taf-setting-groqModel')?.value || 'llama-3.3-70b-versatile');
      Settings.set('aiPrompt', modal.querySelector('#taf-setting-aiPrompt').value);
      Settings.set('enableRandomDelays', modal.querySelector('#taf-setting-delay').checked);
      Settings.set('minDelay', parseInt(modal.querySelector('#taf-setting-minDelay').value) || 300);
      Settings.set('maxDelay', parseInt(modal.querySelector('#taf-setting-maxDelay').value) || 900);
      Settings.set('enableHumanTyping', modal.querySelector('#taf-setting-human').checked);
      Settings.set('humanTypingChance', parseFloat(modal.querySelector('#taf-setting-humanChance').value) || 0.2);
      Settings.set('enableCharTyping', modal.querySelector('#taf-setting-charTyping').checked);
      Settings.set('charTypingDelay', parseInt(modal.querySelector('#taf-setting-charDelay').value) || 50);
      Settings.set('questionDelay', parseInt(modal.querySelector('#taf-setting-questionDelay').value) || 500);
      Settings.set('accentColor', modal.querySelector('#taf-setting-accentColor').value);
      Settings.set('backgroundColor', modal.querySelector('#taf-setting-bgColor').value);
      Settings.set('blurIntensity', parseInt(modal.querySelector('#taf-setting-blur').value) || 20);
      BUTTON_CONFIG.forEach(cfg => Settings.set(cfg.id, modal.querySelector(`#taf-${cfg.id}`).checked));

      Settings.applyTheme();
      document.getElementById('taf-answer-section').style.display = Settings.get('showAnswerRows') ? 'block' : 'none';
      document.getElementById('taf-log').style.display = Settings.get('showLogPanel') ? 'block' : 'none';
      document.getElementById('taf-ai-section').style.display = Settings.get('showAISection') ? 'block' : 'none';
      document.getElementById('taf-fill-range-container').style.display = Settings.get('showFillRange') ? 'flex' : 'none';
      
      rebuildBulkButtons(root);
      refreshDisabledTab(modal, root, entries, bulkText);
      modal.classList.add('hidden');
      toast('Settings saved', 'success');
    });

    // First-time tutorial
    if (!GM_getValue(TUTORIAL_SHOWN_KEY, false)) {
      const tutorial = document.createElement('div');
      tutorial.id = 'taf-tutorial-overlay';
      tutorial.innerHTML = `
        <div class="taf-tutorial-card">
          <h2>👋 Welcome to toddlesux v6.2</h2>
          <p>Auto‑fill Toddle forms with human‑like delays.<br>
          <strong>Drag</strong> header to move, <strong>resize</strong> from corner.<br>
          Press <strong>${Settings.get('hotkey')}</strong> to hide/show — double‑tap to reset position.<br>
          Use <strong>AI Assistant</strong> for ChatGPT, Gemini, Claude & more.<br>
          <strong>Ctrl+Enter</strong> to fill, <strong>Ctrl+Shift+F</strong> to scan.</p>
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