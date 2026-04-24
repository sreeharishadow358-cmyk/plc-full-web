/**
 * Professional Industrial IDE Layout
 * Resizable multi-panel interface for PLC ladder logic generation
 * Architecture: Left Editor | Center Workspace | Right Explanation
 *              ─────────────────────────────────────────────────────
 *              ──────────── Output Console (Bottom) ──────────────
 */

"use client";

import React, { useState } from 'react';
import InstructionEditor from '@/components/editor/InstructionEditor_Professional';
import LadderPreview from '@/components/ladder/LadderPreview_Professional';
import ExplanationPanel from '@/components/explanation/ExplanationPanel_Professional';
import OutputConsole from '@/components/console/OutputConsole_Professional';
import { useThemeStore } from '@/store/themeStore';
import { useResizablePanel } from '@/hooks/useIDE';
import { ResizablePanelDivider, StatusBar, LoadingOverlay } from '@/components/ui/IDEComponents';
import { INDUSTRIAL_COLORS, PANEL_SIZES, INDUSTRIAL_TYPOGRAPHY } from '@/constants/industrialDesign';
import { usePlcStore } from '@/store/plcStore';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Toolbar & Header Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LogoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="6" y="6" width="4" height="4" fill="currentColor" rx="0.5" />
      <line x1="0" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="0" x2="8" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7a6 6 0 1 0 12 0M12.5 4.5L13 4v3h-3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06M11.24 11.24l-1.06-1.06M3.82 3.82L2.76 2.76"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7 1v1.5M7 11.5V13M13 7h-1.5M2.5 7H1M11.24 2.76l-1.06 1.06M3.82 10.18l-1.06 1.06M11.24 11.24l-1.06-1.06M3.82 3.82L2.76 2.76"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M12 7.5A5 5 0 1 1 6.5 2a3.5 3.5 0 0 0 5.5 5.5z"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main IDE Layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function IDELayout() {
  const { theme, toggleTheme } = useThemeStore();
  const { isLoading, resetAll } = usePlcStore();
  
  // Panel sizing with resizable support
  const {
    size: leftPanelSize,
    containerRef: leftPanelRef,
    handleMouseDown: handleLeftPanelMouseDown,
    isDragging: isLeftPanelDragging,
  } = useResizablePanel({
    initialSize: PANEL_SIZES.left.default,
    minSize: PANEL_SIZES.left.min,
    maxSize: PANEL_SIZES.left.max,
  });

  const {
    size: rightPanelSize,
    containerRef: rightPanelRef,
    handleMouseDown: handleRightPanelMouseDown,
    isDragging: isRightPanelDragging,
  } = useResizablePanel({
    initialSize: PANEL_SIZES.right.default,
    minSize: PANEL_SIZES.right.min,
    maxSize: PANEL_SIZES.right.max,
  });

  const {
    size: bottomPanelSize,
    handleMouseDown: handleBottomPanelMouseDown,
    isDragging: isBottomPanelDragging,
  } = useResizablePanel({
    initialSize: PANEL_SIZES.bottom.default,
    minSize: PANEL_SIZES.bottom.min,
    maxSize: PANEL_SIZES.bottom.max,
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleExport = (format: 'xml' | 'csv' | 'txt') => {
    // Advanced mock implementation for pro feeling
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `plc_export_${timestamp}.${format}`;
    const content = `// Auto-generated ${format.toUpperCase()} export\n// Project: plc_ladder_001\n// Target: MITSUBISHI FX / GX3\n\n<LogicData format="${format}">\n  <!-- Generated by Professional PLC IDE -->\n</LogicData>`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: INDUSTRIAL_COLORS.bg.base,
        color: INDUSTRIAL_COLORS.text.primary,
        fontFamily: INDUSTRIAL_TYPOGRAPHY.fontFamily.ui,
        overflow: 'hidden',
      }}
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* HEADER / TOOLBAR                                              */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        style={{
          height: '56px',
          flexShrink: 0,
          backgroundColor: INDUSTRIAL_COLORS.bg.panel,
          borderBottom: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '12px',
          paddingRight: '12px',
          gap: '12px',
        }}
      >
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: INDUSTRIAL_COLORS.accent.primary,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: INDUSTRIAL_COLORS.bg.base,
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <LogoIcon />
          </div>

          <div>
            <div
              style={{
                fontSize: INDUSTRIAL_TYPOGRAPHY.size.lg,
                fontWeight: 700,
                color: INDUSTRIAL_COLORS.text.primary,
                letterSpacing: '0.5px',
              }}
            >
              PLC·IDE
            </div>
            <div
              style={{
                fontSize: '9px',
                color: INDUSTRIAL_COLORS.text.muted,
                marginTop: '-2px',
              }}
            >
              Industrial Automation
            </div>
          </div>

          <div
            style={{
              width: '1px',
              height: '24px',
              backgroundColor: INDUSTRIAL_COLORS.ui.border,
              marginLeft: '8px',
            }}
          />

          <div
            style={{
              fontSize: '11px',
              color: INDUSTRIAL_COLORS.text.secondary,
              fontFamily: INDUSTRIAL_TYPOGRAPHY.fontFamily.mono,
              padding: '4px 8px',
              backgroundColor: INDUSTRIAL_COLORS.bg.base,
              borderRadius: '4px',
              border: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
            }}
          >
            MITSUBISHI FX / GX3
          </div>
        </div>

        {/* Center: Workspace Info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '8px',
            justifyContent: 'center',
            fontSize: '11px',
            color: INDUSTRIAL_COLORS.text.muted,
            fontFamily: INDUSTRIAL_TYPOGRAPHY.fontFamily.mono,
          }}
        >
          <span>/</span>
          <span>workspace</span>
          <span>/</span>
          <span style={{ color: INDUSTRIAL_COLORS.accent.primary }}>plc_ladder_001</span>
        </div>

        {/* Right: Status Indicators & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status Indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: INDUSTRIAL_COLORS.text.secondary,
              fontFamily: INDUSTRIAL_TYPOGRAPHY.fontFamily.mono,
              paddingRight: '12px',
              borderRight: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: INDUSTRIAL_COLORS.status.online,
              }}
            />
            <span>AI Engine</span>

            <span style={{ color: INDUSTRIAL_COLORS.text.muted }}>•</span>

            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: INDUSTRIAL_COLORS.status.online,
              }}
            />
            <span>GX Works3</span>
          </div>

          {/* Action Buttons */}
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: INDUSTRIAL_COLORS.text.secondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease-out',
            }}
            title="Refresh"
            onClick={resetAll}
            aria-label="Refresh"
          >
            <RefreshIcon />
          </button>

          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: INDUSTRIAL_COLORS.text.secondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease-out',
            }}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon />
          </button>

          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: INDUSTRIAL_COLORS.text.secondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease-out',
            }}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* MAIN PANELS                                                    */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ─────────────────────────────────────────────────────── */}
        {/* LEFT PANEL: Instruction Editor                         */}
        {/* ─────────────────────────────────────────────────────── */}
        <div
          ref={leftPanelRef as React.RefObject<HTMLDivElement>}
          style={{
            width: `${leftPanelSize}px`,
            flexShrink: 0,
            overflow: 'hidden',
            backgroundColor: INDUSTRIAL_COLORS.bg.panel,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <InstructionEditor />
        </div>

        <ResizablePanelDivider
          direction="vertical"
          onMouseDown={handleLeftPanelMouseDown}
          isDragging={isLeftPanelDragging}
        />

        {/* ─────────────────────────────────────────────────────── */}
        {/* CENTER PANEL: Ladder Workspace + Console              */}
        {/* ─────────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Ladder Workspace */}
          <div
            style={{
              flex: 1,
              overflow: 'hidden',
              backgroundColor: INDUSTRIAL_COLORS.bg.editor,
              position: 'relative',
            }}
          >
            <LadderPreview />
          </div>

          <ResizablePanelDivider
            direction="horizontal"
            onMouseDown={handleBottomPanelMouseDown}
            isDragging={isBottomPanelDragging}
          />

          {/* Output Console */}
          <div
            style={{
              height: `${bottomPanelSize}px`,
              flexShrink: 0,
              overflow: 'hidden',
              backgroundColor: INDUSTRIAL_COLORS.bg.panel,
            }}
          >
            <OutputConsole onExport={handleExport} />
          </div>
        </div>

        <ResizablePanelDivider
          direction="vertical"
          onMouseDown={handleRightPanelMouseDown}
          isDragging={isRightPanelDragging}
        />

        {/* ─────────────────────────────────────────────────────── */}
        {/* RIGHT PANEL: Explanation & Warnings                   */}
        {/* ─────────────────────────────────────────────────────── */}
        <div
          ref={rightPanelRef as React.RefObject<HTMLDivElement>}
          style={{
            width: `${rightPanelSize}px`,
            flexShrink: 0,
            overflow: 'hidden',
            backgroundColor: INDUSTRIAL_COLORS.bg.panel,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ExplanationPanel />
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* STATUS BAR                                                   */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <StatusBar
        status={isLoading ? 'processing' : 'online'}
        message={isLoading ? 'Generating ladder logic...' : 'Ready'}
        timestamp=""
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* LOADING OVERLAY                                              */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <LoadingOverlay
        visible={isLoading}
        currentStep="Processing your instructions..."
        steps={[
          'Parsing intent',
          'Building logic',
          'Validating safety',
          'Compiling ladder',
          'Rendering preview',
        ]}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* SETTINGS OVERLAY                                             */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showSettings && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '300px',
            backgroundColor: INDUSTRIAL_COLORS.bg.panel,
            border: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
            borderRadius: '6px',
            boxShadow: `0 8px 24px ${INDUSTRIAL_COLORS.ui.shadow}`,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '12px', color: INDUSTRIAL_COLORS.text.primary }}>IDE Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: INDUSTRIAL_COLORS.text.secondary,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: INDUSTRIAL_COLORS.text.primary }}>Target PLC</span>
              <select
                style={{
                  background: INDUSTRIAL_COLORS.bg.base,
                  color: INDUSTRIAL_COLORS.text.primary,
                  border: `1px solid ${INDUSTRIAL_COLORS.ui.border}`,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  outline: 'none',
                }}
              >
                <option>MITSUBISHI FX / GX3</option>
                <option>SIEMENS S7-1200</option>
                <option>OMRON CP1</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: INDUSTRIAL_COLORS.text.primary }}>Auto-save</span>
              <input type="checkbox" defaultChecked style={{ cursor: 'pointer', accentColor: INDUSTRIAL_COLORS.accent.primary }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: INDUSTRIAL_COLORS.text.primary }}>Strict Linting</span>
              <input type="checkbox" defaultChecked style={{ cursor: 'pointer', accentColor: INDUSTRIAL_COLORS.accent.primary }} />
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* GLOBAL STYLES                                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap');

        * {
          box-sizing: border-box;
        }

        :root {
          --bg-base: ${INDUSTRIAL_COLORS.bg.base};
          --bg-panel: ${INDUSTRIAL_COLORS.bg.panel};
          --bg-editor: ${INDUSTRIAL_COLORS.bg.editor};
          --text-primary: ${INDUSTRIAL_COLORS.text.primary};
          --text-secondary: ${INDUSTRIAL_COLORS.text.secondary};
          --cyan: ${INDUSTRIAL_COLORS.accent.primary};
          --border: ${INDUSTRIAL_COLORS.ui.border};
          --font-mono: ${INDUSTRIAL_TYPOGRAPHY.fontFamily.mono};
          --font-brand: ${INDUSTRIAL_TYPOGRAPHY.fontFamily.brand};
        }

        button {
          font-family: inherit;
          cursor: pointer;
        }

        button:hover {
          background-color: ${INDUSTRIAL_COLORS.bg.hover};
        }

        scrollbar-width: thin;
        scrollbar-color: ${INDUSTRIAL_COLORS.ui.border} ${INDUSTRIAL_COLORS.bg.base};
      `}</style>
    </div>
  );
}
