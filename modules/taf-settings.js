// modules/taf-settings.js
// toddlesux - Settings management with theming and multi-AI support
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Settings = (function() {
  'use strict';

  const STORAGE_KEY = 'taf_settings';

  const DEFAULTS = {
    // Humanize
    enableRandomDelays: true,
    minDelay: 300,
    maxDelay: 900,
    enableHumanTyping: false,
    humanTypingChance: 0.2,
    enableCharTyping: false,
    charTypingDelay: 50,
    questionDelay: 500,

    // General UI
    showAnswerRows: true,
    showLogPanel: true,
    showAISection: true,        // NEW: toggle AI section
    hotkey: 'Delete',

    // Theme
    accentColor: '#f5a623',
    backgroundColor: '#000000',
    blurIntensity: 20,

    // Button visibility
    showParseAdd: true,
    showClearAll: true,
    showPaste: true,
    showAiPrompt: true,
    showCopyQuestions: true,
    showClearHighlights: true,
    showClearAllAnswers: true,

    // AI Provider
    aiProvider: 'openai',        // 'openai', 'gemini', 'claude', 'github', 'groq'
    
    // API Keys (stored separately per provider)
    openaiApiKey: '',
    geminiApiKey: '',
    claudeApiKey: '',
    githubToken: '',
    groqApiKey: '',

    // Model settings
    openaiModel: 'gpt-4o-mini',
    geminiModel: 'gemini-2.0-flash',
    claudeModel: 'claude-3-haiku-20240307',
    githubModel: 'gpt-4o',
    groqModel: 'llama-3.3-70b-versatile',

    // AI Prompt
    aiPrompt: `Format your answers exactly like this for toddlesux:

- Start each line with Q followed by the question number, then a colon, then the answer.
  Example: Q1: Britain, France, Russia

- For multiple‑choice questions, just write the correct option text.
- For questions with **multiple blanks**, separate each answer with a pipe symbol (|) with spaces around it.
  Example: Q3: Treaty of Versailles | hyperinflation | worthless

- If a question has the same answer repeated, just repeat the text.
- Provide ONLY the Q&A lines, one per line, no extra commentary.`
  };

  let settings = { ...DEFAULTS };

  function load() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) {
      try { settings = { ...DEFAULTS, ...JSON.parse(saved) }; } catch(e) {}
    }
  }

  function save() { GM_setValue(STORAGE_KEY, JSON.stringify(settings)); }
  function get(key) { return settings[key] !== undefined ? settings[key] : DEFAULTS[key]; }
  function set(key, value) { settings[key] = value; save(); }
  function reset() { settings = { ...DEFAULTS }; save(); }
  function getAll() { return { ...settings }; }

  load();

  function applyTheme() {
    const root = document.documentElement;
    root.style.setProperty('--taf-accent', settings.accentColor);
    root.style.setProperty('--taf-bg', settings.backgroundColor);
    root.style.setProperty('--taf-blur', settings.blurIntensity + 'px');
  }

  applyTheme();

  return { get, set, reset, getAll, DEFAULTS, load, save, applyTheme };
})();
