"use client";

import React, { useState, useEffect } from "react";
import {
  CloseOutlined,
  DeleteOutlined,
  BranchesOutlined,
  CheckOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { LadderSymbol, LadderSymbolType } from "../../types/ladder";
import { usePlcStore } from "../../store/plcStore";

interface SymbolEditorPopoverProps {
  rungId: string;
  symbol: LadderSymbol;
  isCoil: boolean;
  position?: { x: number; y: number };
  onClose: () => void;
}

const QUICK_ADDRESS_PRESETS = [
  { label: "X0 (Start)", address: "X0", type: "contact_no" as LadderSymbolType, comment: "Start PB" },
  { label: "X1 (Stop)", address: "X1", type: "contact_nc" as LadderSymbolType, comment: "Stop PB" },
  { label: "X2 (EMG)", address: "X2", type: "contact_nc" as LadderSymbolType, comment: "Emergency Stop" },
  { label: "X3 (Sensor)", address: "X3", type: "contact_no" as LadderSymbolType, comment: "Sensor 1" },
  { label: "Y0 (Motor)", address: "Y0", type: "coil" as LadderSymbolType, comment: "Main Motor" },
  { label: "Y1 (Valve)", address: "Y1", type: "coil" as LadderSymbolType, comment: "Solenoid Valve" },
  { label: "M0 (Aux)", address: "M0", type: "contact_no" as LadderSymbolType, comment: "Aux Relay" },
  { label: "T0 (Timer)", address: "T0", type: "timer" as LadderSymbolType, comment: "Timer T0", preset: "K50" },
  { label: "C0 (Counter)", address: "C0", type: "counter" as LadderSymbolType, comment: "Counter C0", preset: "K10" },
];

export const SymbolEditorPopover: React.FC<SymbolEditorPopoverProps> = ({
  rungId,
  symbol,
  isCoil,
  position,
  onClose,
}) => {
  const { updateSymbol, deleteSymbol, addParallelBranch } = usePlcStore();

  const [address, setAddress] = useState(symbol.address);
  const [type, setType] = useState<LadderSymbolType>(symbol.type);
  const [preset, setPreset] = useState(symbol.preset || "K50");
  const [comment, setComment] = useState(symbol.comment || "");

  useEffect(() => {
    setAddress(symbol.address);
    setType(symbol.type);
    setPreset(symbol.preset || "K50");
    setComment(symbol.comment || "");
  }, [symbol]);

  const handleApply = (newValues?: Partial<LadderSymbol>) => {
    const finalType = newValues?.type || type;
    const finalAddress = newValues?.address || address;
    const finalComment = newValues?.comment !== undefined ? newValues.comment : comment;
    const finalPreset = newValues?.preset || preset;

    updateSymbol(rungId, symbol.id, {
      type: finalType,
      address: finalAddress.trim().toUpperCase(),
      comment: finalComment.trim(),
      preset: finalType === "timer" || finalType === "counter" ? finalPreset : undefined,
    });
  };

  const handleSelectPreset = (presetItem: typeof QUICK_ADDRESS_PRESETS[0]) => {
    setAddress(presetItem.address);
    setType(presetItem.type);
    setComment(presetItem.comment);
    if (presetItem.preset) setPreset(presetItem.preset);

    handleApply({
      address: presetItem.address,
      type: presetItem.type,
      comment: presetItem.comment,
      preset: presetItem.preset,
    });
  };

  const handleTypeChange = (newType: LadderSymbolType) => {
    setType(newType);
    let defaultAddr = address;
    if (newType === "timer" && !address.startsWith("T")) defaultAddr = "T0";
    if (newType === "counter" && !address.startsWith("C")) defaultAddr = "C0";
    if (newType === "coil" && !address.startsWith("Y") && !address.startsWith("M")) defaultAddr = "Y0";

    setAddress(defaultAddr);
    handleApply({ type: newType, address: defaultAddr });
  };

  const handleAddParallel = () => {
    addParallelBranch(rungId, symbol.id);
    onClose();
  };

  const handleDelete = () => {
    deleteSymbol(rungId, symbol.id);
    onClose();
  };

  return (
    <div
      className="absolute z-50 bg-[#0b1329] border border-cyan-500/40 rounded-lg shadow-2xl p-3.5 w-72 text-slate-200 backdrop-blur-lg animate-in fade-in zoom-in-95 duration-100 font-sans"
      style={{
        left: position ? Math.min(Math.max(position.x - 140, 20), 550) : "50%",
        top: position ? position.y + 40 : 100,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
          <ThunderboltOutlined />
          <span>Edit PLC Block:</span>
          <span className="font-mono text-white bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
            {symbol.address}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition text-xs"
        >
          <CloseOutlined />
        </button>
      </div>

      {/* Block Type Selection */}
      <div className="mb-3">
        <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1 tracking-wider">
          Symbol Type
        </label>
        <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => handleTypeChange("contact_no")}
            className={`px-2 py-1 rounded border transition ${
              type === "contact_no"
                ? "bg-teal-950/80 border-teal-400 text-teal-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            NO -| |-
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("contact_nc")}
            className={`px-2 py-1 rounded border transition ${
              type === "contact_nc"
                ? "bg-red-950/80 border-red-400 text-red-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            NC -|/|-
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("coil")}
            className={`px-2 py-1 rounded border transition ${
              type === "coil"
                ? "bg-amber-950/80 border-amber-400 text-amber-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            OUT -( )-
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("coil_set")}
            className={`px-2 py-1 rounded border transition ${
              type === "coil_set"
                ? "bg-purple-950/80 border-purple-400 text-purple-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            SET -(S)-
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("coil_rst")}
            className={`px-2 py-1 rounded border transition ${
              type === "coil_rst"
                ? "bg-pink-950/80 border-pink-400 text-pink-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            RST -(R)-
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("timer")}
            className={`px-2 py-1 rounded border transition ${
              type === "timer"
                ? "bg-sky-950/80 border-sky-400 text-sky-300 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600"
            }`}
          >
            TON [T]
          </button>
        </div>
      </div>

      {/* Address & Preset Fields */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1 tracking-wider">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value.toUpperCase());
            }}
            onBlur={() => handleApply({ address })}
            placeholder="e.g. X0"
            className="w-full bg-[#162035] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
          />
        </div>

        {(type === "timer" || type === "counter") && (
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1 tracking-wider">
              Preset (K)
            </label>
            <input
              type="text"
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
              }}
              onBlur={() => handleApply({ preset })}
              placeholder="e.g. K50"
              className="w-full bg-[#162035] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-cyan-400 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Description / Comment */}
      <div className="mb-3">
        <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1 tracking-wider">
          Symbol Comment / Tag
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => handleApply({ comment })}
          placeholder="e.g. Start PB, Emergency Stop"
          className="w-full bg-[#162035] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
        />
      </div>

      {/* Quick Address Chips */}
      <div className="mb-3">
        <label className="text-[10px] uppercase font-semibold text-slate-500 block mb-1 tracking-wider">
          Quick Mitsubishi Presets
        </label>
        <div className="flex flex-wrap gap-1">
          {QUICK_ADDRESS_PRESETS.slice(0, 6).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(item)}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 border border-slate-700/50 transition"
            >
              {item.address}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
        {!isCoil && (
          <button
            type="button"
            onClick={handleAddParallel}
            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-800/60 px-2 py-1 rounded transition"
            title="Create parallel OR branch under this contact"
          >
            <BranchesOutlined /> + Parallel
          </button>
        )}

        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 px-2 py-1 rounded transition ml-auto"
        >
          <DeleteOutlined /> Delete
        </button>
      </div>
    </div>
  );
};
