// Page-side measurements for scripts/perf/measure-visuals.js (#168).
//
// Everything here runs against a production build served by `vite preview`
// with `?debug`, which exposes `window.__battleWorld` (ECS state),
// `window.__robotScene` ({scene, camera, gl}) and `window.__rendererStats`
// (per-frame snapshot from src/visuals/rendererStats.ts).
//
// The GPU must be real: launch headed Chrome with `--use-angle=metal` and
// without Playwright's `--enable-unsafe-swiftshader` (see PR #206).

/** Persisted accessibility preference for the #166 team palette. */
const COLOR_BLIND_PALETTE_KEY = "a11y.colorBlindPalette";

/**
 * Seeds the persisted colour-blind team palette before the app loads (#166),
 * so a `--palette=colorblind` run measures and screenshots the same scene the
 * accessibility settings produce.
 */
export async function seedPalette(page, palette) {
  if (palette !== "colorblind") return;
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage can be unavailable; the run then keeps the default palette.
    }
  }, COLOR_BLIND_PALETTE_KEY);
}

/** Collects console output so the harness can report warnings and errors. */
export function installConsoleCapture(page) {
  const messages = [];
  page.on("console", (message) => {
    messages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    messages.push({ type: "pageerror", text: error.message });
  });
  return messages;
}

/** Reads the GPU string the browser actually uses. */
export async function readGpuString(page) {
  return page.evaluate(() => {
    const gl = window.__robotScene?.gl;
    const context = gl?.getContext();
    const extension = context?.getExtension("WEBGL_debug_renderer_info");
    if (!context || !extension) {
      return "unavailable";
    }
    return context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
  });
}

/** Opens the app in debug mode and waits for the simulation to advance. */
export async function openDebugPage(page, url, { minFrameIndex = 300 } = {}) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await page.waitForFunction(
    (min) => (window.__battleWorld?.state.frameIndex ?? -1) >= min,
    minFrameIndex,
    { timeout: 120_000 },
  );
}

/**
 * Waits until robots exist and combat has produced effects, so screenshots and
 * draw-call numbers are taken mid-match rather than during the spawn ramp.
 */
export async function waitForCombat(page, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const state = await page.evaluate(() => ({
      robots: window.__battleWorld?.robots.entities.length ?? 0,
      effects: window.__battleWorld?.effects.entities.length ?? 0,
      frameIndex: window.__battleWorld?.state.frameIndex ?? 0,
    }));
    if (state.robots > 0 && state.effects > 0) {
      return state;
    }
    await page.waitForTimeout(250);
  }
  return page.evaluate(() => ({
    robots: window.__battleWorld?.robots.entities.length ?? 0,
    effects: window.__battleWorld?.effects.entities.length ?? 0,
    frameIndex: window.__battleWorld?.state.frameIndex ?? 0,
  }));
}

/** M1: renderer counters, sampled per frame and averaged. */
export async function sampleRendererStats(page, frames = 120) {
  const samples = await page.evaluate(
    (frameCount) =>
      new Promise((resolve) => {
        const calls = [];
        const triangles = [];
        let seen = 0;
        const step = () => {
          const stats = window.__rendererStats;
          if (stats) {
            calls.push(stats.drawCalls);
            triangles.push(stats.triangles);
          }
          seen += 1;
          if (seen < frameCount) {
            requestAnimationFrame(step);
          } else {
            resolve({ calls, triangles });
          }
        };
        requestAnimationFrame(step);
      }),
    frames,
  );

  const latest = await page.evaluate(() => {
    const stats = window.__rendererStats ?? {};
    const gl = window.__robotScene?.gl;
    return {
      geometries: stats.geometries ?? -1,
      textures: stats.textures ?? -1,
      programs: gl?.info.programs?.length ?? -1,
      robots: window.__battleWorld?.robots.entities.length ?? -1,
      frameIndex: window.__battleWorld?.state.frameIndex ?? -1,
    };
  });

  return {
    drawCalls: average(samples.calls),
    triangles: average(samples.triangles),
    drawCallMax: Math.max(...samples.calls, 0),
    ...latest,
  };
}

