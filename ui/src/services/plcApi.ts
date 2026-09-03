import { parseIntent, ParsedIntent } from '../../../ai/src/services/intentParser';
import { generateLogic, LogicGenerationResult as AILogicGenerationResult } from '../../../ai/src/services/logicGenerator';

export interface LogicGenerationResult {
  ladder: Array<{ type: 'contact' | 'contact_nc' | 'coil'; label: string }>;
  program: any;
  explanation: string;
  instructionList: string;
  warnings: string[];
}

/**
 * End-to-end PLC logic generation service.
 * Flow: User NL prompt → parseIntent() → structured intent object → generateLogic() → ladder JSON
 */
export const generatePlcLogic = async (input: string): Promise<LogicGenerationResult> => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Input instruction cannot be empty.');
  }

  // Artificial short realistic delay for IDE experience
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Step 1: User NL prompt → parseIntent() → structured intent object
  const intent: ParsedIntent = parseIntent(trimmed);

  // Step 2: structured intent object → generateLogic() → ladder JSON
  const aiResult: AILogicGenerationResult = generateLogic(intent);

  return {
    ladder: aiResult.ladder,
    program: aiResult.program,
    explanation: aiResult.explanation,
    instructionList: aiResult.instructionList,
    warnings: aiResult.warnings,
  };
};
