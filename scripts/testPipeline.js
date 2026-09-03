#!/usr/bin/env node

/**
 * SmartLadder Master Engineering Test Suite — 12 Golden Test Cases
 * Verifies End-to-End Pipeline: parseIntent -> detectContradictions -> buildRungSchema -> compileRungs -> validateLadderProgram
 */

import { parseIntent } from '../ai/src/services/intentParser.js';
import { detectContradictions } from '../ai/src/services/contradictionDetector.js';
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
console.log("SMARTLADDER 12 GOLDEN TEST SUITE — SEMANTIC & SAFETY VALIDATION");
console.log("=========================================================================\n");

try {
  // -------------------------------------------------------------------------
  // TEST 1 — Basic Motor Seal-In
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
  // TEST 9 — Duplicate Output Rejection (Negative Test)
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
  // TEST 10 — Circular Interlock Rejection (Negative Test)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 10: Circular Interlock Rejection");
  const intent10 = parseIntent("Motor 1 requires Motor 2 to be running and Motor 2 requires Motor 1 to be running");
  const res10 = generateLogic(intent10);
  assert('status' in res10 && res10.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res10.reasons.some(r => r.includes('Circular dependency detected')), "Reason cites 'Circular dependency detected'");
  console.log(`  ✓ Rejection Output: ${res10.reasons[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 11 — Contradictory Input Roles (Negative Test)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 11: Contradictory Input Roles Rejection");
  const intent11 = parseIntent("X0 is Start and X0 is Emergency Stop");
  const res11 = generateLogic(intent11);
  assert('status' in res11 && res11.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res11.reasons.some(r => r.includes('contradictory roles')), "Reason cites 'contradictory roles'");
  console.log(`  ✓ Rejection Output: ${res11.reasons[0]}\n`);

  // -------------------------------------------------------------------------
  // TEST 12 — Contradictory Output Behavior (Negative Test)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 12: Contradictory Output Behavior Rejection");
  const intent12 = parseIntent("Motor must run when Stop is pressed and Motor must stop when Stop is pressed");
  const res12 = generateLogic(intent12);
  assert('status' in res12 && res12.status === 'generation_rejected', "Contradiction detector returned 'generation_rejected'");
  assert(res12.reasons.some(r => r.includes('both RUN and STOP')), "Reason cites 'both RUN and STOP'");
  console.log(`  ✓ Rejection Output: ${res12.reasons[0]}\n`);

  console.log("-------------------------------------------------------------------------");
  console.log(`🎉 ALL 12 GOLDEN TEST CASES PASSED! (${passed} assertions passed, ${failed} failed)`);
  console.log("-------------------------------------------------------------------------");
  process.exit(0);

} catch (error) {
  console.error(`\n❌ TEST SUITE FAILED WITH EXCEPTION: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
}
