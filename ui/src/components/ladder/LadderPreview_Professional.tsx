"use client";

import React, { useState, useEffect } from "react";
import {
  PlusOutlined,
  ThunderboltFilled,
  InfoCircleOutlined,
  BranchesOutlined,
  UndoOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import { LadderSymbol, LadderProgram } from "../../types/ladder";
import { LadderRungView } from "./LadderRungView";
import { SymbolEditorPopover } from "./SymbolEditorPopover";
import { usePlcStore } from "../../store/plcStore";

interface LadderPreviewProps {
  ladderData?: any;
  zoomLevel?: number;
  onBlockClick?: (block: any) => void;
}

export default function LadderPreview_Professional({
  zoomLevel = 100,
}: LadderPreviewProps) {
  const {
    program,
    addRung,
    selectedSymbol,
    setSelectedSymbol,
    undo,
    redo,
    canUndo,
    canRedo,
  } = usePlcStore();

  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  // Keyboard shortcut listener for Ctrl+Z (Undo) and Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const handleSelectSymbol = (
    symbol: LadderSymbol,
    isCoil: boolean,
    clientPos: { x: number; y: number }
  ) => {
    // Find rung ID containing this symbol
    let targetRungId = "";
    if (program) {
      for (const rung of program.rungs) {
        if (rung.coils.some((c) => c.id === symbol.id)) {
          targetRungId = rung.id;
          break;
        }
        for (const b of rung.branchGroups) {
          if (b.symbols.some((s) => s.id === symbol.id)) {
            targetRungId = rung.id;
            break;
          }
        }
      }
    }

    setSelectedSymbol({
      rungId: targetRungId,
      symbolId: symbol.id,
      isCoil,
      symbol,
    });
    setPopoverPosition(clientPos);
  };

  const handleClosePopover = () => {
    setSelectedSymbol(null);
    setPopoverPosition(undefined);
  };

  // If no program generated yet, render professional empty state
  if (!program || program.rungs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-2xl bg-[#0d1527]/70 max-w-md my-auto backdrop-blur select-none">
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center mb-4 shadow-lg shadow-cyan-950/40 text-cyan-400 text-2xl">
          <ThunderboltFilled />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1.5 font-sans">
          No Ladder Logic on Canvas
        </h3>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed max-w-sm">
          Enter an automation instruction in the prompt panel or choose a preset to synthesize real-time IEC 61131-3 ladder schematics.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addRung()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 rounded-lg transition shadow"
          >
            <PlusOutlined /> Create Blank Rung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col items-center select-none relative pb-10"
      style={{
        transform: `scale(${zoomLevel / 100})`,
        transformOrigin: "top center",
        transition: "transform 150ms ease-out",
      }}
      onClick={handleClosePopover}
    >
      {/* Undo / Redo Floating Quick Badge */}
      <div
        className="fixed top-12 right-6 z-30 flex items-center gap-1 bg-[#0b1329]/90 border border-slate-800 rounded-lg p-1 shadow-lg backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 text-xs rounded text-slate-300 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition"
          title="Undo Edit (Ctrl+Z)"
        >
          <UndoOutlined />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 text-xs rounded text-slate-300 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition"
          title="Redo Edit (Ctrl+Y)"
        >
          <RedoOutlined />
        </button>
      </div>

      {/* Floating Block Editor Popover */}
      {selectedSymbol && (
        <SymbolEditorPopover
          rungId={selectedSymbol.rungId}
          symbol={selectedSymbol.symbol}
          isCoil={selectedSymbol.isCoil}
          position={popoverPosition}
          onClose={handleClosePopover}
        />
      )}

      {/* Rung Stack Container */}
      <div className="w-full flex flex-col items-center gap-4">
        {program.rungs.map((rung, index) => (
          <LadderRungView
            key={rung.id}
            rung={rung}
            rungIndex={index}
            onSelectSymbol={handleSelectSymbol}
            selectedSymbolId={selectedSymbol?.symbolId}
          />
        ))}

        {/* Add Rung Button Below Last Rung */}
        <div className="w-full max-w-4xl flex items-center justify-center pt-2">
          <button
            onClick={() => addRung()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 bg-[#0f172a]/90 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-700/80 rounded-lg transition shadow-md group"
          >
            <PlusOutlined className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span>Insert New Rung (Rung {program.rungs.length})</span>
          </button>
        </div>

        {/* Global Schematic Diagnostic Footer */}
        <div className="w-full max-w-4xl mt-4 p-3 bg-[#0d1424]/90 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-3">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-teal-400 inline-block"></span>
              NO Contact -| |- (LD/AND/OR)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"></span>
              NC Contact -|/|- (LDI/ANI/ORI)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"></span>
              Output Coil -( )- (OUT)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block"></span>
              Timer -[TON]- (OUT T)
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Total Rungs: <span className="text-cyan-400 font-bold">{program.rungs.length}</span> | IEC 61131-3
          </div>
        </div>
      </div>
    </div>
  );
}
