import { LogicGenerationResult, LadderProgram, LadderRung } from './logicGenerator';

export interface PlcScanInput {
  scanNumber: number;
  inputs: Record<string, boolean>;
}

export interface RungEvaluationDetail {
  rungId: string;
  rungNumber: number;
  comment?: string;
  outputAddress: string;
  previousOutputValue: boolean;
  evaluatedValue: boolean;
  startPressed?: boolean;
  sealInRead?: boolean;
  orBranchPassed?: boolean;
  stopConditionPassed?: boolean;
  safetyPermissivePassed?: boolean;
  mutexInterlockPassed?: boolean;
  detailsLog: string;
}

export interface PlcScanState {
  scanNumber: number;
  inputs: Record<string, boolean>;
  previousState: Record<string, boolean>;
  evaluatedState: Record<string, boolean>;
  rungEvaluations: RungEvaluationDetail[];
}

export interface SimulationResult {
  scanHistory: PlcScanState[];
  finalState: Record<string, boolean>;
}

/**
 * Deterministic PLC Behavioral Simulator for Mitsubishi FX / IEC 61131-3 Ladder Logic.
 * Strictly enforces scan-order semantics:
 * 1. Takes external input snapshot at start of scan.
 * 2. Seal-in contacts (e.g. OR Y0) read PREVIOUS scan output state (previousState).
 * 3. Intra-scan internal relays (e.g. Safety Permissive M0) computed in earlier rungs
 *    are available to subsequent rungs within the same scan.
 * 4. Outputs commit at the end of each scan.
 */
export function simulatePlcProgram(
  compiledLogic: LogicGenerationResult,
  inputSequence: Array<Record<string, boolean>>,
  initialState: Record<string, boolean> = {}
): SimulationResult {
  if (!compiledLogic || !compiledLogic.program || !Array.isArray(compiledLogic.program.rungs)) {
    throw new Error('simulatePlcProgram requires a valid LogicGenerationResult with a compiled program.');
  }

  const program: LadderProgram = compiledLogic.program;
  const scanHistory: PlcScanState[] = [];

  // Extract all output addresses used across all rungs
  const knownCoilAddresses = new Set<string>();
  for (const rung of program.rungs) {
    if (rung.coils) {
      for (const coil of rung.coils) {
        knownCoilAddresses.add(coil.address);
      }
    }
  }

  // Initialize known outputs to false if not explicitly set in initialState
  let currentState: Record<string, boolean> = {};
  knownCoilAddresses.forEach((addr) => {
    currentState[addr] = Boolean(initialState[addr]);
  });

  for (let scanIdx = 0; scanIdx < inputSequence.length; scanIdx++) {
    const scanNumber = scanIdx + 1;
    const inputs = inputSequence[scanIdx] || {};

    // 1. Snapshot previous state at start of scan
    const previousState: Record<string, boolean> = { ...currentState };

    // 2. State working buffer for current scan
    const currentScanState: Record<string, boolean> = { ...previousState };

    const rungEvaluations: RungEvaluationDetail[] = [];

    // 3. Evaluate rungs in sequential scan order
    for (const rung of program.rungs) {
      const evalDetail = evaluateRung(rung, inputs, previousState, currentScanState);
      rungEvaluations.push(evalDetail);

      // Commit rung output coil value to current scan working state
      currentScanState[evalDetail.outputAddress] = evalDetail.evaluatedValue;
    }

    // 4. Update state at end of scan
    currentState = { ...currentScanState };

    scanHistory.push({
      scanNumber,
      inputs: { ...inputs },
      previousState: { ...previousState },
      evaluatedState: { ...currentState },
      rungEvaluations,
    });
  }

  return {
    scanHistory,
    finalState: currentState,
  };
}

/**
 * Evaluates a single LadderRung using scan inputs, previous scan state, and current scan working state.
 */
