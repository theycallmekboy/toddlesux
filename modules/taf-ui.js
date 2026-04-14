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
    root.querySelector('#taf-settings-btn').addEventListener('click', () => openSettings());

    setupDraggable(root, root.querySelector('#taf-header'), 'panelX', 'panelY');
    setupResizable(root, 'panelWidth', 'panelHeight');
  }

  function setupDraggable(el, handle, saveX, saveY) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      handle.style.cursor = 'grabbing';
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = (initialX + dx) + 'px';
      el.style.top = (initialY + dy) + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
        Settings.set(saveX, parseInt(el.style.left));
        Settings.set(saveY, parseInt(el.style.top));
      }
    });
  }

  function setupResizable(el, saveW, saveH) {
    const handle = document.createElement('div');
    handle.className = 'taf-resize-handle';
    el.querySelector('#taf-panel').appendChild(handle);

    let isResizing = false;
    let startW, startH, startX, startY;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = el.offsetWidth;
      startH = el.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newW = Math.max(280, startW + (e.clientX - startX));
      const newH = Math.max(400, startH + (e.clientY - startY));
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
    });

    window.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        Settings.set(saveW, el.offsetWidth);
        Settings.set(saveH, el.offsetHeight);
      }
    });
  }

  function openSettings() {
    let modal = document.getElementById('taf-settings-modal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'taf-settings-modal';
    modal.className = 'hidden';
    modal.innerHTML = `
      <div class="taf-modal-content">
        <div class="taf-modal-header">
          <button class="taf-tab-btn active" data-tab="general">General</button>
          <button class="taf-tab-btn" data-tab="ai">AI Config</button>
          <button class="taf-tab-btn" data-tab="appearance">Theme</button>
          <button class="taf-tab-btn" data-tab="advanced">Advanced</button>
          <div style="flex:1;"></div>
          <button id="taf-settings-close" style="background:none; border:none; color:#888; cursor:pointer; font-size:20px;">✕</button>
        </div>
        
        <div class="taf-tab-pane active" id="taf-tab-general">
          <div class="taf-setting-item">
             <label><input type="checkbox" id="set-random-delays" ${Settings.get('enableRandomDelays')?'checked':''}> Enable Random Delays</label>
          </div>
          <div style="display:flex; gap:10px; margin-bottom:18px;">
            <div style="flex:1;">
              <div style="font-size:11px; color:#888; margin-bottom:4px;">Min Delay (ms)</div>
              <input type="number" id="set-min-delay" value="${Settings.get('minDelay')}">
            </div>
            <div style="flex:1;">
              <div style="font-size:11px; color:#888; margin-bottom:4px;">Max Delay (ms)</div>
              <input type="number" id="set-max-delay" value="${Settings.get('maxDelay')}">
            </div>
          </div>
          <div class="taf-setting-item">
             <label><input type="checkbox" id="set-char-typing" ${Settings.get('enableCharTyping')?'checked':''}> Character-by-Character Typing</label>
          </div>
          <div class="taf-setting-item">
             <div style="font-size:11px; color:#888; margin-bottom:4px;">Question Transition Delay (ms)</div>
             <input type="number" id="set-question-delay" value="${Settings.get('questionDelay')}">
          </div>
          <div class="taf-section-label" style="margin-top:24px;">Speed Presets</div>
          <div class="taf-speed-chips">
            ${Object.keys(Settings.SPEED_PRESETS).map(p => `<button class="taf-chip" data-preset="${p}">${p.toUpperCase()}</button>`).join('')}
          </div>
        </div>

        <div class="taf-tab-pane" id="taf-tab-ai">
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Provider</div>
            <select id="set-ai-provider">
              <option value="openai" ${Settings.get('aiProvider')==='openai'?'selected':''}>OpenAI</option>
              <option value="gemini" ${Settings.get('aiProvider')==='gemini'?'selected':''}>Google Gemini</option>
              <option value="claude" ${Settings.get('aiProvider')==='claude'?'selected':''}>Anthropic Claude</option>
              <option value="github" ${Settings.get('aiProvider')==='github'?'selected':''}>GitHub Models</option>
              <option value="groq" ${Settings.get('aiProvider')==='groq'?'selected':''}>Groq (Llama 3)</option>
            </select>
          </div>
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">API Key / Token</div>
            <input type="password" id="set-ai-key" value="${Settings.get(Settings.get('aiProvider') + 'ApiKey') || Settings.get('githubToken') || ''}">
          </div>
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Model</div>
            <input type="text" id="set-ai-model" value="${Settings.get(Settings.get('aiProvider') + 'Model')}">
          </div>
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">System Prompt</div>
            <textarea id="set-ai-prompt" style="width:100%; height:120px; background:rgba(255,255,255,0.05); border:0.5px solid rgba(255,255,255,0.1); border-radius:10px; color:#fff; padding:8px; font-size:11px;">${Settings.get('aiPrompt')}</textarea>
          </div>
        </div>

        <div class="taf-tab-pane" id="taf-tab-appearance">
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Accent Color</div>
            <div class="taf-color-picker">
              <input type="color" id="set-accent-color" value="${Settings.get('accentColor')}">
              <input type="text" value="${Settings.get('accentColor')}" style="margin-top:0;">
            </div>
          </div>
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Background Color</div>
            <div class="taf-color-picker">
              <input type="color" id="set-bg-color" value="${Settings.get('backgroundColor')}">
              <input type="text" value="${Settings.get('backgroundColor')}" style="margin-top:0;">
            </div>
          </div>
          <div class="taf-setting-item">
            <div style="font-size:11px; color:#888; margin-bottom:4px;">Blur Intensity (px)</div>
            <input type="number" id="set-blur-intensity" value="${parseInt(Settings.get('blurIntensity'))}">
          </div>
        </div>

        <div class="taf-tab-pane" id="taf-tab-advanced">
           <div class="taf-setting-item">
             <label><input type="checkbox" id="set-show-answers" ${Settings.get('showAnswerRows')?'checked':''}> Show Answer Rows</label>
           </div>
           <div class="taf-setting-item">
             <label><input type="checkbox" id="set-show-ai" ${Settings.get('showAISection')?'checked':''}> Show AI Assistant</label>
           </div>
           <div class="taf-setting-item">
             <label><input type="checkbox" id="set-show-log" ${Settings.get('showLogPanel')?'checked':''}> Show Log Panel</label>
           </div>
           <div class="taf-setting-item">
             <label><input type="checkbox" id="set-show-range" ${Settings.get('showFillRange')?'checked':''}> Show Fill Range</label>
           </div>
           <div style="display:flex; gap:10px; margin-top:20px;">
             <button class="taf-btn" id="set-export">Export Settings</button>
             <button class="taf-btn" id="set-import">Import Settings</button>
             <button class="taf-btn" id="set-reset" style="background:rgba(255,59,48,0.2); color:#ff5f5f;">Reset All</button>
           </div>
        </div>

      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#taf-settings-close');
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // Tab switching logic
    modal.querySelectorAll('.taf-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.taf-tab-btn').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.taf-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`#taf-tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    // Speed chips
    modal.querySelectorAll('.taf-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        Settings.applyPreset(chip.dataset.preset);
        modal.classList.add('hidden');
        toast(`Applied ${chip.dataset.preset} preset`, 'success');
        // Refresh sidebar view (simplified: just reload page or rebuild, but here we just update inputs if open)
        location.reload(); 
      });
    });

    // Save listeners
    modal.addEventListener('change', (e) => {
      const id = e.target.id;
      if (id === 'set-random-delays') Settings.set('enableRandomDelays', e.target.checked);
      if (id === 'set-min-delay') Settings.set('minDelay', parseInt(e.target.value));
      if (id === 'set-max-delay') Settings.set('maxDelay', parseInt(e.target.value));
      if (id === 'set-char-typing') Settings.set('enableCharTyping', e.target.checked);
      if (id === 'set-question-delay') Settings.set('questionDelay', parseInt(e.target.value));
      if (id === 'set-ai-provider') Settings.set('aiProvider', e.target.value);
      if (id === 'set-ai-key') {
         const provider = Settings.get('aiProvider');
         if (provider === 'github') Settings.set('githubToken', e.target.value);
         else Settings.set(provider + 'ApiKey', e.target.value);
      }
      if (id === 'set-ai-model') Settings.set(Settings.get('aiProvider') + 'Model', e.target.value);
      if (id === 'set-ai-prompt') Settings.set('aiPrompt', e.target.value);
      if (id === 'set-accent-color') { Settings.set('accentColor', e.target.value); Settings.applyTheme(); }
      if (id === 'set-bg-color') { Settings.set('backgroundColor', e.target.value); Settings.applyTheme(); }
      if (id === 'set-blur-intensity') { Settings.set('blurIntensity', parseInt(e.target.value)); Settings.applyTheme(); }
      if (id === 'set-show-answers') { Settings.set('showAnswerRows', e.target.checked); location.reload(); }
      if (id === 'set-show-ai') { Settings.set('showAISection', e.target.checked); location.reload(); }
      if (id === 'set-show-log') { Settings.set('showLogPanel', e.target.checked); location.reload(); }
      if (id === 'set-show-range') { Settings.set('showFillRange', e.target.checked); location.reload(); }
      if (id === 'set-btn-paste') { Settings.set('showPaste', e.target.checked); rebuildBulkButtons(currentRoot); }
      if (id === 'set-btn-prompt') { Settings.set('showAiPrompt', e.target.checked); rebuildBulkButtons(currentRoot); }
      if (id === 'set-btn-copy') { Settings.set('showCopyQuestions', e.target.checked); rebuildBulkButtons(currentRoot); }
      if (id === 'set-btn-clear') { Settings.set('showClearHighlights', e.target.checked); rebuildBulkButtons(currentRoot); }
    });

    modal.querySelector('#set-reset').addEventListener('click', () => {
      if (confirm('Reset all settings to default?')) {
        Settings.reset();
        location.reload();
      }
    });

    modal.querySelector('#set-export').addEventListener('click', () => {
       copyToClipboard(Settings.exportSettings());
       toast('Settings copied to clipboard', 'success');
    });

    modal.querySelector('#set-import').addEventListener('click', () => {
      const json = prompt('Paste settings JSON:');
      if (json && Settings.importSettings(json)) location.reload();
    });

    setupDraggable(modal, modal.querySelector('.taf-modal-header'), null, null);
    
    requestAnimationFrame(() => modal.classList.remove('hidden'));
  }

  function resetForNavigation() {
    if (currentRoot) currentRoot.dataset.state = 'VISIBLE';
    Scanner.invalidateCache();
  }

  return { buildSidebar, addAnswerRow, getAnswersFromUI, resetForNavigation, clearParseDebounce };
})();