#!/usr/bin/env node

/**
 * Mock RAG Initialization - Creates sample vector database.
 *
 * Usage: npm run rag:init:mock
 */

import { getVectorDatabaseStats, saveVectorDatabase } from '../ai/src/services/embeddingService.ts';

function generateMockEmbedding(text) {
  const vector = new Array(384).fill(0);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash &= hash;
  }

  for (let i = 0; i < vector.length; i++) {
    const seed = (hash + i) * 12345678;
    vector[i] = Math.sin(seed) * 0.5 + 0.5;
  }

  return vector;
}

const SAMPLE_CHUNKS = [
  {
    text: 'Motor Start Stop Control. Use NO contact for start button X0. Use NC contact for stop button X1. Output motor contactor Y0. Wiring pattern: LD X0 AND X1 OUT Y0.',
    source: 'Mitsubishi_PLC_Basics.pdf',
    pageNumber: 45,
  },
  {
    text: 'Safety Interlock Logic. Emergency stop must be NC normally closed contact. Safety interlock X2 prevents motor from running. Design: LD X0 ANI X1 ANI X2 OUT Y0 for safe operation.',
    source: 'Safety_Standards.pdf',
    pageNumber: 78,
  },
  {
    text: 'Timer Delay Application. Use timer T0 with 5 second delay for equipment soft start. After delay, activate output Y0. Timer reset on X1 stop signal. Ladder: LD X0 OUT T0 LD T0 OUT Y0.',
    source: 'Timer_Functions.pdf',
    pageNumber: 112,
  },
  {
    text: 'Conveyor Belt Control. Start button X0, emergency stop X1, and running indicator lamp Y1. Motor contactor Y0. Logic: LD X0 ANI X1 OUT Y0 AND OUT Y1.',
    source: 'Industrial_Applications.pdf',
    pageNumber: 234,
  },
  {
    text: 'Counter Logic for Production Count. Up counter C0 triggered by X0, reset by X1. Count to 100 pieces. Output Y0 when count reached. Use auxiliary relay M0 for status.',
    source: 'Counter_Programming.pdf',
    pageNumber: 156,
  },
];

async function initializeMockRAG() {
  try {
    console.log('\nMock RAG initialization\n');
    console.log('Step 1: Preparing sample chunks...\n');

    console.log(`Prepared ${SAMPLE_CHUNKS.length} sample chunks\n`);
    console.log('Step 2: Generating embeddings for chunks...\n');

    const embeddings = SAMPLE_CHUNKS.map((chunk, index) => {
      const progress = Math.round(((index + 1) / SAMPLE_CHUNKS.length) * 100);
      console.log(`  [${progress}%] Generated embedding for chunk ${index + 1}/${SAMPLE_CHUNKS.length}`);

      return {
        id: `chunk-${index}`,
        text: chunk.text,
        source: chunk.source,
        pageNumber: chunk.pageNumber,
        embedding: generateMockEmbedding(chunk.text),
      };
    });

    console.log(`\nGenerated ${embeddings.length} embeddings\n`);
    console.log('Step 3: Saving embeddings to vector database...\n');
    saveVectorDatabase(embeddings);

    console.log('Step 4: Verification...\n');
    const stats = getVectorDatabaseStats();
    const uniqueSources = new Set(embeddings.map((embedding) => embedding.source)).size;

    console.log('Initialization complete');
    console.log('----------------------------------------');
    console.log(`  Total chunks created:    ${embeddings.length}`);
    console.log(`  Embedding dimension:     ${embeddings[0]?.embedding.length || 0}`);
    console.log(`  Unique source documents: ${uniqueSources}`);
    console.log(`  Database path:           ${stats.path}`);
    console.log('----------------------------------------');
    console.log('\nMock RAG system is ready for testing.\n');
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

initializeMockRAG();
