// NOTE: This contract test is intentionally run under Playwright's test runner.
// The file uses runtime Playwright fixtures and real-time measurement. To avoid
// tight coupling with the repo's TypeScript fixture typing setup this file
// disables TS checking. If you prefer strict typing for Playwright tests,
// consider moving to a shared Playwright fixture module and enabling types.
// @ts-nocheck
/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { PerfReport } from '../utils/perfHelper';
import { ensurePerfHarness, startPerfMeasurement, stopPerfMeasurement } from '../utils/perfHelper';

const BASE_URL = process.env.PERF_BASE_URL || process.env.BASE_URL || 'http://localhost:5173';
const SHORT = Boolean(process.env.PERF_SHORT);

// CI-only guard: require PERF_CI=true in the environment to run these heavy perf contracts.
test.skip(!(process.env.CI === 'true' && process.env.PERF_CI === 'true'), 'skipping performance contract — requires CI=true && PERF_CI=true');

// Playwright fixture-based contract test
test('contract/performance — acceptance', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const warmupSeconds = SHORT ? 1 : 10;
  const measurementSeconds = SHORT ? 3 : 30;
  const bufferMs = 1000;

  await ensurePerfHarness(page, 20_000);
  await startPerfMeasurement(page, { warmupSeconds, targetFrameRate: 60 });
  await page.waitForTimeout((warmupSeconds + measurementSeconds) * 1000 + bufferMs);
  const report: PerfReport = await stopPerfMeasurement(page);

  // Log for CI debugging
  console.info('playwright perf report', report);

  expect(report.medianFPS).toBeGreaterThanOrEqual(60);
  expect(report.p5FPS).toBeGreaterThanOrEqual(30);
}, SHORT ? { timeout: 20_000 } : { timeout: 70_000 });
