import {
  RungSchema,
  SafetyPermissiveRungSchema,
  MotorSealInRungSchema,
  MotorInterlockedRungSchema,
  MotorMutexPairSchema,
  TimerControlRungSchema,
  CounterControlRungSchema,
} from '../types/ir';
import {
  LadderBlock,
  LadderProgram,
  LadderRung,
  LogicGenerationResult,
} from './logicGenerator';

let symbolCounter = 500;
function genId(prefix = 'sym'): string {
  symbolCounter += 1;
  return `${prefix}_${symbolCounter}`;
}

/**
 * Pure Compiler: Compiles structured RungSchema[] IR into LogicGenerationResult.
 * This is the ONLY function authorized to emit raw ladder blocks or instruction list strings.
 */
export function compileRungs(schemas: RungSchema[]): LogicGenerationResult {
  if (!schemas || !Array.isArray(schemas) || schemas.length === 0) {
    throw new Error('compileRungs requires a non-empty array of RungSchema.');
  }

  const allBlocks: LadderBlock[] = [];
  const rungs: LadderRung[] = [];
  const ilLines: string[] = [];
  const explanations: string[] = [];
  const warnings: string[] = [];

  let currentRungNumber = 0;

  for (const schema of schemas) {
    switch (schema.kind) {
      case 'safety_permissive': {
        const { safetyInputAddress, permissiveCoilAddress } = schema;

        allBlocks.push(
          { type: 'contact_nc', label: safetyInputAddress },
          { type: 'coil', label: permissiveCoilAddress }
        );

        const rungIL = `LDI ${safetyInputAddress}\nOUT ${permissiveCoilAddress}`;
        ilLines.push(rungIL);

        rungs.push({
          id: schema.id || `rung_${currentRungNumber}`,
          rungNumber: currentRungNumber++,
          comment: `Rung ${currentRungNumber - 1}: Safety Permissive Circuit (${safetyInputAddress} NC -> ${permissiveCoilAddress})`,
          sourceIL: rungIL,
          branchGroups: [
            {
              id: genId('bg'),
              symbols: [
                {
                  id: genId('nc'),
                  type: 'contact_nc',
                  address: safetyInputAddress,
                  comment: 'Emergency Stop / Safety Input (NC)',
                },
              ],
            },
          ],
          coils: [
            {
              id: genId('coil'),
              type: 'coil',
              address: permissiveCoilAddress,
              comment: 'Safety Permissive Control Relay',
            },
          ],
        });

        explanations.push(
          `- **Safety Permissive Circuit**: NC contact on **${safetyInputAddress}** energizes internal relay **${permissiveCoilAddress}**. If **${safetyInputAddress}** trips or loses continuity, **${permissiveCoilAddress}** drops out immediately, de-energizing all safety-gated output rungs.`
        );

        warnings.push(
          `Safety Permissive (${safetyInputAddress}) must be hardwired with a fail-safe Normally Closed physical contact.`
        );
        break;
      }

      case 'motor_seal_in': {
        const { startAddress, stopAddress, permissiveCoilAddress, outputCoilAddress, isMomentaryJog } = schema;

        allBlocks.push({ type: 'contact', label: startAddress });
        if (!isMomentaryJog) {
          allBlocks.push({ type: 'contact', label: `${outputCoilAddress} (OR)` });
        }
        allBlocks.push(
          { type: 'contact_nc', label: stopAddress },
          { type: 'contact_nc', label: permissiveCoilAddress },
          { type: 'coil', label: outputCoilAddress }
        );

        const rungIL = isMomentaryJog
          ? `LD ${startAddress}\nANI ${stopAddress}\nANI ${permissiveCoilAddress}\nOUT ${outputCoilAddress}`
          : `LD ${startAddress}\nOR ${outputCoilAddress}\nANI ${stopAddress}\nANI ${permissiveCoilAddress}\nOUT ${outputCoilAddress}`;

        ilLines.push(rungIL);

        rungs.push({
          id: schema.id || `rung_${currentRungNumber}`,
          rungNumber: currentRungNumber++,
          comment: `Rung ${currentRungNumber - 1}: Motor Control (${outputCoilAddress}) with Seal-in Latch & Safety Gating (${permissiveCoilAddress})`,
          sourceIL: rungIL,
          branchGroups: isMomentaryJog
            ? [
                {
                  id: genId('bg_main'),
                  symbols: [
                    { id: genId('no'), type: 'contact_no', address: startAddress, comment: 'Start Pushbutton (NO)' },
                    { id: genId('nc'), type: 'contact_nc', address: stopAddress, comment: 'Stop Pushbutton (NC)' },
                    { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
                  ],
                },
              ]
            : [
                {
                  id: genId('bg_start'),
                  symbols: [
                    { id: genId('no'), type: 'contact_no', address: startAddress, comment: 'Start Pushbutton (NO)' },
                    { id: genId('nc'), type: 'contact_nc', address: stopAddress, comment: 'Stop Pushbutton (NC)' },
                    { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
                  ],
                },
                {
                  id: genId('bg_seal'),
                  symbols: [
                    { id: genId('no_seal'), type: 'contact_no', address: outputCoilAddress, comment: 'Auxiliary Seal-in Contact', isBranch: true },
                  ],
                },
              ],
          coils: [
            { id: genId('coil'), type: 'coil', address: outputCoilAddress, comment: 'Motor Starter / Contactor' },
          ],
        });

        explanations.push(
          `- **Motor Control (${outputCoilAddress})**: Started by NO contact **${startAddress}** with ${
            isMomentaryJog ? 'momentary jog control' : `auxiliary seal-in latch (**OR ${outputCoilAddress}**)`
          }. Stopped by NC contact **${stopAddress}** and gated through Safety Permissive relay **${permissiveCoilAddress}**.`
        );
        break;
      }

      case 'motor_interlocked': {
        const { startAddress, stopAddress, permissiveCoilAddress, outputCoilAddress, requiredOutputAddress } = schema;

        allBlocks.push(
          { type: 'contact', label: startAddress },
          { type: 'contact', label: `${outputCoilAddress} (OR)` },
          { type: 'contact_nc', label: stopAddress },
          { type: 'contact', label: `${requiredOutputAddress} (REQ)` },
          { type: 'contact_nc', label: permissiveCoilAddress },
          { type: 'coil', label: outputCoilAddress }
        );

        const rungIL = `LD ${startAddress}\nOR ${outputCoilAddress}\nANI ${stopAddress}\nAND ${requiredOutputAddress}\nANI ${permissiveCoilAddress}\nOUT ${outputCoilAddress}`;
        ilLines.push(rungIL);

        rungs.push({
          id: schema.id || `rung_${currentRungNumber}`,
          rungNumber: currentRungNumber++,
          comment: `Rung ${currentRungNumber - 1}: Interlocked Motor (${outputCoilAddress}) requiring ${requiredOutputAddress} active`,
          sourceIL: rungIL,
          branchGroups: [
            {
              id: genId('bg_main'),
              symbols: [
                { id: genId('no'), type: 'contact_no', address: startAddress, comment: 'Start Pushbutton (NO)' },
                { id: genId('no'), type: 'contact_no', address: requiredOutputAddress, comment: `Required Interlock (${requiredOutputAddress})` },
                { id: genId('nc'), type: 'contact_nc', address: stopAddress, comment: 'Stop Pushbutton (NC)' },
                { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
              ],
            },
            {
              id: genId('bg_seal'),
              symbols: [
                { id: genId('no_seal'), type: 'contact_no', address: outputCoilAddress, comment: 'Auxiliary Seal-in Contact', isBranch: true },
              ],
            },
          ],
          coils: [
            { id: genId('coil'), type: 'coil', address: outputCoilAddress, comment: 'Interlocked Motor Output' },
          ],
        });

        explanations.push(
          `- **Sequential Motor Interlock (${outputCoilAddress})**: Motor **${outputCoilAddress}** cannot start unless upstream output **${requiredOutputAddress}** is already running.`
        );
        break;
      }

      case 'motor_mutex_pair': {
        const { motorA, motorB, permissiveCoilAddress, oneSidedFaultTest } = schema;

        // Rung A (Motor A, e.g. Forward Y0)
        allBlocks.push(
          { type: 'contact', label: motorA.startAddress },
          { type: 'contact', label: `${motorA.outputCoilAddress} (OR)` },
          { type: 'contact_nc', label: motorA.stopAddress },
          { type: 'contact_nc', label: `${motorB.outputCoilAddress} (MUTEX)` },
          { type: 'contact_nc', label: permissiveCoilAddress },
          { type: 'coil', label: motorA.outputCoilAddress }
        );

        const rungA_IL = `LD ${motorA.startAddress}\nOR ${motorA.outputCoilAddress}\nANI ${motorA.stopAddress}\nANI ${motorB.outputCoilAddress}\nANI ${permissiveCoilAddress}\nOUT ${motorA.outputCoilAddress}`;
        ilLines.push(rungA_IL);

        rungs.push({
          id: genId('rung_mutex_a'),
          rungNumber: currentRungNumber++,
          comment: `Rung ${currentRungNumber - 1}: ${motorA.name} (${motorA.outputCoilAddress}) with Mutex Interlock against ${motorB.outputCoilAddress}`,
          sourceIL: rungA_IL,
          branchGroups: [
            {
              id: genId('bg_a'),
              symbols: [
                { id: genId('no'), type: 'contact_no', address: motorA.startAddress, comment: `${motorA.name} Start` },
                { id: genId('nc'), type: 'contact_nc', address: motorA.stopAddress, comment: `${motorA.name} Stop` },
                { id: genId('nc'), type: 'contact_nc', address: motorB.outputCoilAddress, comment: `Electrical Interlock (${motorB.outputCoilAddress} NC)` },
                { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
              ],
            },
            {
              id: genId('bg_a_seal'),
              symbols: [
                { id: genId('no_seal'), type: 'contact_no', address: motorA.outputCoilAddress, comment: 'Seal-in Contact', isBranch: true },
              ],
            },
          ],
          coils: [
            { id: genId('coil'), type: 'coil', address: motorA.outputCoilAddress, comment: `${motorA.name} Contactor` },
          ],
        });

        // Rung B (Motor B, e.g. Reverse Y1)
        if (oneSidedFaultTest) {
          // Fault test: omit mutex interlock on Motor B to trigger validator rejection
          allBlocks.push(
            { type: 'contact', label: motorB.startAddress },
            { type: 'contact', label: `${motorB.outputCoilAddress} (OR)` },
            { type: 'contact_nc', label: motorB.stopAddress },
            { type: 'contact_nc', label: permissiveCoilAddress },
            { type: 'coil', label: motorB.outputCoilAddress }
          );

          const rungB_IL = `LD ${motorB.startAddress}\nOR ${motorB.outputCoilAddress}\nANI ${motorB.stopAddress}\nANI ${permissiveCoilAddress}\nOUT ${motorB.outputCoilAddress}`;
          ilLines.push(rungB_IL);

          rungs.push({
            id: genId('rung_mutex_b'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: ${motorB.name} (${motorB.outputCoilAddress}) [FAULT: Missing Mutex Interlock]`,
            sourceIL: rungB_IL,
            branchGroups: [
              {
                id: genId('bg_b'),
                symbols: [
                  { id: genId('no'), type: 'contact_no', address: motorB.startAddress, comment: `${motorB.name} Start` },
                  { id: genId('nc'), type: 'contact_nc', address: motorB.stopAddress, comment: `${motorB.name} Stop` },
                  { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
                ],
              },
            ],
            coils: [
              { id: genId('coil'), type: 'coil', address: motorB.outputCoilAddress, comment: `${motorB.name} Contactor` },
            ],
          });
        } else {
          allBlocks.push(
            { type: 'contact', label: motorB.startAddress },
            { type: 'contact', label: `${motorB.outputCoilAddress} (OR)` },
            { type: 'contact_nc', label: motorB.stopAddress },
            { type: 'contact_nc', label: `${motorA.outputCoilAddress} (MUTEX)` },
            { type: 'contact_nc', label: permissiveCoilAddress },
            { type: 'coil', label: motorB.outputCoilAddress }
          );

          const rungB_IL = `LD ${motorB.startAddress}\nOR ${motorB.outputCoilAddress}\nANI ${motorB.stopAddress}\nANI ${motorA.outputCoilAddress}\nANI ${permissiveCoilAddress}\nOUT ${motorB.outputCoilAddress}`;
          ilLines.push(rungB_IL);

          rungs.push({
            id: genId('rung_mutex_b'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: ${motorB.name} (${motorB.outputCoilAddress}) with Mutex Interlock against ${motorA.outputCoilAddress}`,
            sourceIL: rungB_IL,
            branchGroups: [
              {
                id: genId('bg_b'),
                symbols: [
                  { id: genId('no'), type: 'contact_no', address: motorB.startAddress, comment: `${motorB.name} Start` },
                  { id: genId('nc'), type: 'contact_nc', address: motorB.stopAddress, comment: `${motorB.name} Stop` },
                  { id: genId('nc'), type: 'contact_nc', address: motorA.outputCoilAddress, comment: `Electrical Interlock (${motorA.outputCoilAddress} NC)` },
                  { id: genId('nc'), type: 'contact_nc', address: permissiveCoilAddress, comment: 'Safety Permissive (NC)' },
                ],
              },
              {
                id: genId('bg_b_seal'),
                symbols: [
                  { id: genId('no_seal'), type: 'contact_no', address: motorB.outputCoilAddress, comment: 'Seal-in Contact', isBranch: true },
                ],
              },
            ],
            coils: [
              { id: genId('coil'), type: 'coil', address: motorB.outputCoilAddress, comment: `${motorB.name} Contactor` },
            ],
          });
        }

        explanations.push(
          `- **Mutually Exclusive Pair (${motorA.name} / ${motorB.name})**: Outputs **${motorA.outputCoilAddress}** and **${motorB.outputCoilAddress}** carry cross-interlocked Normally Closed contacts (**ANI ${motorB.outputCoilAddress}** and **ANI ${motorA.outputCoilAddress}**) to prevent simultaneous activation.`
        );
        break;
      }

      case 'timer_control': {
        const { triggerAddress, timerAddress, preset, outputCoilAddress } = schema;

        allBlocks.push(
          { type: 'contact', label: triggerAddress },
          { type: 'coil', label: `${timerAddress} (${preset})` },
          { type: 'contact', label: timerAddress },
          { type: 'coil', label: outputCoilAddress }
        );

        const rung0_IL = `LD ${triggerAddress}\nOUT ${timerAddress} ${preset}`;
        const rung1_IL = `LD ${timerAddress}\nOUT ${outputCoilAddress}`;
        ilLines.push(rung0_IL, rung1_IL);

        rungs.push(
          {
            id: genId('rung_t0'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: Timer ${timerAddress} Preset ${preset} Triggered by ${triggerAddress}`,
            sourceIL: rung0_IL,
            branchGroups: [
              {
                id: genId('bg_t0'),
                symbols: [{ id: genId('no'), type: 'contact_no', address: triggerAddress, comment: 'Trigger Sensor (NO)' }],
              },
            ],
            coils: [
              { id: genId('tmr'), type: 'timer', address: timerAddress, preset, comment: `On-Delay Timer ${timerAddress}` },
            ],
          },
          {
            id: genId('rung_t1'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: Timer ${timerAddress} Done Contact -> Output ${outputCoilAddress}`,
            sourceIL: rung1_IL,
            branchGroups: [
              {
                id: genId('bg_t1'),
                symbols: [{ id: genId('no'), type: 'contact_no', address: timerAddress, comment: 'Timer Done Contact (NO)' }],
              },
            ],
            coils: [
              { id: genId('coil'), type: 'coil', address: outputCoilAddress, comment: 'Delayed Output Contactor' },
            ],
          }
        );

        explanations.push(
          `- **Timer Control (${timerAddress})**: Input **${triggerAddress}** starts timer **${timerAddress}** (${preset}). Output **${outputCoilAddress}** turns ON when timer expires.`
        );
        break;
      }

      case 'counter_control': {
        const { triggerAddress, counterAddress, preset, outputCoilAddress } = schema;

        allBlocks.push(
          { type: 'contact', label: triggerAddress },
          { type: 'coil', label: `${counterAddress} (${preset})` },
          { type: 'contact', label: counterAddress },
          { type: 'coil', label: outputCoilAddress }
        );

        const rung0_IL = `LD ${triggerAddress}\nOUT ${counterAddress} ${preset}`;
        const rung1_IL = `LD ${counterAddress}\nOUT ${outputCoilAddress}`;
        ilLines.push(rung0_IL, rung1_IL);

        rungs.push(
          {
            id: genId('rung_c0'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: Counter ${counterAddress} Preset ${preset} Triggered by ${triggerAddress}`,
            sourceIL: rung0_IL,
            branchGroups: [
              {
                id: genId('bg_c0'),
                symbols: [{ id: genId('no'), type: 'contact_no', address: triggerAddress, comment: 'Pulse Sensor (NO)' }],
              },
            ],
            coils: [
              { id: genId('cnt'), type: 'counter', address: counterAddress, preset, comment: `Up Counter ${counterAddress}` },
            ],
          },
          {
            id: genId('rung_c1'),
            rungNumber: currentRungNumber++,
            comment: `Rung ${currentRungNumber - 1}: Counter ${counterAddress} Done Contact -> Output ${outputCoilAddress}`,
            sourceIL: rung1_IL,
            branchGroups: [
              {
                id: genId('bg_c1'),
                symbols: [{ id: genId('no'), type: 'contact_no', address: counterAddress, comment: 'Counter Done Contact (NO)' }],
              },
            ],
            coils: [
              { id: genId('coil'), type: 'coil', address: outputCoilAddress, comment: 'Counter Reached Output' },
            ],
          }
        );

        explanations.push(
          `- **Counter Control (${counterAddress})**: Pulses on **${triggerAddress}** increment counter **${counterAddress}** (${preset}). Output **${outputCoilAddress}** energizes upon target count completion.`
        );
        break;
      }
    }
  }

  ilLines.push('END');
  const fullIL = ilLines.join('\n');

  const explanationHeader =
    `### Industrial Ladder Logic Breakdown (IR Compiled)\n\n` +
    `> **SAFETY NOTICE**: Process stop controls (e.g. Stop PB) provide operational shutdown, whereas Emergency Stop safety permissives gate power via dedicated safety relays (e.g. M0). Generated ladder logic requires human engineering verification and physical safety circuit validation before machine deployment.\n\n`;

  const explanation = explanationHeader + explanations.join('\n\n') + `\n\n⚡ *Compiled by SmartLadder IR Engine for Mitsubishi FX Series & IEC 61131-3.*`;

  const program: LadderProgram = {
    title: 'Compiled PLC Program',
    rungs,
  };

  return {
    ladder: allBlocks,
    program,
    explanation,
    instructionList: fullIL,
    warnings,
  };
}
