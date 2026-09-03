#!/usr/bin/env node

/**
 * RAG System Initialization Script
 * 
 * This script initializes the RAG system by:
 * 1. Loading all PDFs from the dataset folder
 * 2. Extracting text using pdf-parse
 * 3. Splitting into chunks
 * 4. Generating embeddings
 * 5. Storing in local vector database
 * 
 * Usage: npm run rag:init
 * Or:    node scripts/initializeRAG.js
 * 
 * This should be run ONCE after setup, or whenever you update the PDF dataset.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Import RAG modules
import { processPDFs } from '../ai/src/services/pdfProcessor.ts';
import { generateEmbedding, saveVectorDatabase, clearVectorDatabase, getVectorDatabaseStats } from '../ai/src/services/embeddingService.ts';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                 RAG SYSTEM INITIALIZATION                                  ║
║              PDF Processing & Vector Database Creation                     ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

/**
 * Main initialization function
 */
async function initializeRAG() {
  try {
    console.log('📋 STEP 1: Processing PDFs from dataset folder...\n');
    
    // Process all PDFs and split into chunks
    const chunks = await processPDFs();
    
    if (chunks.length === 0) {
      console.error('❌ No chunks extracted from PDFs');
      process.exit(1);
    }

    console.log(`\n✅ Successfully extracted ${chunks.length} chunks from PDFs\n`);

    // Generate embeddings for each chunk
    console.log('📋 STEP 2: Generating embeddings for chunks...\n');
    console.log('   (This may take a few minutes on first run)\n');

    const embeddings = [];
    let processedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Generate embedding
        const embedding = await generateEmbedding(chunk.text);

        embeddings.push({
          id: `chunk-${i}`,
          text: chunk.text,
          source: chunk.source,
          pageNumber: chunk.pageNumber,
          embedding,
        });

        processedCount++;

        // Progress indicator
        const progress = Math.round((processedCount / chunks.length) * 100);
        const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
        process.stdout.write(`\r  [${progressBar}] ${progress}% (${processedCount}/${chunks.length} chunks)`);

      } catch (error) {
        console.error(`\n⚠️ Failed to embed chunk ${i}:`, error);
        // Continue with next chunk
      }
    }

    console.log('\n');
    console.log(`✅ Generated embeddings for ${embeddings.length} chunks\n`);

    if (embeddings.length === 0) {
      console.error('❌ No embeddings generated');
      process.exit(1);
    }

    // Save embeddings to vector database
    console.log('📋 STEP 3: Saving embeddings to vector database...\n');
    
    saveVectorDatabase(embeddings);

    // Display completion stats
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ INITIALIZATION COMPLETE                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const stats = getVectorDatabaseStats();
    console.log(`
📊 STATISTICS:
  • Embeddings stored: ${stats.count}
  • Embedding dimension: ${stats.embeddingDim}
  • Database location: ${path.relative(projectRoot, stats.path)}
  • Database size: ~${(stats.count * stats.embeddingDim * 4 / 1024 / 1024).toFixed(2)} MB (embeddings only)

🚀 RAG System is now ready for use!

Next steps:
  1. Start the development server: npm run dev
  2. Try generating ladder logic - context from PDFs will be retrieved automatically
  3. View logs to see RAG activity: [RAG] prefix in console

ℹ️ To reinitialize with updated PDFs, run this script again.
`);

  } catch (error) {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeRAG().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
