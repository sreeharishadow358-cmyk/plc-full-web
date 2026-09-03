import { create } from "zustand";
import {
  LadderProgram,
  LadderRung,
  LadderSymbol,
  LadderSymbolType,
  ValidationSummary,
} from "../types/ladder";
import {
  generateSymbolId,
  serializeProgramToInstructionList,
  parseInstructionListToProgram,
  createDefaultProgram,
} from "../services/ladderParser";
import { validateLadderProgram } from "../services/plcValidator";

const MAX_HISTORY_LENGTH = 25;

interface SelectedSymbolRef {
  rungId: string;
  symbolId: string;
  isCoil: boolean;
  branchId?: string;
  symbol: LadderSymbol;
}

interface PlcState {
  // User Prompt & AI State
  instructionInput: string;
  setInstructionInput: (input: string) => void;
  explanation: string;
  setExplanation: (text: string) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  isValidating: boolean;
  setIsValidating: (val: boolean) => void;

  // Single Source of Truth Ladder Model
  program: LadderProgram | null;
  instructionList: string;
  warnings: string[];
  validationSummary: ValidationSummary;

  // Selected Block for Popover Editing
  selectedSymbol: SelectedSymbolRef | null;
  setSelectedSymbol: (ref: SelectedSymbolRef | null) => void;

