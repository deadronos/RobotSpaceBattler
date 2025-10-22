/**
 * Contract Test: Performance
 *
 * Runs a headless Chromium instance, navigates to the app, uses the in-page perf harness
 * (window.__perf) and asserts the acceptance criteria.
 *
 * WARNING: This test intentionally performs a real-time measurement. By default it uses
 * a long window (warm-up 10s + measurement 30s). To run a short local smoke run set
 * PERF_SHORT=1 in the environment (warm-up 1s + measurement 3s).
 */

import { describe, it, expect } from 'vitest';
import { chromium } from 'playwright';
import {
  ensurePerfHarness,
  startPerfMeasurement,
  stopPerfMeasurement,
  PerfReport,
} from '../../playwright/utils/perfHelper';

const BASE_URL = process.env.PERF_BASE_URL || process.env.BASE_URL || 'http://localhost:5173';
const SHORT = Boolean(process.env.PERF_SHORT);
const RUN_PERF = process.env.CI === 'true' && process.env.PERF_CI === 'true';

// Only run this long-running contract when PERF_CI is explicitly enabled in CI.
const describePerf = RUN_PERF ? describe : describe.skip;

describePerf('Contract Test: Performance', () => {
  it('should meet FR-010 / FR-017 performance acceptance criteria', async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

      // parameters (short mode for local dev)
      const warmupSeconds = SHORT ? 1 : 10;
      const measurementSeconds = SHORT ? 3 : 30;
      const postBufferMs = 1000; // allow brief post-measurement stabilization

      // ensure harness
      await ensurePerfHarness(page, 20_000);

      // start measurement inside the page
      await startPerfMeasurement(page, { warmupSeconds, targetFrameRate: 60 });

      // wait for warmup + measurement window
      const totalWaitMs = (warmupSeconds + measurementSeconds) * 1000 + postBufferMs;
      await page.waitForTimeout(totalWaitMs);

      const report: PerfReport = await stopPerfMeasurement(page);

      // Basic shape validation
      expect(typeof report.medianFPS).toBe('number');
      expect(typeof report.p5FPS).toBe('number');
      expect(typeof report.totalFrames).toBe('number');
      expect(typeof report.durationMs).toBe('number');

      // Acceptance criteria coming from the performance contract
      // These are intentionally strict and will fail on underpowered test hosts.
      const requiredMedian = 60;
      const requiredP5 = 30;

      // Log the report for CI debugging
      // eslint-disable-next-line no-console
      console.info('Performance report', report);

      expect(report.medianFPS).toBeGreaterThanOrEqual(requiredMedian);
      expect(report.p5FPS).toBeGreaterThanOrEqual(requiredP5);
    } finally {
      await context.close();
      await browser.close();
    }
  }, SHORT ? 20_000 : 70_000 /* timeout: short vs full run */);
});
