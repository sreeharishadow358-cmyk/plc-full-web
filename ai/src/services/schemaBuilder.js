export function buildRungSchema(intent) {
  if (!intent || !intent.rawPrompt) {
    throw new Error('Invalid intent provided to buildRungSchema');
  }

  const prompt = intent.rawPrompt.trim();
  const lower = prompt.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();

  const hasExplicitAddresses = intent.matchedAddresses && intent.matchedAddresses.length > 0;

  if (
    (!hasExplicitAddresses && (lower === 'run the motor' || lower === 'run motor' || lower === 'start motor' || lower === 'motor')) ||
    (intent.type === 'motor_control' && !hasExplicitAddresses && intent.defaultsApplied && intent.defaultsApplied.length >= 3)
  ) {
    return {
      status: 'needs_clarification',
      questions: [
        'Start input address (e.g. X0)?',
        'Stop input address (e.g. X1)?',
        'Emergency Stop input address (e.g. X2)?',
        'Motor output address (e.g. Y0)?',
      ],
      providedPrompt: prompt,
    };
  }

  if (intent.type === 'motor_control') {
    const startAddr = intent.start || 'X0';
    const stopAddr = intent.stop || 'X1';
    const emgAddr = intent.emergency || 'X2';
    const outAddr = intent.output || 'Y0';
    const permissiveAddr = 'M0';

    const schemas = [
      {
        kind: 'safety_permissive',
        id: 'rung_safety_0',
        safetyInputAddress: emgAddr,
        permissiveCoilAddress: permissiveAddr,
        contactType: 'NC',
      },
      {
        kind: 'motor_seal_in',
        id: 'rung_motor_1',
        startAddress: startAddr,
        stopAddress: stopAddr,
        permissiveCoilAddress: permissiveAddr,
        outputCoilAddress: outAddr,
        isMomentaryJog: false,
      },
    ];

    return { status: 'success', schemas };
  }

  if (intent.type === 'timer_control') {
    const trigger = intent.sensor || 'X0';
    const timer = intent.timer || 'T0';
    const preset = intent.preset || 'K50';
    const output = intent.output || 'Y1';

    const schemas = [
      {
        kind: 'timer_control',
        id: 'rung_timer_0',
        triggerAddress: trigger,
        timerAddress: timer,
        preset,
        outputCoilAddress: output,
      },
    ];

    return { status: 'success', schemas };
  }

  if (intent.type === 'conveyor_interlock') {
    const startAddr = intent.start || 'X0';
    const stopAddr = intent.stop || 'X1';
    const emgAddr = intent.emergency || 'X2';
    const sensorAddr = intent.sensor || 'X3';
    const outAddr = intent.output || 'Y0';
    const permissiveAddr = 'M0';

    const schemas = [
      {
        kind: 'safety_permissive',
        id: 'rung_safety_0',
        safetyInputAddress: emgAddr,
        permissiveCoilAddress: permissiveAddr,
        contactType: 'NC',
      },
      {
        kind: 'motor_interlocked',
        id: 'rung_conv_1',
        startAddress: startAddr,
        stopAddress: stopAddr,
        permissiveCoilAddress: permissiveAddr,
        outputCoilAddress: outAddr,
        requiredOutputAddress: sensorAddr,
      },
    ];

    return { status: 'success', schemas };
  }

  const trigger = intent.sensor || 'X0';
  const counter = intent.counter || 'C0';
  const preset = intent.preset || 'K10';
  const output = intent.output || 'Y2';

  const schemas = [
    {
      kind: 'counter_control',
      id: 'rung_counter_0',
      triggerAddress: trigger,
      counterAddress: counter,
      preset,
      outputCoilAddress: output,
    },
  ];

  return { status: 'success', schemas };
}
