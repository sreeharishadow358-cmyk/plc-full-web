import { LadderProgram, LadderRung, RungValidationState, ValidationSummary } from "../types/ladder";

/**
 * Rule 9.A: Hard rejection for Motor Rung with no seal-in, unless explicitly marked momentary/jog
 */
export function rejectMissingSealIn(rung: LadderRung): RungValidationState {
  const motorCoil = rung.coils.find((c) => c.type === "coil" && c.address.toUpperCase().startsWith("Y"));
  if (!motorCoil) {
    return { status: "valid", message: "Not a motor coil rung." };
  }

  const isJog = /jog|momentary/i.test(rung.comment || "");
  if (isJog) {
    return { status: "valid", message: "Rung explicitly marked as momentary jog control." };
  }

  let hasSealIn = false;

  if (rung.branchGroups.length > 1) {
    for (let i = 1; i < rung.branchGroups.length; i++) {
      const branch = rung.branchGroups[i];
      if (branch.symbols.some((s) => s.address.toUpperCase() === motorCoil.address.toUpperCase())) {
        hasSealIn = true;
        break;
      }
    }
  }

  if (!hasSealIn && rung.sourceIL) {
    const ilLines = rung.sourceIL.split("\n").map((l) => l.trim().toUpperCase());
    if (ilLines.some((l) => l.startsWith(`OR ${motorCoil.address.toUpperCase()}`))) {
      hasSealIn = true;
    }
  }

  if (!hasSealIn) {
    return {
      status: "violation",
      message: `Safety/Functional Violation: Motor output '${motorCoil.address}' lacks an auxiliary seal-in contact (OR ${motorCoil.address}). Motor will drop out immediately upon pushbutton release.`,
      ruleId: "RULE_REJECT_MISSING_SEAL_IN",
      flaggedSymbols: [motorCoil.id],
    };
  }

  return { status: "valid", message: "Motor seal-in contact verified." };
}

/**
 * Rule 9.B: Hard rejection for Safety Input configured as Normally Open (NO)
 */
export function rejectSafetyInputWiredNormallyOpen(rung: LadderRung): RungValidationState {
  const flaggedSymbols: string[] = [];

  for (const branch of rung.branchGroups) {
    for (const sym of branch.symbols) {
      const isEStop =
        sym.address.toUpperCase() === "X2" ||
        /emg|emergency|e-stop|estop/i.test(sym.comment || "") ||
        /emg|emergency/i.test(sym.address);

      if (isEStop && sym.type === "contact_no") {
        flaggedSymbols.push(sym.id);
        return {
          status: "violation",
          message: `Safety Violation: Emergency Stop '${sym.address}' is configured as Normally Open (NO). E-Stop MUST be Normally Closed (NC / ANI / LDI) for fail-safe physical break.`,
          ruleId: "RULE_REJECT_SAFETY_NO",
          flaggedSymbols,
        };
      }
    }
  }

  return { status: "valid", message: "Safety inputs properly configured as NC." };
}

/**
 * Rule 9.C: Hard rejection for Mutex Pair where only one direction interlocks
 */
export function rejectOneSidedMutexInterlock(program: LadderProgram): {
  status: "valid" | "violation";
  message?: string;
  ruleId?: string;
} {
  if (!program || !program.rungs || program.rungs.length < 2) {
    return { status: "valid" };
  }

  // Find rungs driving physical motor output coils (Y addresses)
  const coilToRungMap: Record<string, LadderRung> = {};
  program.rungs.forEach((r) => {
    r.coils.forEach((c) => {
      if (c.type === "coil" && c.address.toUpperCase().startsWith("Y")) {
        coilToRungMap[c.address.toUpperCase()] = r;
      }
    });
  });

  const addresses = Object.keys(coilToRungMap);
  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const addrA = addresses[i];
      const addrB = addresses[j];
      const rungA = coilToRungMap[addrA];
      const rungB = coilToRungMap[addrB];

      const rungsComment = `${rungA.comment || ""} ${rungB.comment || ""}`.toLowerCase();
      const isMutexPairCandidate =
        rungsComment.includes("mutex") ||
        rungsComment.includes("forward") ||
        rungsComment.includes("reverse");

      if (isMutexPairCandidate) {
        const rungAHasB = rungA.branchGroups.some((bg) =>
          bg.symbols.some((s) => s.address.toUpperCase() === addrB && s.type === "contact_nc")
        ) || (rungA.sourceIL && rungA.sourceIL.toUpperCase().includes(`ANI ${addrB}`));

        const rungBHasA = rungB.branchGroups.some((bg) =>
          bg.symbols.some((s) => s.address.toUpperCase() === addrA && s.type === "contact_nc")
        ) || (rungB.sourceIL && rungB.sourceIL.toUpperCase().includes(`ANI ${addrA}`));

        if (rungAHasB && !rungBHasA) {
          return {
            status: "violation",
            message: `One-Sided Mutex Hazard: Output '${addrA}' interlocks against '${addrB}', but '${addrB}' does NOT interlock against '${addrA}'.`,
            ruleId: "RULE_REJECT_ONE_SIDED_MUTEX",
          };
        }

        if (rungBHasA && !rungAHasB) {
          return {
            status: "violation",
            message: `One-Sided Mutex Hazard: Output '${addrB}' interlocks against '${addrA}', but '${addrA}' does NOT interlock against '${addrB}'.`,
            ruleId: "RULE_REJECT_ONE_SIDED_MUTEX",
          };
        }
      }
    }
  }

  return { status: "valid" };
}

