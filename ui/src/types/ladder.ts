/**
 * Core Data Model for PLC Ladder Logic (IEC 61131-3 & Mitsubishi FX / GX Works3)
 */

export type LadderSymbolType =
  | "contact_no"   // Normally Open Contact: -| |- (LD / AND / OR)
  | "contact_nc"   // Normally Closed Contact: -|/|- (LDI / ANI / ORI)
  | "coil"         // Output Relay Coil: -( )- (OUT)
  | "coil_set"     // Latch SET Coil: -(S)- / -[SET]- (SET)
  | "coil_rst"     // Latch RESET Coil: -(R)- / -[RST]- (RST)
  | "timer"        // Timer Function Block: -[TON T0 K50]- (OUT T0 K50)
  | "counter";     // Counter Function Block: -[CTU C0 K10]- (OUT C0 K10)

export interface LadderSymbol {
  id: string;
  type: LadderSymbolType;
  address: string;      // e.g. "X0", "X1", "Y0", "M0", "T0", "C0"
  preset?: string;     // e.g. "K50" (5.0s), "K10" (10 counts)
  comment?: string;    // e.g. "Start Button", "Emergency Stop", "Main Motor"
  isBranch?: boolean;  // whether this symbol is in a parallel branch
  parallelId?: string; // identifier grouping parallel branch contacts
}

export type RungValidationStatus = "valid" | "needs_review" | "violation" | "validating";

export interface RungValidationState {
  status: RungValidationStatus;
  message?: string;
  ruleId?: string;
  flaggedSymbols?: string[]; // symbol ids
}

export interface LadderBranch {
  id: string;
  symbols: LadderSymbol[];
}

export interface LadderRung {
  id: string;
  rungNumber: number; // 0, 1, 2...
  comment?: string;   // e.g. "Rung 0: Motor Start / Stop with Seal-in Latch"
  sourceIL?: string;  // e.g. "LD X0\nOR Y0\nANI X1\nOUT Y0"
  
  // A rung contains contact branches (parallel paths or single series path)
  // And ends with one or more output coils/blocks (OUT, SET, RST, TMR, CNT)
  branchGroups: LadderBranch[]; // e.g. [ { id: 'main', symbols: [X0, X1, X2] }, { id: 'branch-1', symbols: [Y0] } ]
  coils: LadderSymbol[];        // Terminating coils/blocks e.g. [ { id: 'c1', type: 'coil', address: 'Y0' } ]
  
  validation?: RungValidationState;
}

export interface LadderProgram {
  title?: string;
  rungs: LadderRung[];
}

export interface ValidationSummary {
  status: "valid" | "needs_review" | "violation";
  warnings: string[];
  errors: string[];
  rulesChecked: number;
}
