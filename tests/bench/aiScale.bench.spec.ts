// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  buildScenarioWorld,
  createLcg,
  measureAllocationsPerTick,
  stepScenario,
  type ScenarioProbe,
} from "../helpers/aiScenario";

/**
 * Headless AI + combat micro-benchmark at 20 / 100 / 200 robots (#171).
 *
 * Under `npm test` this is a quick smoke run. `npm run bench` sets
 * RUN_BENCH=1 for a full measurement and prints a markdown table; the numbers
 * are recorded in tests/bench/RESULTS.md.
 */
const FULL = process.env.RUN_BENCH === "1";
const TICKS = FULL ? 600 : 10;
const WARMUP = FULL ? 150 : 2;
const COUNTS = [20, 100, 200];

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function timeTicks(count: number): { median: number; p95: number } {
  const world = buildScenarioWorld(count);
  const rng = createLcg(1);
  const samples: number[] = [];
  let tickMs = 0;
  const probe: ScenarioProbe = (_phase, run) => {
    const start = performance.now();
    run();
    tickMs += performance.now() - start;
  };
  for (let tick = 0; tick < WARMUP + TICKS; tick += 1) {
    tickMs = 0;
    stepScenario(world, rng, tick, 1 / 60, probe);
    if (tick >= WARMUP) samples.push(tickMs);
  }
  samples.sort((a, b) => a - b);
  return { median: percentile(samples, 0.5), p95: percentile(samples, 0.95) };
}

describe("AI + combat scaling benchmark", () => {
  it("runs 20 / 100 / 200 robots headlessly", () => {
    const rows: string[] = [
      "| robots | median ms/tick | p95 ms/tick | AI KB/tick | combat B/shot |",
      "| ---: | ---: | ---: | ---: | ---: |",
    ];
    for (const count of COUNTS) {
      const time = timeTicks(count);
      const alloc = measureAllocationsPerTick(count, FULL ? 30 : 2, WARMUP);
      expect(time.median).toBeGreaterThan(0);
      rows.push(
        `| ${count} | ${time.median.toFixed(3)} | ${time.p95.toFixed(3)} | ${(alloc.aiBytes / 1024).toFixed(1)} | ${alloc.combatBytes.toFixed(0)} |`,
      );
    }
    if (FULL) process.stdout.write(`\n${rows.join("\n")}\n`);
  }, 120000);
});