function evaluateRung(
  rung: LadderRung,
  inputs: Record<string, boolean>,
  previousState: Record<string, boolean>,
  currentScanState: Record<string, boolean>
): RungEvaluationDetail {
  const outputCoil = rung.coils && rung.coils.length > 0 ? rung.coils[0] : null;
  const outputAddress = outputCoil ? outputCoil.address : `RUNG_${rung.rungNumber}_OUT`;
  const previousOutputValue = Boolean(previousState[outputAddress]);

  let evaluatedValue = false;
  let startPressed = false;
  let sealInRead = false;
  let orBranchPassed = false;
  let stopConditionPassed = true;
  let safetyPermissivePassed = true;
  let mutexInterlockPassed = true;
  const logs: string[] = [];

  // A. Safety Permissive Rung (e.g. X2 NC -> M0 coil)
  if (outputAddress.startsWith('M')) {
    const firstBranch = rung.branchGroups[0];
    if (firstBranch && firstBranch.symbols && firstBranch.symbols.length > 0) {
      const safetySym = firstBranch.symbols[0];
      const safetyInputAddr = safetySym.address;
      const isInputActive = Boolean(inputs[safetyInputAddr]);

      // NC contact is TRUE when physical input is OFF (false/unpressed/healthy)
      if (safetySym.type === 'contact_nc') {
        evaluatedValue = !isInputActive;
        logs.push(
          `Safety Permissive Rung: Input '${safetyInputAddr}' is ${isInputActive ? 'ON (Tripped)' : 'OFF (Healthy)'}. NC contact -> M0 = ${evaluatedValue}`
        );
      } else {
        evaluatedValue = isInputActive;
        logs.push(`Safety Permissive Rung: Input '${safetyInputAddr}' -> M0 = ${evaluatedValue}`);
      }
    } else {
      evaluatedValue = true;
    }

    return {
      rungId: rung.id,
      rungNumber: rung.rungNumber,
      comment: rung.comment,
      outputAddress,
      previousOutputValue,
      evaluatedValue,
      detailsLog: logs.join(' | '),
    };
  }

  // B. Standard Motor / Interlock / Mutex Rung Evaluation
  let mainBranch = rung.branchGroups[0];
  let sealBranch = rung.branchGroups.length > 1 ? rung.branchGroups[1] : null;

  // 1. Evaluate Start Pushbutton (NO Contact)
  let startSym = mainBranch?.symbols?.find((s) => s.type === 'contact_no' && !s.isBranch);
  if (startSym) {
    startPressed = Boolean(inputs[startSym.address]);
  }

  // 2. Evaluate Seal-In Contact (NO Contact referencing previous output state)
  let sealSym = sealBranch?.symbols?.find((s) => s.type === 'contact_no' && s.isBranch) ||
    mainBranch?.symbols?.find((s) => s.type === 'contact_no' && s.address === outputAddress);
  if (sealSym) {
    sealInRead = Boolean(previousState[outputAddress]);
  }

  // OR Branch Result = Start Pressed OR Previous Seal-In Active
  orBranchPassed = startPressed || sealInRead;
  logs.push(`OR Branch: Start '${startSym?.address || 'N/A'}'=${startPressed}, Prev Seal-In '${outputAddress}'=${sealInRead} => OR Result=${orBranchPassed}`);

  // 3. Evaluate Series Stop Pushbutton (NC Contact)
  let stopSym = mainBranch?.symbols?.find((s) => s.type === 'contact_nc' && s.address.startsWith('X') && s.address !== 'X2');
  if (stopSym) {
    const stopPressed = Boolean(inputs[stopSym.address]);
    stopConditionPassed = !stopPressed; // NC contact passes power when Stop is NOT pressed
    logs.push(`Stop Condition: NC '${stopSym.address}'=${stopPressed ? 'ON (Pressed -> Breaks Power)' : 'OFF (Unpressed -> Passes Power)'} => Stop OK=${stopConditionPassed}`);
  }

  // 4. Evaluate Safety Permissive Relay (e.g. M0)
  let permSym = mainBranch?.symbols?.find((s) => s.address.startsWith('M'));
  if (permSym) {
    const m0State = Boolean(currentScanState[permSym.address]);
    safetyPermissivePassed = m0State;
    logs.push(`Safety Permissive: Relay '${permSym.address}'=${m0State ? 'ACTIVE (Passes Power)' : 'INACTIVE (Tripped -> Blocks Power)'} => Safety OK=${safetyPermissivePassed}`);
  }

  // 5. Evaluate Mutex Interlock Contact (NC Contact referencing opposite motor output)
  let mutexSym = mainBranch?.symbols?.find((s) => s.type === 'contact_nc' && s.address.startsWith('Y') && s.address !== outputAddress);
  if (mutexSym) {
    const oppositeMotorActive = Boolean(currentScanState[mutexSym.address] || previousState[mutexSym.address]);
    mutexInterlockPassed = !oppositeMotorActive;
    logs.push(`Mutex Interlock: Opposite '${mutexSym.address}'=${oppositeMotorActive ? 'ON (Blocked)' : 'OFF (Allowed)'} => Mutex OK=${mutexInterlockPassed}`);
  }

  // 6. Evaluate Sequential Required Interlock (NO Contact referencing upstream motor output)
  let reqSym = mainBranch?.symbols?.find((s) => s.type === 'contact_no' && s.address.startsWith('Y') && s.address !== outputAddress && !s.isBranch);
  let reqInterlockPassed = true;
  if (reqSym) {
    const upstreamActive = Boolean(currentScanState[reqSym.address] || previousState[reqSym.address]);
    reqInterlockPassed = upstreamActive;
    logs.push(`Sequential Interlock: Upstream '${reqSym.address}'=${upstreamActive ? 'ON (Allowed)' : 'OFF (Blocked)'} => Req OK=${reqInterlockPassed}`);
  }

  // Final Rung Output Coil State = OR_Branch && Stop_OK && Safety_OK && Mutex_OK && Req_OK
  evaluatedValue = orBranchPassed && stopConditionPassed && safetyPermissivePassed && mutexInterlockPassed && reqInterlockPassed;
  logs.push(`Final Coil '${outputAddress}' = ${evaluatedValue}`);

  return {
    rungId: rung.id,
    rungNumber: rung.rungNumber,
    comment: rung.comment,
    outputAddress,
    previousOutputValue,
    evaluatedValue,
    startPressed,
    sealInRead,
    orBranchPassed,
    stopConditionPassed,
    safetyPermissivePassed,
    mutexInterlockPassed,
    detailsLog: logs.join(' | '),
  };
}
