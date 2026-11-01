import { execSync } from "node:child_process";

/**
 * Runs the headless AI + combat micro-benchmark (20 / 100 / 200 robots).
 * Delegates to the Vitest bench spec with RUN_BENCH=1 so it prints the full
 * results table instead of the quick smoke run.
 */
function main() {
  const cmd = "npx vitest run tests/bench/aiScale.bench.spec.ts";
  console.log(`[ai-bench] running: ${cmd}`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      env: { ...process.env, RUN_BENCH: "1" },
    });
  } catch (err) {
    console.error("[ai-bench] failed", err);
    process.exit(1);
  }
}

main();