/**
 * Rule 9.D: Hard rejection for Duplicate Output Coils
 */
export function rejectDuplicateOutputCoil(program: LadderProgram): {
  status: "valid" | "violation" | "needs_review";
  message?: string;
  ruleId?: string;
  duplicates?: string[];
} {
  if (!program || !program.rungs) return { status: "valid" };

  const coilAddressCount: Record<string, number> = {};
  program.rungs.forEach((rung) => {
    rung.coils.forEach((coil) => {
      if (coil.type === "coil" && coil.address.toUpperCase().startsWith("Y")) {
        const addr = coil.address.toUpperCase();
        coilAddressCount[addr] = (coilAddressCount[addr] || 0) + 1;
      }
    });
  });

  const duplicates = Object.entries(coilAddressCount)
    .filter(([_, count]) => count > 1)
    .map(([addr]) => addr);

  if (duplicates.length > 0) {
    return {
      status: "violation",
      message: `Duplicate Output Coil Hazard: Output coil(s) [${duplicates.join(", ")}] are written in multiple rungs.`,
      ruleId: "RULE_REJECT_DUPLICATE_COIL",
      duplicates,
    };
  }

  return { status: "valid" };
}

/**
 * Validates an entire LadderProgram and produces both per-rung validation states and a global summary.
 */
export function validateLadderProgram(program: LadderProgram): {
  validatedProgram: LadderProgram;
  summary: ValidationSummary;
} {
  if (!program || !program.rungs || program.rungs.length === 0) {
    return {
      validatedProgram: program,
      summary: {
        status: "valid",
        warnings: [],
        errors: [],
        rulesChecked: 8,
      },
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  const dupCheck = rejectDuplicateOutputCoil(program);
  if (dupCheck.status === "violation" && dupCheck.message) {
    errors.push(dupCheck.message);
  }

  const mutexCheck = rejectOneSidedMutexInterlock(program);
  if (mutexCheck.status === "violation" && mutexCheck.message) {
    errors.push(mutexCheck.message);
  }

  const validatedRungs = program.rungs.map((rung, index) => {
    const rungValidation = validateSingleRung(rung, index);

    if (rungValidation.status === "violation" && rungValidation.message) {
      errors.push(`Rung ${index}: ${rungValidation.message}`);
    } else if (rungValidation.status === "needs_review" && rungValidation.message) {
      warnings.push(`Rung ${index}: ${rungValidation.message}`);
    }

    return {
      ...rung,
      validation: rungValidation,
    };
  });

  const overallStatus = errors.length > 0 ? "violation" : warnings.length > 0 ? "needs_review" : "valid";

  return {
    validatedProgram: {
      ...program,
      rungs: validatedRungs,
    },
    summary: {
      status: overallStatus,
      warnings,
      errors,
      rulesChecked: 8,
    },
  };
}

/**
 * Validates a single rung according to industrial standards
 */
export function validateSingleRung(
  rung: LadderRung,
  rungIndex: number
): RungValidationState {
  if (!rung.coils || rung.coils.length === 0) {
    return {
      status: "violation",
      message: "Dangling Rung: Rung must terminate in an output coil, timer, or counter.",
      ruleId: "RULE_NO_COIL",
    };
  }

  const hasContacts = rung.branchGroups.some((b) => b.symbols.length > 0);
  if (!hasContacts) {
    return {
      status: "needs_review",
      message: "Unconditional Rung: No input contacts defined. Coil energizes constantly on every scan.",
      ruleId: "RULE_UNCONDITIONAL_COIL",
    };
  }

  const safetyCheck = rejectSafetyInputWiredNormallyOpen(rung);
  if (safetyCheck.status === "violation") {
    return safetyCheck;
  }

  const sealInCheck = rejectMissingSealIn(rung);
  if (sealInCheck.status === "violation") {
    return sealInCheck;
  }

  for (const coil of rung.coils) {
    if (coil.type === "timer" || coil.type === "counter") {
      if (!coil.preset || !/^K\d+$/i.test(coil.preset)) {
        return {
          status: "needs_review",
          message: `Missing Preset Value: ${coil.type === "timer" ? "Timer" : "Counter"} '${coil.address}' requires a valid preset constant (e.g. K50).`,
          ruleId: "RULE_PRESET_REQUIRED",
          flaggedSymbols: [coil.id],
        };
      }
    }
  }

  for (const branch of rung.branchGroups) {
    for (const sym of branch.symbols) {
      if (!isValidMitsubishiAddress(sym.address)) {
        return {
          status: "needs_review",
          message: `Non-standard Address: '${sym.address}' does not match standard Mitsubishi FX address ranges (X, Y, M, T, C, S, D).`,
          ruleId: "RULE_ADDRESS_FORMAT",
          flaggedSymbols: [sym.id],
        };
      }
    }
  }

  return {
    status: "valid",
    message: "Rung validated with 0 safety conflicts.",
  };
}

export function isValidMitsubishiAddress(addr: string): boolean {
  const match = addr.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return false;
  const prefix = match[1].toUpperCase();
  return ["X", "Y", "M", "T", "C", "S", "D"].includes(prefix);
}
