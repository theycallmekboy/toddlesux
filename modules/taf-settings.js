// modules/taf-settings.js
// toddlesux - Settings management
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Settings = (function() {
  'use strict';

  const STORAGE_KEY = 'taf_settings';

  const DEFAULTS = {
    enableRandomDelays: true,
    minDelay: 300,
    maxDelay: 900,
    enableHumanTyping: false,
    humanTypingChance: 0.2,
    enableCharTyping: false,
    charTypingDelay: 50,
    questionDelay: 500,
    showAnswerRows: true,      // new
    showLogPanel: true,        // new
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

  return { get, set, reset, getAll, DEFAULTS, load, save };
})();
