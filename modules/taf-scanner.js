// modules/taf-scanner.js
// toddlesux - Question detection with caching and observer invalidation
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Scanner = (function() {
  'use strict';

  const QUESTION_SELECTOR = '[data-test-id*="worksheet-question-questionCard"]';
  const QUESTION_TEXT_SELECTOR = '[class*="Header__studentViewContainer"]';
  const OPTIONS_CONTAINER_SELECTOR = '[class*="MultiChoiceCheckList__container"]';
  const OPTION_ITEM_SELECTOR = '[class*="OptionsList__itemContainer"]';

  let cachedBlocks = null;
  let cacheValid = false;

  function invalidateCache() { cacheValid = false; cachedBlocks = null; }

  function findQuestionBlocks() {
    if (cacheValid && cachedBlocks) return cachedBlocks;
    const cards = document.querySelectorAll(QUESTION_SELECTOR);
    cachedBlocks = [...cards].filter(el => 
      el.querySelector('input, select, textarea, [role="radio"], [role="checkbox"], [contenteditable="true"], ' + OPTIONS_CONTAINER_SELECTOR)
    );
    cacheValid = true;
    return cachedBlocks;
  }

  function getQuestionLabel(block) {
    const header = block.querySelector(QUESTION_TEXT_SELECTOR);
    if (header) {
      const idx = header.querySelector('[class*="Header__index"]');
      const txt = header.querySelector('[class*="Header__minWidth0"]');
      if (idx && txt) return `${idx.textContent.trim()} ${txt.textContent.trim()}`;
      return header.textContent.trim();
    }
    return block.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function scanPage() {
    TAF.Utils.clearLog();
    const blocks = findQuestionBlocks();
    if (!blocks.length) {
      TAF.Utils.log('No questions found', 'warn');
      TAF.Utils.setStatus('NONE', false);
      return blocks;
    }
    TAF.Utils.log(`Found ${blocks.length} questions`, 'info');
    blocks.forEach((b, i) => TAF.Utils.log(`q${i+1}: ${getQuestionLabel(b).slice(0,60)}`, 'info'));
    TAF.Utils.setStatus(`${blocks.length} Qs`, true);
    return blocks;
  }

  async function copyAllQuestions() {
    const blocks = findQuestionBlocks();
    if (!blocks.length) { TAF.Utils.toast('No questions found', 'warn'); return; }
    const lines = [];
    blocks.forEach((b, i) => {
      const label = getQuestionLabel(b);
      const m = label.match(/^(Q\d+(?:\.\d+)?)/i);
      lines.push(m ? `${m[1]}: ${label.slice(m[1].length).replace(/^[:.\s]+/, '').trim()}` : `Q${i+1}: ${label}`);
    });
    await TAF.Utils.copyToClipboard(lines.join('\n'));
    TAF.Utils.log(`Copied ${blocks.length} questions`, 'ok');
  }

  return {
    QUESTION_SELECTOR, QUESTION_TEXT_SELECTOR, OPTIONS_CONTAINER_SELECTOR, OPTION_ITEM_SELECTOR,
    findQuestionBlocks, getQuestionLabel, scanPage, copyAllQuestions, invalidateCache
  };
})();