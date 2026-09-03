/**
 * Intermediate Representation (IR) Type Definitions for SmartLadder PLC Compiler
 * Strictly enforces safety constraints and schema structures before compilation.
 */

export interface BaseRungSchema {
  id: string;
  comment?: string;
}

/**
 * A. Safety Permissive Rung Schema
 * Maps NC safety input (e.g. X2) -> internal permissive coil (e.g. M0).
 * Contact type 'NC' is strictly forced in the type system.
 */
export interface SafetyPermissiveRungSchema extends BaseRungSchema {
  kind: 'safety_permissive';
  safetyInputAddress: string;    // e.g. "X2"
  permissiveCoilAddress: string; // e.g. "M0"
  contactType: 'NC';             // Force Normally Closed
}

/**
 * B. Motor Seal-In Rung Schema
 * Start (NO) + seal-in (OR Y0) + Stop (NC) + AND permissive coil (M0) -> output coil (Y0).
 */
export interface MotorSealInRungSchema extends BaseRungSchema {
  kind: 'motor_seal_in';
  startAddress: string;
  stopAddress: string;
  permissiveCoilAddress: string;
  outputCoilAddress: string;
  isMomentaryJog?: boolean;
}

/**
 * C. Motor Interlocked Rung Schema
 * Motor seal-in + AND requiredOutputAddress (interlock dependency).
 */
export interface MotorInterlockedRungSchema extends BaseRungSchema {
  kind: 'motor_interlocked';
  startAddress: string;
  stopAddress: string;
  permissiveCoilAddress: string;
  outputCoilAddress: string;
  requiredOutputAddress: string; // e.g. "Y0"
}

/**
 * D. Motor Mutex Pair Schema
 * Pair of motor rungs where Forward (Y0) and Reverse (Y1) interlock via ANI on opposite outputs.
 */
export interface MotorMutexPairSchema extends BaseRungSchema {
  kind: 'motor_mutex_pair';
  motorA: {
    name: string;
    startAddress: string;
    stopAddress: string;
    outputCoilAddress: string; // e.g. "Y0"
  };
  motorB: {
    name: string;
    startAddress: string;
    stopAddress: string;
    outputCoilAddress: string; // e.g. "Y1"
  };
  permissiveCoilAddress: string;
  oneSidedFaultTest?: boolean; // For validator rejection testing
}

/**
 * E. Timer Control Rung Schema
 */
export interface TimerControlRungSchema extends BaseRungSchema {
  kind: 'timer_control';
  triggerAddress: string;
  timerAddress: string;
  preset: string;
  outputCoilAddress: string;
}

/**
 * F. Counter Control Rung Schema
 */
export interface CounterControlRungSchema extends BaseRungSchema {
  kind: 'counter_control';
  triggerAddress: string;
  counterAddress: string;
  preset: string;
  outputCoilAddress: string;
}

export type RungSchema =
  | SafetyPermissiveRungSchema
  | MotorSealInRungSchema
  | MotorInterlockedRungSchema
  | MotorMutexPairSchema
  | TimerControlRungSchema
  | CounterControlRungSchema;

export interface ClarificationResult {
  status: 'needs_clarification';
  questions: string[];
  providedPrompt: string;
}
