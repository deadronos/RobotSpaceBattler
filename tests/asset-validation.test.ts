import { execSync } from 'child_process';

test('assets:validate succeeds on example assets', () => {
  try {
    execSync('npm run assets:validate', { stdio: 'pipe' });
  } catch (e: any) {
    const stdout = e.stdout ? e.stdout.toString() : '';
    const stderr = e.stderr ? e.stderr.toString() : '';
    throw new Error(`assets:validate failed. stdout:\n${stdout}\nstderr:\n${stderr}`);
  }
});
