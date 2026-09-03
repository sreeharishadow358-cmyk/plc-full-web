"use client";

import React, { useState } from "react";
import {
  PlayCircleOutlined,
  ClearOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  CopyOutlined,
  DownloadOutlined,
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ThunderboltOutlined,
  CodeOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
  UndoOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { usePlcStore } from "../store/plcStore";
import { useGenerateLogic } from "../hooks/useGenerateLogic";
import LadderPreview_Professional from "../components/ladder/LadderPreview_Professional";

export default function IDELayout() {
  const {
    instructionInput,
    setInstructionInput,
    program,
    explanation,
    instructionList,
    warnings,
    validationSummary,
    clearWorkspace,
    isGenerating,
    isValidating,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePlcStore();

  const { mutate: generateLogic, isPending } = useGenerateLogic();
  const [activeConsoleTab, setActiveConsoleTab] = useState<"instructions" | "json" | "safety">("instructions");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);

  const isBusy = isPending || isGenerating || isValidating;

  const handleGenerate = () => {
    if (!instructionInput.trim() || isBusy) return;
    generateLogic(instructionInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const insertTemplate = (template: string) => {
    setInstructionInput(template);
  };

  const templates = [
    { label: "Motor Latch", value: "Start motor X0, Stop X1, Emergency X2, Output Y0" },
    { label: "Timer Delay", value: "Sensor X0 triggers Timer T0 for 5s, then turn on Y1" },
    { label: "Conveyor Interlock", value: "Start X0 starts Conveyor Y0 if Sensor X3 is active" },
  ];

  const hasViolations = validationSummary.status === "violation" || validationSummary.errors.length > 0;
  const hasWarnings = validationSummary.status === "needs_review" || validationSummary.warnings.length > 0;

  return (
    <div className="flex flex-col h-screen bg-[#0a0f24] text-[#e2e8f0] font-sans overflow-hidden select-none">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. TOP HEADER                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 bg-[#0d142b] border-b border-[#1e293b] flex items-center justify-between px-5 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <ThunderboltOutlined className="text-white text-base" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
              PLC AI STUDIO <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono">v2.4 PRO</span>
            </h1>
            <p className="text-[11px] text-slate-400">Mitsubishi FX & IEC 61131-3 Synthesizer</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Undo / Redo Header Buttons */}
          <div className="flex items-center gap-1 bg-[#131d38] border border-slate-700/60 rounded px-1 py-0.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700/60 transition flex items-center gap-1"
              title="Undo Edit (Ctrl+Z)"
            >
              <UndoOutlined /> <span className="hidden sm:inline text-[10px]">Undo</span>
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700/60 transition flex items-center gap-1"
              title="Redo Edit (Ctrl+Y)"
            >
              <RedoOutlined /> <span className="hidden sm:inline text-[10px]">Redo</span>
            </button>
          </div>

          {/* GX Works3 Engine Online Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-[#131d38] border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isBusy ? "bg-cyan-400 animate-ping" : "bg-emerald-400"
              }`}
            />
            <span className="text-slate-300 font-medium font-mono text-[11px]">
              {isBusy ? "Synthesizing Logic…" : "GX Works3 Engine Online"}
            </span>
          </div>

          {/* Clear Workspace Button */}
          <button
            onClick={clearWorkspace}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 transition"
          >
            <ClearOutlined /> Clear All
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 2. MAIN THREE-PANEL WORKSPACE                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Instruction Editor & Presets */}
        <aside className="w-80 border-r border-[#1e293b] bg-[#0c1329] flex flex-col p-4 gap-4 overflow-y-auto shrink-0">
          <div>
            <label className="text-[11px] font-bold text-teal-400 uppercase tracking-wider block mb-2 font-mono">
              1. Prompt Instruction
            </label>
            <div className="relative">
              <textarea
                value={instructionInput}
                onChange={(e) => setInstructionInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your PLC control requirements (e.g. Start X0, Stop X1, Emergency X2, Output Y0)..."
                className="w-full h-36 bg-[#131d38] border border-slate-700/80 rounded-md p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 resize-none font-mono leading-relaxed"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-500 font-mono">
                Ctrl + Enter to run
              </div>
            </div>
          </div>

          {/* Preset Shortcuts (Ghost / Outline Style) */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wider font-mono">
              Quick Presets
            </span>
            <div className="flex flex-col gap-1.5">
              {templates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => insertTemplate(tmpl.value)}
                  className="text-left text-xs bg-transparent hover:bg-teal-950/40 text-slate-300 hover:text-teal-300 border border-slate-700/60 hover:border-teal-700/60 px-3 py-1.5 rounded transition group flex items-center justify-between"
                >
                  <span>{tmpl.label}</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-teal-400 font-mono">+ Load</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isBusy || !instructionInput.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition"
          >
            {isBusy ? (
              <>
                <ReloadOutlined className="animate-spin" /> Synthesizing Logic...
              </>
            ) : (
              <>
                <PlayCircleOutlined className="text-base" /> Generate Ladder Logic
              </>
            )}
          </button>

          {/* Industrial PLC Reference Guide */}
          <div className="mt-auto bg-[#101933]/70 border border-slate-800/80 rounded-md p-3 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-teal-400 font-semibold text-[11px]">
              <InfoCircleOutlined /> Mitsubishi FX Reference
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              <div><span className="text-emerald-400 font-bold">X[0-7]</span>: Inputs</div>
              <div><span className="text-amber-400 font-bold">Y[0-7]</span>: Outputs</div>
              <div><span className="text-purple-400 font-bold">M[0-9]</span>: Relays</div>
              <div><span className="text-sky-400 font-bold">T[0-9]</span>: Timers</div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL: Diagram Canvas & Multi-tab Console */}
        <main className="flex-1 flex flex-col bg-[#080d1e] relative overflow-hidden">
          {/* Canvas Toolbar */}
          <div className="h-10 bg-[#0d142b] border-b border-[#1e293b] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <CodeOutlined className="text-teal-400" />
              <span>Ladder Logic Canvas</span>
              {program && (
                <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                  {program.rungs.length} {program.rungs.length === 1 ? "Rung" : "Rungs"}
                </span>
              )}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 50))}
                className="p-1 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded text-xs"
                title="Zoom Out"
              >
                <ZoomOutOutlined />
              </button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 150))}
                className="p-1 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded text-xs"
                title="Zoom In"
              >
                <ZoomInOutlined />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-0.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded ml-1 text-[11px] font-mono"
                title="Reset Zoom"
              >
                100%
              </button>
            </div>
          </div>

          {/* Canvas Diagram Viewport with Blueprint Grid */}
          <div className="flex-1 overflow-auto p-6 relative flex items-start justify-center blueprint-grid">
            {isBusy ? (
              <div className="flex flex-col items-center gap-3 my-auto z-10 p-8 rounded-xl bg-[#0c1326]/80 border border-slate-800 backdrop-blur">
                <div className="w-10 h-10 rounded-full border-3 border-teal-500/20 border-t-teal-400 animate-spin" />
                <p className="text-xs font-mono text-teal-300 animate-pulse">
                  Analyzing Safety Rules & Synthesizing SVG Rung Diagram...
                </p>
              </div>
            ) : (
              <LadderPreview_Professional zoomLevel={zoomLevel} />
            )}
          </div>

          {/* Bottom Console Panel */}
          <div className="h-48 border-t border-[#1e293b] bg-[#0c1329] flex flex-col shrink-0">
            <div className="h-9 bg-[#0d142b] border-b border-[#1e293b] flex items-center justify-between px-4">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveConsoleTab("instructions")}
                  className={`px-3 py-1 text-xs font-medium border-b-2 transition ${
                    activeConsoleTab === "instructions"
                      ? "border-teal-400 text-teal-300 bg-teal-950/30"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Instruction List (IL)
                </button>
                <button
                  onClick={() => setActiveConsoleTab("json")}
                  className={`px-3 py-1 text-xs font-medium border-b-2 transition ${
                    activeConsoleTab === "json"
                      ? "border-teal-400 text-teal-300 bg-teal-950/30"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  JSON Model
                </button>
                <button
                  onClick={() => setActiveConsoleTab("safety")}
                  className={`px-3 py-1 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                    activeConsoleTab === "safety"
                      ? "border-teal-400 text-teal-300 bg-teal-950/30"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>Safety Diagnostic</span>
                  {hasViolations ? (
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  ) : hasWarnings ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleCopy(
                      activeConsoleTab === "instructions"
                        ? instructionList
                        : JSON.stringify(program, null, 2)
                    )
                  }
                  className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded transition"
                >
                  <CopyOutlined /> {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() =>
                    handleDownload(
                      instructionList || "// No instruction list compiled.\nEND",
                      "plc_program.il"
                    )
                  }
                  className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded transition"
                >
                  <DownloadOutlined /> Export IL
                </button>
              </div>
            </div>

            {/* Console Output Area */}
            <div className="flex-1 p-3 overflow-auto font-mono text-xs text-slate-300 bg-[#090e21]">
              {activeConsoleTab === "instructions" && (
                <pre className="text-teal-300 font-bold whitespace-pre-wrap leading-relaxed">
                  {instructionList || "// No instruction list compiled yet. Enter a prompt and generate logic."}
                </pre>
              )}
              {activeConsoleTab === "json" && (
                <pre className="text-cyan-300 whitespace-pre-wrap leading-relaxed">
                  {program
                    ? JSON.stringify(program, null, 2)
                    : "// No JSON structure generated yet."}
                </pre>
              )}
              {activeConsoleTab === "safety" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 pb-1 border-b border-slate-800">
                    <span>Engine Rules Checked: {validationSummary.rulesChecked}</span>
                    <span>•</span>
                    <span>Overall State: <span className="uppercase text-teal-400">{validationSummary.status}</span></span>
                  </div>
                  {warnings.length > 0 ? (
                    warnings.map((w, idx) => (
                      <div key={idx} className="text-amber-300 text-xs flex items-start gap-2">
                        <span className="text-amber-500 font-bold">⚠</span>
                        <span>{w}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircleFilled /> All safety rules passed with zero critical warnings.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Safety Rule Check Escalation & AI Logic Breakdown */}
        <aside className="w-80 border-l border-[#1e293b] bg-[#0c1329] flex flex-col p-4 gap-4 overflow-y-auto shrink-0">
          {/* SAFETY ESCALATION PANEL */}
          <div>
            <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 font-mono">
              <SafetyCertificateOutlined className="text-sm" /> Safety & Rule Check
            </h3>

            {hasViolations ? (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-600/80 text-red-200 text-xs space-y-2 shadow-lg shadow-red-950/30">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <CloseCircleFilled className="text-base text-red-400 shrink-0" />
                  <span>Critical Safety Violations ({validationSummary.errors.length})</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] font-mono leading-relaxed">
                  {validationSummary.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : hasWarnings ? (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-600/70 text-amber-200 text-xs space-y-2 shadow-lg shadow-amber-950/30">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <WarningFilled className="text-base text-amber-400 shrink-0" />
                  <span>Review Advisories ({validationSummary.warnings.length})</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] font-mono leading-relaxed">
                  {validationSummary.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircleFilled className="text-emerald-400 text-base shrink-0" />
                <div>
                  <div className="font-bold">Safety Compliance Verified</div>
                  <div className="text-[11px] text-emerald-400/80">Zero double coils or open E-Stops detected.</div>
                </div>
              </div>
            )}
          </div>

          {/* AI LOGIC BREAKDOWN */}
          <div>
            <h3 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider mb-2 font-mono">
              Logic Explanation
            </h3>
            <div className="p-3 rounded-lg bg-[#131d38] border border-slate-700/70 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {explanation || "Enter prompt instructions and click generate to view AI logic breakdown."}
            </div>
          </div>
        </aside>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. STICKY BOTTOM STATUS BAR                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <footer className="h-6 bg-[#090d1c] border-t border-[#1e293b] flex items-center justify-between px-4 text-[10px] text-slate-400 font-mono shrink-0 z-20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? "bg-amber-400 animate-ping" : "bg-teal-400"}`} />
            STATUS: <strong className="text-slate-200">{isBusy ? "SYNTHESIZING" : "READY"}</strong>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">COMPILER: <strong className="text-slate-200">IEC 61131-3 (Mitsubishi FX3U/FX5U)</strong></span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">SCAN CYCLE: <strong className="text-slate-200">10ms</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span>RUNGS: <strong className="text-teal-300">{program ? program.rungs.length : 0}</strong></span>
          <span>UNDO: <strong className="text-slate-300">{canUndo ? "READY" : "NONE"}</strong></span>
        </div>
      </footer>
    </div>
  );
}
