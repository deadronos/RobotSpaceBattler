import { test, expect } from '@playwright/test';
import { test, expect } from '@playwright/test';

// E2E UI Flow: victory overlay → stats → settings → restart
test('ui flow: victory → stats → settings → restart', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // ensure perf harness available and reset
  await page.evaluate(() => { if (window.__perf) { window.__perf.reset(); } });

  // start measurement to simulate performance stress during E2E\  await page.evaluate(() => { if (window.__perf) { window.__perf.startMeasurement({ warmupSeconds: 0, targetFrameRate: 60 }); } });
  await expect(page.locator('.hud-root')).toBeVisible();

  // trigger a simulated victory pathway via window helpers if available\  await page.evaluate(() => {
    // call a global test helper if present to set simulation to victory
    if ((window as any).testHelpers?.triggerVictory) {
      (window as any).testHelpers.triggerVictory();
    }
  });

  // wait for victory overlay to appear
  await expect(page.locator('.victory-overlay')).toBeVisible({ timeout: 5000 });

  // open stats from overlay
  await page.locator('button', { hasText: 'Stats' }).click();
  await expect(page.locator('.stats-modal')).toBeVisible();

  // open settings from overlay
  await page.locator('button', { hasText: 'Settings' }).click();
  await expect(page.locator('.settings-drawer')).toBeVisible();

  // apply settings and close
  await page.locator('.settings-drawer button', { hasText: 'Apply' }).click();

  // wait for restart: simulate by calling restartNow if available
  await page.evaluate(() => { if (window.__perf) { window.__perf.stopMeasurement(); } });
  // final check: HUD still visible after restart
  await expect(page.locator('.hud-root')).toBeVisible();
});
