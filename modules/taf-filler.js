// modules/taf-filler.js
// toddlesux - Fill logic with stable block iteration, mixed-content support, and strict matching
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

  // --- Strict matching (word boundary regex) ---
  function matchesAnswer(questionText, answerText) {
    if (!questionText || !answerText) return false;
    const q = questionText.trim().toLowerCase();
    const a = answerText.trim().toLowerCase();
    if (q === a) return true;
    
    // Strict boundary check (Fixes single-char match errors)
    const escapedA = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s|[:.)])${escapedA}(?:$|\\s|[:.)])`, 'i');
    return regex.test(q);
  }

  function waitForDropdownItems(block, timeout = 1000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const localItems = block.querySelectorAll('[role="option"], [role="listitem"]');
        const globalItems = document.querySelectorAll('body > [role="listbox"] [role="option"], body > div [role="option"]');
        if (localItems.length > 0 || globalItems.length > 0) resolve(true);
        else if (Date.now() - start > timeout) resolve(false);
        else requestAnimationFrame(check);
      };
      check();
    });
  }

  async function fillBlock(block, answerArray, label, retries = 2) {
    if (!answerArray?.length || !block) return false;
    let anyFilled = false;
    const firstAns = answerArray[0]?.trim() || '';

    // 1. Multiple Choice
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
          log(`Choice → "${firstAns}"`, 'ok');
          anyFilled = true;
          break;
        }
      }
    }

    // 2. Radio/checkbox (Standalone)
    if (!anyFilled) {
      for (const r of block.querySelectorAll('input[type="radio"], input[type="checkbox"]')) {
        const lbl = r.labels?.[0] || r.closest('label') || r.parentElement;
        if (matchesAnswer(lbl?.textContent || r.value || '', firstAns)) {
          scrollToElement(r);
          if (!r.checked) { r.click(); r.dispatchEvent(new Event('change', {bubbles:true})); }
          highlight(lbl || r);
          log(`Select → "${firstAns}"`, 'ok');
          anyFilled = true;
          break;
        }
      }
    }

    // 3. Dropdown (supports Portals)
    if (!anyFilled) {
      const drop = block.querySelector('[class*="dropdown"], [aria-haspopup="listbox"]');
      if (drop) {
        drop.click();
        const opened = await waitForDropdownItems(block);
        if (opened) {
          const items = [...block.querySelectorAll('[role="option"], [role="listitem"]'), ...document.querySelectorAll('body > [role="listbox"] [role="option"], body > div [role="option"]')];
          const match = items.find(i => {
            const text = i.querySelector('[class*="Option__text"], span, div')?.textContent || i.textContent;
            return matchesAnswer(text, firstAns);
          });
          if (match) {
            scrollToElement(match);
            match.click();
            highlight(match);
            log(`Pick → "${firstAns}"`, 'ok');
            anyFilled = true;
          }
        } else if (retries > 0) {
          await sleep(200);
          return fillBlock(block, answerArray, label, retries - 1);
        }
      }
    }

    // 4. Text Inputs (Mixed content: Always attempt to fill text boxes)
    const textEls = [...block.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea, [contenteditable="true"]')];
    if (textEls.length) {
      scrollToElement(block);
      let filledCount = 0;
      // If we filled a choice above, the text answer is likely the SECOND element in answerArray
      const textStartIndex = anyFilled ? 1 : 0;
      
      for (let i = 0; i < textEls.length; i++) {
        const ansIndex = textStartIndex + i;
        const ans = answerArray[ansIndex];
        if (!ans) continue;
        
        const inp = textEls[i];
        inp.focus();
        const useHuman = Settings.get('enableCharTyping');
        const useMistakes = Settings.get('enableHumanTyping');

        if (useHuman) {
          let currentStr = '';
          for (let c = 0; c < ans.length; c++) {
            if (useMistakes && Math.random() < Settings.get('humanTypingChance') && c > 0 && c < ans.length - 1) {
              const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
              await setAndDispatch(inp, currentStr + wrongChar);
              await sleep(Settings.get('charTypingDelay') * 1.5);
              await setAndDispatch(inp, currentStr);
              await sleep(Settings.get('charTypingDelay'));
            }
            currentStr += ans[c];
            await setAndDispatch(inp, currentStr);
            await sleep(Settings.get('charTypingDelay') + (Math.random() * 20));
          }
        } else {
          await setAndDispatch(inp, ans);
        }
        inp.blur();
        highlight(inp);
        filledCount++;
      }
      if (filledCount) {
        log(`Text → ${filledCount} input(s)`, 'ok');
        anyFilled = true;
      }
    }

    if (anyFilled) await questionDelay();
    return anyFilled;
  }

  async function setAndDispatch(el, val) {
    if (el.contentEditable === 'true') { el.textContent = val; }
    else { setNativeValue(el, val); }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findAnswer(answers, block, index) {
    const label = Scanner.getQuestionLabel(block).toLowerCase();
    
    // 1. Try numeric match (Toddle usually labels as 1.1 or 9)
    const numMatch = label.match(/^(\d+(\.\d+)?)/);
    if (numMatch) {
      const qKey = "q" + numMatch[1];
      if (answers[qKey]) return answers[qKey];
    }

    // 2. Direct Index match (q1, q2...)
    const key = `q${index+1}`;
    if (answers[key]) return answers[key];
    
    // 3. Word boundary phrase matching
    for (const [k, v] of Object.entries(answers)) {
      if (/^q\d+(\.\d+)?$/.test(k)) continue;
      const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedK}\\b`, 'i');
      if (regex.test(label)) return v;
    }
    
    return null;
  }

  async function runFill(answersMap, rangeStart = null, rangeEnd = null) {
    if (TAF.__isFilling && TAF.__isFilling()) { toast('Fill already running', 'warn'); return; }
    if (TAF.UI && TAF.UI.clearParseDebounce) TAF.UI.clearParseDebounce();
    
    if (abortController) abortController.abort();
    abortController = new AbortController(); const signal = abortController.signal;
    TAF.__setFilling(true); isRunning = true;

    Scanner.invalidateCache();
    let start = rangeStart ?? Settings.get('fillRangeStart');
    let end = rangeEnd ?? Settings.get('fillRangeEnd');
    start = Math.max(1, parseInt(start) || 1);
    end = Math.max(start, parseInt(end) || 999);

    TAF.Utils.clearLog(); setStatus('RUNNING', true);
    const btn = document.getElementById('taf-btn-run'); if (btn) { btn.textContent = '⬛ Stop'; btn.classList.add('stop'); }

    let totalSuccessful = 0, totalFailed = 0;
    const prog = document.getElementById('taf-progress-bar'), progTxt = document.getElementById('taf-progress-text');

    try {
      const blocks = Scanner.findQuestionBlocks();
      if (!blocks.length) { toast('No questions found', 'warn'); return; }

      const actualEnd = Math.min(end, blocks.length);
      const rangeTotal = actualEnd - start + 1;
      if (rangeTotal <= 0) { toast('Invalid fill range', 'error'); return; }

      for (let i = start - 1; i < actualEnd; i++) {
        if (signal.aborted) break;
        
        // --- STABLE BLOCK REFERENCE (Fixes last-question-only bug) ---
        const block = blocks[i];
        if (!block || !block.isConnected) {
          log(`Question ${i+1} vanished`, 'warn');
          totalFailed++; continue;
        }

        const ans = findAnswer(answersMap, block, i);
        if (!ans?.length) { totalFailed++; continue; }

        if (prog) prog.style.width = `${((i - start + 1) / rangeTotal) * 100}%`;
        if (progTxt) progTxt.textContent = `${totalSuccessful}/${rangeTotal}`;

        await humanDelay(); if (signal.aborted) break;
        const success = await fillBlock(block, ans, Scanner.getQuestionLabel(block));
        if (success) totalSuccessful++; else totalFailed++;
      }

      if (!signal.aborted) log(`✅ ${totalSuccessful} filled, ${totalFailed} failed`, totalSuccessful?'ok':'warn');
    } finally {
      abortController = null; isRunning = false; TAF.__setFilling(false);
      if (btn) { btn.textContent = '▶ Fill now'; btn.classList.remove('stop'); }
      if (prog) prog.style.width = '0%';
      Scanner.invalidateCache();
    }
  }

  function stopFill() { if (abortController) abortController.abort(); }
  function isRunning() { return isRunning; }

  return { runFill, stopFill, isRunning };
})();