  // Undo / Redo History
  history: LadderProgram[];
  future: LadderProgram[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Mutation Actions
  setProgram: (program: LadderProgram | null, recordHistory?: boolean) => void;
  updateSymbol: (
    rungId: string,
    symbolId: string,
    updates: Partial<LadderSymbol>
  ) => void;
  addRung: (afterRungIndex?: number) => void;
  deleteRung: (rungId: string) => void;
  duplicateRung: (rungId: string) => void;
  addParallelBranch: (rungId: string, targetSymbolId: string) => void;
  deleteSymbol: (rungId: string, symbolId: string) => void;
  insertSymbol: (
    rungId: string,
    branchId: string,
    index: number,
    type?: LadderSymbolType
  ) => void;
  clearWorkspace: () => void;
}

export const usePlcStore = create<PlcState>((set, get) => {
  // Internal helper to apply program updates with automatic re-validation, IL sync, and history recording
  const applyProgramMutation = (
    newProgram: LadderProgram,
    recordHistory = true
  ) => {
    const currentProgram = get().program;

    // Run safety rule validation
    const { validatedProgram, summary } = validateLadderProgram(newProgram);
    const serializedIL = serializeProgramToInstructionList(validatedProgram);

    let newHistory = get().history;
    if (recordHistory && currentProgram) {
      newHistory = [...get().history, currentProgram].slice(-MAX_HISTORY_LENGTH);
    }

    set({
      program: validatedProgram,
      instructionList: serializedIL,
      warnings: summary.warnings.concat(summary.errors),
      validationSummary: summary,
      history: newHistory,
      future: recordHistory ? [] : get().future,
      canUndo: newHistory.length > 0,
      canRedo: recordHistory ? false : get().future.length > 0,
    });
  };

  return {
    instructionInput: "Start motor X0, Stop X1, Emergency X2, Output Y0",
    setInstructionInput: (input) => set({ instructionInput: input }),
    explanation: "",
    setExplanation: (text) => set({ explanation: text }),
    isGenerating: false,
    setIsGenerating: (val) => set({ isGenerating: val }),
    isValidating: false,
    setIsValidating: (val) => set({ isValidating: val }),

    program: null,
    instructionList: "",
    warnings: [],
    validationSummary: {
      status: "valid",
      warnings: [],
      errors: [],
      rulesChecked: 6,
    },

    selectedSymbol: null,
    setSelectedSymbol: (ref) => set({ selectedSymbol: ref }),

    history: [],
    future: [],
    canUndo: false,
    canRedo: false,

    setProgram: (prog, recordHistory = true) => {
      if (!prog) {
        set({
          program: null,
          instructionList: "",
          warnings: [],
          validationSummary: {
            status: "valid",
            warnings: [],
            errors: [],
            rulesChecked: 6,
          },
          history: [],
          future: [],
          canUndo: false,
          canRedo: false,
          selectedSymbol: null,
        });
        return;
      }
      applyProgramMutation(prog, recordHistory);
    },

    undo: () => {
      const { history, program, future } = get();
      if (history.length === 0 || !program) return;

      const previous = history[history.length - 1];
      const nextHistory = history.slice(0, -1);
      const nextFuture = [program, ...future].slice(0, MAX_HISTORY_LENGTH);

      const { validatedProgram, summary } = validateLadderProgram(previous);
      const serializedIL = serializeProgramToInstructionList(validatedProgram);

      set({
        program: validatedProgram,
        instructionList: serializedIL,
        warnings: summary.warnings.concat(summary.errors),
        validationSummary: summary,
        history: nextHistory,
        future: nextFuture,
        canUndo: nextHistory.length > 0,
        canRedo: nextFuture.length > 0,
        selectedSymbol: null,
      });
    },

    redo: () => {
      const { history, program, future } = get();
      if (future.length === 0) return;

      const next = future[0];
      const nextFuture = future.slice(1);
      const nextHistory = program
        ? [...history, program].slice(-MAX_HISTORY_LENGTH)
        : history;

      const { validatedProgram, summary } = validateLadderProgram(next);
      const serializedIL = serializeProgramToInstructionList(validatedProgram);

      set({
        program: validatedProgram,
        instructionList: serializedIL,
        warnings: summary.warnings.concat(summary.errors),
        validationSummary: summary,
        history: nextHistory,
        future: nextFuture,
        canUndo: nextHistory.length > 0,
        canRedo: nextFuture.length > 0,
        selectedSymbol: null,
      });
    },

    updateSymbol: (rungId, symbolId, updates) => {
      const { program } = get();
      if (!program) return;

      const updatedRungs = program.rungs.map((rung) => {
        if (rung.id !== rungId) return rung;

        // Check coils
        let coilFound = false;
        const newCoils = rung.coils.map((c) => {
          if (c.id === symbolId) {
            coilFound = true;
            return { ...c, ...updates };
          }
          return c;
        });

        if (coilFound) {
          return { ...rung, coils: newCoils };
        }

        // Check branch groups
        const newBranches = rung.branchGroups.map((branch) => ({
          ...branch,
          symbols: branch.symbols.map((sym) => {
            if (sym.id === symbolId) {
              return { ...sym, ...updates };
            }
            return sym;
          }),
        }));

        return { ...rung, branchGroups: newBranches };
      });

      applyProgramMutation({ ...program, rungs: updatedRungs }, true);

      // Keep selected symbol reference fresh
      const sel = get().selectedSymbol;
      if (sel && sel.symbolId === symbolId) {
        set({ selectedSymbol: { ...sel, symbol: { ...sel.symbol, ...updates } } });
      }
    },

    addRung: (afterRungIndex) => {
      const { program } = get();
      const currentProgram = program || { title: "Ladder Program", rungs: [] };

      const newIndex =
        typeof afterRungIndex === "number"
          ? afterRungIndex + 1
          : currentProgram.rungs.length;

      const newRung: LadderRung = {
        id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        rungNumber: newIndex,
        comment: `Rung ${newIndex}: New Control Circuit`,
        branchGroups: [
          {
            id: `branch_main_${Date.now()}`,
            symbols: [
              {
                id: generateSymbolId("no"),
                type: "contact_no",
                address: `X${newIndex * 2}`,
                comment: "Input Contact",
              },
            ],
          },
        ],
        coils: [
          {
            id: generateSymbolId("coil"),
            type: "coil",
            address: `Y${newIndex}`,
            comment: "Output Relay",
          },
        ],
      };

      const updatedRungs = [...currentProgram.rungs];
      if (typeof afterRungIndex === "number") {
        updatedRungs.splice(afterRungIndex + 1, 0, newRung);
      } else {
        updatedRungs.push(newRung);
      }

      // Re-index rung numbers
      const reindexed = updatedRungs.map((r, i) => ({ ...r, rungNumber: i }));
      applyProgramMutation({ ...currentProgram, rungs: reindexed }, true);
    },

    deleteRung: (rungId) => {
      const { program } = get();
      if (!program) return;

      const filtered = program.rungs.filter((r) => r.id !== rungId);
      const reindexed = filtered.map((r, i) => ({ ...r, rungNumber: i }));

      applyProgramMutation({ ...program, rungs: reindexed }, true);
      set({ selectedSymbol: null });
    },

    duplicateRung: (rungId) => {
      const { program } = get();
      if (!program) return;

      const targetRung = program.rungs.find((r) => r.id === rungId);
      if (!targetRung) return;

      const targetIndex = program.rungs.indexOf(targetRung);
      const duplicated: LadderRung = {
        ...targetRung,
        id: `rung_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        comment: `${targetRung.comment || "Rung"} (Copy)`,
        branchGroups: targetRung.branchGroups.map((b) => ({
          ...b,
          id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          symbols: b.symbols.map((s) => ({
            ...s,
            id: generateSymbolId(s.type),
          })),
        })),
        coils: targetRung.coils.map((c) => ({
          ...c,
          id: generateSymbolId(c.type),
        })),
      };

      const updatedRungs = [...program.rungs];
      updatedRungs.splice(targetIndex + 1, 0, duplicated);
      const reindexed = updatedRungs.map((r, i) => ({ ...r, rungNumber: i }));

      applyProgramMutation({ ...program, rungs: reindexed }, true);
    },

    addParallelBranch: (rungId, targetSymbolId) => {
      const { program } = get();
      if (!program) return;

      const updatedRungs = program.rungs.map((rung) => {
        if (rung.id !== rungId) return rung;

        // Duplicate the target contact as a parallel branch
        let targetSymbol: LadderSymbol | null = null;
        for (const branch of rung.branchGroups) {
          const found = branch.symbols.find((s) => s.id === targetSymbolId);
          if (found) {
            targetSymbol = found;
            break;
          }
        }

        const newBranchSymbol: LadderSymbol = {
          id: generateSymbolId("par"),
          type: targetSymbol ? targetSymbol.type : "contact_no",
          address: targetSymbol ? targetSymbol.address : "Y0",
          isBranch: true,
          comment: "Parallel Seal-in / OR Branch",
        };

        const newParallelBranch = {
          id: `branch_par_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          symbols: [newBranchSymbol],
        };

        return {
          ...rung,
          branchGroups: [...rung.branchGroups, newParallelBranch],
        };
      });

      applyProgramMutation({ ...program, rungs: updatedRungs }, true);
    },

    deleteSymbol: (rungId, symbolId) => {
      const { program } = get();
      if (!program) return;

      const updatedRungs = program.rungs.map((rung) => {
        if (rung.id !== rungId) return rung;

        // If deleting coil
        const remainingCoils = rung.coils.filter((c) => c.id !== symbolId);

        // If deleting contact from branches
        const remainingBranches = rung.branchGroups
          .map((b) => ({
            ...b,
            symbols: b.symbols.filter((s) => s.id !== symbolId),
          }))
          .filter((b) => b.symbols.length > 0);

        return {
          ...rung,
          coils: remainingCoils,
          branchGroups: remainingBranches,
        };
      });

      applyProgramMutation({ ...program, rungs: updatedRungs }, true);
      set({ selectedSymbol: null });
    },

    insertSymbol: (rungId, branchId, index, type = "contact_no") => {
      const { program } = get();
      if (!program) return;

      const newSymbol: LadderSymbol = {
        id: generateSymbolId(type),
        type,
        address: type.includes("nc") ? "X1" : "X0",
        comment: "Contact",
      };

      const updatedRungs = program.rungs.map((rung) => {
        if (rung.id !== rungId) return rung;

        const updatedBranches = rung.branchGroups.map((branch) => {
          if (branch.id !== branchId) return branch;
          const nextSymbols = [...branch.symbols];
          nextSymbols.splice(index, 0, newSymbol);
          return { ...branch, symbols: nextSymbols };
        });

        return { ...rung, branchGroups: updatedBranches };
      });

      applyProgramMutation({ ...program, rungs: updatedRungs }, true);
    },

    clearWorkspace: () => {
      set({
        instructionInput: "",
        program: null,
        explanation: "",
        instructionList: "",
        warnings: [],
        validationSummary: {
          status: "valid",
          warnings: [],
          errors: [],
          rulesChecked: 6,
        },
        selectedSymbol: null,
        history: [],
        future: [],
        canUndo: false,
        canRedo: false,
      });
    },
  };
});
