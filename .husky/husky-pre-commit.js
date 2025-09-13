#!/usr/bin/env node
// Cross-platform husky pre-commit wrapper — runs lint-staged using Node so hooks avoid env/sh plumbing issues
const { spawn } = require('child_process');

function runLintStaged() {
  const cmd = 'npx';
  const args = ['--no', '--', 'lint-staged'];

  const p = spawn(cmd, args, { stdio: 'inherit' });

  p.on('close', (code) => {
    process.exit(code);
  });

  p.on('error', (err) => {
    console.error('Failed to run lint-staged:', err);
    process.exit(1);
  });
}

runLintStaged();
