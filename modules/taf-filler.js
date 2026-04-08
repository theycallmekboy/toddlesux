// modules/taf-filler.js
// toddlesux - Fill logic with human simulation
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Filler = (function() {
  'use strict';

  const { sleep, log, setStatus, highlight, setNativeValue } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;

  // ─────────────────────────────────────────────────────────────
  //  Random delay based on settings
  // ─────────────────────────────────────────────────────────────
  async function humanDelay() {
    if (!Settings.get('enableRandomDelays')) return;
    const min = Settings.get('minDelay');
    const max = Settings.get('maxDelay');
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await sleep(delay);
  }

  // ─────────────────────────────────────────────────────────────
  //  Type text character by character with delay
  // ─────────────────────────────────────────────────────────────
  async function typeCharByChar(inputElement, text) {
    const delay = Settings.get('charTypingDelay') || 50;
    let current = '';
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      setNativeValue(inputElement, current);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(delay);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Simulate human typing (supports char‑by‑char and mistakes)
  // ─────────────────────────────────────────────────────────────
  async function simulateHumanTyping(inputElement, text) {
    const useHumanSim = Settings.get('enableHumanTyping');
    const useCharTyping = Settings.get('enableCharTyping');

    // If both disabled, just set instantly
    if (!useHumanSim && !useCharTyping) {
      setNativeValue(inputElement, text);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Character‑by‑character typing
    if (useCharTyping) {
      await typeCharByChar(inputElement, text);

      // Optionally layer human mistake on top
      if (useHumanSim && Math.random() < Settings.get('humanTypingChance')) {
        const backCount = Math.floor(Math.random() * 3) + 1; // backspace 1–3 chars
        const partial = text.slice(0, -backCount);
        setNativeValue(inputElement, partial);
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        await sleep(200 + Math.random() * 200);

        // Retype the remaining characters
        for (let i = partial.length; i < text.length; i++) {
          const newVal = text.slice(0, i + 1);
          setNativeValue(inputElement, newVal);
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(Settings.get('charTypingDelay'));
        }
      }
      return;
    }

    // Human mistake simulation without char‑typing (original behavior)
    if (Math.random() < Settings.get('humanTypingChance')) {
      const partialLength = Math.floor(text.length * 0.6);
      const partial = text.substring(0, partialLength);
      setNativeValue(inputElement, partial);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(150 + Math.random() * 200);

      const backspaceCount = Math.floor(Math.random() * 4) + 2;
      const newText = partial.substring(0, Math.max(0, partial.length - backspaceCount));
      setNativeValue(inputElement, newText);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(200 + Math.random() * 300);

      setNativeValue(inputElement, text);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      setNativeValue(inputElement, text);
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(100 + Math.random() * 150);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Fill a single question block
  // ─────────────────────────────────────────────────────────────
  async function fillBlock(block, answerArray, label) {
    const firstAns = answerArray[0] || '';
    const firstAnsLo = firstAns.toLowerCase();

    // 1. Multiple‑choice (Toddle specific)
    const optionsContainer = block.querySelector(Scanner.OPTIONS_CONTAINER_SELECTOR);
    if (optionsContainer) {
      const items = optionsContainer.querySelectorAll(Scanner.OPTION_ITEM_SELECTOR);
      for (const item of items) {
        const txt = item.textContent.trim().toLowerCase();
        if (txt.includes(firstAnsLo) || firstAnsLo.includes(txt)) {
          const input = item.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input && !input.checked) input.click();
          else item.click();
          highlight(item);
          log(`Multiple‑choice → "${firstAns}" (${label.slice(0,30)})`, 'ok');
          await sleep(Settings.get('questionDelay') || 0);
          return true;
        }
      }
    }

    // 2. Generic radio/checkbox
    const radios = [...block.querySelectorAll('input[type="radio"], input[type="checkbox"]')];
    for (const r of radios) {
      const labelEl = r.labels?.[0] || r.closest('label') || r.parentElement;
      const lTxt = (labelEl?.textContent || r.value || '').trim().toLowerCase();
      if (lTxt.includes(firstAnsLo) || firstAnsLo.includes(lTxt)) {
        if (!r.checked) r.click();
        r.dispatchEvent(new Event('change', { bubbles: true }));
        highlight(labelEl || r);
        log(`Radio/Check → "${firstAns}" (${label.slice(0,30)})`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
    }

    // 3. Option pills
    const pills = [...block.querySelectorAll(
      '[role="radio"], [role="option"], [class*="option"], [class*="Option"], ' +
      '[class*="choice"], [class*="Choice"]'
    )];
    for (const pill of pills) {
      const t = pill.textContent.trim().toLowerCase();
      if (!t) continue;
      if (t.includes(firstAnsLo) || firstAnsLo.includes(t)) {
        pill.click();
        highlight(pill);
        log(`Option → "${firstAns}" (${label.slice(0,30)})`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
    }

    // 4. Native <select>
    const selects = [...block.querySelectorAll('select')];
    for (const sel of selects) {
      const match = [...sel.options].find(o =>
        o.text.toLowerCase().includes(firstAnsLo) || firstAnsLo.includes(o.text.toLowerCase())
      );
      if (match) {
        sel.value = match.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input',  { bubbles: true }));
        highlight(sel);
        log(`Dropdown → "${match.text}" (${label.slice(0,30)})`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
    }

    // 5. Custom dropdown (async)
    const dropTrigger = block.querySelector(
      '[class*="dropdown"], [class*="Dropdown"], [aria-haspopup="listbox"], [class*="select-trigger"]'
    );
    if (dropTrigger) {
      dropTrigger.click();
      setTimeout(() => {
        const items = [...document.querySelectorAll('[role="option"], [role="listitem"], [class*="menu-item"]')];
        for (const item of items) {
          if (item.textContent.trim().toLowerCase().includes(firstAnsLo)) {
            item.click();
            highlight(dropTrigger);
            log(`Custom dropdown → "${firstAns}" (${label.slice(0,30)})`, 'ok');
          }
        }
        log(`Dropdown opened but "${firstAns}" not found.`, 'warn');
      }, 450);
      await sleep(Settings.get('questionDelay') || 0);
      return true;
    }

    // 6. TEXT INPUTS / TEXTAREAS / CONTENTEDITABLE – fill all in order
    const textEls = [...block.querySelectorAll(
      'input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea, [contenteditable="true"]'
    )];

    if (textEls.length > 0) {
      let filledCount = 0;
      for (let i = 0; i < textEls.length && i < answerArray.length; i++) {
        const inp = textEls[i];
        const ans = answerArray[i];
        if (!ans) continue;

        inp.focus();
        if (inp.getAttribute('contenteditable') === 'true') {
          document.execCommand('selectAll', false, null);
          document.execCommand('insertText', false, ans);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          await simulateHumanTyping(inp, ans);
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          inp.blur();
        }
        highlight(inp);
        filledCount++;
        await humanDelay();
      }
      if (filledCount > 0) {
        log(`Text fills → ${filledCount} blank(s) (${label.slice(0,30)})`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
    }

    log(`No field found for: "${label.slice(0,30)}" (answers: ${answerArray.join(' | ')})`, 'err');
    return false;
  }

  // ─────────────────────────────────────────────────────────────
  //  Match answer array to question block
  // ─────────────────────────────────────────────────────────────
  function findAnswer(answers, block, index) {
    const indexKey = `q${index + 1}`;
    if (answers[indexKey]) return answers[indexKey];

    // Also try sub‑question keys like q1.1
    const label = Scanner.getQuestionLabel(block);
    const subMatch = label.match(/^Q(\d+(?:\.\d+)?)/i);
    if (subMatch) {
      const subKey = `q${subMatch[1].toLowerCase()}`;
      if (answers[subKey]) return answers[subKey];
    }

    // Keyword match
    const labelLo = label.toLowerCase();
    for (const [key, val] of Object.entries(answers)) {
      if (/^q\d+(\.\d+)?$/.test(key)) continue;
      if (labelLo.includes(key) || key.split(' ').every(w => labelLo.includes(w))) return val;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  //  Main fill orchestration
  // ─────────────────────────────────────────────────────────────
  async function runFill(answersMap) {
    TAF.Utils.clearLog();
    setStatus('RUNNING', true);

    const blocks = Scanner.findQuestionBlocks();
    if (!blocks.length) {
      log('No question blocks found — scroll to load them first.', 'warn');
      setStatus('NONE', false);
      return;
    }

    log(`Processing ${blocks.length} block(s)…`, 'info');
    let filled = 0;

    for (let i = 0; i < blocks.length; i++) {
      const answerArray = findAnswer(answersMap, blocks[i], i);
      if (!answerArray || answerArray.length === 0) continue;

      await humanDelay();
      const success = await fillBlock(blocks[i], answerArray, Scanner.getQuestionLabel(blocks[i]));
      if (success) filled++;
    }

    const allGood = filled > 0;
    log(allGood
      ? `${filled} of ${blocks.length} field(s) filled successfully.`
      : 'Nothing filled — check your keys match question text or use q1/q2 indexing.',
      allGood ? 'ok' : 'warn'
    );
    setStatus(allGood ? `${filled} DONE` : 'MISS', allGood);
  }

  return {
    humanDelay,
    simulateHumanTyping,
    fillBlock,
    findAnswer,
    runFill
  };

})();
