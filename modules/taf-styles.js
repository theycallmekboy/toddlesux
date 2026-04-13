// modules/taf-styles.js
// toddlesux - Apple-inspired true black theme with subtle animations
// Author: theycallmekboy - made with DS

window.TAF = window.TAF || {};

TAF.Styles = (function() {
  'use strict';

  const inject = () => {
    GM_addStyle(`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

      :root {
        --taf-accent: #ff3b30;
        --taf-bg: #000000;
        --taf-blur: 20px;
      }

      * {
        transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.2s ease, transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1);
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
        transition: opacity 0.2s ease, transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1);
        resize: both;
        overflow: auto;
        animation: taf-fade-in 0.3s ease;
      }
      @keyframes taf-fade-in {
        from { opacity: 0; transform: translateY(-45%); }
        to { opacity: 1; transform: translateY(-50%); }
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

      #taf-settings-btn, #taf-close-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
        transition: color 0.15s ease, transform 0.1s ease;
      }
      #taf-settings-btn:hover { color: var(--taf-accent); transform: scale(1.1); }
      #taf-close-btn:hover { color: #ff5f5f; transform: scale(1.1); }

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
        animation: taf-slide-up 0.2s ease;
      }
      @keyframes taf-slide-up {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .taf-row input {
        background: rgba(255, 255, 255, 0.05);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #fff;
        font-size: 12px;
        padding: 8px 10px;
        outline: none;
        transition: border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      }
      .taf-row input:focus {
        border-color: var(--taf-accent);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
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
        transition: all 0.15s ease;
      }
      .taf-row .taf-del:hover {
        border-color: #ff5f5f;
        color: #ff5f5f;
        background: rgba(255, 95, 95, 0.1);
        transform: scale(1.05);
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
        transition: border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      }
      #taf-bulk-text:focus { 
        border-color: var(--taf-accent); 
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
      }

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
        transition: all 0.15s ease;
        background: rgba(255, 255, 255, 0.06);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        color: #ddd;
        flex: 1 0 auto;
        backdrop-filter: blur(5px);
        transform: scale(1);
      }
      .taf-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      .taf-btn:active {
        transform: scale(0.98);
        transition: transform 0.05s;
      }
      .taf-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
        background: rgba(255, 255, 255, 0.03);
        border-color: rgba(255, 255, 255, 0.05);
        color: #666;
        transform: none;
        box-shadow: none;
      }

      .taf-btn-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 16px 0 8px;
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
      .taf-log-line {
        display: flex;
        gap: 8px;
        align-items: baseline;
        animation: taf-slide-up 0.2s ease;
      }
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
        animation: taf-pulse-outline 0.3s ease;
      }
      @keyframes taf-pulse-outline {
        0% { outline-width: 0; }
        100% { outline-width: 2px; }
      }

      /* Toast Notifications */
      #taf-toast-container {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483650;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        pointer-events: none;
      }
      .taf-toast {
        background: rgba(30, 30, 30, 0.95);
        backdrop-filter: blur(20px);
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        border-radius: 40px;
        padding: 10px 20px;
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        pointer-events: auto;
        animation: taf-toast-in 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .taf-toast.success { border-left: 3px solid #7ec850; }
      .taf-toast.error { border-left: 3px solid #ff5f5f; }
      .taf-toast.info { border-left: 3px solid var(--taf-accent); }
      @keyframes taf-toast-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .taf-toast.hiding {
        animation: taf-toast-out 0.2s ease forwards;
      }
      @keyframes taf-toast-out {
        to { opacity: 0; transform: translateY(-10px); }
      }

      /* AI Section */
      #taf-ai-section {
        margin-top: 16px;
        border-top: 0.5px solid rgba(255,255,255,0.05);
        padding-top: 12px;
        animation: taf-fade-in 0.3s ease;
      }
      #taf-ai-questions {
        width: 100%;
        background: rgba(255, 255, 255, 0.03);
        border: 0.5px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        color: #fff;
        font-size: 11px;
        padding: 10px;
        resize: vertical;
        min-height: 100px;
        margin-bottom: 8px;
        transition: border 0.15s ease, box-shadow 0.15s ease;
      }
      #taf-ai-questions:focus {
        border-color: var(--taf-accent);
        box-shadow: 0 0 0 2px rgba(255, 59, 48, 0.2);
      }
      #taf-ai-output {
        width: 100%;
        background: rgba(0, 0, 0, 0.3);
        border: 0.5px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        color: #ddd;
        font-size: 11px;
        padding: 10px;
        min-height: 80px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        margin-bottom: 8px;
      }
      .taf-ai-buttons {
        display: flex;
        gap: 6px;
      }

      /* Settings Modal */
      #taf-settings-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        z-index: 2147483648;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: taf-fade-in 0.2s ease;
      }
      #taf-settings-modal.hidden { display: none; }
      .taf-modal-content {
        background: rgba(20, 20, 20, 0.9);
        backdrop-filter: blur(30px);
        border: 0.5px solid rgba(255,255,255,0.08);
        border-radius: 28px;
        width: 520px;
        max-width: 90vw;
        padding: 24px;
        box-shadow: 0 30px 50px rgba(0,0,0,0.8);
        position: relative;
        overflow: auto;
        resize: both;
        min-width: 420px;
        min-height: 500px;
      }
      .taf-modal-resize-handle {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        z-index: 10;
      }
      .taf-modal-resize-handle::after {
        content: '';
        position: absolute;
        bottom: 3px;
        right: 3px;
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(255,255,255,0.3);
        border-bottom: 2px solid rgba(255,255,255,0.3);
      }
      .taf-modal-header {
        display: flex;
        margin-bottom: 16px;
        border-bottom: 0.5px solid rgba(255,255,255,0.06);
        padding-bottom: 8px;
        cursor: grab;
        user-select: none;
      }
      .taf-modal-header:active { cursor: grabbing; }
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
        transition: all 0.15s ease;
      }
      .taf-tab-btn.active {
        background: rgba(255,255,255,0.08);
        color: var(--taf-accent);
      }
      .taf-tab-pane { display: none; }
      .taf-tab-pane.active { display: block; animation: taf-fade-in 0.2s ease; }

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
      .taf-setting-item input[type="text"],
      .taf-setting-item input[type="password"],
      .taf-setting-item select {
        background: rgba(255,255,255,0.05);
        border: 0.5px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        color: #fff;
        padding: 8px 10px;
        width: 100%;
        margin-top: 6px;
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
        animation: taf-fade-in 0.3s ease;
      }
      .taf-tutorial-card {
        background: rgba(30,30,30,0.9);
        backdrop-filter: blur(20px);
        border: 0.5px solid rgba(255,255,255,0.1);
        border-radius: 32px;
        padding: 32px;
        max-width: 500px;
        text-align: center;
        animation: taf-slide-up 0.3s ease;
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
