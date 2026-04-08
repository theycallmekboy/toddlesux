// modules/taf-settings.js
// toddlesux - Settings management
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Settings = (function() {
  'use strict';

  const STORAGE_KEY = 'taf_settings';

  const DEFAULTS = {
    enableRandomDelays: true,
    minDelay: 300,            // milliseconds
    maxDelay: 900,
    enableHumanTyping: false,
    humanTypingChance: 0.2,   // 20% chance per field
  };

  let settings = { ...DEFAULTS };

  // Load saved settings from Tampermonkey storage
  function load() {
    const saved = GM_getValue(STORAGE_KEY, null);
    if (saved) {
      try {
        settings = { ...DEFAULTS, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('[toddlesux] Failed to parse settings, using defaults.');
      }
    }
  }

  // Save current settings to storage
  function save() {
    GM_setValue(STORAGE_KEY, JSON.stringify(settings));
  }

  // Get a setting value
  function get(key) {
    return settings[key] !== undefined ? settings[key] : DEFAULTS[key];
  }

  // Set a setting value and save
  function set(key, value) {
    settings[key] = value;
    save();
  }

  // Reset to defaults
  function reset() {
    settings = { ...DEFAULTS };
    save();
  }

  // Get all settings
  function getAll() {
    return { ...settings };
  }

  // Initialize on load
  load();

  return {
    get,
    set,
    reset,
    getAll,
    DEFAULTS,
    load,
    save
  };

})();
