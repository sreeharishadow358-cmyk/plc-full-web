export function detectContradictions(intent) {
  const issues = [];
  if (!intent || !intent.rawPrompt) {
    return { hasContradiction: false, issues: [] };
  }

  const prompt = intent.rawPrompt.trim();
  const lower = prompt.toLowerCase();

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

  const x0StartEstopMatch = lower.includes('x0 is start') && (lower.includes('x0 is emergency') || lower.includes('x0 is e-stop') || lower.includes('x0 is estop'));
  if (x0StartEstopMatch && !issues.some((i) => i.ruleId === 'RULE_CONTRADICTORY_INPUT_ROLES')) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_INPUT_ROLES',
      message: "Contradiction Detected: Input 'X0' assigned to contradictory roles (Start and Emergency Stop).",
    });
  }

  const runOnStop = lower.includes('run') && lower.includes('when stop is pressed');
  const stopOnStop = lower.includes('stop') && lower.includes('when stop is pressed');
  if (runOnStop && stopOnStop) {
    issues.push({
      ruleId: 'RULE_CONTRADICTORY_OUTPUT_BEHAVIOR',
      message: "Contradiction Detected: Output is configured to both RUN and STOP on the same 'Stop' pushbutton press.",
    });
  }

  const m1RequiresM2 = (lower.includes('motor 1 requires motor 2') || lower.includes('m1 requires m2') || lower.includes('y0 requires y1'));
  const m2RequiresM1 = (lower.includes('motor 2 requires motor 1') || lower.includes('m2 requires m1') || lower.includes('y1 requires y0'));
  if (m1RequiresM2 && m2RequiresM1) {
    issues.push({
      ruleId: 'RULE_CIRCULAR_INTERLOCK',
      message: "Contradiction Detected: Circular dependency detected (Motor 1 requires Motor 2 AND Motor 2 requires Motor 1). Neither motor can start.",
    });
  }

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
