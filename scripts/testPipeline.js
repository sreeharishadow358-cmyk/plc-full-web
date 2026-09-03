#!/usr/bin/env node

import { parseIntent } from '../ai/src/services/intentParser.js';
import { buildRungSchema } from '../ai/src/services/schemaBuilder.js';
import { compileRungs } from '../ai/src/services/compiler.js';
import { generateLogic } from '../ai/src/services/logicGenerator.js';
import {
  validateLadderProgram,
  rejectMissingSealIn,
  rejectSafetyInputWiredNormallyOpen,
  rejectOneSidedMutexInterlock,
  rejectDuplicateOutputCoil,
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
console.log("SMARTLADDER PHASE 1 MASTER TEST SUITE — IR COMPILER & VALIDATOR");
console.log("=========================================================================\n");

try {
  // -------------------------------------------------------------------------
  // TEST A — Basic Motor Control (Safety Permissive M0 + Seal-in Latch Y0)
  // -------------------------------------------------------------------------
  console.log("▶ TEST A: Basic Motor Control (Safety Permissive & Seal-in Latch)");
  const promptA = "When Start X0 is pressed, run the motor Y0. Stop the motor when Stop X1 or emergency stop X2 is activated.";
  const intentA = parseIntent(promptA);
  const schemaResA = buildRungSchema(intentA);

  assert(schemaResA.status === 'success', "buildRungSchema returned status 'success'");
  const schemasA = schemaResA.schemas;
  assert(schemasA.length === 2, "Schema contains 2 rungs (Safety Permissive + Motor Control)");

  const safetySchemaA = schemasA.find(s => s.kind === 'safety_permissive');
  assert(!!safetySchemaA, "Safety permissive schema exists");
  assert(safetySchemaA.safetyInputAddress === 'X2', "Safety input is X2");
  assert(safetySchemaA.permissiveCoilAddress === 'M0', "Permissive coil is M0");
  assert(safetySchemaA.contactType === 'NC', "Safety contact type is NC");

  const motorSchemaA = schemasA.find(s => s.kind === 'motor_seal_in');
  assert(!!motorSchemaA, "Motor seal-in schema exists");
  assert(motorSchemaA.startAddress === 'X0', "Start address is X0");
  assert(motorSchemaA.stopAddress === 'X1', "Stop address is X1");
  assert(motorSchemaA.permissiveCoilAddress === 'M0', "Motor rung uses M0 permissive coil");
  assert(motorSchemaA.outputCoilAddress === 'Y0', "Output coil is Y0");

  const compiledA = compileRungs(schemasA);
  assert(!!compiledA.program && compiledA.program.rungs.length === 2, "Compiled program contains 2 rungs");
  assert(compiledA.instructionList.includes("LDI X2\nOUT M0"), "IL contains 'LDI X2\\nOUT M0'");
  assert(compiledA.instructionList.includes("LD X0\nOR Y0\nANI X1\nANI M0\nOUT Y0"), "IL contains motor seal-in and M0 gating");

  const valResA = validateLadderProgram(compiledA.program);
  assert(valResA.summary.status === 'valid', "Program A passed validation with 0 errors/warnings");
  console.log("  Output IL Preview:\n" + compiledA.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST B — Sequential Interlock (Motor 2 requires Motor 1 output Y0)
  // -------------------------------------------------------------------------
  console.log("▶ TEST B: Sequential Motor Interlock");
  const schemasB = [
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

  const compiledB = compileRungs(schemasB);
  assert(compiledB.instructionList.includes("AND Y0"), "Compiled IL includes 'AND Y0' interlock check");
  const valResB = validateLadderProgram(compiledB.program);
  if (valResB.summary.status !== 'valid') {
    console.log("valResB summary:", valResB.summary);
  }
  assert(valResB.summary.status === 'valid', "Interlocked program B validated successfully");
  console.log("  Output IL Preview:\n" + compiledB.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST C — Mutex Pair (Forward Y0 / Reverse Y1 Mutual Interlock)
  // -------------------------------------------------------------------------
  console.log("▶ TEST C: Mutually Exclusive Pair (Forward / Reverse)");
  const schemasC = [
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

  const compiledC = compileRungs(schemasC);
  assert(compiledC.instructionList.includes("ANI Y1"), "Rung A contains 'ANI Y1'");
  assert(compiledC.instructionList.includes("ANI Y0"), "Rung B contains 'ANI Y0'");
  const valResC = validateLadderProgram(compiledC.program);
  if (valResC.summary.status !== 'valid') {
    console.log("valResC summary:", valResC.summary);
  }
  assert(valResC.summary.status === 'valid', "Mutex pair C passed validation");
  console.log("  Output IL Preview:\n" + compiledC.instructionList.split('\n').map(l => '    ' + l).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // TEST C-NEGATIVE — One-Sided Mutex Construction (MUST BE REJECTED)
  // -------------------------------------------------------------------------
  console.log("▶ TEST C-NEGATIVE: One-Sided Mutex Construction (Must be Rejected)");
  const schemasCNeg = [
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

  const compiledCNeg = compileRungs(schemasCNeg);
  const valResCNeg = validateLadderProgram(compiledCNeg.program);
  assert(valResCNeg.summary.status === 'violation', "Validator flagged status as 'violation'");
  assert(valResCNeg.summary.errors.some(e => e.includes('One-Sided Mutex Hazard')), "Error message explicitly cites 'One-Sided Mutex Hazard'");
  console.log(`  ✓ Rejection Output: ${valResCNeg.summary.errors[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST D — Ambiguous Prompt ("Run the motor.")
  // -------------------------------------------------------------------------
  console.log("▶ TEST D: Ambiguous Prompt ('Run the motor.')");
  const intentD = parseIntent("Run the motor.");
  const schemaResD = buildRungSchema(intentD);
  assert(schemaResD.status === 'needs_clarification', "status is 'needs_clarification'");
  assert(Array.isArray(schemaResD.questions) && schemaResD.questions.length >= 4, "Returns 4 clarification questions");

  const genResD = generateLogic(intentD);
  assert(genResD.status === 'needs_clarification', "generateLogic returns needs_clarification result without producing ladder");
  console.log("  Clarification Questions:\n" + schemaResD.questions.map(q => '    - ' + q).join('\n') + "\n");

  // -------------------------------------------------------------------------
  // REGRESSION TESTS — Timer, Counter, Conveyor
  // -------------------------------------------------------------------------
  console.log("▶ REGRESSION TESTS: Timer, Counter, Conveyor Interlock");
  const intentTimer = parseIntent("Start timer T0 for 5 seconds using sensor X0 to trigger output Y1");
  const resTimer = generateLogic(intentTimer);
  assert('instructionList' in resTimer && resTimer.instructionList.includes("OUT T0 K50"), "Timer control compiles correctly");

  const intentCounter = parseIntent("Count 10 pulses on sensor X0 with counter C0 to turn on output Y2");
  const resCounter = generateLogic(intentCounter);
  assert('instructionList' in resCounter && resCounter.instructionList.includes("OUT C0 K10"), "Counter control compiles correctly");

  const intentConv = parseIntent("Start conveyor Y0 with button X0 and clearance sensor X3, stop with X1, emergency X2");
  const resConv = generateLogic(intentConv);
  assert('instructionList' in resConv && resConv.instructionList.includes("AND X3"), "Conveyor interlock compiles correctly");

  console.log("-------------------------------------------------------------------------");
  console.log(`🎉 ALL TESTS PASSED! (${passed} assertions passed, ${failed} failed)`);
  console.log("-------------------------------------------------------------------------");
  process.exit(0);

} catch (error) {
  console.error(`\n❌ TEST SUITE FAILED WITH EXCEPTION: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
}
