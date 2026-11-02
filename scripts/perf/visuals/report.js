// Build-level measurements (M6, M7) and markdown reporting for
// scripts/perf/measure-visuals.js (#168).

import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { measureBundle } from "../../bundle-size.js";

const BUDGET_FILE = "scripts/bundle-budget.json";

/** M6: initial-load gzip from the production build, plus the budget. */
export function measureBundleSize(distDir = "dist") {
  const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
  const result = measureBundle(distDir);
  return {
    initialGzipKb: result.initial.gzipKb,
    totalGzipKb: result.total.gzipKb,
    budgetInitialGzipKb: budget.initialGzipKb,
    budgetTotalGzipKb: budget.totalGzipKb,
    withinBudget:
      result.initial.gzipKb <= budget.initialGzipKb &&
      result.total.gzipKb <= budget.totalGzipKb,
  };
}

/** M7: `npm run bench` AI ms/tick, parsed from the printed markdown table. */
export function runBench() {
  let output = "";
  try {
    output = execFileSync("npm", ["run", "bench"], {
      encoding: "utf8",
      env: { ...process.env, RUN_BENCH: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}${error.message}`;
  }

  const rows = [];
  for (const line of output.split("\n")) {
    const match = /^\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/.exec(
      line.trim(),
    );
    if (match) {
      rows.push({
        robots: Number(match[1]),
        medianMs: Number(match[2]),
        p95Ms: Number(match[3]),
      });
    }
  }
  return { rows, raw: output };
}

/** Aggregates repeated trials into mean/p95 per metric. */
export function aggregateTrials(trials) {
  const pick = (fn) => trials.map(fn);
  return {
    drawCalls: round(average(pick((trial) => trial.m1.drawCalls))),
    triangles: Math.round(average(pick((trial) => trial.m1.triangles))),
    geometries: Math.round(average(pick((trial) => trial.m1.geometries))),
    textures: Math.round(average(pick((trial) => trial.m1.textures))),
    programs: Math.round(average(pick((trial) => trial.m1.programs))),
    vsyncMeanMs: round(average(pick((trial) => trial.vsync.meanMs))),
    vsyncP95Ms: round(average(pick((trial) => trial.vsync.p95Ms))),
    vsyncFps: round(average(pick((trial) => trial.vsync.fps))),
    uncappedFps: round(average(pick((trial) => trial.uncapped.fps))),
    uncappedMeanMs: round(average(pick((trial) => trial.uncapped.meanMs))),
    // Spread across trials, so "within noise" has a number.
    p95SpreadMs: round(spread(pick((trial) => trial.vsync.p95Ms))),
    uncappedFpsSpread: round(spread(pick((trial) => trial.uncapped.fps))),
  };
}

export function formatReport(report) {
  const lines = [];
  lines.push(`# Visual measurement: ${report.label}`);
  lines.push("");
  lines.push(`- GPU: ${report.gpu}`);
  lines.push(`- Trials: ${report.trials.length}`);
  lines.push(
    `- Sim frames per trial: ${report.trials.map((t) => t.frameIndex).join(", ")}`,
  );
  lines.push("");
  lines.push("## M1 renderer counters");
  lines.push("");
  lines.push("| draw calls | triangles | geometries | textures | programs |");
  lines.push("| ---: | ---: | ---: | ---: | ---: |");
  lines.push(
    `| ${report.summary.drawCalls} | ${report.summary.triangles} | ${report.summary.geometries} | ${report.summary.textures} | ${report.summary.programs} |`,
  );
  lines.push("");
  lines.push("## M2 draw calls vs robot count");
  lines.push("");
  lines.push("| robots | draw calls (trial 1) |");
  lines.push("| ---: | ---: |");
  for (const step of report.robotScaling) {
    lines.push(`| ${step.robots} | ${step.drawCalls} |`);
  }
  lines.push("");
  lines.push("## M3 frame time (10 s rAF deltas)");
  lines.push("");
  lines.push("| mode | fps | mean ms | p95 ms | max ms |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  lines.push(
    `| vsync | ${report.summary.vsyncFps} | ${report.summary.vsyncMeanMs} | ${report.summary.vsyncP95Ms} | ${report.trials[0].vsync.maxMs} |`,
  );
  lines.push(
    `| uncapped | ${report.summary.uncappedFps} | ${report.summary.uncappedMeanMs} | ${report.trials[0].uncapped.p95Ms} | ${report.trials[0].uncapped.maxMs} |`,
  );
  lines.push("");
  lines.push(
    `Noise across trials: p95 ±${report.summary.p95SpreadMs} ms, uncapped fps ±${report.summary.uncappedFpsSpread}.`,
  );
  lines.push("");
  lines.push("## M4 console");
  lines.push("");
  if (report.console.length === 0) {
    lines.push("No warnings or errors.");
  } else {
    for (const entry of report.console) {
      lines.push(`- ${entry.count}× \`${entry.text}\``);
    }
  }
  lines.push("");
  lines.push("## M5 screenshot");
  lines.push("");
  for (const file of report.screenshots) {
    lines.push(`- ${file}`);
  }
  lines.push("");
  lines.push("## M6 bundle (gzip)");
  lines.push("");
  lines.push(
    `- initial load ${report.bundle.initialGzipKb} kB (budget ${report.bundle.budgetInitialGzipKb} kB)`,
  );
  lines.push(
    `- whole bundle ${report.bundle.totalGzipKb} kB (budget ${report.bundle.budgetTotalGzipKb} kB)`,
  );
  lines.push(`- within budget: ${report.bundle.withinBudget}`);
  if (report.bench) {
    lines.push("");
    lines.push("## M7 AI bench (ms/tick)");
    lines.push("");
    lines.push("| robots | median | p95 |");
    lines.push("| ---: | ---: | ---: |");
    for (const row of report.bench.rows) {
      lines.push(`| ${row.robots} | ${row.medianMs} | ${row.p95Ms} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function spread(values) {
  if (values.length === 0) return 0;
  return (Math.max(...values) - Math.min(...values)) / 2;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
