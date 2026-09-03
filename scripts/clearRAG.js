#!/usr/bin/env node

/**
 * RAG Database Clear Script
 * 
 * Clears the vector database cache.
 * Useful for:
 * - Resetting before reinitialization
 * - Troubleshooting
 * - Freeing disk space
 * 
 * Usage: npm run rag:clear
 */

import { clearVectorDatabase, getVectorDatabaseStats } from '../ai/src/services/embeddingService.ts';

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    RAG DATABASE CLEAR                                      ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

const statsBefore = getVectorDatabaseStats();
console.log(`\n📊 Before: ${statsBefore.count} embeddings in database`);

clearVectorDatabase();

const statsAfter = getVectorDatabaseStats();
console.log(`📊 After: ${statsAfter.count} embeddings in database\n`);

console.log('✅ RAG database cleared successfully\n');
console.log('ℹ️ To reinitialize, run: npm run rag:init\n');
