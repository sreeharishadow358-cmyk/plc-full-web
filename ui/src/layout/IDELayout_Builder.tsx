"use client";

import React, { useState, useEffect } from 'react';
import { usePlcStore } from '@/store/plcStore';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Icons = {
  Logo: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
  ),
  Save: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
  ),
  Undo: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 14 4 9 9 4"></polyline>
      <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
    </svg>
  ),
  Redo: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 14 20 9 15 4"></polyline>
      <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
  Warning: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  Error: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  )
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function IDELayout_Builder() {
  const [prompt, setPrompt] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  
  // Handlers
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Save");

  const handleConvert = () => {
    if (!prompt) return;
    setIsProcessing(true);
    setTimeout(() => {
      setLogicText("LD X0\nOR Y0\nANI X1\nOUT Y0\nOUT T0 K50\n// Logic auto-generated from prompt:\n// " + prompt);
      setIsProcessing(false);
    }, 1200);
  };

  const handleSave = () => {
    setSaveStatus("Saving...");
    setTimeout(() => {
      setSaveStatus("Saved ✓");
      setTimeout(() => setSaveStatus("Save"), 2000);
    }, 800);
  };

  const handleExport = (type: string) => {
    setIsDropdownOpen(false);
    const a = document.createElement('a');
    const blob = new Blob([`// Exported as ${type}\n${logicText}`], { type: 'text/plain' });
    a.href = URL.createObjectURL(blob);
    a.download = `plc_export.${type}`;
    a.click();
  };

  const handleAutoFix = () => {
    setLogicText(prev => prev.replace("ANI X1", "LD X1\nINV"));
  };

  const handleUndo = () => console.log("Undo history empty");
  const handleRedo = () => console.log("Redo history empty");

  // Mock data for UI state
  const [symbols, setSymbols] = useState([
    { id: 1, name: 'Start', address: 'X0', type: 'Input' },
    { id: 2, name: 'Stop', address: 'X1', type: 'Input' },
    { id: 3, name: 'Motor', address: 'Y0', type: 'Output' },
    { id: 4, name: 'Timer_Delay', address: 'T0', type: 'Timer' },
  ]);

  const [logicText, setLogicText] = useState("LD X0\nOR Y0\nANI X1\nOUT Y0\nOUT T0 K50");
  const [timerPreset, setTimerPreset] = useState("5");
  const [inputRange, setInputRange] = useState("X0-X100");

  return (
    <div className="builder-container">
      {/* GLOBAL STYLES & VARIABLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .builder-container {
          --bg-dark: #0B0F14;
          --bg-panel: #121821;
          --bg-surface: #161D26;
          --bg-surface-hover: #1F2933;
          
          --border-color: #2A3441;
          --border-light: #1F2933;
          
          --text-main: #E6EDF3;
          --text-muted: #8B949E;
          --text-dark: #6B7280;
          
          --accent-primary: #00E5FF;
          --accent-primary-hover: #1AF2FF;
          --accent-secondary: #3B82F6;
          --accent-glow: rgba(0, 229, 255, 0.25);
          
          --status-error: #EF4444;
          --status-error-bg: rgba(239, 68, 68, 0.1);
          --status-warn: #F59E0B;
          --status-warn-bg: rgba(245, 158, 11, 0.1);
          --status-success: #22C55E;
          --status-info: #38BDF8;
          
          --font-ui: 'Inter', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
          
          --radius-sm: 6px;
          --radius-md: 12px;
          --radius-lg: 16px;
          
          --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          --shadow-glow: 0 0 15px var(--accent-glow);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .builder-container {
          background-color: var(--bg-dark);
          color: var(--text-main);
          font-family: var(--font-ui);
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.05) 0%, var(--bg-dark) 100%);
        }

        /* ---------------- HEADER ---------------- */
        .top-nav {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          background-color: rgba(18, 24, 33, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          z-index: 100;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, var(--accent-primary), #60a5fa);
          color: white;
          box-shadow: var(--shadow-glow);
        }

        .app-title {
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.5px;
          color: var(--text-main);
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: var(--font-ui);
        }

        .icon-btn:hover {
          background-color: var(--bg-surface-hover);
          border-color: var(--text-muted);
        }

        .icon-btn.primary {
          background-color: var(--accent-primary);
          border-color: var(--accent-primary);
          color: var(--bg-dark);
        }

        .icon-btn.primary:hover {
          background-color: var(--accent-primary-hover);
          box-shadow: var(--shadow-glow);
          border-color: var(--accent-primary-hover);
        }

        .icon-btn:active {
          transform: scale(0.96);
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 200px;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 200;
          opacity: 0;
          transform: translateY(-10px);
          pointer-events: none;
          transition: all 0.2s ease;
        }

        .dropdown-menu.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .dropdown-item {
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          color: var(--text-main);
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .dropdown-item:hover {
          background-color: var(--bg-surface);
        }

        /* ---------------- MAIN GRID ---------------- */
        .main-content {
          display: grid;
          grid-template-columns: 320px 1fr 340px;
          gap: 16px;
          padding: 16px;
          height: calc(100vh - 60px);
        }

        .panel {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .panel-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--bg-surface-hover);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-dark);
        }

        /* ---------------- LEFT PANEL ---------------- */
        .prompt-area {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .prompt-input {
          width: 100%;
          min-height: 120px;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          color: var(--text-main);
          font-family: var(--font-ui);
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .prompt-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .prompt-input::placeholder {
          color: var(--text-dark);
        }

        .interpretation-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
        }

        .card-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent-primary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .intent-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .intent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background-color: var(--bg-dark);
          border-radius: var(--radius-sm);
          font-size: 13px;
        }

        .intent-arrow {
          color: var(--text-dark);
          margin: 0 8px;
        }

        .intent-type {
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 12px;
        }

        /* ---------------- CENTER PANEL ---------------- */
        .center-grid {
          display: grid;
          grid-template-rows: 1fr 200px;
          gap: 16px;
          height: 100%;
        }

        .ladder-view {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .ladder-canvas {
          flex: 1;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          padding: 40px;
          position: relative;
          overflow: auto;
        }

        /* Power Rails */
        .power-rail {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: var(--accent-primary);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .power-rail.left { left: 40px; }
        .power-rail.right { right: 40px; }

        /* Mock Ladder Elements */
        .rung {
          display: flex;
          align-items: center;
          height: 60px;
          margin-bottom: 20px;
          position: relative;
        }

        .rung-line {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #2A3441;
          z-index: 1;
        }

        .ladder-element {
          position: relative;
          z-index: 2;
          background-color: var(--bg-dark);
          padding: 0 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-left: 60px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .ladder-element:hover {
          transform: scale(1.05);
        }

        .ladder-element.active {
          text-shadow: 0 0 8px var(--accent-glow);
        }

        .ladder-element.active .contact {
          border-color: var(--accent-primary);
          box-shadow: inset 0 0 8px var(--accent-glow);
        }

        .ladder-element.active .contact.nc::after {
          background-color: var(--accent-primary);
        }

        .ladder-element.active .coil {
          border-color: var(--accent-primary);
          box-shadow: inset 0 0 8px var(--accent-glow);
        }

        .contact {
          width: 30px;
          height: 30px;
          border-left: 3px solid #3A4553;
          border-right: 3px solid #3A4553;
          position: relative;
          transition: all 0.2s;
        }

        .contact.nc::after {
          content: '';
          position: absolute;
          top: -5px;
          left: 15px;
          width: 2px;
          height: 40px;
          background-color: #3A4553;
          transform: rotate(45deg);
          transition: all 0.2s;
        }

        .coil {
          width: 30px;
          height: 30px;
          border: 2px solid #3A4553;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .timer-block {
          width: 80px;
          height: 50px;
          border: 2px solid var(--accent-primary);
          background-color: #1A2330;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .element-label {
          margin-top: 8px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
        }
        
        .ladder-element:hover .contact { border-color: var(--accent-primary); }
        .ladder-element:hover .contact.nc::after { background-color: var(--accent-primary); }
        .ladder-element:hover .coil { border-color: var(--accent-primary); }
        
        .ladder-element.active .element-label {
          color: var(--accent-primary);
        }

        .explanation-view {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .explanation-cards {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
          margin-top: 12px;
        }

        .step-card {
          min-width: 200px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          gap: 12px;
        }

        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background-color: var(--accent-primary);
          color: white;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        /* ---------------- RIGHT PANEL ---------------- */
        .section-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .logic-editor {
          width: 100%;
          height: 150px;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
          color: var(--text-main);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.5;
          resize: none;
        }
        
        .logic-editor:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .symbol-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .symbol-table th {
          text-align: left;
          padding: 8px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-color);
          font-weight: 500;
        }

        .symbol-table td {
          padding: 8px;
          border-bottom: 1px solid var(--border-light);
        }

        .editable-select {
          background-color: transparent;
          border: 1px solid transparent;
          color: var(--text-main);
          font-family: var(--font-mono);
          font-size: 12px;
          padding: 4px;
          border-radius: 4px;
          width: 100%;
          cursor: pointer;
        }

        .editable-select:hover {
          background-color: var(--bg-surface);
          border-color: var(--border-color);
        }

        .editable-select:focus {
          outline: none;
          border-color: var(--accent-primary);
          background-color: var(--bg-dark);
        }

        .value-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .small-input {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          color: var(--text-main);
          font-family: var(--font-mono);
          font-size: 13px;
        }
        
        .small-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .validation-panel {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-top: auto;
        }

        .validation-header {
          padding: 12px 16px;
          background-color: var(--bg-surface);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
        }

        .validation-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .validation-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          line-height: 1.4;
        }

        .validation-item.error {
          background-color: var(--status-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }

        .validation-item.warn {
          background-color: var(--status-warn-bg);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #fcd34d;
        }

        .auto-fix-btn {
          margin-top: 8px;
          align-self: flex-start;
          background-color: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .auto-fix-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

      `}</style>

      {/* TOP NAVIGATION */}
      <header className="top-nav">
        <div className="nav-left">
          <div className="logo-box">
            <Icons.Logo />
          </div>
          <span className="app-title">PLC Logic Builder</span>
        </div>
        
        <div className="nav-right">
          <button className="icon-btn" onClick={handleUndo}>
            <Icons.Undo />
          </button>
          <button className="icon-btn" onClick={handleRedo}>
            <Icons.Redo />
          </button>
          <button className="icon-btn" onClick={handleSave}>
            <Icons.Save /> {saveStatus}
          </button>
          
          <div className="dropdown-container">
            <button 
              className="icon-btn primary" 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            >
              <Icons.Download /> Download <Icons.ChevronDown />
            </button>
            <div className={`dropdown-menu ${isDropdownOpen ? 'open' : ''}`}>
              <div className="dropdown-item" onClick={() => handleExport('lad')}>PLC File (.lad)</div>
              <div className="dropdown-item" onClick={() => handleExport('xml')}>PLC File (.xml)</div>
              <div className="dropdown-item" onClick={() => handleExport('pdf')}>PDF Document</div>
              <div className="dropdown-item" onClick={() => handleExport('png')}>Image Export</div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="main-content">
        
        {/* LEFT PANEL: Input & AI */}
        <div className="panel">
          <div className="panel-header">Input & Interpretation</div>
          <div className="panel-body">
            <div className="prompt-area">
              <div className="section-label">Engineering Prompt</div>
              <textarea 
                className="prompt-input"
                placeholder="Start motor and stop after 5 seconds"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                className="icon-btn primary" 
                style={{ justifyContent: 'center', width: '100%', height: '40px', opacity: isProcessing ? 0.7 : 1 }}
                onClick={handleConvert}
                disabled={isProcessing}
              >
                {isProcessing ? '⏳ Processing...' : <><Icons.Play /> Convert Prompt</>}
              </button>
            </div>

            <div className="interpretation-card">
              <div className="card-title">AI Interpretation</div>
              <div className="intent-list">
                <div className="intent-item">
                  <span style={{ fontWeight: 500 }}>Start</span>
                  <span className="intent-arrow">→</span>
                  <span className="intent-type">Input (NO)</span>
                </div>
                <div className="intent-item">
                  <span style={{ fontWeight: 500 }}>Motor</span>
                  <span className="intent-arrow">→</span>
                  <span className="intent-type">Output Coil</span>
                </div>
                <div className="intent-item">
                  <span style={{ fontWeight: 500 }}>Time</span>
                  <span className="intent-arrow">→</span>
                  <span className="intent-type">Timer (5s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Logic + Explanation */}
        <div className="center-grid">
          <div className="ladder-view">
            <div className="panel-header" style={{ border: 'none', position: 'absolute', top: 0, left: 0, zIndex: 10, background: 'rgba(17,17,20,0.8)', backdropFilter: 'blur(4px)', width: '100%' }}>
              Ladder Logic View
            </div>
            <div className="ladder-canvas">
              <div className="power-rail left"></div>
              <div className="power-rail right"></div>

              {/* Rung 1 */}
              <div className="rung">
                <div className="rung-line"></div>
                <div className="ladder-element" onClick={() => setActiveItem('X0')} style={{ transform: activeItem === 'X0' ? 'scale(1.1)' : 'none' }}>
                  <div className="contact"></div>
                  <div className="element-label">X0 (Start)</div>
                </div>
                <div className="ladder-element" style={{ marginLeft: '40px' }} onClick={() => setActiveItem('X1')}>
                  <div className="contact nc"></div>
                  <div className="element-label">X1 (Stop)</div>
                </div>
                <div className="ladder-element" style={{ marginLeft: 'auto', marginRight: '60px' }} onClick={() => setActiveItem('Y0')}>
                  <div className="coil"></div>
                  <div className="element-label">Y0 (Motor)</div>
                </div>
              </div>

              {/* Rung 2 */}
              <div className="rung">
                <div className="rung-line"></div>
                <div className="ladder-element" onClick={() => setActiveItem('Y0')}>
                  <div className="contact"></div>
                  <div className="element-label">Y0</div>
                </div>
                <div className="ladder-element" style={{ marginLeft: 'auto', marginRight: '60px' }} onClick={() => setActiveItem('T0')}>
                  <div className="timer-block">T0 K50</div>
                  <div className="element-label">Timer (5s)</div>
                </div>
              </div>

            </div>
          </div>

          <div className="explanation-view">
            <div className="section-label">Step-by-Step Explanation</div>
            <div className="explanation-cards">
              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-text">Start input (X0) activates the motor output (Y0) and seals the circuit.</div>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-text">Stop input (X1) is Normally Closed (NC) to ensure fail-safe operation.</div>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-text">Timer T0 starts counting when Y0 is active. Delay set to 5 seconds.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Control & Validation */}
        <div className="panel">
          <div className="panel-header">Control & Validation</div>
          <div className="panel-body">
            
            <div>
              <div className="section-label">Main Logic Editor</div>
              <textarea 
                className="logic-editor" 
                value={logicText}
                onChange={(e) => setLogicText(e.target.value)}
                spellCheck={false}
              />
            </div>

            <div>
              <div className="section-label">Symbol Configuration</div>
              <table className="symbol-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map(sym => (
                    <tr key={sym.id}>
                      <td>{sym.name}</td>
                      <td>
                        <select className="editable-select" defaultValue={sym.address}>
                          <option value="X0">X0</option>
                          <option value="X1">X1</option>
                          <option value="Y0">Y0</option>
                          <option value="T0">T0</option>
                        </select>
                      </td>
                      <td>
                        <select className="editable-select" defaultValue={sym.type}>
                          <option value="Input">Input</option>
                          <option value="Output">Output</option>
                          <option value="Timer">Timer</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="value-inputs">
              <div className="input-group">
                <label className="section-label">Input Range</label>
                <input className="small-input" value={inputRange} onChange={(e) => setInputRange(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="section-label">Timer Preset</label>
                <input className="small-input" value={timerPreset} onChange={(e) => setTimerPreset(e.target.value)} />
              </div>
            </div>

            <div className="validation-panel">
              <div className="validation-header">
                <span>Validation & Safety System</span>
                <span style={{ display: 'flex', gap: '8px' }}>
                  <Icons.Error />
                  <Icons.Warning />
                </span>
              </div>
              <div className="validation-list">
                <div className="validation-item error">
                  <Icons.Error />
                  <div>
                    <strong>ERROR:</strong> Stop input must be normally closed (NC) for safety compliance.
                    <button className="auto-fix-btn" onClick={handleAutoFix}>Auto Fix</button>
                  </div>
                </div>
                <div className="validation-item warn">
                  <Icons.Warning />
                  <div>
                    <strong>WARNING:</strong> No emergency stop (E-STOP) mapped in current logic.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
