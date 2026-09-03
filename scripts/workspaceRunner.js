#!/usr/bin/env node

import { spawn } from 'child_process';

const mode = process.argv[2];
const npmCommand = 'npm';

const runners = {
  dev: [
    { name: 'backend', args: ['--workspace', 'backend', 'run', 'dev'] },
    { name: 'ui', args: ['--workspace', 'ui', 'run', 'dev'] },
  ],
  start: [
    { name: 'backend', args: ['--workspace', 'backend', 'run', 'start'] },
    { name: 'ui', args: ['--workspace', 'ui', 'run', 'start'] },
  ],
};

if (!mode || !(mode in runners)) {
  console.error('Usage: node scripts/workspaceRunner.js <dev|start>');
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

for (const runner of runners[mode]) {
  console.log(`[runner] starting ${runner.name} (${mode})`);

  const child = spawn(npmCommand, runner.args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    if (shuttingDown) {
      return;
    }

    if (code && code !== 0) {
      console.error(`[runner] ${runner.name} exited with code ${code}`);
      shutdown(code);
      return;
    }

    console.log(`[runner] ${runner.name} exited`);
    shutdown(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(`[runner] failed to start ${runner.name}: ${error.message}`);
    shutdown(1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
