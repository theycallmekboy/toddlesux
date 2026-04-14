// modules/taf-filler.js
// toddlesux - Fill logic with auto-scroll, range, retry, and fixed dropdown
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Filler = (function() {
  'use strict';

  const { sleep, log, setStatus, highlight, setNativeValue, toast } = TAF.Utils;
  const Settings = TAF.Settings;
  const Scanner = TAF.Scanner;

  let abortController = null;

  async function humanDelay() {
    if (!Settings.get('enableRandomDelays')) return;
    const min = Settings.get('minDelay'), max = Settings.get('maxDelay');
    await sleep(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  function scrollToElement(el) { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  async function fillBlock(block, answerArray, label) {
    const firstAns = answerArray[0]?.trim() || '', firstAnsLo = firstAns.toLowerCase();

    // Multiple choice
    const opts = block.querySelector(Scanner.OPTIONS_CONTAINER_SELECTOR);
    if (opts) {
      for (const item of opts.querySelectorAll(Scanner.OPTION_ITEM_SELECTOR)) {
        if (item.textContent.trim().toLowerCase().includes(firstAnsLo) || firstAnsLo.includes(item.textContent.trim().toLowerCase())) {
          scrollToElement(item);
          const inp = item.querySelector('input[type="radio"], input[type="checkbox"]');
          if (inp) { if (!inp.checked) { inp.click(); inp.dispatchEvent(new Event('change', {bubbles:true})); } }
          else item.click();
          highlight(item);
          log(`MC → "${firstAns}"`, 'ok');
          await sleep(Settings.get('questionDelay') || 0);
          return true;
        }
      }
    }

    // Radio/checkbox
    for (const r of block.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
      const lbl = r.labels?.[0] || r.closest('label') || r.parentElement;
      if ((lbl?.textContent || r.value || '').trim().toLowerCase().includes(firstAnsLo)) {
        scrollToElement(r);
        if (!r.checked) { r.click(); r.dispatchEvent(new Event('change', {bubbles:true})); }
        highlight(lbl || r);
        log(`Radio → "${firstAns}"`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
    }

    // Text inputs
    const texts = [...block.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea, [contenteditable="true"]')];
    if (texts.length) {
      scrollToElement(block);
      let filled = 0;
      for (let i = 0; i < texts.length && i < answerArray.length; i++) {
        const inp = texts[i], ans = answerArray[i]; if (!ans) continue;
        inp.focus();
        if (inp.contentEditable === 'true') { inp.innerHTML = ans; inp.dispatchEvent(new Event('input', {bubbles:true})); }
        else { setNativeValue(inp, ans); inp.dispatchEvent(new Event('input', {bubbles:true})); inp.dispatchEvent(new Event('change', {bubbles:true})); inp.blur(); }
        highlight(inp);
        filled++;
        await humanDelay();
      }
      if (filled) { log(`Text → ${filled} blanks`, 'ok'); return true; }
    }

    // Dropdown (fixed async)
    const drop = block.querySelector('[class*="dropdown"], [aria-haspopup="listbox"]');
    if (drop) {
      drop.click();
      await sleep(500);
      const items = [...document.querySelectorAll('[role="option"], [role="listitem"]')];
      const match = items.find(i => i.textContent.trim().toLowerCase().includes(firstAnsLo));
      if (match) {
        scrollToElement(match);
        match.click();
        highlight(match);
        log(`Dropdown → "${firstAns}"`, 'ok');
        await sleep(Settings.get('questionDelay') || 0);
        return true;
      }
      log(`Dropdown item not found`, 'warn');
      return false;
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
    if (abortController) abortController.abort();
    abortController = new AbortController(); const signal = abortController.signal;
    const start = rangeStart ?? Settings.get('fillRangeStart'), end = rangeEnd ?? Settings.get('fillRangeEnd');
    TAF.Utils.clearLog(); setStatus('RUNNING', true);
    const btn = document.getElementById('taf-btn-run'); if (btn) { btn.textContent = '⬛ Stop'; btn.classList.add('stop'); }
    try {
      const blocks = Scanner.findQuestionBlocks(); if (!blocks.length) { toast('No questions', 'warn'); return; }
      const total = Math.min(end, blocks.length) - start + 1;
      log(`Processing ${total} questions`, 'info');
      let filled = 0;
      const prog = document.getElementById('taf-progress-bar'), progTxt = document.getElementById('taf-progress-text');
      for (let i = start-1; i < blocks.length && i < end; i++) {
        if (signal.aborted) break;
        const ans = findAnswer(answersMap, blocks[i], i); if (!ans?.length) continue;
        if (prog) prog.style.width = `${((i-start+1)/total)*100}%`;
        if (progTxt) progTxt.textContent = `${i-start+1}/${total}`;
        await humanDelay(); if (signal.aborted) break;
        if (await fillBlock(blocks[i], ans, Scanner.getQuestionLabel(blocks[i]))) filled++;
      }
      if (!signal.aborted) { log(`${filled}/${total} filled`, filled?'ok':'warn'); setStatus(`${filled} DONE`, true); }
      else toast('Stopped', 'info');
    } finally {
      abortController = null;
      if (btn) { btn.textContent = '▶ Fill now'; btn.classList.remove('stop'); }
      const prog = document.getElementById('taf-progress-bar'); if (prog) prog.style.width = '0%';
    }
  }

  function stopFill() { if (abortController) abortController.abort(); }
  function isRunning() { return abortController !== null; }

  return { runFill, stopFill, isRunning };
})();