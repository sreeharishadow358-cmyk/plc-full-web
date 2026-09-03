import { ParsedIntent } from './intentParser.js';

export interface LadderBlock {
  type: 'contact' | 'contact_nc' | 'coil';
  label: string;
}

export interface LadderSymbol {
  id: string;
  type: 'contact_no' | 'contact_nc' | 'coil' | 'timer' | 'counter' | 'coil_set' | 'coil_rst';
  address: string;
  preset?: string;
  comment?: string;
  isBranch?: boolean;
}

export interface LadderBranch {
  id: string;
  symbols: LadderSymbol[];
}

export interface LadderRung {
  id: string;
  rungNumber: number;
  comment?: string;
  sourceIL?: string;
  branchGroups: LadderBranch[];
  coils: LadderSymbol[];
}

export interface LadderProgram {
  title?: string;
  rungs: LadderRung[];
}

export interface LogicGenerationResult {
  ladder: LadderBlock[];
  program: LadderProgram;
  explanation: string;
  instructionList: string;
  warnings: string[];
}

let symbolCounter = 100;
function generateSymbolId(prefix = 'sym'): string {
  symbolCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${symbolCounter}`;
}

/**
 * Logic Generator that transforms a structured ParsedIntent object into ladder JSON,
 * IL instructions, and explanation.
 */
export function generateLogic(intent: ParsedIntent): LogicGenerationResult {
  if (!intent || !intent.type) {
    throw new Error('Invalid intent object provided to generateLogic.');
  }

  // Handle Motor Control Intent
  if (intent.type === 'motor_control') {
    const startAddr = intent.start || 'X0';
    const stopAddr = intent.stop || 'X1';
    const emgAddr = intent.emergency || 'X2';
    const outAddr = intent.output || 'Y0';

    const ladder: LadderBlock[] = [
      { type: 'contact', label: startAddr },
      { type: 'contact_nc', label: stopAddr },
      { type: 'contact_nc', label: emgAddr },
      { type: 'coil', label: outAddr },
    ];

    const instructionList = `LD ${startAddr}\nANI ${stopAddr}\nANI ${emgAddr}\nOUT ${outAddr}\nEND`;

    const rungs: LadderRung[] = [
      {
        id: 'rung_main_0',
        rungNumber: 0,
        comment: `Rung 0: Motor Start (${startAddr}), Stop (${stopAddr}), Emergency Stop (${emgAddr}) & Output (${outAddr})`,
        sourceIL: instructionList,
        branchGroups: [
          {
            id: 'bg_main',
            symbols: [
              { id: generateSymbolId('no'), type: 'contact_no', address: startAddr, comment: 'Start PB (NO)' },
              { id: generateSymbolId('nc'), type: 'contact_nc', address: stopAddr, comment: 'Stop PB (NC)' },
              { id: generateSymbolId('nc'), type: 'contact_nc', address: emgAddr, comment: 'Emergency Stop (NC)' },
            ],
          },
        ],
        coils: [
          { id: generateSymbolId('coil'), type: 'coil', address: outAddr, comment: 'Main Motor Contactor' },
        ],
      },
    ];

    const explanation =
      `### Industrial Motor Control Breakdown\n\n` +
      `- **Start Pushbutton (` + startAddr + `)**: Normally Open (NO / \`LD\`) contact energizes motor output **\`' + outAddr + '\`** when pressed.\n` +
      `- **Stop Pushbutton (\`' + stopAddr + '\`)**: Normally Closed (NC / \`ANI\`) contact interrupts power when pressed.\n` +
      `- **Emergency Stop (\`' + emgAddr + '\`)**: Normally Closed (NC / \`ANI\`) safety interlock for immediate emergency shutdown.\n\n` +
      `⚡ *Compiled for Mitsubishi FX Series & IEC 61131-3.*`;

    const warnings: string[] = [
      `Ensure Emergency Stop (` + emgAddr + `) is also hardwired for physical safety redundancy.`,
    ];

    return {
      ladder,
      program: {
        title: 'Synthesized Motor Control',
        rungs,
      },
      explanation,
      instructionList,
      warnings,
    };
  }

  // Handle Timer Control Intent
  if (intent.type === 'timer_control') {
    const sensor = intent.sensor || 'X0';
    const timer = intent.timer || 'T0';
    const preset = intent.preset || 'K50';
    const output = intent.output || 'Y1';

    const ladder: LadderBlock[] = [
      { type: 'contact', label: sensor },
      { type: 'coil', label: `${timer} (${preset})` },
    ];

    const instructionList = `LD ${sensor}\nOUT ${timer} ${preset}\n\nLD ${timer}\nOUT ${output}\nEND`;

    const rungs: LadderRung[] = [
      {
        id: 'rung_timer_0',
        rungNumber: 0,
        comment: `Rung 0: Sensor ${sensor} activates Timer ${timer} (${preset})`,
        sourceIL: `LD ${sensor}\nOUT ${timer} ${preset}`,
        branchGroups: [
          {
            id: 'bg_0',
            symbols: [{ id: generateSymbolId('no'), type: 'contact_no', address: sensor, comment: 'Sensor Trigger' }],
          },
        ],
        coils: [
          { id: generateSymbolId('tmr'), type: 'timer', address: timer, preset, comment: `Timer ${timer}` },
        ],
      },
      {
        id: 'rung_timer_1',
        rungNumber: 1,
        comment: `Rung 1: Timer ${timer} Done Contact Energizes Output ${output}`,
        sourceIL: `LD ${timer}\nOUT ${output}`,
        branchGroups: [
          {
            id: 'bg_1',
            symbols: [{ id: generateSymbolId('no'), type: 'contact_no', address: timer, comment: 'Timer Done Contact' }],
          },
        ],
        coils: [
          { id: generateSymbolId('coil'), type: 'coil', address: output, comment: `Delayed Output (${output})` },
        ],
      },
    ];

    return {
      ladder,
      program: {
        title: 'Timed Delay Control Circuit',
        rungs,
      },
      explanation: `Rung 0 triggers Timer ${timer} preset ${preset} when ${sensor} is active. Rung 1 energizes ${output} when ${timer} expires.`,
      instructionList,
      warnings: [`Verify sensor ${sensor} stays active for timer duration.`],
    };
  }

  // Handle Conveyor Interlock Intent
  if (intent.type === 'conveyor_interlock') {
    const start = intent.start || 'X0';
    const sensor = intent.sensor || 'X3';
    const stop = intent.stop || 'X1';
    const emergency = intent.emergency || 'X2';
    const output = intent.output || 'Y0';

    const ladder: LadderBlock[] = [
      { type: 'contact', label: start },
      { type: 'contact', label: sensor },
      { type: 'contact_nc', label: stop },
      { type: 'contact_nc', label: emergency },
      { type: 'coil', label: output },
    ];

    const instructionList = `LD ${start}\nAND ${sensor}\nANI ${stop}\nANI ${emergency}\nOUT ${output}\nEND`;

    const rungs: LadderRung[] = [
      {
        id: 'rung_conv_0',
        rungNumber: 0,
        comment: `Rung 0: Conveyor ${output} with Permissive Sensor ${sensor}`,
        sourceIL: instructionList,
        branchGroups: [
          {
            id: 'bg_conv',
            symbols: [
              { id: generateSymbolId('no'), type: 'contact_no', address: start, comment: 'Start PB' },
              { id: generateSymbolId('no'), type: 'contact_no', address: sensor, comment: 'Clearance Sensor' },
              { id: generateSymbolId('nc'), type: 'contact_nc', address: stop, comment: 'Stop PB' },
              { id: generateSymbolId('nc'), type: 'contact_nc', address: emergency, comment: 'Safety E-Stop' },
            ],
          },
        ],
        coils: [
          { id: generateSymbolId('coil'), type: 'coil', address: output, comment: 'Conveyor Motor' },
        ],
      },
    ];

    return {
      ladder,
      program: {
        title: 'Interlocked Conveyor Control',
        rungs,
      },
      explanation: `Conveyor output ${output} requires Start ${start} and Permissive Sensor ${sensor} active, while ${stop} and ${emergency} are un-tripped.`,
      instructionList,
      warnings: [`Verify Emergency Stop (${emergency}) hardwiring.`],
    };
  }

  // Fallback / Counter Control Intent
  const sensor = intent.sensor || 'X0';
  const counter = intent.counter || 'C0';
  const preset = intent.preset || 'K10';
  const output = intent.output || 'Y2';

  const ladder: LadderBlock[] = [
    { type: 'contact', label: sensor },
    { type: 'coil', label: `${counter} (${preset})` },
  ];

  const instructionList = `LD ${sensor}\nOUT ${counter} ${preset}\n\nLD ${counter}\nOUT ${output}\nEND`;

  return {
    ladder,
    program: {
      title: 'Counter System',
      rungs: [
        {
          id: 'rung_cnt_0',
          rungNumber: 0,
          comment: `Counter ${counter} triggered by ${sensor}`,
          branchGroups: [
            {
              id: 'bg_cnt',
              symbols: [{ id: generateSymbolId('no'), type: 'contact_no', address: sensor, comment: 'Pulse Input' }],
            },
          ],
          coils: [{ id: generateSymbolId('cnt'), type: 'counter', address: counter, preset, comment: 'Counter' }],
        },
      ],
    },
    explanation: `Sensor ${sensor} increments counter ${counter} up to preset ${preset}. Output ${output} energizes on completion.`,
    instructionList,
    warnings: [],
  };
}
