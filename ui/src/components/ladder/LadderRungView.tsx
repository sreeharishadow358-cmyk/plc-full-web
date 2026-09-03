"use client";

import React, { useState } from "react";
import {
  CheckCircleFilled,
  WarningFilled,
  CloseCircleFilled,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  BranchesOutlined,
} from "@ant-design/icons";
import { LadderRung, LadderSymbol } from "../../types/ladder";
import { LadderSymbolView, SYMBOL_WIDTH } from "./LadderSymbolView";
import { usePlcStore } from "../../store/plcStore";

interface LadderRungViewProps {
  rung: LadderRung;
  rungIndex: number;
  onSelectSymbol: (symbol: LadderSymbol, isCoil: boolean, clientPos: { x: number; y: number }) => void;
  selectedSymbolId?: string | null;
}

export const LadderRungView: React.FC<LadderRungViewProps> = ({
  rung,
  rungIndex,
  onSelectSymbol,
  selectedSymbolId,
}) => {
  const { deleteRung, duplicateRung, insertSymbol, addParallelBranch } = usePlcStore();
  const [isHovered, setIsHovered] = useState(false);

  const mainBranch = rung.branchGroups[0] || { id: "main", symbols: [] };
  const parallelBranches = rung.branchGroups.slice(1);
  const hasBranch = parallelBranches.length > 0;

  // Geometry calculations
  const SVG_WIDTH = 840;
  const LEFT_RAIL_X = 40;
  const RIGHT_RAIL_X = SVG_WIDTH - 40;
  const MAIN_RAIL_Y = 65;
  const BRANCH_SPACING_Y = 80;
  const TOTAL_BRANCHES = 1 + parallelBranches.length;
  const SVG_HEIGHT = Math.max(140, 65 + (TOTAL_BRANCHES - 1) * BRANCH_SPACING_Y + 45);

  const PARALLEL_START_X = 75;
  const PARALLEL_WIDTH = 135;
  const PARALLEL_END_X = PARALLEL_START_X + PARALLEL_WIDTH;

  // Parallel contacts (1st symbol of main branch sits on top parallel rail)
  const topParallelSymbol = hasBranch ? mainBranch.symbols[0] : null;
  const seriesSymbols = hasBranch ? mainBranch.symbols.slice(1) : mainBranch.symbols;
  const coils = rung.coils || [];

  // Positions of series contacts and coils
  const REMAINING_START_X = hasBranch ? PARALLEL_END_X + 25 : LEFT_RAIL_X + 25;
  const REMAINING_END_X = RIGHT_RAIL_X - 25;
  const REMAINING_WIDTH = REMAINING_END_X - REMAINING_START_X;
  const totalElements = seriesSymbols.length + coils.length;
  const elementSpacing = totalElements > 0 ? REMAINING_WIDTH / (totalElements + 1) : 120;

  const validation = rung.validation;
  const isViolation = validation?.status === "violation";
  const isNeedsReview = validation?.status === "needs_review";
  const isValidating = validation?.status === "validating";

  // Card Border Styling
  let borderClass = "border-slate-800/80 hover:border-slate-700";
  let bgGradient = "bg-[#0c1326]/95";

  if (isViolation) {
    borderClass = "border-red-500/80 shadow-[0_0_20px_rgba(242,107,107,0.18)]";
    bgGradient = "bg-[#18111e]/95";
  } else if (isNeedsReview) {
    borderClass = "border-amber-500/70 shadow-[0_0_15px_rgba(245,166,35,0.14)]";
    bgGradient = "bg-[#181615]/95";
  }

  return (
    <div
      className={`w-full max-w-4xl border rounded-xl p-4 transition-all duration-300 backdrop-blur-md relative ${borderClass} ${bgGradient}`}
      style={{
        animation: `fadeInUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both`,
        animationDelay: `${rungIndex * 45}ms`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RUNG HEADER BAR                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Rung Number Pill */}
          <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded tracking-wider">
            RUNG {rung.rungNumber.toString().padStart(4, "0")}
          </span>

          {/* Rung Description / Comment */}
          <span className="text-xs text-slate-300 font-medium truncate max-w-md">
            {rung.comment || `Control Rung ${rung.rungNumber}`}
          </span>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Validation Status Pill */}
          {isValidating ? (
            <span className="text-[11px] text-cyan-300 bg-cyan-950/60 border border-cyan-700/50 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 animate-pulse">
              <ReloadOutlined className="animate-spin text-xs" /> Re-validating…
            </span>
          ) : isViolation ? (
            <span
              className="text-[11px] text-red-300 bg-red-950/70 border border-red-600/80 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 cursor-help"
              title={validation?.message}
            >
              <CloseCircleFilled className="text-xs text-red-400" /> Safety Violation
            </span>
          ) : isNeedsReview ? (
            <span
              className="text-[11px] text-amber-300 bg-amber-950/70 border border-amber-600/70 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 cursor-help"
              title={validation?.message}
            >
              <WarningFilled className="text-xs text-amber-400" /> Review Warning
            </span>
          ) : (
            <span className="text-[11px] text-emerald-400 bg-emerald-950/50 border border-emerald-700/50 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
              <CheckCircleFilled className="text-xs" /> Valid
            </span>
          )}

          {/* Quick Rung Action Menu */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-700/60">
            <button
              onClick={() => insertSymbol(rung.id, mainBranch.id, mainBranch.symbols.length, "contact_no")}
              className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition text-xs"
              title="Add Series Contact"
            >
              <PlusOutlined />
            </button>
            <button
              onClick={() => duplicateRung(rung.id)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition text-xs"
              title="Duplicate Rung"
            >
              <CopyOutlined />
            </button>
            <button
              onClick={() => deleteRung(rung.id)}
              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition text-xs"
              title="Delete Rung"
            >
              <DeleteOutlined />
            </button>
          </div>
        </div>
      </div>

      {/* Validation Message Banner (if flagged) */}
      {(isViolation || isNeedsReview) && validation?.message && (
        <div
          className={`mb-3 p-2 rounded text-xs flex items-start gap-2 font-mono ${
            isViolation
              ? "bg-red-950/40 border border-red-600/50 text-red-200"
              : "bg-amber-950/40 border border-amber-600/50 text-amber-200"
          }`}
        >
          {isViolation ? (
            <CloseCircleFilled className="text-red-400 text-sm mt-0.5 shrink-0" />
          ) : (
            <WarningFilled className="text-amber-400 text-sm mt-0.5 shrink-0" />
          )}
          <span className="text-[11px] leading-relaxed">{validation.message}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SVG SCHEMATIC DIAGRAM                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full overflow-x-auto py-1 flex justify-center">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto max-w-[840px] drop-shadow"
          style={{ minWidth: "680px" }}
        >
          <defs>
            <linearGradient id={`railGlow-${rung.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.8" />
            </linearGradient>
            <filter id={`junctionGlow-${rung.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#38bdf8" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* 1. LEFT POWER RAIL (+24V / L1) */}
          <line
            x1={LEFT_RAIL_X}
            y1={10}
            x2={LEFT_RAIL_X}
            y2={SVG_HEIGHT - 10}
            stroke={`url(#railGlow-${rung.id})`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <text
            x={LEFT_RAIL_X}
            y={8}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            +24V
          </text>

          {/* 2. RIGHT POWER RAIL (0V / N) */}
          <line
            x1={RIGHT_RAIL_X}
            y1={10}
            x2={RIGHT_RAIL_X}
            y2={SVG_HEIGHT - 10}
            stroke={`url(#railGlow-${rung.id})`}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <text
            x={RIGHT_RAIL_X}
            y={8}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            0V
          </text>

          {/* 3. MAIN RUN HORIZONTAL WIRE: Left Rail -> Start of parallel/series section */}
          <line
            x1={LEFT_RAIL_X}
            y1={MAIN_RAIL_Y}
            x2={hasBranch ? PARALLEL_START_X : seriesSymbols.length > 0 ? REMAINING_START_X + elementSpacing - SYMBOL_WIDTH / 2 : RIGHT_RAIL_X}
            y2={MAIN_RAIL_Y}
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* PARALLEL OR BRANCHES (SEAL-IN / ALTERNATIVE CONDITIONS)            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {hasBranch && (
            <g id={`parallel-group-${rung.id}`}>
              {/* Top parallel symbol on main rail */}
              {topParallelSymbol && (
                <>
                  <line
                    x1={PARALLEL_START_X}
                    y1={MAIN_RAIL_Y}
                    x2={PARALLEL_START_X + PARALLEL_WIDTH / 2 - SYMBOL_WIDTH / 2}
                    y2={MAIN_RAIL_Y}
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                  />
                  <LadderSymbolView
                    symbol={topParallelSymbol}
                    centerX={PARALLEL_START_X + PARALLEL_WIDTH / 2}
                    centerY={MAIN_RAIL_Y}
                    isSelected={selectedSymbolId === topParallelSymbol.id}
                    isFlagged={validation?.flaggedSymbols?.includes(topParallelSymbol.id)}
                    flagType={isViolation ? "violation" : "needs_review"}
                    onClick={(e) => {
                      const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                      onSelectSymbol(topParallelSymbol, false, { x: rect.left, y: rect.top });
                    }}
                  />
                  <line
                    x1={PARALLEL_START_X + PARALLEL_WIDTH / 2 + SYMBOL_WIDTH / 2}
                    y1={MAIN_RAIL_Y}
                    x2={PARALLEL_END_X}
                    y2={MAIN_RAIL_Y}
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                  />
                </>
              )}

              {/* Render each parallel branch below */}
              {parallelBranches.map((pBranch, branchIdx) => {
                const branchY = MAIN_RAIL_Y + (branchIdx + 1) * BRANCH_SPACING_Y;
                const pSymbol = pBranch.symbols[0];

                return (
                  <g key={pBranch.id}>
                    {/* Vertical Dropper from Main Rail to Branch Y */}
                    <line
                      x1={PARALLEL_START_X}
                      y1={MAIN_RAIL_Y}
                      x2={PARALLEL_START_X}
                      y2={branchY}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Horizontal Branch Wires */}
                    <line
                      x1={PARALLEL_START_X}
                      y1={branchY}
                      x2={PARALLEL_START_X + PARALLEL_WIDTH / 2 - SYMBOL_WIDTH / 2}
                      y2={branchY}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />

                    {pSymbol && (
                      <LadderSymbolView
                        symbol={pSymbol}
                        centerX={PARALLEL_START_X + PARALLEL_WIDTH / 2}
                        centerY={branchY}
                        isSelected={selectedSymbolId === pSymbol.id}
                        isFlagged={validation?.flaggedSymbols?.includes(pSymbol.id)}
                        flagType={isViolation ? "violation" : "needs_review"}
                        onClick={(e) => {
                          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                          onSelectSymbol(pSymbol, false, { x: rect.left, y: rect.top });
                        }}
                      />
                    )}

                    <line
                      x1={PARALLEL_START_X + PARALLEL_WIDTH / 2 + SYMBOL_WIDTH / 2}
                      y1={branchY}
                      x2={PARALLEL_END_X}
                      y2={branchY}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                    />

                    {/* Vertical Raiser back to Main Rail */}
                    <line
                      x1={PARALLEL_END_X}
                      y1={branchY}
                      x2={PARALLEL_END_X}
                      y2={MAIN_RAIL_Y}
                      stroke="#06b6d4"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Branch Corner Dots */}
                    <circle cx={PARALLEL_START_X} cy={branchY} r="3.5" fill="#38bdf8" />
                    <circle cx={PARALLEL_END_X} cy={branchY} r="3.5" fill="#38bdf8" />
                  </g>
                );
              })}

              {/* Main Rail Junction Dots */}
              <circle cx={PARALLEL_START_X} cy={MAIN_RAIL_Y} r="4" fill="#38bdf8" filter={`url(#junctionGlow-${rung.id})`} />
              <circle cx={PARALLEL_END_X} cy={MAIN_RAIL_Y} r="4" fill="#38bdf8" filter={`url(#junctionGlow-${rung.id})`} />
            </g>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SERIES CONTACTS                                                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {seriesSymbols.map((symbol, idx) => {
            const cx = REMAINING_START_X + (idx + 1) * elementSpacing;
            const startX = cx + SYMBOL_WIDTH / 2;
            const nextCx =
              idx < seriesSymbols.length - 1
                ? REMAINING_START_X + (idx + 2) * elementSpacing
                : coils.length > 0
                ? REMAINING_START_X + (seriesSymbols.length + 1) * elementSpacing
                : RIGHT_RAIL_X;

            const endX = nextCx - (idx < seriesSymbols.length - 1 || coils.length > 0 ? SYMBOL_WIDTH / 2 : 0);

            // Wire leading into this contact from parallel end or left rail
            const wireBefore =
              idx === 0 ? (
                <line
                  x1={hasBranch ? PARALLEL_END_X : LEFT_RAIL_X}
                  y1={MAIN_RAIL_Y}
                  x2={cx - SYMBOL_WIDTH / 2}
                  y2={MAIN_RAIL_Y}
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
              ) : null;

            return (
              <g key={symbol.id}>
                {wireBefore}
                <LadderSymbolView
                  symbol={symbol}
                  centerX={cx}
                  centerY={MAIN_RAIL_Y}
                  isSelected={selectedSymbolId === symbol.id}
                  isFlagged={validation?.flaggedSymbols?.includes(symbol.id)}
                  flagType={isViolation ? "violation" : "needs_review"}
                  onClick={(e) => {
                    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                    onSelectSymbol(symbol, false, { x: rect.left, y: rect.top });
                  }}
                />
                {/* Wire after this contact */}
                <line
                  x1={startX}
                  y1={MAIN_RAIL_Y}
                  x2={endX}
                  y2={MAIN_RAIL_Y}
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* OUTPUT COILS & BLOCKS (TERMINATING RUNGS)                           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {coils.map((coil, idx) => {
            const cx = REMAINING_START_X + (seriesSymbols.length + idx + 1) * elementSpacing;
            const startX = cx + SYMBOL_WIDTH / 2;
            const nextCx =
              idx < coils.length - 1
                ? REMAINING_START_X + (seriesSymbols.length + idx + 2) * elementSpacing
                : RIGHT_RAIL_X;

            const endX = nextCx - (idx < coils.length - 1 ? SYMBOL_WIDTH / 2 : 0);

            // Wire leading from previous into coil
            const wireBefore =
              seriesSymbols.length === 0 && idx === 0 ? (
                <line
                  x1={hasBranch ? PARALLEL_END_X : LEFT_RAIL_X}
                  y1={MAIN_RAIL_Y}
                  x2={cx - SYMBOL_WIDTH / 2}
                  y2={MAIN_RAIL_Y}
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
              ) : null;

            return (
              <g key={coil.id}>
                {wireBefore}
                <LadderSymbolView
                  symbol={coil}
                  centerX={cx}
                  centerY={MAIN_RAIL_Y}
                  isSelected={selectedSymbolId === coil.id}
                  isFlagged={validation?.flaggedSymbols?.includes(coil.id)}
                  flagType={isViolation ? "violation" : "needs_review"}
                  onClick={(e) => {
                    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
                    onSelectSymbol(coil, true, { x: rect.left, y: rect.top });
                  }}
                />
                {/* Final wire to Right Rail */}
                <line
                  x1={startX}
                  y1={MAIN_RAIL_Y}
                  x2={endX}
                  y2={MAIN_RAIL_Y}
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Rung Footer Toolbar with quick instructions summary */}
      <div className="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">IL:</span>
          <span className="text-cyan-300 font-bold bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            {mainBranch.symbols.map((s, i) => `${i === 0 ? (s.type === "contact_nc" ? "LDI" : "LD") : (s.type === "contact_nc" ? "ANI" : "AND")} ${s.address}`).join(" ") || "LD X0"}
            {hasBranch && ` [OR ${parallelBranches.map((b) => b.symbols[0]?.address).join(",")}]`}
            {` → OUT ${coils.map((c) => c.address).join(",") || "Y0"}`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span>{mainBranch.symbols.length} Contacts</span>
          <span>•</span>
          <span>{coils.length} Coils</span>
        </div>
      </div>
    </div>
  );
};
