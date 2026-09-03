/**
 * Deterministic PLC Behavioral Simulator for Mitsubishi FX / IEC 61131-3 Ladder Logic.
 * Strictly enforces scan-order semantics:
 * 1. Takes external input snapshot at start of scan.
 * 2. Seal-in contacts (e.g. OR Y0) read PREVIOUS scan output state (previousState).
 * 3. Intra-scan internal relays (e.g. Safety Permissive M0) computed in earlier rungs
 *    are available to subsequent rungs within the same scan.
 * 4. Outputs commit at the end of each scan.
 */
export function simulatePlcProgram(compiledLogic, inputSequence, initialState = {}) {
  if (!compiledLogic || !compiledLogic.program || !Array.isArray(compiledLogic.program.rungs)) {
    throw new Error('simulatePlcProgram requires a valid LogicGenerationResult with a compiled program.');
  }

  const program = compiledLogic.program;
  const scanHistory = [];

  const knownCoilAddresses = new Set();
  for (const rung of program.rungs) {
    if (rung.coils) {
      for (const coil of rung.coils) {
        knownCoilAddresses.add(coil.address);
      }
    }
  }

  let currentState = {};
  knownCoilAddresses.forEach((addr) => {
    currentState[addr] = Boolean(initialState[addr]);
  });

  for (let scanIdx = 0; scanIdx < inputSequence.length; scanIdx++) {
    const scanNumber = scanIdx + 1;
    const inputs = inputSequence[scanIdx] || {};

    const previousState = { ...currentState };
    const currentScanState = { ...previousState };
    const rungEvaluations = [];

    for (const rung of program.rungs) {
      const evalDetail = evaluateRung(rung, inputs, previousState, currentScanState);
      rungEvaluations.push(evalDetail);
      currentScanState[evalDetail.outputAddress] = evalDetail.evaluatedValue;
    }

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

function evaluateRung(rung, inputs, previousState, currentScanState) {
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
  const logs = [];

  if (outputAddress.startsWith('M')) {
    const firstBranch = rung.branchGroups[0];
    if (firstBranch && firstBranch.symbols && firstBranch.symbols.length > 0) {
      const safetySym = firstBranch.symbols[0];
      const safetyInputAddr = safetySym.address;
      const isInputActive = Boolean(inputs[safetyInputAddr]);

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

  let mainBranch = rung.branchGroups[0];
  let sealBranch = rung.branchGroups.length > 1 ? rung.branchGroups[1] : null;

  let startSym = mainBranch?.symbols?.find((s) => s.type === 'contact_no' && !s.isBranch);
  if (startSym) {
    startPressed = Boolean(inputs[startSym.address]);
  }

  let sealSym = sealBranch?.symbols?.find((s) => s.type === 'contact_no' && s.isBranch) ||
    mainBranch?.symbols?.find((s) => s.type === 'contact_no' && s.address === outputAddress);
  if (sealSym) {
    sealInRead = Boolean(previousState[outputAddress]);
  }

  orBranchPassed = startPressed || sealInRead;
  logs.push(`OR Branch: Start '${startSym?.address || 'N/A'}'=${startPressed}, Prev Seal-In '${outputAddress}'=${sealInRead} => OR Result=${orBranchPassed}`);

  let stopSym = mainBranch?.symbols?.find((s) => s.type === 'contact_nc' && s.address.startsWith('X') && s.address !== 'X2');
  if (stopSym) {
    const stopPressed = Boolean(inputs[stopSym.address]);
    stopConditionPassed = !stopPressed;
    logs.push(`Stop Condition: NC '${stopSym.address}'=${stopPressed ? 'ON (Pressed -> Breaks Power)' : 'OFF (Unpressed -> Passes Power)'} => Stop OK=${stopConditionPassed}`);
  }

  let permSym = mainBranch?.symbols?.find((s) => s.address.startsWith('M'));
  if (permSym) {
    const m0State = Boolean(currentScanState[permSym.address]);
    safetyPermissivePassed = m0State;
    logs.push(`Safety Permissive: Relay '${permSym.address}'=${m0State ? 'ACTIVE (Passes Power)' : 'INACTIVE (Tripped -> Blocks Power)'} => Safety OK=${safetyPermissivePassed}`);
  }

  let mutexSym = mainBranch?.symbols?.find((s) => s.type === 'contact_nc' && s.address.startsWith('Y') && s.address !== outputAddress);
  if (mutexSym) {
    const oppositeMotorActive = Boolean(currentScanState[mutexSym.address] || previousState[mutexSym.address]);
    mutexInterlockPassed = !oppositeMotorActive;
    logs.push(`Mutex Interlock: Opposite '${mutexSym.address}'=${oppositeMotorActive ? 'ON (Blocked)' : 'OFF (Allowed)'} => Mutex OK=${mutexInterlockPassed}`);
  }

  let reqSym = mainBranch?.symbols?.find((s) => s.type === 'contact_no' && s.address.startsWith('Y') && s.address !== outputAddress && !s.isBranch);
  let reqInterlockPassed = true;
  if (reqSym) {
    const upstreamActive = Boolean(currentScanState[reqSym.address] || previousState[reqSym.address]);
    reqInterlockPassed = upstreamActive;
    logs.push(`Sequential Interlock: Upstream '${reqSym.address}'=${upstreamActive ? 'ON (Allowed)' : 'OFF (Blocked)'} => Req OK=${reqInterlockPassed}`);
  }

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
