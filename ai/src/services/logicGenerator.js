import { buildRungSchema } from './schemaBuilder.js';
import { compileRungs } from './compiler.js';

/**
 * Logic Generator Migration: Orchestrates structured data flow.
 * NL -> parseIntent() -> ParsedIntent -> buildRungSchema() -> RungSchema[] -> compileRungs() -> LogicGenerationResult
 * Zero string templates constructed here.
 */
export function generateLogic(intent) {
  if (!intent || !intent.type) {
    throw new Error('Invalid intent object provided to generateLogic.');
  }

  const schemaResult = buildRungSchema(intent);
  if (schemaResult.status === 'needs_clarification') {
    return schemaResult;
  }

  return compileRungs(schemaResult.schemas);
}
