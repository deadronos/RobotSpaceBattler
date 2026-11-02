#!/usr/bin/env node
/**
 * Real-GPU visual measurement harness for #168 (and any visual change).
 *
 * Measures, on a production build served by `vite preview` with `?debug`:
 *   M1  draw calls, triangles, geometries, textures, programs
 *   M2  draw calls as a function of robot count
 *   M3  rAF frame time (mean / p95) with vsync and uncapped fps
 *   M4  console warnings and errors (deduplicated)
 *   M5  a mid-match screenshot under `test-results/` (not committed)
 *   M6  initial-load gzip from `npm run build` against the bundle budget
 *   M7  AI ms/tick from `npm run bench`
 *   M8  opt-in (`--breakdown`) scene dump: lights by type, meshes grouped by
 *       material/triangles/instances/castShadow, programs, and the share of the
 *       frame spent inside `gl.render` (#229-#233)
 *
 * The GPU must be real, following the PR #206 method: headed Chrome with
 * `--use-angle=metal`, Playwright's `--enable-unsafe-swiftshader` dropped, and
 * `--disable-gpu-vsync --disable-frame-rate-limit` for the uncapped run.
 * `UNMASKED_RENDERER_WEBGL` is printed so a software fallback cannot hide.
 *
 * Usage:
 *   node scripts/perf/measure-visuals.js --label=baseline
 *   node scripts/perf/measure-visuals.js --label=step-2 --skip-build --trials=3
 *   node scripts/perf/measure-visuals.js --label=final --bench --breakdown
 *
 * Results go to test-results/visuals/<label>.json and <label>.md.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "playwright";

import {
  summarizeConsole,
  installConsoleCapture,
  openDebugPage,
  readGpuString,
  sampleFrameTimes,
  sampleRendererStats,
  measureRobotScaling,
  captureScreenshot,
  seedPalette,
  waitForCombat,
} from "./visuals/pageMetrics.js";
import {
  aggregateTrials,
  formatReport,
  measureBundleSize,
  runBench,
} from "./visuals/report.js";
import {
  collectSceneBreakdown,
  sampleRenderCallTime,
} from "./visuals/sceneBreakdown.js";

const OUTPUT_DIR = "test-results/visuals";
const MEASURE_MS = 10_000;

function parseArgs(argv) {
  const args = {
    trials: 1,
    bench: false,
    build: true,
    breakdown: false,
    palette: "default",
  };
  for (const arg of argv) {
    if (arg.startsWith("--label=")) args.label = arg.slice("--label=".length);
    else if (arg.startsWith("--trials=")) args.trials = Number(arg.slice(9));
    else if (arg.startsWith("--port=")) args.port = Number(arg.slice(7));
    else if (arg === "--bench") args.bench = true;
    else if (arg === "--skip-build") args.build = false;
    else if (arg === "--breakdown") args.breakdown = true;
    else if (arg.startsWith("--palette=")) args.palette = arg.slice(10);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: process.env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`)),
    );
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) return;
    } catch {
      // Retry until the timeout.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function launchBrowser({ uncapped }) {
  const args = ["--use-angle=metal"];
  if (uncapped) {
    args.push("--disable-gpu-vsync", "--disable-frame-rate-limit");
  }
  return chromium.launch({
    headless: false,
    args,
    // Playwright injects this by default; it breaks the real-GPU measurement.
    ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
  });
}

async function measureOneTrial({
  browsers,
  baseUrl,
  label,
  trial,
  capture,
  breakdown,
  palette,
}) {
  const screenShot = path.join(OUTPUT_DIR, `${label}-trial${trial}.png`);
  const page = await browsers.vsync.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const messages = installConsoleCapture(page);
  await seedPalette(page, palette);
  await openDebugPage(page, `${baseUrl}?debug`);
  await waitForCombat(page);
  const gpu = await readGpuString(page);
  await captureScreenshot(page, screenShot);

  const m1 = await sampleRendererStats(page, 120);
  const vsync = await sampleFrameTimes(page, MEASURE_MS);
  const robotScaling = await measureRobotScaling(page);
  const frameIndex = await page.evaluate(
    () => window.__battleWorld?.state.frameIndex ?? -1,
  );
  await page.close();
  capture.messages.push(...messages);

  const uncappedPage = await browsers.uncapped.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const uncappedMessages = installConsoleCapture(uncappedPage);
  await seedPalette(uncappedPage, palette);
  await openDebugPage(uncappedPage, `${baseUrl}?debug`);
  await waitForCombat(uncappedPage);
  const uncapped = await sampleFrameTimes(uncappedPage, MEASURE_MS);
  // The scene dump is the same for every trial, so it runs once.
  if (breakdown && trial === 1) {
    capture.breakdown = {
      scene: await collectSceneBreakdown(uncappedPage),
      render: await sampleRenderCallTime(uncappedPage),
    };
  }
  await uncappedPage.close();
  capture.messages.push(...uncappedMessages);

  console.log(
    `[measure-visuals] trial ${trial}: ${m1.drawCalls.toFixed(0)} calls, ` +
      `${vsync.fps} fps vsync, ${uncapped.fps} fps uncapped`,
  );

  return { gpu, m1, vsync, uncapped, robotScaling, frameIndex, screenShot };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.label) {
    console.log(
      "Usage: node scripts/perf/measure-visuals.js --label=<name> [--trials=3] [--skip-build] [--bench] [--breakdown] [--palette=colorblind] [--port=4299]",
    );
    return;
  }

  if (args.build) {
    await runCommand("npm", ["run", "build"]);
  }

  const port = args.port ?? 4299;
  const baseUrl = `http://127.0.0.1:${port}/RobotSpaceBattler/`;
  const preview = spawn(
    "npm",
    [
      "run",
      "preview",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { stdio: "ignore", env: process.env },
  );

  const browsers = {
    vsync: await launchBrowser({ uncapped: false }),
    uncapped: await launchBrowser({ uncapped: true }),
  };
  const capture = { messages: [] };

  try {
    await waitForServer(baseUrl);
    const trials = [];
    for (let trial = 1; trial <= args.trials; trial += 1) {
      trials.push(
        await measureOneTrial({
          browsers,
          baseUrl,
          label: args.label,
          trial,
          capture,
          breakdown: args.breakdown,
          palette: args.palette,
        }),
      );
    }

    const bundle = measureBundleSize("dist");
    const bench = args.bench ? runBench() : null;
    const report = {
      label: args.label,
      palette: args.palette,
      gpu: trials[0].gpu,
      generatedAt: new Date().toISOString(),
      trials,
      summary: aggregateTrials(trials),
      robotScaling: trials[0].robotScaling,
      screenshots: trials.map((trial) => trial.screenShot),
      console: summarizeConsole(capture.messages),
      breakdown: capture.breakdown ?? null,
      bundle,
      bench,
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `${args.label}.json`),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    const markdown = formatReport(report);
    fs.writeFileSync(path.join(OUTPUT_DIR, `${args.label}.md`), markdown);
    console.log(`\nGPU: ${report.gpu}\n`);
    console.log(markdown);
  } finally {
    await browsers.vsync.close();
    await browsers.uncapped.close();
    preview.kill("SIGINT");
  }
}

main().catch((error) => {
  console.error("[measure-visuals] failed:", error);
  process.exitCode = 1;
});
