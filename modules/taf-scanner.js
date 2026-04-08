// modules/taf-scanner.js
// toddlesux - Question detection & scanning
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Scanner = (function() {
  'use strict';

  const QUESTION_SELECTOR = '[class*="SectionDetails__questionCardRevamp"]';
  const QUESTION_TEXT_SELECTOR = '[class*="Header__studentViewContainer"]';
  const OPTIONS_CONTAINER_SELECTOR = '[class*="MultiChoiceCheckList__container"]';
  const OPTION_ITEM_SELECTOR = '[class*="OptionsList__itemContainer"]';

  function findQuestionBlocks() {
    // Use only the main container selector to avoid duplicates
    const elements = document.querySelectorAll(QUESTION_SELECTOR);
    // Also include any with data-test-id that might be sub-questions
    const subCards = document.querySelectorAll('[data-test-id*="worksheet-question-questionCard"]');
    
    // Combine and deduplicate using a Set (by element reference)
    const uniqueElements = [...new Set([...elements, ...subCards])];
    
    // Filter to only blocks that contain actual form elements
    return uniqueElements.filter(el =>
      el.querySelector('input, select, textarea, [role="radio"], [role="checkbox"], [contenteditable="true"], ' + OPTIONS_CONTAINER_SELECTOR)
    );
  }

  function getQuestionLabel(block) {
    const header = block.querySelector(QUESTION_TEXT_SELECTOR);
    if (header) {
      const indexEl = header.querySelector('[class*="Header__index"]');
      const textEl = header.querySelector('[class*="Header__minWidth0"]');
      if (indexEl && textEl) {
        const number = indexEl.textContent.trim();
        const text = textEl.textContent.trim();
        return `${number} ${text}`;
      }
      return header.textContent.trim();
    }
    const candidates = block.querySelectorAll('label, legend, h3, h4, h5, [class*="label"]');
    for (const el of candidates) {
      const t = el.textContent.trim();
      if (t.length > 1 && t.length < 500) return t;
    }
    return block.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function scanPage() {
    TAF.Utils.clearLog();
    const blocks = findQuestionBlocks();
    if (!blocks.length) {
      TAF.Utils.log('No question blocks found. Scroll to load content first.', 'warn');
      TAF.Utils.setStatus('NONE', false);
      return;
    }
    TAF.Utils.log(`Found ${blocks.length} question block(s):`, 'info');
    blocks.forEach((b, i) => {
      const label = getQuestionLabel(b).slice(0, 60);
      TAF.Utils.log(`q${i + 1}: ${label}`, 'info');
    });
    TAF.Utils.setStatus(`${blocks.length} QS`, true);
  }

  async function copyAllQuestions() {
    const blocks = findQuestionBlocks();
    if (!blocks.length) {
      TAF.Utils.log('No questions found. Scroll to load them first.', 'warn');
      return;
    }

    const lines = [];
    blocks.forEach((b) => {
      const label = getQuestionLabel(b);
      const match = label.match(/^(Q\d+(?:\.\d+)?)/i);
      if (match) {
        const prefix = match[1];
        const rest = label.slice(prefix.length).replace(/^[:.\s]+/, '').trim();
        lines.push(`${prefix}: ${rest}`);
      } else {
        const idx = lines.length + 1;
        lines.push(`Q${idx}: ${label}`);
      }
    });

    const output = lines.join('\n');
    const success = await TAF.Utils.copyToClipboard(output);
    if (success) {
      TAF.Utils.log(`✅ Copied ${blocks.length} questions to clipboard!`, 'ok');
    } else {
      TAF.Utils.log('❌ Failed to copy questions.', 'err');
    }
  }

  return {
    QUESTION_SELECTOR,
    QUESTION_TEXT_SELECTOR,
    OPTIONS_CONTAINER_SELECTOR,
    OPTION_ITEM_SELECTOR,
    findQuestionBlocks,
    getQuestionLabel,
    scanPage,
    copyAllQuestions
  };
})();
