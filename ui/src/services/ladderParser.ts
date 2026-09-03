import { LadderProgram, LadderRung, LadderSymbol, LadderBranch, LadderSymbolType } from "../types/ladder";

/**
 * Generate a unique ID for rungs and symbols
 */
let symbolCounter = 100;
export function generateSymbolId(prefix = "sym"): string {
  symbolCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${symbolCounter}`;
}

/**
 * Parses raw Mitsubishi FX Instruction List (IL) string into a structured LadderProgram
 */
export function parseInstructionListToProgram(ilText: string): LadderProgram {
  const lines = ilText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith(";"));

  const rungs: LadderRung[] = [];
  let currentRungIndex = 0;
  let currentComment = "";
  let currentLines: string[] = [];

  let mainSymbols: LadderSymbol[] = [];
  let branchSymbols: LadderSymbol[] = [];
  let coils: LadderSymbol[] = [];

  const finalizeRung = () => {
    if (mainSymbols.length === 0 && coils.length === 0 && branchSymbols.length === 0) {
      return;
    }

    const branches: LadderBranch[] = [];
    if (mainSymbols.length > 0) {
      branches.push({
        id: `branch_main_${currentRungIndex}`,
        symbols: [...mainSymbols],
      });
    }
    if (branchSymbols.length > 0) {
      branches.push({
        id: `branch_par_${currentRungIndex}`,
        symbols: [...branchSymbols],
      });
    }

    rungs.push({
      id: `rung_${currentRungIndex}`,
      rungNumber: currentRungIndex,
      comment: currentComment || `Rung ${currentRungIndex}`,
      sourceIL: currentLines.join("\n"),
      branchGroups: branches,
      coils: coils.length > 0 ? [...coils] : [{ id: generateSymbolId("coil"), type: "coil", address: "Y0", comment: "Output" }],
    });

    currentRungIndex += 1;
    currentComment = "";
    currentLines = [];
    mainSymbols = [];
    branchSymbols = [];
    coils = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for rung comments like "// Rung 0: Start Motor"
    if (line.startsWith("//")) {
      const cleaned = line.replace(/^\/\/\s*/, "");
      if (cleaned.toLowerCase().includes("rung") || !currentComment) {
        currentComment = cleaned;
      }
      continue;
    }

    if (line.toUpperCase() === "END") {
      finalizeRung();
      break;
    }

    const tokens = line.split(/\s+/);
    const opcode = tokens[0].toUpperCase();
    const operand = tokens[1] || "";
    const extra = tokens.slice(2).join(" ");

    currentLines.push(line);

    // Interpret opcodes
    switch (opcode) {
      case "LD":
      case "LOAD":
        if (coils.length > 0) {
          // If we already had coils, a new LD starts a new rung!
          finalizeRung();
          currentLines.push(line);
        }
        mainSymbols.push({
          id: generateSymbolId("no"),
          type: "contact_no",
          address: operand || "X0",
          comment: getStandardComment(operand, "contact_no"),
        });
        break;

      case "LDI":
      case "LOAD_NOT":
      case "LDN":
        if (coils.length > 0) {
          finalizeRung();
          currentLines.push(line);
        }
        mainSymbols.push({
          id: generateSymbolId("nc"),
          type: "contact_nc",
          address: operand || "X1",
          comment: getStandardComment(operand, "contact_nc"),
        });
        break;

      case "AND":
        mainSymbols.push({
          id: generateSymbolId("and_no"),
          type: "contact_no",
          address: operand || "X0",
          comment: getStandardComment(operand, "contact_no"),
        });
        break;

      case "ANI":
      case "ANDN":
      case "AND_NOT":
        mainSymbols.push({
          id: generateSymbolId("and_nc"),
          type: "contact_nc",
          address: operand || "X1",
          comment: getStandardComment(operand, "contact_nc"),
        });
        break;

      case "OR":
        branchSymbols.push({
          id: generateSymbolId("or_no"),
          type: "contact_no",
          address: operand || "Y0",
          isBranch: true,
          comment: getStandardComment(operand, "contact_no", true),
        });
        break;

      case "ORI":
      case "ORN":
      case "OR_NOT":
        branchSymbols.push({
          id: generateSymbolId("or_nc"),
          type: "contact_nc",
          address: operand || "X2",
          isBranch: true,
          comment: getStandardComment(operand, "contact_nc", true),
        });
        break;

      case "OUT":
        if (operand.toUpperCase().startsWith("T")) {
          // Timer block: OUT T0 K50
          coils.push({
            id: generateSymbolId("tmr"),
            type: "timer",
            address: operand,
            preset: extra || "K50",
            comment: `Timer ${operand} (${extra || "5.0s"})`,
          });
        } else if (operand.toUpperCase().startsWith("C")) {
          // Counter block: OUT C0 K10
          coils.push({
            id: generateSymbolId("cnt"),
            type: "counter",
            address: operand,
            preset: extra || "K10",
            comment: `Counter ${operand} (${extra || "10"})`,
          });
        } else {
          // Standard coil
          coils.push({
            id: generateSymbolId("coil"),
            type: "coil",
            address: operand || "Y0",
            comment: getStandardComment(operand, "coil"),
          });
        }
        break;

      case "SET":
        coils.push({
          id: generateSymbolId("set"),
          type: "coil_set",
          address: operand || "Y0",
          comment: `SET ${operand}`,
        });
        break;

      case "RST":
      case "RESET":
        coils.push({
          id: generateSymbolId("rst"),
          type: "coil_rst",
          address: operand || "Y0",
          comment: `RESET ${operand}`,
        });
        break;

      default:
        break;
    }
  }

  finalizeRung();

  if (rungs.length === 0) {
    return createDefaultProgram();
  }

  return {
    title: "Generated Ladder Program",
    rungs,
  };
}

/**
 * Serializes a LadderProgram into standard Mitsubishi FX Instruction List (IL) string
 */
export function serializeProgramToInstructionList(program: LadderProgram): string {
  if (!program || !program.rungs || program.rungs.length === 0) {
    return "// Empty Ladder Logic Program\nEND";
  }

  const lines: string[] = [];

  program.rungs.forEach((rung, index) => {
    lines.push(`// ==========================================`);
    lines.push(`// Rung ${index}: ${rung.comment || `Rung ${index}`}`);
    lines.push(`// ==========================================`);

    const mainBranch = rung.branchGroups[0];
    const parallelBranches = rung.branchGroups.slice(1);

    if (mainBranch && mainBranch.symbols.length > 0) {
      const firstSymbol = mainBranch.symbols[0];
      // 1. First instruction (LD or LDI)
      if (firstSymbol.type === "contact_nc") {
        lines.push(`LDI ${firstSymbol.address}`);
      } else {
        lines.push(`LD ${firstSymbol.address}`);
      }

      // 2. Parallel branch on start (e.g. OR Y0 seal-in)
      if (parallelBranches.length > 0) {
        parallelBranches.forEach((pBranch) => {
          pBranch.symbols.forEach((pSym) => {
            if (pSym.type === "contact_nc") {
              lines.push(`ORI ${pSym.address}`);
            } else {
              lines.push(`OR ${pSym.address}`);
            }
          });
        });
      }

      // 3. Series contacts (AND / ANI)
      for (let i = 1; i < mainBranch.symbols.length; i++) {
        const sym = mainBranch.symbols[i];
        if (sym.type === "contact_nc") {
          lines.push(`ANI ${sym.address}`);
        } else {
          lines.push(`AND ${sym.address}`);
        }
      }
    } else if (parallelBranches.length > 0) {
      // Fallback if main branch empty
      const firstSym = parallelBranches[0].symbols[0];
      if (firstSym) {
        lines.push(`${firstSym.type === "contact_nc" ? "LDI" : "LD"} ${firstSym.address}`);
      }
    }

    // 4. Output Coils / Blocks
    if (rung.coils && rung.coils.length > 0) {
      rung.coils.forEach((coil) => {
        if (coil.type === "coil_set") {
          lines.push(`SET ${coil.address}`);
        } else if (coil.type === "coil_rst") {
          lines.push(`RST ${coil.address}`);
        } else if (coil.type === "timer") {
          lines.push(`OUT ${coil.address} ${coil.preset || "K50"}`);
        } else if (coil.type === "counter") {
          lines.push(`OUT ${coil.address} ${coil.preset || "K10"}`);
        } else {
          lines.push(`OUT ${coil.address}`);
        }
      });
    } else {
      lines.push(`OUT Y0`);
    }

    lines.push(""); // empty line between rungs
  });

  lines.push("END");
  return lines.join("\n");
}

