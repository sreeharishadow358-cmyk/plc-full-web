import { parseIntent, ParsedIntent } from '../../../ai/src/services/intentParser';
import { generateLogic } from '../../../ai/src/services/logicGenerator';

export interface LogicGenerationResult {
  status?: 'needs_clarification' | 'generation_rejected';
  questions?: string[];
  reasons?: string[];
  ladder?: Array<{ type: 'contact' | 'contact_nc' | 'coil'; label: string }>;
  program?: any;
  explanation: string;
  instructionList: string;
  warnings: string[];
}

/**
 * End-to-end PLC logic generation service using IR Compiler & Contradiction Detection architecture.
 * Flow: User NL prompt → parseIntent() → detectContradictions() → buildRungSchema() → compileRungs() → Ladder JSON
 */
export const generatePlcLogic = async (input: string): Promise<LogicGenerationResult> => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Input instruction cannot be empty.');
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  const intent: ParsedIntent = parseIntent(trimmed);
  const aiResult = generateLogic(intent);

  if ('status' in aiResult && aiResult.status === 'generation_rejected') {
    return {
      status: 'generation_rejected',
      reasons: aiResult.reasons,
      explanation: `### Generation Rejected (Contradiction Detected)\n\nThe requested PLC logic contains safety or operational contradictions:\n\n` +
        aiResult.reasons.map((r) => `- ❌ ${r}`).join('\n') +
        `\n\nCompilation aborted to protect equipment and operator safety.`,
      instructionList: '; Compilation rejected due to detected contradiction.\n; No ladder produced.',
      warnings: aiResult.reasons,
    };
  }

  if ('status' in aiResult && aiResult.status === 'needs_clarification') {
    return {
      status: 'needs_clarification',
      questions: aiResult.questions,
      explanation: `### Clarification Required\n\nThe provided instruction "${trimmed}" is ambiguous. Please specify the following details:\n\n` +
        aiResult.questions.map((q) => `- ${q}`).join('\n'),
      instructionList: '; Clarification required before compilation.\n; No ladder produced.',
      warnings: ['Specification incomplete. Enter exact I/O addresses to proceed.'],
    };
  }

  return {
    ladder: aiResult.ladder,
    program: aiResult.program,
    explanation: aiResult.explanation,
    instructionList: aiResult.instructionList,
    warnings: aiResult.warnings,
  };
};
