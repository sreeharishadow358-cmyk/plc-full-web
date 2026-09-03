import { LadderProgram, LadderRung, RungValidationState, ValidationSummary } from "../types/ladder";

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
        rulesChecked: 5,
      },
    };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const coilAddressCount: Record<string, number> = {};

  // First pass: count all output coil writes to detect double coil hazards
  program.rungs.forEach((rung) => {
    rung.coils.forEach((coil) => {
      if (coil.type === "coil" && coil.address.toUpperCase().startsWith("Y")) {
        const addr = coil.address.toUpperCase();
        coilAddressCount[addr] = (coilAddressCount[addr] || 0) + 1;
      }
    });
  });

  // Second pass: validate each individual rung
  const validatedRungs = program.rungs.map((rung, index) => {
    const rungValidation = validateSingleRung(rung, index, coilAddressCount);

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

  // Check if any double coils exist
  Object.entries(coilAddressCount).forEach(([addr, count]) => {
    if (count > 1) {
      warnings.push(`Double Coil Hazard: Output '${addr}' is written across ${count} rungs.`);
    }
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
      rulesChecked: 6,
    },
  };
}

/**
 * Validates a single rung according to industrial standards
 */
export function validateSingleRung(
  rung: LadderRung,
  rungIndex: number,
  allCoilCounts?: Record<string, number>
): RungValidationState {
  const flaggedSymbols: string[] = [];

  // 1. Check for missing coil
  if (!rung.coils || rung.coils.length === 0) {
    return {
      status: "violation",
      message: "Dangling Rung: Rung must terminate in an output coil, timer, or counter.",
      ruleId: "RULE_NO_COIL",
    };
  }

  // 2. Check for empty contact branches
  const hasContacts = rung.branchGroups.some((b) => b.symbols.length > 0);
  if (!hasContacts) {
    return {
      status: "needs_review",
      message: "Unconditional Rung: No input contacts defined. Coil energizes constantly on every scan.",
      ruleId: "RULE_UNCONDITIONAL_COIL",
    };
  }

  // 3. Emergency Stop safety check (E-Stop MUST be Normally Closed contact_nc)
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
          message: `Safety Violation: Emergency Stop '${sym.address}' is configured as Normally Open (NO). E-Stop MUST be Normally Closed (NC / ANI) for fail-safe physical break.`,
          ruleId: "RULE_ESTOP_FAILSAFE",
          flaggedSymbols,
        };
      }
    }
  }

  // 4. Double coil hazard on this rung
  if (allCoilCounts) {
    for (const coil of rung.coils) {
      const addr = coil.address.toUpperCase();
      if (coil.type === "coil" && (allCoilCounts[addr] || 0) > 1) {
        flaggedSymbols.push(coil.id);
        return {
          status: "needs_review",
          message: `Double Coil Hazard: Output coil '${addr}' is duplicated in other rungs. Scan cycles may overwrite state.`,
          ruleId: "RULE_DOUBLE_COIL",
          flaggedSymbols,
        };
      }
    }
  }

  // 5. Timer / Counter preset check
  for (const coil of rung.coils) {
    if (coil.type === "timer" || coil.type === "counter") {
      if (!coil.preset || !/^K\d+$/i.test(coil.preset)) {
        flaggedSymbols.push(coil.id);
        return {
          status: "needs_review",
          message: `Missing Preset Value: ${coil.type === "timer" ? "Timer" : "Counter"} '${coil.address}' requires a valid preset constant (e.g. K50).`,
          ruleId: "RULE_PRESET_REQUIRED",
          flaggedSymbols,
        };
      }
    }
  }

  // 6. Address convention format check
  for (const branch of rung.branchGroups) {
    for (const sym of branch.symbols) {
      if (!isValidMitsubishiAddress(sym.address)) {
        flaggedSymbols.push(sym.id);
        return {
          status: "needs_review",
          message: `Non-standard Address: '${sym.address}' does not match standard Mitsubishi FX address ranges (X, Y, M, T, C, D).`,
          ruleId: "RULE_ADDRESS_FORMAT",
          flaggedSymbols,
        };
      }
    }
  }

  return {
    status: "valid",
    message: "Rung validated with 0 safety conflicts.",
  };
}

/**
 * Validates Mitsubishi address format (X, Y, M, T, C, S, D)
 */
export function isValidMitsubishiAddress(addr: string): boolean {
  const match = addr.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return false;
  const prefix = match[1].toUpperCase();
  return ["X", "Y", "M", "T", "C", "S", "D"].includes(prefix);
}