/**
 * Parses generic JSON object (e.g. backend nodes/edges or rung array) into unified LadderProgram
 */
export function parseJsonToProgram(data: any): LadderProgram {
  if (!data) return createDefaultProgram();

  // If already a LadderProgram
  if (Array.isArray(data.rungs) && data.rungs.length > 0) {
    return data as LadderProgram;
  }

  // If provided as a list of nodes (legacy mock or AI generator format)
  if (Array.isArray(data.nodes) && data.nodes.length > 0) {
    const mainSymbols: LadderSymbol[] = [];
    const branchSymbols: LadderSymbol[] = [];
    const coils: LadderSymbol[] = [];

    data.nodes.forEach((node: any) => {
      const rawLabel = node.label || node.address || "X0";
      const addrMatch = rawLabel.match(/^([A-Za-z0-9]+)/);
      const address = addrMatch ? addrMatch[1] : rawLabel;
      const descMatch = rawLabel.match(/\((.*?)\)/);
      const comment = descMatch ? descMatch[1] : undefined;

      const isParallel =
        node.branch === "parallel" ||
        node.is_branch === true ||
        node.isBranch === true ||
        (typeof node.y === "number" && node.y >= 100) ||
        /\b(seal[-_]?in|or|parallel)\b/i.test(rawLabel);

      let type: LadderSymbolType = "contact_no";
      if (node.type === "coil_set" || node.type === "set") {
        type = "coil_set";
      } else if (node.type === "coil_rst" || node.type === "rst") {
        type = "coil_rst";
      } else if (node.type === "timer" || address.startsWith("T")) {
        type = "timer";
      } else if (node.type === "counter" || address.startsWith("C")) {
        type = "counter";
      } else if (node.type === "coil" || address.startsWith("Y") || String(node.type).includes("coil")) {
        type = "coil";
      } else if (node.type === "contact_nc" || /stop|emg|off|nc/i.test(rawLabel)) {
        type = "contact_nc";
      }

      const symbol: LadderSymbol = {
        id: node.id || generateSymbolId("node"),
        type,
        address,
        comment: comment || getStandardComment(address, type),
        preset: node.preset || (type === "timer" ? "K50" : type === "counter" ? "K10" : undefined),
      };

      const isOutput =
        type === "coil" ||
        type === "timer" ||
        type === "counter" ||
        type === "coil_set" ||
        type === "coil_rst";

      if (isOutput) {
        coils.push(symbol);
      } else if (isParallel) {
        branchSymbols.push({ ...symbol, isBranch: true });
      } else {
        mainSymbols.push(symbol);
      }
    });

    const branches: LadderBranch[] = [];
    if (mainSymbols.length > 0) {
      branches.push({ id: "branch_main_0", symbols: mainSymbols });
    }
    if (branchSymbols.length > 0) {
      branches.push({ id: "branch_par_0", symbols: branchSymbols });
    }

    return {
      title: "Synthesized Program",
      rungs: [
        {
          id: "rung_0",
          rungNumber: 0,
          comment: "Motor Control with Seal-in Latch & Safety Interlock",
          branchGroups: branches,
          coils: coils.length > 0 ? coils : [{ id: generateSymbolId("coil"), type: "coil", address: "Y0", comment: "Main Output" }],
        },
      ],
    };
  }

  return createDefaultProgram();
}

