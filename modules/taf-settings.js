// modules/taf-settings.js
// toddlesux - Settings with export/import and speed presets
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Settings = (function() {
  'use strict';

  const STORAGE_KEY = 'taf_settings';
  const DEFAULTS = {
    enableRandomDelays: true, minDelay: 300, maxDelay: 900,
    enableHumanTyping: false, humanTypingChance: 0.2,
    enableCharTyping: false, charTypingDelay: 50, questionDelay: 500,
    showAnswerRows: true, showLogPanel: true, showAISection: true, showFillRange: false, hotkey: 'Delete',
    accentColor: '#ff3b30', backgroundColor: '#000000', blurIntensity: 20,
    showPaste: true, showAiPrompt: true, showCopyQuestions: true, showClearHighlights: true,
    aiProvider: 'openai', openaiApiKey: '', geminiApiKey: '', claudeApiKey: '', githubToken: '', groqApiKey: '',
    openaiModel: 'gpt-4o-mini', geminiModel: 'gemini-2.0-flash', claudeModel: 'claude-3-haiku-20240307',
    githubModel: 'gpt-4o', groqModel: 'llama-3.3-70b-versatile',
    aiPrompt: `Format your answers exactly like this for toddlesux:

- Start each line with Q followed by the question number, then a colon, then the answer.
  Example: Q1: Britain, France, Russia

- For multiple‑choice questions, just write the correct option text.
- For questions with **multiple blanks**, separate each answer with a pipe symbol (|) with spaces around it.
  Example: Q3: Treaty of Versailles | hyperinflation | worthless

- If a question has the same answer repeated, just repeat the text.
- Provide ONLY the Q&A lines, one per line, no extra commentary.
- Make sure that one blank does not mean multiple blanks.`,
    fillRangeStart: 1, fillRangeEnd: 999,
    panelX: null, panelY: null, panelWidth: 360, panelHeight: null
  };

  let settings = {...DEFAULTS};

  function load() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) try { settings = {...DEFAULTS, ...JSON.parse(saved)}; } catch {}
  }
  function save() { GM_setValue(STORAGE_KEY, JSON.stringify(settings)); }
  function get(k) { return settings[k] ?? DEFAULTS[k]; }
  function set(k, v) { settings[k] = v; save(); }
  function reset() { settings = {...DEFAULTS}; save(); }
  function getAll() { return {...settings}; }

  const SPEED_PRESETS = {
    turbo:   { enableRandomDelays: false, enableHumanTyping: false, enableCharTyping: false, questionDelay: 0 },
    fast:    { enableRandomDelays: true, minDelay: 100, maxDelay: 300, enableHumanTyping: false, enableCharTyping: false, questionDelay: 100 },
    normal:  { enableRandomDelays: true, minDelay: 300, maxDelay: 900, enableHumanTyping: false, enableCharTyping: false, questionDelay: 500 },
    human:   { enableRandomDelays: true, minDelay: 500, maxDelay: 1500, enableHumanTyping: true, humanTypingChance: 0.3, enableCharTyping: true, charTypingDelay: 80, questionDelay: 800 },
    ghost:   { enableRandomDelays: true, minDelay: 2000, maxDelay: 4000, enableHumanTyping: true, humanTypingChance: 0.5, enableCharTyping: true, charTypingDelay: 150, questionDelay: 2000 }
  };

  function applyPreset(name) {
    const preset = SPEED_PRESETS[name];
    if (!preset) return;
    Object.assign(settings, preset);
    save();
  }

  function exportSettings() { return JSON.stringify(settings, null, 2); }
  function importSettings(json) {
    try {
      const imported = JSON.parse(json);
      settings = {...DEFAULTS, ...imported};
      save();
      return true;
    } catch { return false; }
  }

  load();
  function applyTheme() {
    const root = document.documentElement;
    root.style.setProperty('--taf-accent', settings.accentColor);
    root.style.setProperty('--taf-bg', settings.backgroundColor);
    root.style.setProperty('--taf-blur', settings.blurIntensity + 'px');
  }
  applyTheme();

  return { get, set, reset, getAll, DEFAULTS, load, save, applyTheme, applyPreset, exportSettings, importSettings, SPEED_PRESETS };
})();