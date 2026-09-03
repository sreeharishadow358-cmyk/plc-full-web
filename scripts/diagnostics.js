#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function section(title) {
  console.log(`\n== ${title} ==\n`);
}

function pass(message) {
  console.log(`[pass] ${message}`);
  passCount++;
}

function fail(message) {
  console.log(`[fail] ${message}`);
  failCount++;
}

function warn(message) {
  console.log(`[warn] ${message}`);
  warnCount++;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const fileContents = fs.readFileSync(filePath, 'utf8');

  for (const line of fileContents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }

  return env;
}

function getMergedEnv() {
  return {
    ...parseEnvFile(path.join(projectRoot, '.env')),
    ...parseEnvFile(path.join(projectRoot, '.env.local')),
    ...process.env,
  };
}

async function runDiagnostics() {
  const env = getMergedEnv();
  const { getVectorDatabaseStats } = await import('../ai/src/services/embeddingService.ts');

  section('Workspace');

  const nodeVersion = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
  if (nodeVersion >= 18) {
    pass(`Node.js ${process.version}`);
  } else {
    fail(`Node.js ${process.version} is too old; Node 18+ is recommended`);
  }

  if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
    pass('node_modules directory exists');
  } else {
    fail('node_modules directory is missing');
  }

  const workspacePackages = ['package.json', 'ui/package.json', 'backend/package.json', 'ai/package.json'];
  for (const relativePath of workspacePackages) {
    if (fs.existsSync(path.join(projectRoot, relativePath))) {
      pass(`${relativePath} found`);
    } else {
      fail(`${relativePath} is missing`);
    }
  }

  section('Environment');

  if (env.GROQ_API_KEY && !String(env.GROQ_API_KEY).includes('your_')) {
    pass('GROQ_API_KEY is configured');
  } else {
    fail('GROQ_API_KEY is missing or still using the example value');
  }

  if (env.NEXT_PUBLIC_API_BASE_URL) {
    pass(`NEXT_PUBLIC_API_BASE_URL=${env.NEXT_PUBLIC_API_BASE_URL}`);
  } else {
    warn('NEXT_PUBLIC_API_BASE_URL is not set; the UI will use http://localhost:4000');
  }

  if (env.FRONTEND_ORIGIN) {
    pass(`FRONTEND_ORIGIN=${env.FRONTEND_ORIGIN}`);
  } else {
    warn('FRONTEND_ORIGIN is not set; the backend will allow http://localhost:3000 by default');
  }

  section('Dataset');

  const datasetPath = path.join(projectRoot, 'dataset');
  if (!fs.existsSync(datasetPath)) {
    fail('dataset directory is missing');
  } else {
    pass('dataset directory found');
    const pdfFiles = fs.readdirSync(datasetPath).filter((file) => file.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length > 0) {
      pass(`found ${pdfFiles.length} PDF file(s)`);
      pdfFiles.forEach((file) => console.log(`       - ${file}`));
    } else {
      warn('no PDF files found in dataset');
    }
  }

  section('RAG Source Files');

  const requiredFiles = [
    'ai/src/services/pdfProcessor.ts',
    'ai/src/services/embeddingService.ts',
    'ai/src/services/ragService.ts',
    'backend/src/routes/generateLogic.ts',
    'scripts/initializeRAG.js',
    'scripts/testPipeline.js',
  ];

  for (const relativePath of requiredFiles) {
    if (fs.existsSync(path.join(projectRoot, relativePath))) {
      pass(relativePath);
    } else {
      fail(`${relativePath} is missing`);
    }
  }

  section('Vector Database');

  const stats = getVectorDatabaseStats();
  if (stats.exists) {
    pass(`vector database found at ${path.relative(projectRoot, stats.path)}`);
    pass(`embedding count: ${stats.count}`);
  } else {
    warn(`vector database not initialized at ${path.relative(projectRoot, stats.path)}`);
  }

  const metadataPath = path.join(stats.path, 'metadata.json');
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      if (metadata.model) {
        pass(`embedding model: ${metadata.model}`);
      }
      if (metadata.embeddingDim || metadata.embeddingDimension) {
        pass(`embedding dimension: ${metadata.embeddingDim || metadata.embeddingDimension}`);
      }
    } catch (error) {
      warn(`unable to parse vector metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    warn('metadata.json is missing from the vector database');
  }

  section('Documentation');

  const docs = ['RAG_SETUP.md', 'RAG_QUICKSTART.md'];
  for (const relativePath of docs) {
    if (fs.existsSync(path.join(projectRoot, relativePath))) {
      pass(`${relativePath} found`);
    } else {
      warn(`${relativePath} not found`);
    }
  }

  section('Summary');
  console.log(`Passed:   ${passCount}`);
  console.log(`Failed:   ${failCount}`);
  console.log(`Warnings: ${warnCount}`);

  if (failCount === 0) {
    console.log('\nSystem check completed without blocking failures.');
  } else {
    console.log('\nSystem check found blocking issues that should be fixed first.');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runDiagnostics().catch((error) => {
  console.error(`Diagnostic error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
