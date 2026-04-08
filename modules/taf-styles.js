// modules/taf-styles.js
// toddlesux - Styles & CSS injection
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Styles = (function() {
  'use strict';

  const inject = () => {
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700&display=swap');

      #taf-root * { box-sizing: border-box; font-family: 'DM Mono', monospace; }

      #taf-root {
        position: fixed;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        width: 340px;
        z-index: 2147483647;
        transition: transform .35s cubic-bezier(.77,0,.18,1), opacity .3s;
      }
      #taf-root.taf-hidden {
        transform: translateY(-50%) translateX(calc(100% - 38px));
      }
      #taf-root.taf-emergency-hidden {
        display: none !important;
      }

      #taf-tab {
        position: absolute;
        left: -32px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 72px;
        background: #0f0f14;
        border-radius: 10px 0 0 10px;
        border: 1px solid #2a2a3a;
        border-right: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        writing-mode: vertical-rl;
        color: #f5a623;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: .15em;
        user-select: none;
        gap: 4px;
      }
      #taf-tab:hover { background: #16161f; }
      #taf-tab-dot {
        width: 6px; height: 6px;
        background: #f5a623;
        border-radius: 50%;
        margin: 0 auto 4px;
        flex-shrink: 0;
        writing-mode: horizontal-tb;
        animation: taf-pulse 2s infinite;
      }
      @keyframes taf-pulse {
        0%,100% { opacity: 1; }
        50%      { opacity: .3; }
      }

      #taf-panel {
        background: #0f0f14;
        border: 1px solid #2a2a3a;
        border-radius: 14px 0 0 14px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 88vh;
        box-shadow: -8px 0 40px rgba(0,0,0,.7);
      }

      #taf-header {
        background: linear-gradient(135deg, #1a1a26 0%, #12121b 100%);
        border-bottom: 1px solid #2a2a3a;
        padding: 14px 16px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #taf-logo {
        font-family: 'Syne', sans-serif;
        font-size: 14px;
        font-weight: 700;
        color: #f5a623;
        letter-spacing: .04em;
        flex: 1;
      }
      #taf-logo span { color: #ffffff88; font-weight: 600; }
      #taf-status-badge {
        font-size: 9px;
        padding: 2px 7px;
        border-radius: 99px;
        background: #1e2a14;
        border: 1px solid #3a5a20;
        color: #7ec850;
        letter-spacing: .1em;
      }
      #taf-status-badge.inactive {
        background: #1a1520;
        border-color: #3a2a3a;
        color: #806080;
      }

      #taf-body {
        flex: 1;
        overflow-y: auto;
        padding: 14px 14px 6px;
        scrollbar-width: thin;
        scrollbar-color: #2a2a3a transparent;
      }

      .taf-section-label {
        font-size: 9px;
        font-weight: 500;
        color: #5a5a7a;
        letter-spacing: .2em;
        text-transform: uppercase;
        margin: 12px 0 7px;
      }
      .taf-section-label:first-child { margin-top: 0; }

      .taf-row {
        display: grid;
        grid-template-columns: 1fr 1fr 28px;
        gap: 5px;
        margin-bottom: 5px;
        align-items: center;
      }
      .taf-row input {
        background: #18182a;
        border: 1px solid #2c2c42;
        border-radius: 6px;
        color: #d8d8e8;
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        padding: 6px 8px;
        outline: none;
        transition: border-color .2s, background .2s;
        width: 100%;
        min-width: 0;
      }
      .taf-row input:focus {
        border-color: #f5a623;
        background: #1e1e30;
      }
      .taf-row input::placeholder { color: #3a3a58; }
      .taf-row .taf-del {
        background: transparent;
        border: 1px solid #2c2c42;
        border-radius: 6px;
        color: #5a5a7a;
        cursor: pointer;
        font-size: 13px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .15s;
        flex-shrink: 0;
      }
      .taf-row .taf-del:hover { border-color: #e15555; color: #e15555; }

      #taf-bulk-area {
        margin: 8px 0 4px;
      }
      #taf-bulk-text {
        width: 100%;
        background: #18182a;
        border: 1px solid #2c2c42;
        border-radius: 6px;
        color: #d8d8e8;
        font-size: 10px;
        padding: 8px;
        resize: vertical;
        min-height: 70px;
        margin-bottom: 4px;
      }
      #taf-bulk-text:focus { border-color: #f5a623; }
      .taf-bulk-buttons {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
      }
      .taf-bulk-buttons .taf-btn {
        flex: 1 1 auto;
        padding: 5px 4px;
        font-size: 10px;
        white-space: nowrap;
      }

      .taf-btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin: 10px 0 6px;
      }
      .taf-btn {
        border: none;
        border-radius: 8px;
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        padding: 8px 6px;
        transition: all .15s;
        letter-spacing: .05em;
        background: #1a1a2a;
        border: 1px solid #3a3a5a;   /* changed from dashed to solid */
        color: #6a6a9a;
      }
      #taf-btn-add {
        grid-column: 1/-1;
        margin-bottom: 2px;
      }
      #taf-btn-add:hover { border-color: #f5a623; color: #f5a623; }
      #taf-btn-scan {
        background: #131b2a;
        border: 1px solid #1e3060;
        color: #6090d8;
      }
      #taf-btn-scan:hover { background: #1a2840; border-color: #4060c0; color: #90b8f8; }
      #taf-btn-run {
        background: linear-gradient(135deg, #f5a623, #e07b00);
        color: #0f0f14;
        font-weight: 700;
        font-size: 12px;
      }
      #taf-btn-run:hover { filter: brightness(1.1); }
      #taf-btn-run:active { filter: brightness(.95); transform: scale(.98); }

      #taf-log {
        background: #08080f;
        border: 1px solid #1e1e2e;
        border-radius: 8px;
        padding: 8px 10px;
        max-height: 150px;
        overflow-y: auto;
        margin-top: 4px;
        font-size: 10px;
        line-height: 1.8;
        scrollbar-width: thin;
        scrollbar-color: #1e1e2e transparent;
        display: none;
      }
      #taf-log.visible { display: block; }
      .taf-log-line { display: flex; gap: 6px; align-items: baseline; }
      .taf-log-line .taf-tag {
        flex-shrink: 0;
        font-size: 9px;
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 500;
      }
      .taf-ok   .taf-tag { background:#1a3020; color:#7ec850; }
      .taf-warn .taf-tag { background:#2a1e08; color:#e8a030; }
      .taf-err  .taf-tag { background:#2a0f10; color:#e84040; }
      .taf-info .taf-tag { background:#0f1a2a; color:#5090e0; }
      .taf-log-line .taf-msg { color:#888; flex:1; word-break:break-word; }

      #taf-footer {
        padding: 8px 14px;
        border-top: 1px solid #1e1e2e;
        font-size: 9px;
        color: #2e2e48;
        letter-spacing: .1em;
      }

      .taf-filled-ok {
        outline: 2px solid #f5a623 !important;
        outline-offset: 2px !important;
        transition: outline .3s !important;
      }

      /* Settings Modal */
      #taf-settings-modal {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7);
        z-index: 2147483648;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
      }
      #taf-settings-modal.hidden { display: none; }
      .taf-modal-content {
        background: #0f0f14;
        border: 1px solid #2a2a3a;
        border-radius: 16px;
        width: 360px;
        max-width: 90vw;
        padding: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.8);
      }
      .taf-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .taf-modal-header h3 {
        font-family: 'Syne', sans-serif;
        color: #f5a623;
        margin: 0;
        font-size: 16px;
      }
      .taf-modal-close {
        background: none;
        border: none;
        color: #888;
        font-size: 20px;
        cursor: pointer;
        padding: 0 4px;
      }
      .taf-setting-item {
        margin-bottom: 16px;
      }
      .taf-setting-item label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #ccc;
        font-size: 12px;
        cursor: pointer;
      }
      .taf-setting-item input[type="checkbox"] {
        width: 16px; height: 16px;
        accent-color: #f5a623;
      }
      .taf-setting-item input[type="number"] {
        width: 80px;
        background: #18182a;
        border: 1px solid #2c2c42;
        border-radius: 4px;
        color: #d8d8e8;
        padding: 4px 6px;
        margin-left: 8px;
      }
      .taf-range-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 6px;
        margin-left: 24px;
      }
      .taf-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
      }
      .taf-modal-footer button {
        background: #1a1a2a;
        border: 1px solid #3a3a5a;
        color: #ccc;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
      }
      .taf-modal-footer button.primary {
        background: #f5a623;
        border-color: #f5a623;
        color: #0f0f14;
        font-weight: 600;
      }

      #taf-settings-btn {
        background: transparent;
        border: none;
        color: #6a6a9a;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
        margin-left: 4px;
      }
      #taf-settings-btn:hover { color: #f5a623; }
    `);
  };

  // Auto-inject styles
  inject();

  return { inject };
})();
