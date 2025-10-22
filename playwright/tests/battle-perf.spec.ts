import { test, expect } from '../fixtures/perfFixture';

const WARMUP_SECONDS = 2;
const TARGET_FPS = 60;

test.describe('Battle performance', () => {
  test('hits target frame rates during sample round', async ({ page, perf }, testInfo) => {
    await page.goto('/');

    const { report } = await perf.measure(
      async () => {
        await page.waitForTimeout(2_000);
      },
      { warmupSeconds: WARMUP_SECONDS, targetFrameRate: TARGET_FPS, postActionBufferMs: 1_000 }
    );

    await testInfo.attach('battle-perf-report', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });

    expect(report.medianFPS).toBeGreaterThanOrEqual(60);
  });
});