/**
 * Creates default initial ladder program
 */
export function createDefaultProgram(): LadderProgram {
  return {
    title: "Standard Motor Control",
    rungs: [
      {
        id: "rung_0",
        rungNumber: 0,
        comment: "Standard Motor Start/Stop with Seal-in Latch",
        branchGroups: [
          {
            id: "branch_main_0",
            symbols: [
              { id: "sym_start", type: "contact_no", address: "X0", comment: "Start Pushbutton" },
              { id: "sym_stop", type: "contact_nc", address: "X1", comment: "Stop Pushbutton" },
              { id: "sym_emg", type: "contact_nc", address: "X2", comment: "Emergency Stop" },
            ],
          },
          {
            id: "branch_par_0",
            symbols: [
              { id: "sym_sealin", type: "contact_no", address: "Y0", isBranch: true, comment: "Seal-in Auxiliary" },
            ],
          },
        ],
        coils: [
          { id: "sym_motor", type: "coil", address: "Y0", comment: "Motor Starter Relay" },
        ],
      },
    ],
  };
}

/**
 * Generate sensible default comments for PLC addresses
 */
function getStandardComment(address: string, type: LadderSymbolType, isBranch = false): string {
  const upper = address.toUpperCase();
  if (upper === "X0") return "Start PB";
  if (upper === "X1") return "Stop PB";
  if (upper === "X2") return "Emergency Stop";
  if (upper === "X3") return "Sensor 1";
  if (upper === "X4") return "Sensor 2";
  if (upper === "Y0") return isBranch ? "Seal-in Aux" : "Main Motor";
  if (upper === "Y1") return "Solenoid Valve";
  if (upper === "Y2") return "Alarm Lamp";
  if (upper === "M0") return "Run Permissive";
  if (upper.startsWith("T")) return "Timer Delay";
  if (upper.startsWith("C")) return "Part Counter";
  return type === "coil" ? "Output" : "Contact";
}
