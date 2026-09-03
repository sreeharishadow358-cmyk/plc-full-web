export interface ParsedIntent {
  type: 'motor_control' | 'timer_control' | 'conveyor_interlock' | 'counter_control';
  start?: string;
  stop?: string;
  emergency?: string;
  output?: string;
  sensor?: string;
  timer?: string;
  counter?: string;
  preset?: string;
  confidence: number;
  matchedAddresses: string[];
  defaultsApplied: string[];
  rawPrompt: string;
}

/**
 * Natural language intent parser for Mitsubishi PLC automation prompts.
 * Converts raw prompt strings into structured intent objects.
 */
export function parseIntent(prompt: string): ParsedIntent {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt instruction cannot be empty.');
  }

  const rawPrompt = prompt.trim();
  const lower = rawPrompt.toLowerCase();
  const matchedAddresses: string[] = [];
  const defaultsApplied: string[] = [];

  // Extract explicit address patterns like X0, X1, Y0, Y1, T0, C0, K50
  const addressMatches = rawPrompt.match(/\b([XYMTC]\d+)\b/gi) || [];
  addressMatches.forEach((addr) => {
    const uppercaseAddr = addr.toUpperCase();
    if (!matchedAddresses.includes(uppercaseAddr)) {
      matchedAddresses.push(uppercaseAddr);
    }
  });

  // Extract presets like K50 or K10 or 5s / 5 seconds
  let preset: string | undefined;
  const kMatch = rawPrompt.match(/\bK\d+\b/i);
  if (kMatch) {
    preset = kMatch[0].toUpperCase();
  } else {
    const secMatch = lower.match(/(\d+)\s*(s|sec|seconds)/);
    if (secMatch) {
      const seconds = parseInt(secMatch[1], 10);
      preset = `K${seconds * 10}`;
    }
  }

  // Helper to extract address or fallback to default
  const getAddress = (
    regex: RegExp,
    defaultAddr: string,
    roleName: string
  ): string => {
    const match = rawPrompt.match(regex);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
    const explicitX = matchedAddresses.find((a) => a.startsWith('X'));
    const explicitY = matchedAddresses.find((a) => a.startsWith('Y'));
    if (roleName === 'start' && explicitX) return explicitX;
    if (roleName === 'output' && explicitY) return explicitY;
    defaultsApplied.push(`${roleName}:${defaultAddr}`);
    return defaultAddr;
  };

  // Scenario 1: Timer Delay
  if (
    lower.includes('timer') ||
    lower.includes('delay') ||
    lower.includes('t0') ||
    lower.includes('seconds') ||
    lower.includes('5s')
  ) {
    const sensor = matchedAddresses.find((a) => a.startsWith('X')) || 'X0';
    const timer = matchedAddresses.find((a) => a.startsWith('T')) || 'T0';
    const output = matchedAddresses.find((a) => a.startsWith('Y')) || 'Y1';

    return {
      type: 'timer_control',
      sensor,
      timer,
      preset: preset || 'K50',
      output,
      confidence: 0.92,
      matchedAddresses,
      defaultsApplied,
      rawPrompt,
    };
  }

  // Scenario 2: Conveyor Interlock
  if (
    lower.includes('conveyor') ||
    lower.includes('interlock') ||
    lower.includes('sensor x3')
  ) {
    const start = getAddress(/start\s*(?:motor|pb|button)?\s*([XY]\d+)?/i, 'X0', 'start');
    const stop = getAddress(/stop\s*(?:pb|button)?\s*([XY]\d+)?/i, 'X1', 'stop');
    const emergency = getAddress(/(?:emergency|emg|e-stop)\s*([XY]\d+)?/i, 'X2', 'emergency');
    const sensor = matchedAddresses.find((a) => a === 'X3') || 'X3';
    const output = matchedAddresses.find((a) => a.startsWith('Y')) || 'Y0';

    return {
      type: 'conveyor_interlock',
      start,
      stop,
      emergency,
      sensor,
      output,
      confidence: 0.94,
      matchedAddresses,
      defaultsApplied,
      rawPrompt,
    };
  }

  // Scenario 3: Counter Control
  if (
    lower.includes('counter') ||
    lower.includes('count') ||
    lower.includes('c0')
  ) {
    const sensor = matchedAddresses.find((a) => a.startsWith('X')) || 'X0';
    const counter = matchedAddresses.find((a) => a.startsWith('C')) || 'C0';
    const output = matchedAddresses.find((a) => a.startsWith('Y')) || 'Y2';

    return {
      type: 'counter_control',
      sensor,
      counter,
      preset: preset || 'K10',
      output,
      confidence: 0.9,
      matchedAddresses,
      defaultsApplied,
      rawPrompt,
    };
  }

  // Scenario 4 (Default): Standard Motor Control (Start / Stop / Emergency Stop)
  // Extract Start (e.g. X0 or Start button)
  const startMatch = rawPrompt.match(/start\b[^\w]*([xX]\d+)?/i);
  let start = 'X0';
  if (startMatch && startMatch[1]) {
    start = startMatch[1].toUpperCase();
  } else {
    const firstX = matchedAddresses.find((a) => a.startsWith('X'));
    if (firstX) start = firstX;
    else defaultsApplied.push('start:X0');
  }

  // Extract Stop (e.g. X1 or Stop button)
  const stopMatch = rawPrompt.match(/stop\b[^\w]*([xX]\d+)?/i);
  let stop = 'X1';
  if (stopMatch && stopMatch[1]) {
    stop = stopMatch[1].toUpperCase();
  } else {
    const secondX = matchedAddresses.filter((a) => a.startsWith('X'))[1];
    if (secondX) stop = secondX;
    else defaultsApplied.push('stop:X1');
  }

  // Extract Emergency Stop (e.g. X2 or Emergency)
  const emgMatch = rawPrompt.match(/(?:emergency|emg|e-stop)\b[^\w]*([xX]\d+)?/i);
  let emergency = 'X2';
  if (emgMatch && emgMatch[1]) {
    emergency = emgMatch[1].toUpperCase();
  } else {
    const thirdX = matchedAddresses.filter((a) => a.startsWith('X'))[2];
    if (thirdX) emergency = thirdX;
    else defaultsApplied.push('emergency:X2');
  }

  // Extract Output (e.g. Y0 or Motor)
  const outMatch = rawPrompt.match(/(?:output|motor|run|coil)\b[^\w]*([yY]\d+)?/i);
  let output = 'Y0';
  if (outMatch && outMatch[1]) {
    output = outMatch[1].toUpperCase();
  } else {
    const firstY = matchedAddresses.find((a) => a.startsWith('Y'));
    if (firstY) output = firstY;
    else defaultsApplied.push('output:Y0');
  }

  return {
    type: 'motor_control',
    start,
    stop,
    emergency,
    output,
    confidence: 0.95,
    matchedAddresses,
    defaultsApplied,
    rawPrompt,
  };
}
