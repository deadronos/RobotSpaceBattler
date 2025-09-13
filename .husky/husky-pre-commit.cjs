#!/usr/bin/env node
// Cross-platform husky pre-commit wrapper — runs lint-staged using Node so hooks avoid env/sh plumbing issues
const { spawn } = require('child_process');

function runLintStaged() {
  // Use local binary if available to avoid relying on global npx
  const path = require('path');
  const fs = require('fs');
  const localBin = path.join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'lint-staged.cmd' : 'lint-staged');
  const useLocal = fs.existsSync(localBin);

  const cmd = useLocal ? localBin : 'npx';
  const args = useLocal ? [] : ['--no', '--', 'lint-staged'];

  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });

  p.on('close', (code) => {
    process.exit(code);
  });

  p.on('error', (err) => {
    console.error('Failed to run lint-staged:', err);
    process.exit(1);
  });
}

runLintStaged();
