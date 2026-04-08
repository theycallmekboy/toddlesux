// modules/taf-scanner.js
// toddlesux - Question detection & scanning
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Scanner = (function() {
  'use strict';

  const QUESTION_SELECTORS = [
    '[class*="SectionDetails__questionCardRevamp"]',
    '[data-test-id*="worksheet-question-questionCard"]',
    '[class*="QuestionCard"]',
    '[class*="question-card"]',
    'fieldset',
    '[role="group"]',
  ];

  const QUESTION_TEXT_SELECTOR = '[class*="Header__studentViewContainer"]';
  const OPTIONS_CONTAINER_SELECTOR = '[class*="MultiChoiceCheckList__container"]';
  const OPTION_ITEM_SELECTOR = '[class*="OptionsList__itemContainer"]';

  // Find all question blocks on the page
  function findQuestionBlocks() {
    let elements = [];
    
    for (const sel of QUESTION_SELECTORS) {
      const found = document.querySelectorAll(sel);
      if (found.length) {
        elements = [...found];
        break;
      }
    }

    // Also include sub-question cards (like Q1.1)
    const subCards = document.querySelectorAll('[data-test-id*="worksheet-question-questionCard-"]');
    elements = [...new Set([...elements, ...subCards])];

    // Filter to only blocks that contain actual form elements
    return elements.filter(el =>
      el.querySelector('input, select, textarea, [role="radio"], [role="checkbox"], [contenteditable="true"], ' + OPTIONS_CONTAINER_SELECTOR)
    );
  }

  // Extract clean question text from a block
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

    // Fallback to any label, legend, heading
    const candidates = block.querySelectorAll('label, legend, h3, h4, h5, [class*="label"]');
    for (const el of candidates) {
      const t = el.textContent.trim();
      if (t.length > 1 && t.length < 500) return t;
    }

    return block.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  // Scan page and log questions to the panel
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

  // Copy all questions to clipboard (ready for AI)
  async function copyAllQuestions() {
    const blocks = findQuestionBlocks();
    if (!blocks.length) {
      TAF.Utils.log('No questions found. Scroll to load them first.', 'warn');
      return;
    }

    const lines = [];
    blocks.forEach((b, i) => {
      let label = getQuestionLabel(b);
      // Remove any existing Q1 prefix to avoid duplication
      label = label.replace(/^Q\d+(\.\d+)?\s*[:.]?\s*/i, '').trim();
      lines.push(`Q${i + 1}: ${label}`);
    });

    const output = lines.join('\n');
    const success = await TAF.Utils.copyToClipboard(output);
    
    if (success) {
      TAF.Utils.log(`✅ Copied ${blocks.length} questions to clipboard!`, 'ok');
    } else {
      TAF.Utils.log('❌ Failed to copy questions.', 'err');
    }
  }

  // Export selectors for use by filler module
  return {
    QUESTION_SELECTORS,
    QUESTION_TEXT_SELECTOR,
    OPTIONS_CONTAINER_SELECTOR,
    OPTION_ITEM_SELECTOR,
    findQuestionBlocks,
    getQuestionLabel,
    scanPage,
    copyAllQuestions
  };

})();
