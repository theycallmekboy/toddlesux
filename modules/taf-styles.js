// modules/taf-styles.js
// toddlesux - Modern Apple-style dark theme with blur
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Styles = (function() {
  'use strict';

  const inject = () => {
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      #taf-root * {
        box-sizing: border-box;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      #taf-root {
        position: fixed;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        width: 360px;
        z-index: 2147483647;
        transition: opacity 0.2s;
      }
      #taf-root.taf-hidden {
        opacity: 0;
        pointer-events: none;
      }
      #taf-root.taf-emergency-hidden {
        display: none !important;
      }

      #taf-panel {
        background: rgba(20, 20, 30, 0.75);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 85vh;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.05) inset;
      }

      #taf-header {
        background: rgba(30, 30, 40, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding: 14px 18px;
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: grab;
        user-select: none;
      }
      #taf-header:active { cursor: grabbing; }

      #taf-logo {
        font-weight: 600;
        font-size: 16px;
        color: #f5a623;
        letter-spacing: -0.01em;
        flex: 1;
      }
      #taf-logo span { color: rgba(255, 255, 255, 0.5); font-weight: 500; }

      #taf-status-badge {
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 20px;
        background: rgba(50, 200, 80, 0.15);
        border: 0.5px solid rgba(50, 200, 80, 0.3);
        color: #7ec850;
        font-weight: 500;
      }
      #taf-status-badge.inactive {
        background: rgba(120, 120, 140, 0.1);
        border-color: rgba(120, 120, 140, 0.2);
        color: #a0a0b0;
      }

      #taf-body {
        flex: 1;
        overflow-y: auto;
        padding: 16px 16px 8px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
      }
      #taf-body::-webkit-scrollbar { width: 4px; }
      #taf-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }

      .taf-section-label {
        font-size: 10px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin: 16px 0 8px;
      }
      .taf-section-label:first-child { margin-top: 0; }

      .taf-row {
        display: grid;
        grid-template-columns: 1fr 1fr 28px;
        gap: 8px;
        margin-bottom: 8px;
        align-items: center;
      }
      .taf-row input {
        background: rgba(0, 0, 0, 0.3);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #fff;
        font-size: 12px;
        padding: 8px 10px;
        outline: none;
        transition: border 0.15s, background 0.15s;
        width: 100%;
      }
      .taf-row input:focus {
        border-color: #f5a623;
        background: rgba(0, 0, 0, 0.5);
      }
      .taf-row input::placeholder { color: rgba(255, 255, 255, 0.3); }
      .taf-row .taf-del {
        background: transparent;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        font-size: 16px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .taf-row .taf-del:hover {
        border-color: #ff5f5f;
        color: #ff5f5f;
        background: rgba(255, 95, 95, 0.1);
      }

      #taf-bulk-area { margin: 8px 0 4px; }
      #taf-bulk-text {
        width: 100%;
        background: rgba(0, 0, 0, 0.3);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #fff;
        font-size: 11px;
        padding: 10px;
        resize: vertical;
        min-height: 80px;
        margin-bottom: 8px;
      }
      #taf-bulk-text:focus { border-color: #f5a623; }

      .taf-bulk-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .taf-btn {
        border: none;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        padding: 8px 12px;
        transition: all 0.15s;
        background: rgba(255, 255, 255, 0.05);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        color: #ddd;
        flex: 1 0 auto;
        backdrop-filter: blur(5px);
      }
      .taf-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.15);
      }

      .taf-btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 16px 0 8px;
      }
      #taf-btn-scan {
        background: rgba(0, 100, 255, 0.15);
        border-color: rgba(0, 150, 255, 0.3);
        color: #7ab8ff;
      }
      #taf-btn-scan:hover { background: rgba(0, 120, 255, 0.25); }
      #taf-btn-run {
        background: #f5a623;
        color: #000;
        font-weight: 600;
        border: none;
      }
      #taf-btn-run.stop {
        background: #ff5f5f;
        color: #fff;
      }

      #taf-log {
        background: rgba(0, 0, 0, 0.3);
        border: 0.5px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        padding: 10px;
        max-height: 150px;
        overflow-y: auto;
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.6;
        scrollbar-width: thin;
        display: none;
      }
      #taf-log.visible { display: block; }
      .taf-log-line { display: flex; gap: 8px; align-items: baseline; }
      .taf-log-line .taf-tag {
        flex-shrink: 0;
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 12px;
        font-weight: 500;
      }
      .taf-ok .taf-tag { background: rgba(50, 200, 80, 0.2); color: #7ec850; }
      .taf-warn .taf-tag { background: rgba(255, 180, 0, 0.2); color: #ffb400; }
      .taf-err .taf-tag { background: rgba(255, 80, 80, 0.2); color: #ff5f5f; }
      .taf-info .taf-tag { background: rgba(100, 150, 255, 0.2); color: #7ab8ff; }

      #taf-footer {
        padding: 10px 16px;
        border-top: 0.5px solid rgba(255, 255, 255, 0.05);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.25);
        text-align: center;
      }

      .taf-filled-ok {
        outline: 2px solid #f5a623 !important;
        outline-offset: 2px !important;
        transition: outline 0.2s !important;
        border-radius: 6px;
      }

      /* Settings Modal */
      #taf-settings-modal {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        z-index: 2147483648;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #taf-settings-modal.hidden { display: none; }
      .taf-modal-content {
        background: rgba(30, 30, 40, 0.9);
        backdrop-filter: blur(20px);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        width: 380px;
        max-width: 90vw;
        padding: 24px;
        box-shadow: 0 30px 50px rgba(0, 0, 0, 0.5);
      }
      .taf-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .taf-modal-header h3 {
        color: #f5a623;
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
      .taf-modal-close {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
      }
      .taf-setting-item { margin-bottom: 18px; }
      .taf-setting-item label {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #ddd;
        font-size: 13px;
        cursor: pointer;
      }
      .taf-setting-item input[type="checkbox"] {
        width: 18px; height: 18px;
        accent-color: #f5a623;
      }
      .taf-setting-item input[type="number"] {
        width: 80px;
        background: rgba(0, 0, 0, 0.3);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        padding: 6px 8px;
        margin-left: 8px;
      }
      .taf-range-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        margin-left: 28px;
      }
      .taf-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }
      .taf-modal-footer button {
        background: rgba(255, 255, 255, 0.05);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        color: #ddd;
        padding: 8px 18px;
        border-radius: 12px;
        cursor: pointer;
      }
      .taf-modal-footer button.primary {
        background: #f5a623;
        color: #000;
        font-weight: 600;
      }

      #taf-settings-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
      }
      #taf-settings-btn:hover { color: #f5a623; }
    `);
  };

  inject();
  return { inject };
})();
