"use client";

import React, { useState } from "react";
import { LadderSymbol } from "../../types/ladder";

interface LadderSymbolViewProps {
  symbol: LadderSymbol;
  centerX: number;
  centerY: number;
  width?: number;
  height?: number;
  isSelected?: boolean;
  isFlagged?: boolean;
  flagType?: "violation" | "needs_review";
  onClick?: (e: React.MouseEvent) => void;
  onToggleType?: () => void;
  onAddParallel?: () => void;
  onDelete?: () => void;
}

export const SYMBOL_WIDTH = 100;
export const SYMBOL_HEIGHT = 54;

export const LadderSymbolView: React.FC<LadderSymbolViewProps> = ({
  symbol,
  centerX,
  centerY,
  width = SYMBOL_WIDTH,
  height = SYMBOL_HEIGHT,
  isSelected = false,
  isFlagged = false,
  flagType = "needs_review",
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const x = centerX - width / 2;
  const y = centerY - height / 2;

  const isCoil = symbol.type === "coil";
  const isSet = symbol.type === "coil_set";
  const isRst = symbol.type === "coil_rst";
  const isTimer = symbol.type === "timer";
  const isCounter = symbol.type === "counter";
  const isNC = symbol.type === "contact_nc";
  const isNO = symbol.type === "contact_no";

  // Color tokens
  let themeColor = "#2dd4bf"; // default cyan/teal
  let badgeText = symbol.comment || "Contact";

  if (isFlagged) {
    themeColor = flagType === "violation" ? "#f26b6b" : "#f5a623";
  } else if (isCoil) {
    themeColor = "#f5a623"; // warm amber for outputs
    badgeText = symbol.comment || "Output (OUT)";
  } else if (isSet) {
    themeColor = "#a855f7"; // purple for SET
    badgeText = symbol.comment || "Latch (SET)";
  } else if (isRst) {
    themeColor = "#ec4899"; // pink for RST
    badgeText = symbol.comment || "Unlatch (RST)";
  } else if (isTimer) {
    themeColor = "#38bdf8"; // sky blue for timer
    badgeText = symbol.preset ? `TON ${symbol.preset}` : "Timer";
  } else if (isCounter) {
    themeColor = "#818cf8"; // indigo for counter
    badgeText = symbol.preset ? `CTU ${symbol.preset}` : "Counter";
  } else if (isNC) {
    themeColor = "#f26b6b"; // red for NC
    badgeText = symbol.comment || "NC Contact";
  } else {
    themeColor = "#2dd4bf"; // teal for NO
    badgeText = symbol.comment || "NO Contact";
  }

  return (
    <g
      className="cursor-pointer transition-all duration-150 group select-none"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background card container */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={isSelected ? "#13213c" : isHovered ? "#0f1a30" : "#0c1326"}
        stroke={
          isFlagged
            ? themeColor
            : isSelected
            ? "#2dd4bf"
            : isHovered
            ? "#38bdf8"
            : "rgba(51, 65, 85, 0.6)"
        }
        strokeWidth={isSelected ? "2" : isFlagged ? "2" : "1.2"}
        className="transition-colors"
      />

      {/* Flagged warning glow badge */}
      {isFlagged && (
        <circle
          cx={x + width - 6}
          cy={y + 6}
          r="4"
          fill={themeColor}
          className="animate-pulse"
        />
      )}

      {/* Internal Lead Wires (connect to block boundary) */}
      <line
        x1={x}
        y1={centerY}
        x2={x + 24}
        y2={centerY}
        stroke={themeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1={x + width - 24}
        y1={centerY}
        x2={x + width}
        y2={centerY}
        stroke={themeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* ====================================================================== */}
      {/* ELECTRICAL SYMBOLS                                                     */}
      {/* ====================================================================== */}

      {/* 1. Normally Open Contact: -| |- */}
      {isNO && (
        <g>
          <line
            x1={centerX - 8}
            y1={centerY - 12}
            x2={centerX - 8}
            y2={centerY + 12}
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1={centerX + 8}
            y1={centerY - 12}
            x2={centerX + 8}
            y2={centerY + 12}
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 2. Normally Closed Contact: -|/|- */}
      {isNC && (
        <g>
          <line
            x1={centerX - 8}
            y1={centerY - 12}
            x2={centerX - 8}
            y2={centerY + 12}
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1={centerX + 8}
            y1={centerY - 12}
            x2={centerX + 8}
            y2={centerY + 12}
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1={centerX - 12}
            y1={centerY + 11}
            x2={centerX + 12}
            y2={centerY - 11}
            stroke={themeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 3. Standard Output Coil: -( )- */}
      {isCoil && (
        <g>
          <path
            d={`M ${centerX - 10} ${centerY - 12} A 13 13 0 0 0 ${centerX - 10} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={`M ${centerX + 10} ${centerY - 12} A 13 13 0 0 1 ${centerX + 10} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={centerX} cy={centerY} r="2.5" fill={themeColor} />
        </g>
      )}

      {/* 4. SET Latch Coil: -(S)- */}
      {isSet && (
        <g>
          <path
            d={`M ${centerX - 11} ${centerY - 12} A 13 13 0 0 0 ${centerX - 11} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={`M ${centerX + 11} ${centerY - 12} A 13 13 0 0 1 ${centerX + 11} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text
            x={centerX}
            y={centerY + 4}
            textAnchor="middle"
            fill={themeColor}
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            S
          </text>
        </g>
      )}

      {/* 5. RESET Coil: -(R)- */}
      {isRst && (
        <g>
          <path
            d={`M ${centerX - 11} ${centerY - 12} A 13 13 0 0 0 ${centerX - 11} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={`M ${centerX + 11} ${centerY - 12} A 13 13 0 0 1 ${centerX + 11} ${centerY + 12}`}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text
            x={centerX}
            y={centerY + 4}
            textAnchor="middle"
            fill={themeColor}
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
          >
            R
          </text>
        </g>
      )}

      {/* 6. Timer Block: -[TON T0 K50]- */}
      {isTimer && (
        <g>
          <rect
            x={centerX - 15}
            y={centerY - 12}
            width={30}
            height={24}
            rx={2}
            fill="#0f172a"
            stroke={themeColor}
            strokeWidth="1.5"
          />
          <text
            x={centerX}
            y={centerY - 1}
            textAnchor="middle"
            fill={themeColor}
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
          >
            TON
          </text>
          <text
            x={centerX}
            y={centerY + 9}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="monospace"
          >
            {symbol.preset || "K50"}
          </text>
        </g>
      )}

      {/* 7. Counter Block: -[CTU C0 K10]- */}
      {isCounter && (
        <g>
          <rect
            x={centerX - 15}
            y={centerY - 12}
            width={30}
            height={24}
            rx={2}
            fill="#0f172a"
            stroke={themeColor}
            strokeWidth="1.5"
          />
          <text
            x={centerX}
            y={centerY - 1}
            textAnchor="middle"
            fill={themeColor}
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
          >
            CTU
          </text>
          <text
            x={centerX}
            y={centerY + 9}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="7"
            fontFamily="monospace"
          >
            {symbol.preset || "K10"}
          </text>
        </g>
      )}

      {/* Top Address Label (Monospace) */}
      <text
        x={centerX}
        y={y + 12}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize="11"
        fontWeight="bold"
        fontFamily="'JetBrains Mono', 'IBM Plex Mono', monospace"
        letterSpacing="0.5"
      >
        {symbol.address}
      </text>

      {/* Bottom Description / Comment Badge */}
      <text
        x={centerX}
        y={y + height - 6}
        textAnchor="middle"
        fill={themeColor}
        fontSize="8.5"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        className="tracking-wider uppercase opacity-90"
      >
        {badgeText.length > 14 ? `${badgeText.substring(0, 13)}…` : badgeText}
      </text>

      {/* Hover Selection Ring */}
      {isHovered && !isSelected && (
        <rect
          x={x - 1}
          y={y - 1}
          width={width + 2}
          height={height + 2}
          rx={5}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.8"
        />
      )}
    </g>
  );
};
