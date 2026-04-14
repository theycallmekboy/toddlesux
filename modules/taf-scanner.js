// modules/taf-scanner.js
// toddlesux - Question detection with stable ID tracking and order
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Scanner = (function() {
  'use strict';

  // --- Primary Selector (Attribute-based is more stable than dynamic classes) ---
  const QUESTION_SELECTOR = '[data-test-id^="worksheet-question-questionCard-"]';
  const INDEX_SELECTOR = '[class*="Header__index"]';
  const TEXT_SELECTOR = '[class*="Textview__richText"]';
  
  const OPTIONS_CONTAINER_SELECTOR = '[class*="MultiChoiceCheckList__container"]';
  const OPTION_ITEM_SELECTOR = '[class*="OptionsList__itemContainer"]';

  let cachedBlocks = null;
  let cacheValid = false;

  function invalidateCache() { cacheValid = false; cachedBlocks = null; }

  function findQuestionBlocks() {
    if (cacheValid && cachedBlocks) return cachedBlocks;
    cacheValid = true;

    const cards = document.querySelectorAll(QUESTION_SELECTOR);
    const seenIds = new Set();
    const unique = [];

    // Deduplicate by the unique data-test-id string, not DOM reference
    cards.forEach(card => {
      const id = card.getAttribute('data-test-id');
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        unique.push(card);
      }
    });

    // Ensure logical order based on the trailing question index in the ID
    cachedBlocks = unique.sort((a, b) => {
      const idxA = parseInt(a.getAttribute('data-test-id').split('-').pop()) || 0;
      const idxB = parseInt(b.getAttribute('data-test-id').split('-').pop()) || 0;
      return idxA - idxB;
    });

    return cachedBlocks;
  }

  function getQuestionLabel(block) {
    const indexEl = block.querySelector(INDEX_SELECTOR);
    const textEl = block.querySelector(TEXT_SELECTOR);
    
    const index = indexEl ? indexEl.textContent.trim() : ""; 
    const text = textEl ? textEl.textContent.trim() : "";
    
    if (!index && !text) return block.textContent.slice(0, 100).replace(/\s+/g, ' ').trim();
    return `${index} ${text}`.trim();
  }

  function scanPage() {
    TAF.Utils.clearLog();
    invalidateCache();
    const blocks = findQuestionBlocks();
    if (!blocks.length) {
      TAF.Utils.log('No questions found', 'warn');
      TAF.Utils.setStatus('NONE', false);
      return [];
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
      // Format as Q1: Question Text
      const m = label.match(/^(Q\d+)/i);
      lines.push(m ? `${m[1]}: ${label.slice(m[1].length).replace(/^[:.\s]+/, '').trim()}` : `Q${i+1}: ${label}`);
    });
    await TAF.Utils.copyToClipboard(lines.join('\n'));
    TAF.Utils.log(`Copied ${blocks.length} questions`, 'ok');
  }

  return {
    QUESTION_SELECTOR, OPTIONS_CONTAINER_SELECTOR, OPTION_ITEM_SELECTOR,
    findQuestionBlocks, getQuestionLabel, scanPage, copyAllQuestions, invalidateCache
  };
})();