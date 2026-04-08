// modules/taf-styles.js
// toddlesux - Apple-inspired true black theme with CSS variables
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Styles = (function() {
  'use strict';

  const inject = () => {
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      :root {
        --taf-accent: #f5a623;
        --taf-bg: #000000;
        --taf-blur: 20px;
      }

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
        min-width: 280px;
        min-height: 400px;
        z-index: 2147483647;
        transition: opacity 0.2s;
        resize: both;
        overflow: auto;
      }
      #taf-root.taf-hidden {
        opacity: 0;
        pointer-events: none;
      }
      #taf-root.taf-emergency-hidden {
        display: none !important;
      }

      #taf-panel {
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(var(--taf-blur)) saturate(180%);
        -webkit-backdrop-filter: blur(var(--taf-blur)) saturate(180%);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255, 255, 255, 0.03) inset;
        position: relative;
      }

      .taf-resize-handle {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        background: transparent;
        z-index: 10;
      }
      .taf-resize-handle::after {
        content: '';
        position: absolute;
        bottom: 3px;
        right: 3px;
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(255,255,255,0.3);
        border-bottom: 2px solid rgba(255,255,255,0.3);
      }

      #taf-header {
        background: rgba(20, 20, 20, 0.5);
        border-bottom: 0.5px solid rgba(255, 255, 255, 0.05);
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
        color: var(--taf-accent);
        letter-spacing: -0.01em;
        flex: 1;
      }
      #taf-logo span { color: rgba(255, 255, 255, 0.5); font-weight: 500; }

      #taf-status-badge {
        font-size: 10px;
        padding: 4px 8px;
        border-radius: 20px;
        background: rgba(80, 200, 120, 0.15);
        border: 0.5px solid rgba(80, 200, 120, 0.3);
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

      .taf-section-label {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 0.3px;
        text-transform: uppercase;
        margin: 18px 0 8px;
      }

      .taf-row {
        display: grid;
        grid-template-columns: 1fr 1fr 28px;
        gap: 8px;
        margin-bottom: 8px;
      }
      .taf-row input {
        background: rgba(255, 255, 255, 0.05);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #fff;
        font-size: 12px;
        padding: 8px 10px;
        outline: none;
        transition: border 0.15s, background 0.15s;
      }
      .taf-row input:focus {
        border-color: var(--taf-accent);
        background: rgba(255, 255, 255, 0.08);
      }

      .taf-row .taf-del {
        background: transparent;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
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

      #taf-bulk-text {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        color: #fff;
        font-size: 11px;
        padding: 10px;
        resize: vertical;
        min-height: 80px;
        margin-bottom: 8px;
      }
      #taf-bulk-text:focus { border-color: var(--taf-accent); }

      .taf-bulk-buttons {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .taf-btn {
        border: none;
        border-radius: 30px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        padding: 8px 14px;
        transition: all 0.15s;
        background: rgba(255, 255, 255, 0.06);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        color: #ddd;
        flex: 1 0 auto;
        backdrop-filter: blur(5px);
      }
      .taf-btn:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .taf-btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 16px 0 8px;
      }
      #taf-btn-scan {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.1);
        color: #aaa;
      }
      #taf-btn-run {
        background: var(--taf-accent);
        color: #000;
        font-weight: 600;
        border: none;
      }
      #taf-btn-run.stop {
        background: #ff5f5f;
        color: #fff;
      }

      #taf-log {
        background: rgba(255, 255, 255, 0.02);
        border: 0.5px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 10px;
        max-height: 150px;
        overflow-y: auto;
        margin-top: 8px;
        font-size: 11px;
        line-height: 1.6;
        display: none;
      }
      #taf-log.visible { display: block; }
      .taf-log-line .taf-tag {
        font-size: 9px;
        padding: 2px 6px;
        border-radius: 20px;
        font-weight: 500;
      }
      .taf-ok .taf-tag { background: rgba(80, 200, 120, 0.2); color: #7ec850; }
      .taf-warn .taf-tag { background: rgba(255, 180, 0, 0.2); color: #ffb400; }
      .taf-err .taf-tag { background: rgba(255, 80, 80, 0.2); color: #ff5f5f; }
      .taf-info .taf-tag { background: rgba(100, 150, 255, 0.2); color: #7ab8ff; }

      #taf-footer {
        padding: 10px 16px;
        border-top: 0.5px solid rgba(255, 255, 255, 0.03);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.2);
        text-align: center;
      }

      .taf-filled-ok {
        outline: 2px solid var(--taf-accent) !important;
        outline-offset: 2px !important;
        border-radius: 8px;
      }

      /* Settings Modal Tabs */
      #taf-settings-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        z-index: 2147483648;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #taf-settings-modal.hidden { display: none; }
      .taf-modal-content {
        background: rgba(20, 20, 20, 0.9);
        backdrop-filter: blur(30px);
        border: 0.5px solid rgba(255,255,255,0.08);
        border-radius: 28px;
        width: 420px;
        max-width: 90vw;
        padding: 24px;
        box-shadow: 0 30px 50px rgba(0,0,0,0.8);
      }
      .taf-modal-header {
        display: flex;
        margin-bottom: 16px;
        border-bottom: 0.5px solid rgba(255,255,255,0.06);
        padding-bottom: 8px;
      }
      .taf-tab-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 13px;
        font-weight: 500;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 20px;
        margin-right: 4px;
      }
      .taf-tab-btn.active {
        background: rgba(255,255,255,0.08);
        color: var(--taf-accent);
      }
      .taf-tab-pane { display: none; }
      .taf-tab-pane.active { display: block; }

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
        accent-color: var(--taf-accent);
      }
      .taf-setting-item input[type="number"],
      .taf-setting-item input[type="text"] {
        background: rgba(255,255,255,0.05);
        border: 0.5px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #fff;
        padding: 6px 10px;
      }
      .taf-color-picker {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 8px;
      }
      .taf-color-picker input[type="color"] {
        width: 40px; height: 40px;
        border: none;
        background: transparent;
        cursor: pointer;
      }

      /* Tutorial overlay */
      #taf-tutorial-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(12px);
        z-index: 2147483649;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .taf-tutorial-card {
        background: rgba(30,30,30,0.9);
        backdrop-filter: blur(20px);
        border: 0.5px solid rgba(255,255,255,0.1);
        border-radius: 32px;
        padding: 32px;
        max-width: 500px;
        text-align: center;
      }
      .taf-tutorial-card h2 {
        color: var(--taf-accent);
        margin: 0 0 16px;
      }
      .taf-tutorial-card p {
        color: #ddd;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .taf-tutorial-card .taf-btn {
        margin: 0 8px;
      }
    `);
  };

  inject();
  return { inject };
})();