/** M3: requestAnimationFrame deltas over `durationMs`. */
export async function sampleFrameTimes(page, durationMs = 10_000) {
  const measurement = await page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const deltas = [];
        const startFrame = window.__battleWorld?.state.frameIndex ?? -1;
        const start = performance.now();
        let last = start;
        const step = (now) => {
          deltas.push(now - last);
          last = now;
          if (now - start < duration) {
            requestAnimationFrame(step);
            return;
          }
          resolve({
            deltas,
            durationMs: now - start,
            startFrame,
            endFrame: window.__battleWorld?.state.frameIndex ?? -1,
          });
        };
        requestAnimationFrame(step);
      }),
    durationMs,
  );

  return {
    ...summarizeDeltas(measurement.deltas, measurement.durationMs),
    simSteps: measurement.endFrame - measurement.startFrame,
  };
}

/**
 * M2: robot draw calls as a function of robot count.
 *
 * Draw calls are measured with the full roster and then after removing robots
 * from the ECS (half the roster per team, then everything). This works for an
 * instanced build and for the per-robot placeholder meshes it replaces, and it
 * needs no knowledge of the scene graph. Removing robots is destructive, so
 * this is the last measurement of a page session.
 */
export async function measureRobotScaling(page, { frames = 45 } = {}) {
  const sample = async () => {
    const values = await page.evaluate(
      (frameCount) =>
        new Promise((resolve) => {
          const calls = [];
          let seen = 0;
          const step = () => {
            const stats = window.__rendererStats;
            if (stats) calls.push(stats.drawCalls);
            seen += 1;
            if (seen < frameCount) requestAnimationFrame(step);
            else resolve(calls);
          };
          requestAnimationFrame(step);
        }),
      frames,
    );
    return Math.round(average(values));
  };
  const robotCount = () =>
    page.evaluate(() => window.__battleWorld?.robots.entities.length ?? -1);
  const keepPerTeam = (keep) =>
    page.evaluate((perTeam) => {
      const world = window.__battleWorld;
      if (!world) return;
      const robots = [...world.robots.entities];
      for (const team of ["red", "blue"]) {
        const doomed = robots
          .filter((robot) => robot.team === team)
          .slice(perTeam);
        for (const robot of doomed) world.world.remove(robot);
      }
    }, keep);

  const steps = [];
  steps.push({ robots: await robotCount(), drawCalls: await sample() });
  const half = await page.evaluate(() => {
    const world = window.__battleWorld;
    if (!world) return 0;
    const roster = world.robots.entities;
    const red = roster.filter((robot) => robot.team === "red").length;
    const blue = roster.filter((robot) => robot.team === "blue").length;
    return Math.floor(Math.min(red, blue) / 2);
  });
  await keepPerTeam(half);
  await page.waitForTimeout(200);
  steps.push({ robots: await robotCount(), drawCalls: await sample() });
  await keepPerTeam(0);
  steps.push({ robots: await robotCount(), drawCalls: await sample() });
  return steps;
}

/** M5: screenshot under the gitignored `test-results/` tree. */
export async function captureScreenshot(page, file) {
  await page.screenshot({ path: file });
  return file;
}

function average(values) {
  if (values.length === 0) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}

/** Mean, p95 and fps from rAF deltas. */
export function summarizeDeltas(deltas, durationMs) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const mean = average(sorted);
  const p95 =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const duration = durationMs ?? sorted.reduce((sum, value) => sum + value, 0);
  return {
    frames: sorted.length,
    meanMs: round(mean),
    p95Ms: round(p95),
    maxMs: round(sorted[sorted.length - 1] ?? 0),
    fps: round(duration > 0 ? (sorted.length / duration) * 1000 : 0),
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

/** M4: deduplicated console warnings and errors, with counts. */
export function summarizeConsole(allMessages) {
  const seen = new Map();
  for (const message of allMessages) {
    if (
      message.type !== "warning" &&
      message.type !== "error" &&
      message.type !== "pageerror"
    ) {
      continue;
    }
    const key = `${message.type}: ${message.text}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()]
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count);
}
