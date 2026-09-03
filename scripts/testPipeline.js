#!/usr/bin/env node

/**
 * End-to-End Pipeline Integration Test
 * Verifies the flow: User NL prompt → parseIntent() → structured intent object → generateLogic() → ladder JSON
 */

import { parseIntent } from '../ai/src/services/intentParser.js';
import { generateLogic } from '../ai/src/services/logicGenerator.js';

const testPrompt = "When Start is pressed, run the motor. Stop the motor when Stop or emergency stop is activated.";

console.log("=================================================");
console.log("SMARTLADDER END-TO-END PIPELINE INTEGRATION TEST");
console.log("=================================================");
console.log(`Input Prompt: "${testPrompt}"\n`);

try {
  // Step 1: Parse Intent
  console.log("Step 1: Running parseIntent(prompt)...");
  const intent = parseIntent(testPrompt);
  console.log("Parsed Intent Object:");
  console.log(JSON.stringify(intent, null, 2));

  // Assertions on Intent
  if (!intent || intent.type !== 'motor_control') {
    throw new Error(`FAIL: Expected intent.type to be 'motor_control', got '${intent?.type}'`);
  }
  if (!intent.start || !intent.stop || !intent.emergency || !intent.output) {
    throw new Error(`FAIL: Missing extracted addresses in intent: ${JSON.stringify(intent)}`);
  }

  // Step 2: Generate Logic
  console.log("\nStep 2: Running generateLogic(intent)...");
  const result = generateLogic(intent);
  console.log("Generated Logic Result:");
  console.log(JSON.stringify(result, null, 2));

  // Assertions on Generated Result
  if (!result || !Array.isArray(result.ladder) || result.ladder.length === 0) {
    throw new Error("FAIL: Ladder array is empty or undefined!");
  }

  const expectedLadder = [
    { type: 'contact', label: 'X0' },
    { type: 'contact_nc', label: 'X1' },
    { type: 'contact_nc', label: 'X2' },
    { type: 'coil', label: 'Y0' }
  ];

  if (result.ladder.length !== 4) {
    throw new Error(`FAIL: Expected 4 ladder blocks, got ${result.ladder.length}`);
  }

  for (let i = 0; i < expectedLadder.length; i++) {
    if (result.ladder[i].type !== expectedLadder[i].type || result.ladder[i].label !== expectedLadder[i].label) {
      throw new Error(`FAIL: Mismatch at ladder block index ${i}. Expected ${JSON.stringify(expectedLadder[i])}, got ${JSON.stringify(result.ladder[i])}`);
    }
  }

  if (!result.instructionList || !result.instructionList.includes("LD X0") || !result.instructionList.includes("OUT Y0")) {
    throw new Error(`FAIL: Invalid instructionList: ${result.instructionList}`);
  }

  if (!result.program || !Array.isArray(result.program.rungs) || result.program.rungs.length === 0) {
    throw new Error("FAIL: LadderProgram structure is missing or invalid!");
  }

  console.log("\n✅ INTEGRATION TEST PASSED! End-to-End pipeline is fully functional and valid.");
  process.exit(0);

} catch (error) {
  console.error(`\n❌ INTEGRATION TEST FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
