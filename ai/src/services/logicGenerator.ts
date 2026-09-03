import { ParsedIntent } from './intentParser';
import { buildRungSchema } from './schemaBuilder';
import { compileRungs } from './compiler';
import { ClarificationResult } from '../types/ir';

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

/**
 * Logic Generator Migration: Orchestrates structured data flow.
 * NL -> parseIntent() -> ParsedIntent -> buildRungSchema() -> RungSchema[] -> compileRungs() -> LogicGenerationResult
 * Zero string templates constructed here.
 */
export function generateLogic(intent: ParsedIntent): LogicGenerationResult | ClarificationResult {
  if (!intent || !intent.type) {
    throw new Error('Invalid intent object provided to generateLogic.');
  }

  // Step 1: Build structured IR RungSchema[] or return ClarificationResult
  const schemaResult = buildRungSchema(intent);
  if (schemaResult.status === 'needs_clarification') {
    return schemaResult;
  }

  // Step 2: Compile RungSchema[] into LogicGenerationResult via pure compiler
  return compileRungs(schemaResult.schemas);
}
