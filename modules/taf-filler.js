// modules/taf-filler.js
// toddlesux - Fill logic with scoped dropdown, safe contenteditable, strict matching
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Filler = (function() {
  'use strict';

  const { sleep, log, setStatus, highlight, setNativeValue, toast } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;

  let abortController = null;
  let isRunning = false;

  async function humanDelay() {
    if (!Settings.get('enableRandomDelays')) return;
    const min = Settings.get('minDelay'), max = Settings.get('maxDelay');
    await sleep(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  async function questionDelay() {
    await sleep(Settings.get('questionDelay') || 0);
  }

  function scrollToElement(el) {
    if (!el || !Settings.get('enableRandomDelays')) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // --- Strict matching (exact or token-based) ---
  function matchesAnswer(questionText, answerText) {
    if (!questionText || !answerText) return false;
    const q = questionText.trim().toLowerCase();
    const a = answerText.trim().toLowerCase();
    if (q === a) return true;
    const qTokens = q.split(/\s+/).filter(t => t.length > 1);
    const aTokens = a.split(/\s+/).filter(t => t.length > 1);
    if (qTokens.length && aTokens.length && qTokens.every(t => aTokens.includes(t))) return true;
    return false;
  }

  // --- Event-driven dropdown wait (scoped to block) ---
  function waitForDropdownItems(block, timeout = 1000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const items = block.querySelectorAll('[role="option"], [role="listitem"]');
        if (items.length > 0) resolve(true);
        else if (Date.now() - start > timeout) resolve(false);
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  async function fillBlock(block, answerArray, label, retries = 2) {
    const firstAns = answerArray[0]?.trim() || '';
    const firstAnsLo = firstAns.toLowerCase();

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

    // 2. Radio/checkbox (scoped, strict matching)
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

    // 3. Dropdown (scoped, event-driven)
    const drop = block.querySelector('[class*="dropdown"], [aria-haspopup="listbox"]');
    if (drop) {
      drop.click();
      const opened = await waitForDropdownItems(block);
      if (opened) {
        const items = block.querySelectorAll('[role="option"], [role="listitem"]');
        const match = [...items].find(i => matchesAnswer(i.textContent, firstAns));
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

    // 4. Text inputs (safe contenteditable)
    const textEls = [...block.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea, [contenteditable="true"]')];
    if (textEls.length) {
      scrollToElement(block);
      let filled = 0;
      for (let i = 0; i < textEls.length && i < answerArray.length; i++) {
        const inp = textEls[i], ans = answerArray[i]; if (!ans) continue;
        inp.focus();
        if (inp.contentEditable === 'true') {
          inp.textContent = ans;  // Safe: no HTML parsing
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
    for (const [k, v] of Object.entries(answers)) {
      if (/^q\d+(\.\d+)?$/.test(k)) continue;
      // Strict: only match if the keyword is a whole word in the label
      if (label.split(/\s+/).includes(k)) return v;
    }
    return null;
  }

  async function runFill(answersMap, rangeStart = null, rangeEnd = null) {
    if (TAF.__isFilling && TAF.__isFilling()) { toast('Fill already running', 'warn'); return; }
    if (abortController) abortController.abort();
    abortController = new AbortController(); const signal = abortController.signal;
    TAF.__setFilling(true); isRunning = true;

    let start = rangeStart ?? Settings.get('fillRangeStart');
    let end = rangeEnd ?? Settings.get('fillRangeEnd');
    // Validate range
    start = Math.max(1, parseInt(start) || 1);
    end = Math.max(start, parseInt(end) || 999);

    TAF.Utils.clearLog(); setStatus('RUNNING', true);
    const btn = document.getElementById('taf-btn-run'); if (btn) { btn.textContent = '⬛ Stop'; btn.classList.add('stop'); }

    let totalDetected = 0, totalSuccessful = 0, totalFailed = 0;
    const prog = document.getElementById('taf-progress-bar'), progTxt = document.getElementById('taf-progress-text');

    try {
      const blocks = Scanner.findQuestionBlocks(); totalDetected = blocks.length;
      if (!blocks.length) { toast('No questions', 'warn'); return; }

      const actualEnd = Math.min(end, blocks.length);
      const rangeTotal = actualEnd - start + 1;
      if (rangeTotal <= 0) { toast('Invalid fill range', 'error'); return; }
      log(`Processing ${rangeTotal} questions (${start}-${actualEnd})`, 'info');

      for (let i = start-1; i < actualEnd; i++) {
        if (signal.aborted) break;
        const ans = findAnswer(answersMap, blocks[i], i);
        if (!ans?.length) { totalFailed++; continue; }
        if (prog) prog.style.width = `${((i - start + 1) / rangeTotal) * 100}%`;
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
      Scanner.invalidateCache();
    }
  }

  function stopFill() { if (abortController) abortController.abort(); }
  function isFilling() { return isRunning; }

  return { runFill, stopFill, isFilling };
})();