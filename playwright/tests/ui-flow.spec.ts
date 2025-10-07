import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

let server: ChildProcess | null = null;

test.describe.serial('UI flow - victory → stats → settings → restart', () => {
  test.beforeAll(async () => {
    // Start preview server for the built app (headed/CI compatible)
    server = spawn('npm', ['run', 'preview', '--', '--port=5173'], {
      shell: true,
      stdio: 'ignore',
      env: process.env,
    });

    // give the preview server time to start
    await new Promise((r) => setTimeout(r, 1500));
  });

  test.afterAll(async () => {
    if (server) {
      server.kill();
      server = null;
    }
  });

  test('triggers victory overlay, opens stats and settings, then auto-restarts', async ({ page }) => {
    await page.goto('http://localhost:5173/');

    // Attempt to trigger a test-only victory helper if present. Tests are expected
    // to provide a global helper in development/test builds. If not present,
    // this will be a no-op and the test will fail until app implements hooks.
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (typeof window['triggerVictory'] === 'function') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window['triggerVictory']();
      } else {
        // marker to help implementers know the test attempted to force victory
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window['__PLAYWRIGHT_TRIED_TRIGGER_VICTORY__'] = true;
      }
    });

    // Expect the victory overlay to appear
    const overlay = page.locator('.victory-overlay');
    await expect(overlay).toHaveCount(1, { timeout: 5000 });

    // Open stats modal
    await page.getByRole('button', { name: /Stats/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 });

    // Close stats (if there is a close button) and open settings
    // try to click the Settings button in the overlay
    await page.getByRole('button', { name: /Settings/i }).click();

    // In settings, attempt to apply a trivial change if controls exist
    const applyBtn = page.getByRole('button', { name: /Apply/i });
    if (await applyBtn.count()) {
      await applyBtn.click();
    }

    // Wait for the auto-restart period (5s expected in spec)
    await page.waitForTimeout(5500);

    // After restart the victory overlay should be gone and HUD root visible
    await expect(page.locator('.victory-overlay')).toHaveCount(0);
    await expect(page.locator('header, .hud-root, .hud')).toHaveCount(1);
  });
});
