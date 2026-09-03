import { ParsedIntent } from './intentParser';

export interface ContradictionIssue {
  ruleId: string;
  message: string;
}

export interface ContradictionResult {
  hasContradiction: boolean;
  issues: ContradictionIssue[];
}

/**
 * Contradiction Detector: Analyzes structured intent before IR compilation
 * to catch conflicting role assignments, contradictory output requirements, circular interlocks, and mutex conflicts.
 */
export function detectContradictions(intent: ParsedIntent): ContradictionResult {
  const issues: ContradictionIssue[] = [];
  if (!intent || !intent.rawPrompt) {
    return { hasContradiction: false, issues: [] };
  }

  const prompt = intent.rawPrompt.trim();
  const lower = prompt.toLowerCase();

  // 1. Conflicting Input Roles (e.g. X0 is assigned as both Start and Emergency Stop / Stop)
  if (intent.start && intent.emergency && intent.start === intent.emergency) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_INPUT_ROLES',
      message: `Contradiction Detected: Input address '${intent.start}' cannot serve as both Start PB and Emergency Stop simultaneously.`,
    });
  }

  if (intent.start && intent.stop && intent.start === intent.stop) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_INPUT_ROLES',
      message: `Contradiction Detected: Input address '${intent.start}' cannot serve as both Start PB and Stop PB simultaneously.`,
    });
  }

  // Check raw text pattern for role conflicts (e.g. "X0 is start and X0 is emergency")
  const x0StartEstopMatch = lower.includes('x0 is start') && (lower.includes('x0 is emergency') || lower.includes('x0 is e-stop') || lower.includes('x0 is estop'));
  if (x0StartEstopMatch && !issues.some((i) => i.ruleId === 'RULE_CONTRADICTORY_INPUT_ROLES')) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_INPUT_ROLES',
      message: "Contradiction Detected: Input 'X0' assigned to contradictory roles (Start and Emergency Stop).",
    });
  }

  // 2. Conflicting Output Behavior (e.g. "run when stop is pressed and stop when stop is pressed")
  const runOnStop = lower.includes('run') && lower.includes('when stop is pressed');
  const stopOnStop = lower.includes('stop') && lower.includes('when stop is pressed');
  if (runOnStop && stopOnStop) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_OUTPUT_BEHAVIOR',
      message: "Contradiction Detected: Output is configured to both RUN and STOP on the same 'Stop' pushbutton press.",
    });
  }

  // 3. Circular Interlocks (e.g. "Motor 1 requires Motor 2 and Motor 2 requires Motor 1")
  const m1RequiresM2 = (lower.includes('motor 1 requires motor 2') || lower.includes('m1 requires m2') || lower.includes('y0 requires y1'));
  const m2RequiresM1 = (lower.includes('motor 2 requires motor 1') || lower.includes('m2 requires m1') || lower.includes('y1 requires y0'));
  if (m1RequiresM2 && m2RequiresM1) {
    issues.push({
      ruleId: 'RULE_CIRCULAR_INTERLOCK',
      message: "Contradiction Detected: Circular dependency detected (Motor 1 requires Motor 2 AND Motor 2 requires Motor 1). Neither motor can start.",
    });
  }

  // 4. Mutex Contradictions (e.g. "Forward and Reverse must run at the same time")
  const mutexSimultaneous = lower.includes('forward and reverse') && (lower.includes('at the same time') || lower.includes('simultaneously') || lower.includes('together'));
  if (mutexSimultaneous) {
    issues.push({
      ruleId: 'RULE_MUTEX_CONTRADICTION',
      message: "Contradiction Detected: Mutually exclusive outputs (Forward Y0 and Reverse Y1) cannot be requested to run simultaneously.",
    });
  }

  return {
    hasContradiction: issues.length > 0,
    issues,
  };
}
