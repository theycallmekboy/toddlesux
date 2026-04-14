// modules/taf-filler.js
// toddlesux - Fill logic with strict scoping, event-driven dropdown, matching tiers, retry
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Filler = (function() {
  'use strict';

  const { sleep, log, setStatus, highlight, setNativeValue, toast } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;

  let abortController = null;
  let isRunning = false;

  // --- Centralized delay manager ---
  async function humanDelay() {
    if (!Settings.get('enableRandomDelays')) return;
    const min = Settings.get('minDelay'), max = Settings.get('maxDelay');
    await sleep(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  async function questionDelay() {
    await sleep(Settings.get('questionDelay') || 0);
  }

  // --- Scroll (disabled in turbo) ---
  function scrollToElement(el) {
    if (!el || !Settings.get('enableRandomDelays')) return;
    const behavior = Settings.get('enableRandomDelays') ? 'smooth' : 'auto';
    el.scrollIntoView({ behavior, block: 'center' });
  }

  // --- Tiered answer matching ---
  function matchesAnswer(questionText, answerText) {
    const q = questionText.trim().toLowerCase();
    const a = answerText.trim().toLowerCase();
    if (q === a) return true;                          // exact
    const qTokens = q.split(/\s+/);
    const aTokens = a.split(/\s+/);
    if (qTokens.every(t => aTokens.includes(t))) return true; // token match
    return false;
  }

  // --- Wait for dropdown to open (event-driven) ---
  function waitForDropdownOpen(trigger, timeout = 1000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const items = document.querySelectorAll('[role="option"], [role="listitem"]');
        if (items.length > 0) resolve(true);
        else if (Date.now() - start > timeout) resolve(false);
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  // --- Fill single block (scoped queries) ---
  async function fillBlock(block, answerArray, label, retries = 2) {
    const firstAns = answerArray[0]?.trim() || '';

    // 1. Multiple choice (scoped)
    const optsContainer = block.querySelector(Scanner.OPTIONS_CONTAINER_SELECTOR);
    if (optsContainer) {
      const items = optsContainer.querySelectorAll(Scanner.OPTION_ITEM_SELECTOR);
      for (const item of items) {
        if (matchesAnswer(item.textContent, firstAns)) {
          scrollToElement(item);
          const input = item.querySelector('input[type="radio"], input[type="checkbox"]');
          if (input) { if (!input.checked) { input.click(); input.dispatchEvent(new Event('change', {bubbles:true})); } }
          else item.click();
          highlight(item);
          log(`MC → "${firstAns}"`, 'ok');
          await questionDelay();
          return true;
        }
      }
    }

    // 2. Radio/checkbox (scoped)
    for (const r of block.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
      const lbl = r.labels?.[0] || r.closest('label') || r.parentElement;
      if (matchesAnswer(lbl?.textContent || r.value || '', firstAns)) {
        scrollToElement(r);
        if (!r.checked) { r.click(); r.dispatchEvent(new Event('change', {bubbles:true})); }
        highlight(lbl || r);
        log(`Radio → "${firstAns}"`, 'ok');
        await questionDelay();
        return true;
      }
    }

    // 3. Dropdown (detected BEFORE text inputs, event-driven)
    const drop = block.querySelector('[class*="dropdown"], [aria-haspopup="listbox"]');
    if (drop) {
      drop.click();
      const opened = await waitForDropdownOpen(drop);
      if (opened) {
        const items = [...document.querySelectorAll('[role="option"], [role="listitem"]')];
        const match = items.find(i => matchesAnswer(i.textContent, firstAns));
        if (match) {
          scrollToElement(match);
          match.click();
          highlight(match);
          log(`Dropdown → "${firstAns}"`, 'ok');
          await questionDelay();
          return true;
        }
      }
      log(`Dropdown item not found for "${firstAns}"`, 'warn');
      if (retries > 0) return fillBlock(block, answerArray, label, retries - 1);
      return false;
    }

    // 4. Text inputs (scoped)
    const textEls = [...block.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea, [contenteditable="true"]')];
    if (textEls.length) {
      scrollToElement(block);
      let filled = 0;
      for (let i = 0; i < textEls.length && i < answerArray.length; i++) {
        const inp = textEls[i], ans = answerArray[i]; if (!ans) continue;
        inp.focus();
        if (inp.contentEditable === 'true') {
          inp.textContent = ans; // Safe
          inp.dispatchEvent(new Event('input', {bubbles:true}));
        } else {
          setNativeValue(inp, ans);
          inp.dispatchEvent(new Event('input', {bubbles:true}));
          inp.dispatchEvent(new Event('change', {bubbles:true}));
          inp.blur();
        }
        highlight(inp);
        filled++;
        await humanDelay();
      }
      if (filled) { log(`Text → ${filled} blanks`, 'ok'); return true; }
    }

    log(`No match for "${firstAns}"`, 'warn');
    return false;
  }

  function findAnswer(answers, block, index) {
    const key = `q${index+1}`; if (answers[key]) return answers[key];
    const label = Scanner.getQuestionLabel(block).toLowerCase();
    for (const [k, v] of Object.entries(answers)) if (!/^q\d+(\.\d+)?$/.test(k) && label.includes(k)) return v;
    return null;
  }

  async function runFill(answersMap, rangeStart = null, rangeEnd = null) {
    if (TAF.__isFilling && TAF.__isFilling()) { toast('Fill already running', 'warn'); return; }
    if (abortController) abortController.abort();
    abortController = new AbortController(); const signal = abortController.signal;
    TAF.__setFilling(true); isRunning = true;

    const start = rangeStart ?? Settings.get('fillRangeStart'), end = rangeEnd ?? Settings.get('fillRangeEnd');
    TAF.Utils.clearLog(); setStatus('RUNNING', true);
    const btn = document.getElementById('taf-btn-run'); if (btn) { btn.textContent = '⬛ Stop'; btn.classList.add('stop'); }

    let totalDetected = 0, totalSuccessful = 0, totalFailed = 0;
    const prog = document.getElementById('taf-progress-bar'), progTxt = document.getElementById('taf-progress-text');

    try {
      const blocks = Scanner.findQuestionBlocks(); totalDetected = blocks.length;
      if (!blocks.length) { toast('No questions', 'warn'); return; }

      const rangeTotal = Math.min(end, blocks.length) - start + 1;
      log(`Processing ${rangeTotal} questions`, 'info');

      for (let i = start-1; i < blocks.length && i < end; i++) {
        if (signal.aborted) break;
        const ans = findAnswer(answersMap, blocks[i], i);
        if (!ans?.length) { totalFailed++; continue; }
        if (prog) prog.style.width = `${((i-start+1)/rangeTotal)*100}%`;
        if (progTxt) progTxt.textContent = `${totalSuccessful}/${rangeTotal}`;

        await humanDelay(); if (signal.aborted) break;
        const success = await fillBlock(blocks[i], ans, Scanner.getQuestionLabel(blocks[i]));
        if (success) totalSuccessful++; else totalFailed++;
      }

      if (!signal.aborted) {
        log(`✅ ${totalSuccessful} filled, ${totalFailed} failed`, totalSuccessful?'ok':'warn');
        setStatus(`${totalSuccessful} DONE`, true);
      } else toast('Stopped', 'info');
    } finally {
      abortController = null; isRunning = false; TAF.__setFilling(false);
      if (btn) { btn.textContent = '▶ Fill now'; btn.classList.remove('stop'); }
      if (prog) prog.style.width = '0%';
      Scanner.invalidateCache(); // Rule 8
    }
  }

  function stopFill() { if (abortController) abortController.abort(); }
  function isFilling() { return isRunning; }

  return { runFill, stopFill, isFilling };
})();