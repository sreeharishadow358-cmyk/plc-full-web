import { detectContradictions } from './contradictionDetector.js';
import { buildRungSchema } from './schemaBuilder.js';
import { compileRungs } from './compiler.js';

export function generateLogic(intent) {
  if (!intent || !intent.type) {
    throw new Error('Invalid intent object provided to generateLogic.');
  }

  const contradictionResult = detectContradictions(intent);
  if (contradictionResult.hasContradiction) {
    return {
      status: 'generation_rejected',
      reasons: contradictionResult.issues.map((i) => i.message),
      providedPrompt: intent.rawPrompt,
    };
  }

  const schemaResult = buildRungSchema(intent);
  if (schemaResult.status === 'needs_clarification') {
    return schemaResult;
  }

  return compileRungs(schemaResult.schemas);
}
