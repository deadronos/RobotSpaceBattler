import { execSync } from 'node:child_process';

/**
 * Convenience runner for the obstacle stress test.
 * Delegates to the Vitest stress spec to reuse TypeScript sources without separate build plumbing.
 */
function main() {
  const cmd = 'npm run test -- tests/stress/obstacles.stress.spec.ts';
  console.log(`[obstacle-stress] running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('[obstacle-stress] completed');
  } catch (err) {
    console.error('[obstacle-stress] failed', err);
    process.exit(1);
  }
}

main();
