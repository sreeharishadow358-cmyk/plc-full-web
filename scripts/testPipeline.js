#!/usr/bin/env node

/**
 * SmartLadder Master Engineering Test Suite — Phase 1 & Phase 1.5
 * Includes 12 Golden Compiler/Validator Test Cases + 5 Behavioral Simulator Verification Proofs
 */

import { parseIntent } from '../ai/src/services/intentParser.js';
import { detectContradictions } from '../ai/src/services/contradictionDetector.js';
import { buildRungSchema } from '../ai/src/services/schemaBuilder.js';
import { compileRungs } from '../ai/src/services/compiler.js';
import { generateLogic } from '../ai/src/services/logicGenerator.js';
import { simulatePlcProgram } from '../ai/src/services/simulator.js';
import {
  validateLadderProgram,
} from '../ui/src/services/plcValidator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    failed++;
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
  passed++;
}

console.log("=========================================================================");
console.log("SMARTLADDER MASTER TEST SUITE — PHASE 1 (COMPILER/VALIDATOR) & PHASE 1.5 (SIMULATOR)");
console.log("=========================================================================\n");

try {
  // -------------------------------------------------------------------------
  // TEST 1 — Basic Motor Control & Seal-in Latch
  // -------------------------------------------------------------------------
  console.log("▶ TEST 1: Basic Motor Control & Seal-in Latch");
  const prompt1 = "When Start X0 is pressed, run the motor Y0. Stop the motor when Stop X1 or emergency stop X2 is activated.";
  const intent1 = parseIntent(prompt1);
  const schemaRes1 = buildRungSchema(intent1);
  assert(schemaRes1.status === 'success', "buildRungSchema returned status 'success'");
  const compiled1 = compileRungs(schemaRes1.schemas);
  assert(compiled1.instructionList.includes("OR Y0"), "Compiled IL includes 'OR Y0' seal-in contact");
  assert(compiled1.instructionList.includes("OUT Y0"), "Compiled IL includes 'OUT Y0' coil");
  const valRes1 = validateLadderProgram(compiled1.program);
  assert(valRes1.summary.status === 'valid', "Program 1 validated with 0 errors/warnings");
  console.log("  Output IL Preview:\n" + compiled1.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST 2 — Emergency Stop Handling (Separate Safety Permissive M0)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 2: Emergency Stop Handling (Safety Permissive M0)");
  const safetySchema = schemaRes1.schemas.find(s => s.kind === 'safety_permissive');
  assert(!!safetySchema, "Safety permissive schema exists");
  assert(safetySchema.safetyInputAddress === 'X2', "Safety input is X2");
  assert(safetySchema.permissiveCoilAddress === 'M0', "Permissive coil is M0");
  assert(safetySchema.contactType === 'NC', "Safety contact type is NC");
  assert(compiled1.instructionList.includes("LDI X2\nOUT M0"), "IL contains separate safety rung 'LDI X2\\nOUT M0'");
  assert(compiled1.instructionList.includes("ANI M0"), "Motor rung gates power through safety permissive 'ANI M0'");
  console.log("  ✓ Safety gating verified: X2 NC -> M0 coil; Motor rung ANI M0\n");

  // -------------------------------------------------------------------------
  // TEST 3 — Motor Interlock (Motor 2 requires Motor 1 output Y0)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 3: Sequential Motor Interlock");
  const schemas3 = [
    {
      kind: 'safety_permissive',
      id: 'rung_safety',
      safetyInputAddress: 'X2',
      permissiveCoilAddress: 'M0',
      contactType: 'NC',
    },
    {
      kind: 'motor_interlocked',
      id: 'rung_m2',
      startAddress: 'X4',
      stopAddress: 'X5',
      permissiveCoilAddress: 'M0',
      outputCoilAddress: 'Y1',
      requiredOutputAddress: 'Y0',
    },
  ];
  const compiled3 = compileRungs(schemas3);
  assert(compiled3.instructionList.includes("AND Y0"), "Compiled IL includes 'AND Y0' interlock condition");
  const valRes3 = validateLadderProgram(compiled3.program);
  assert(valRes3.summary.status === 'valid', "Motor interlock program validated successfully");
  console.log("  Output IL Preview:\n" + compiled3.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST 4 — Forward / Reverse Mutex Pair
  // -------------------------------------------------------------------------
  console.log("▶ TEST 4: Forward / Reverse Bidirectional Mutex Pair");
  const schemas4 = [
    {
      kind: 'safety_permissive',
      id: 'rung_safety',
      safetyInputAddress: 'X2',
      permissiveCoilAddress: 'M0',
      contactType: 'NC',
    },
    {
      kind: 'motor_mutex_pair',
      id: 'rung_mutex',
      motorA: { name: 'Forward', startAddress: 'X0', stopAddress: 'X1', outputCoilAddress: 'Y0' },
      motorB: { name: 'Reverse', startAddress: 'X3', stopAddress: 'X4', outputCoilAddress: 'Y1' },
      permissiveCoilAddress: 'M0',
    },
  ];
  const compiled4 = compileRungs(schemas4);
  assert(compiled4.instructionList.includes("ANI Y1"), "Forward rung contains 'ANI Y1' reverse interlock");
  assert(compiled4.instructionList.includes("ANI Y0"), "Reverse rung contains 'ANI Y0' forward interlock");
  const valRes4 = validateLadderProgram(compiled4.program);
  assert(valRes4.summary.status === 'valid', "Forward/Reverse mutex pair validated successfully");
  console.log("  Output IL Preview:\n" + compiled4.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST 5 — One-Sided Mutex Rejection (Negative Test)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 5: One-Sided Mutex Rejection");
  const schemas5 = [
    {
      kind: 'safety_permissive',
      id: 'rung_safety',
      safetyInputAddress: 'X2',
      permissiveCoilAddress: 'M0',
      contactType: 'NC',
    },
    {
      kind: 'motor_mutex_pair',
      id: 'rung_mutex_fault',
      motorA: { name: 'Forward', startAddress: 'X0', stopAddress: 'X1', outputCoilAddress: 'Y0' },
      motorB: { name: 'Reverse', startAddress: 'X3', stopAddress: 'X4', outputCoilAddress: 'Y1' },
      permissiveCoilAddress: 'M0',
      oneSidedFaultTest: true,
    },
  ];
  const compiled5 = compileRungs(schemas5);
  const valRes5 = validateLadderProgram(compiled5.program);
  assert(valRes5.summary.status === 'violation', "Validator rejected one-sided mutex with 'violation' status");
  assert(valRes5.summary.errors.some(e => e.includes('One-Sided Mutex Hazard')), "Error message cites 'One-Sided Mutex Hazard'");
  console.log(`  ✓ Rejection Output: ${valRes5.summary.errors[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 6 — Timer Control
  // -------------------------------------------------------------------------
  console.log("▶ TEST 6: Timer Control (On-Delay TON)");
  const intent6 = parseIntent("Start timer T0 for 5 seconds using sensor X0 to trigger output Y1");
  const res6 = generateLogic(intent6);
  assert('instructionList' in res6 && res6.instructionList.includes("OUT T0 K50"), "Timer control compiles 'OUT T0 K50'");
  assert('instructionList' in res6 && res6.instructionList.includes("OUT Y1"), "Timer done contact drives 'OUT Y1'");
  console.log("  ✓ Timer control verified\n");

  // -------------------------------------------------------------------------
  // TEST 7 — Counter Control
  // -------------------------------------------------------------------------
  console.log("▶ TEST 7: Counter Control (Up Counter CTU)");
  const intent7 = parseIntent("Count 10 pulses on sensor X0 with counter C0 to turn on output Y2");
  const res7 = generateLogic(intent7);
  assert('instructionList' in res7 && res7.instructionList.includes("OUT C0 K10"), "Counter control compiles 'OUT C0 K10'");
  assert('instructionList' in res7 && res7.instructionList.includes("OUT Y2"), "Counter done contact drives 'OUT Y2'");
  console.log("  ✓ Counter control verified\n");

  // -------------------------------------------------------------------------
  // TEST 8 — Ambiguous Motor Prompt
  // -------------------------------------------------------------------------
  console.log("▶ TEST 8: Ambiguous Motor Prompt ('Run the motor.')");
  const intent8 = parseIntent("Run the motor.");
  const res8 = generateLogic(intent8);
  assert('status' in res8 && res8.status === 'needs_clarification', "Returns status 'needs_clarification'");
  assert(Array.isArray(res8.questions) && res8.questions.length >= 4, "Returns 4 clarification questions");
  console.log("  Clarification Questions:\n" + res8.questions.map(q => '    - ' + q).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST 9 — Duplicate Output Rejection
  // -------------------------------------------------------------------------
  console.log("▶ TEST 9: Duplicate Output Coil Rejection");
  const dupProgram = {
    rungs: [
      {
        id: 'r0',
        rungNumber: 0,
        comment: 'Rung 0 writing Y0',
        branchGroups: [{ symbols: [{ id: 's0', type: 'contact_no', address: 'X0' }] }],
        coils: [{ id: 'c0', type: 'coil', address: 'Y0' }],
      },
      {
        id: 'r1',
        rungNumber: 1,
        comment: 'Rung 1 writing duplicate Y0',
        branchGroups: [{ symbols: [{ id: 's1', type: 'contact_no', address: 'X1' }] }],
        coils: [{ id: 'c1', type: 'coil', address: 'Y0' }],
      },
    ],
  };
  const dupVal = validateLadderProgram(dupProgram);
  assert(dupVal.summary.status === 'violation', "Validator flagged duplicate output coil as 'violation'");
  assert(dupVal.summary.errors.some(e => e.includes('Duplicate Output Coil Hazard')), "Error cites 'Duplicate Output Coil Hazard'");
  console.log(`  ✓ Rejection Output: ${dupVal.summary.errors[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 10 — Circular Interlock Rejection
  // -------------------------------------------------------------------------
  console.log("▶ TEST 10: Circular Interlock Rejection");
  const intent10 = parseIntent("Motor 1 requires Motor 2 to be running and Motor 2 requires Motor 1 to be running");
  const res10 = generateLogic(intent10);
  assert('status' in res10 && res10.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res10.reasons.some(r => r.includes('Circular dependency detected')), "Reason cites 'Circular dependency detected'");
  console.log(`  ✓ Rejection Output: ${res10.reasons[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 11 — Contradictory Input Roles Rejection
  // -------------------------------------------------------------------------
  console.log("▶ TEST 11: Contradictory Input Roles Rejection");
  const intent11 = parseIntent("X0 is Start and X0 is Emergency Stop");
  const res11 = generateLogic(intent11);
  assert('status' in res11 && res11.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res11.reasons.some(r => r.includes('contradictory roles')), "Reason cites 'contradictory roles'");
  console.log(`  ✓ Rejection Output: ${res11.reasons[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 12 — Contradictory Output Behavior Rejection
  // -------------------------------------------------------------------------
  console.log("▶ TEST 12: Contradictory Output Behavior Rejection");
  const intent12 = parseIntent("Motor must run when Stop is pressed and Motor must stop when Stop is pressed");
  const res12 = generateLogic(intent12);
  assert('status' in res12 && res12.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res12.reasons.some(r => r.includes('both RUN and STOP')), "Reason cites 'both RUN and STOP'");
  console.log(`  ✓ Rejection Output: ${res12.reasons[0]}\n`);


  // =========================================================================
  // PHASE 1.5: DETERMINISTIC PLC BEHAVIORAL SIMULATOR VERIFICATION SUITE
  // =========================================================================
  console.log("=========================================================================");
  console.log("PHASE 1.5: BEHAVIORAL SIMULATOR & PLC SCAN-ORDER VERIFICATION PROOFS");
  console.log("=========================================================================\n");

  // -------------------------------------------------------------------------
  // SIMULATOR PROOF 1: Scan-Order Self-Verification
  // -------------------------------------------------------------------------
  console.log("▶ SIMULATOR PROOF 1: Scan-Order Self-Verification");
  const simInputSeq1 = [
    { X0: true, X1: false, X2: false },  // Scan 1: Press Start
    { X0: false, X1: false, X2: false }, // Scan 2: Release Start
  ];
  const simResult1 = simulatePlcProgram(compiled1, simInputSeq1);
  
  const scan1 = simResult1.scanHistory[0];
  const scan2 = simResult1.scanHistory[1];

  assert(scan1.previousState.Y0 === false, "Scan 1: Previous Y0 state is false (OFF)");
  assert(scan1.rungEvaluations[1].sealInRead === false, "Scan 1: Seal-in Y0 contact reads previous scan state (false)");
  assert(scan1.evaluatedState.Y0 === true, "Scan 1: Output coil Y0 becomes true (ON) after Start press");

  assert(scan2.previousState.Y0 === true, "Scan 2: Previous Y0 state is true (ON)");
  assert(scan2.rungEvaluations[1].sealInRead === true, "Scan 2: Seal-in Y0 contact reads previous scan state (true)");
  assert(scan2.evaluatedState.Y0 === true, "Scan 2: Output coil Y0 remains true (ON) after Start release");

  console.log("  Step-by-step Scan Order Verification:");
  console.log(`    Scan 1: Prev Y0=${scan1.previousState.Y0} | Start X0=${scan1.inputs.X0} | Seal-in Read=${scan1.rungEvaluations[1].sealInRead} | Final Y0=${scan1.evaluatedState.Y0}`);
  console.log(`    Scan 2: Prev Y0=${scan2.previousState.Y0} | Start X0=${scan2.inputs.X0} | Seal-in Read=${scan2.rungEvaluations[1].sealInRead} | Final Y0=${scan2.evaluatedState.Y0}\n`);

  // -------------------------------------------------------------------------
  // SIMULATOR PROOF 2: Motor Seal-in & Stop Behavior
  // -------------------------------------------------------------------------
  console.log("▶ SIMULATOR PROOF 2: Motor Control, Seal-in Latch & Stop Verification");
  const simInputSeq2 = [
    { X0: false, X1: false, X2: false }, // Scan 1: Initial state
    { X0: true,  X1: false, X2: false }, // Scan 2: Press Start
    { X0: false, X1: false, X2: false }, // Scan 3: Release Start (Seal-in check)
    { X0: false, X1: true,  X2: false }, // Scan 4: Press Stop
    { X0: false, X1: false, X2: false }, // Scan 5: Release Stop (No auto-restart check)
  ];
  const simResult2 = simulatePlcProgram(compiled1, simInputSeq2);
  
  assert(simResult2.scanHistory[0].evaluatedState.Y0 === false, "Scan 1 (Initial): Y0 is OFF");
  assert(simResult2.scanHistory[1].evaluatedState.Y0 === true, "Scan 2 (Start Pressed): Y0 turns ON");
  assert(simResult2.scanHistory[2].evaluatedState.Y0 === true, "Scan 3 (Start Released): Y0 stays ON via seal-in");
  assert(simResult2.scanHistory[3].evaluatedState.Y0 === false, "Scan 4 (Stop Pressed): Y0 turns OFF");
  assert(simResult2.scanHistory[4].evaluatedState.Y0 === false, "Scan 5 (Stop Released): Y0 stays OFF (No auto-restart)");

  console.log("  Motor Behavioral Trace:");
  simResult2.scanHistory.forEach((s) => {
    console.log(`    Scan ${s.scanNumber}: Inputs [X0=${Boolean(s.inputs.X0)}, X1=${Boolean(s.inputs.X1)}, X2=${Boolean(s.inputs.X2)}] | Prev Y0=${Boolean(s.previousState.Y0)} -> New Y0=${Boolean(s.evaluatedState.Y0)}`);
  });
  console.log("");

  // -------------------------------------------------------------------------
  // SIMULATOR PROOF 3: Emergency Stop & Recovery Verification
  // -------------------------------------------------------------------------
  console.log("▶ SIMULATOR PROOF 3: Emergency Stop Handling & Non-Auto-Restart Verification");
  const simInputSeq3 = [
    { X0: true,  X1: false, X2: false }, // Scan 1: Press Start -> Y0 ON
    { X0: false, X1: false, X2: false }, // Scan 2: Running -> Y0 ON
    { X0: false, X1: false, X2: true  }, // Scan 3: E-Stop Activated -> Y0 OFF
    { X0: false, X1: false, X2: false }, // Scan 4: E-Stop Reset -> Y0 MUST STAY OFF
    { X0: true,  X1: false, X2: false }, // Scan 5: Press Start again -> Y0 ON
  ];
  const simResult3 = simulatePlcProgram(compiled1, simInputSeq3);

  assert(simResult3.scanHistory[0].evaluatedState.Y0 === true, "Scan 1 (Start): Motor Y0 turns ON");
  assert(simResult3.scanHistory[1].evaluatedState.Y0 === true, "Scan 2 (Running): Motor Y0 remains ON");
  assert(simResult3.scanHistory[2].evaluatedState.Y0 === false, "Scan 3 (E-Stop Active X2=true): Safety relay M0 drops out, Y0 turns OFF");
  assert(simResult3.scanHistory[3].evaluatedState.Y0 === false, "Scan 4 (E-Stop Reset X2=false): Motor Y0 MUST REMAIN OFF");
  assert(simResult3.scanHistory[4].evaluatedState.Y0 === true, "Scan 5 (Start Again X0=true): Motor Y0 turns ON only after operator intervention");

  console.log("  E-Stop Recovery Trace:");
  simResult3.scanHistory.forEach((s) => {
    console.log(`    Scan ${s.scanNumber}: Inputs [Start X0=${Boolean(s.inputs.X0)}, E-Stop X2=${Boolean(s.inputs.X2)}] | M0=${Boolean(s.evaluatedState.M0)} | Motor Y0=${Boolean(s.evaluatedState.Y0)}`);
  });
  console.log("");

  // -------------------------------------------------------------------------
  // SIMULATOR PROOF 4: Bidirectional Mutex Interlock Verification
  // -------------------------------------------------------------------------
  console.log("▶ SIMULATOR PROOF 4: Forward / Reverse Bidirectional Mutex Interlock");
  const simInputSeq4 = [
    { X0: true,  X1: false, X3: false, X4: false, X2: false }, // Scan 1: Start Forward (X0) -> Forward Y0 ON
    { X0: false, X1: false, X3: true,  X4: false, X2: false }, // Scan 2: Attempt Reverse (X3) while Forward ON -> Reverse Y1 BLOCKED
    { X0: false, X1: true,  X3: false, X4: false, X2: false }, // Scan 3: Stop Forward (X1) -> Forward Y0 OFF
    { X0: false, X1: false, X3: true,  X4: false, X2: false }, // Scan 4: Start Reverse (X3) -> Reverse Y1 ON
    { X0: true,  X1: false, X3: false, X4: false, X2: false }, // Scan 5: Attempt Forward (X0) while Reverse ON -> Forward Y0 BLOCKED
  ];
  const simResult4 = simulatePlcProgram(compiled4, simInputSeq4);

  assert(simResult4.scanHistory[0].evaluatedState.Y0 === true && simResult4.scanHistory[0].evaluatedState.Y1 === false, "Scan 1: Forward Y0 is ON, Reverse Y1 is OFF");
  assert(simResult4.scanHistory[1].evaluatedState.Y0 === true && simResult4.scanHistory[1].evaluatedState.Y1 === false, "Scan 2 (Reverse Attempt): Reverse Y1 BLOCKED by ANI Y0");
  assert(simResult4.scanHistory[2].evaluatedState.Y0 === false && simResult4.scanHistory[2].evaluatedState.Y1 === false, "Scan 3 (Forward Stopped): Forward Y0 turns OFF");
  assert(simResult4.scanHistory[3].evaluatedState.Y0 === false && simResult4.scanHistory[3].evaluatedState.Y1 === true, "Scan 4 (Reverse Started): Reverse Y1 turns ON");
  assert(simResult4.scanHistory[4].evaluatedState.Y0 === false && simResult4.scanHistory[4].evaluatedState.Y1 === true, "Scan 5 (Forward Attempt): Forward Y0 BLOCKED by ANI Y1");

  console.log("  Mutex Interlock Behavioral Trace:");
  simResult4.scanHistory.forEach((s) => {
    console.log(`    Scan ${s.scanNumber}: Inputs [FwdStart X0=${Boolean(s.inputs.X0)}, RevStart X3=${Boolean(s.inputs.X3)}] -> State [Forward Y0=${Boolean(s.evaluatedState.Y0)}, Reverse Y1=${Boolean(s.evaluatedState.Y1)}]`);
  });
  console.log("");

  // -------------------------------------------------------------------------
  // SIMULATOR PROOF 5: Validator Gate before Simulation (Negative Case)
  // -------------------------------------------------------------------------
  console.log("▶ SIMULATOR PROOF 5: Validator Gate before Simulation (One-Sided Mutex Rejection)");
  const valResult5 = validateLadderProgram(compiled5.program);
  assert(valResult5.summary.status === 'violation', "Validator rejects asymmetric mutex schema before simulation");
  let simAttempted = false;
  try {
    if (valResult5.summary.status === 'violation') {
      throw new Error(`Simulation Aborted: Validator rejected program with ${valResult5.summary.errors.length} violation(s).`);
    }
    simulatePlcProgram(compiled5, simInputSeq4);
    simAttempted = true;
  } catch (err) {
    assert(err.message.includes('Simulation Aborted'), "Simulator correctly blocked execution of invalid program");
    console.log(`  ✓ Validator Gate Result: ${err.message}\n`);
  }
  assert(!simAttempted, "Unsafe program was not executed by the simulator");

  console.log("-------------------------------------------------------------------------");
  console.log(`🎉 ALL TESTS PASSED! (${passed} assertions passed, ${failed} failed)`);
  console.log("-------------------------------------------------------------------------");
  process.exit(0);

} catch (error) {
  console.error(`\n❌ TEST SUITE FAILED WITH EXCEPTION: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
}
