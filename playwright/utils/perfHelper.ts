import type { Page } from '@playwright/test';

/** Minimal local PerfReport type matching the in-app harness. */
export interface PerfBucket {
  startMs: number;
  frames: number;
  fps: number;
}

export interface PerfReport {
  medianFPS: number;
  p5FPS: number;
  totalFrames: number;
  droppedFrames: number;
  durationMs: number;
  buckets: PerfBucket[];
}

export interface PerfOptions {
  warmupSeconds?: number;
  targetFrameRate?: number;
  waitForHarnessTimeoutMs?: number;
}

/**
 * Wait for the perf harness to be present on window (registered by the app).
 *
 * Example:
 * await ensurePerfHarness(page, 5000);
 */
export async function ensurePerfHarness(page: Page, timeoutMs = 5000) {
  await page.waitForFunction(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (window as any).__perf !== 'undefined';
  }, { timeout: timeoutMs });
}

/**
 * Start a measurement on the page harness (waits for harness if needed).
 */
export async function startPerfMeasurement(page: Page, opts?: PerfOptions) {
  await ensurePerfHarness(page, opts?.waitForHarnessTimeoutMs ?? 5000);
  // forward only the harness-safe options
  const payload = { warmupSeconds: opts?.warmupSeconds ?? 10, targetFrameRate: opts?.targetFrameRate ?? 60 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.evaluate((p: any) => (window as any).__perf.startMeasurement(p), payload);
}

/**
 * Stop the existing measurement and return the computed PerfReport.
 * Always resolves to a serializable PerfReport.
 */
export async function stopPerfMeasurement(page: Page): Promise<PerfReport> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report = await page.evaluate(() => (window as any).__perf.stopMeasurement());
  return report as PerfReport;
}

/**
 * Convenience helper: run an action while measuring.
 * Ensures harness present, starts measurement, runs the action, waits for a short buffer
 * and stops measurement, returning the report.
 */
export async function measureWithAction<T = void>(
  page: Page,
  action: () => Promise<T>,
  opts?: PerfOptions & { postActionBufferMs?: number },
): Promise<{ report: PerfReport; result: T }> {
  await startPerfMeasurement(page, opts);
  const result = await action();
  // let the app run a bit after the action to collect stable metrics
  const buffer = opts?.postActionBufferMs ?? 1000;
  await page.waitForTimeout(buffer);
  const report = await stopPerfMeasurement(page);
  return { report, result };
}

/**
 * Assert that the report meets acceptance thresholds. Throws (via expect) if not.
 * Import `expect` from Playwright in your test and pass it in so this helper stays test-runner-agnostic.
 */
export function assertPerfAcceptance(
  report: PerfReport,
  thresholds: { medianFPS?: number; p5FPS?: number },
) {
  if (typeof thresholds.medianFPS === 'number') {
    if (report.medianFPS < thresholds.medianFPS) {
      throw new Error(`Median FPS ${report.medianFPS} below threshold ${thresholds.medianFPS}`);
    }
  }
  if (typeof thresholds.p5FPS === 'number') {
    if (report.p5FPS < thresholds.p5FPS) {
      throw new Error(`p5 FPS ${report.p5FPS} below threshold ${thresholds.p5FPS}`);
    }
  }
}

/** Example usage in a Playwright test:

import { test, expect } from '@playwright/test';
import { measureWithAction, assertPerfAcceptance } from '../utils/perfHelper';

test('performance smoke', async ({ page }) => {
  await page.goto('http://localhost:5174');
  const { report } = await measureWithAction(page, async () => {
    // perform actions that exercise the simulation or rendering
    await page.click('button#start');
    await page.waitForSelector('text=Victory', { timeout: 30000 });
  }, { warmupSeconds: 10, targetFrameRate: 60, postActionBufferMs: 2000 });

  // enforce contract thresholds
  assertPerfAcceptance(report, { medianFPS: 60, p5FPS: 30 });
});

*/