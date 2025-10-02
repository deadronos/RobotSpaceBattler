import { test, expect } from '@playwright/test';

// This test navigates to the running dev server, reproduces the pause/unpause
// spawn sequence and records a short video. Run with:
//   npm run playwright:install
//   npx playwright test playwright/tests/record-pause-unpause.spec.ts --project=chromium

test.use({
  video: 'on',
  viewport: { width: 1280, height: 720 },
});

test('record pause/unpause spawn sequence', async ({ page }) => {
  // Adjust this URL if you run on a different port
  await page.goto('http://localhost:5173');

  // Wait for the canvas to be present
  await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });

  // Wait a moment for initial spawn to complete
  await page.waitForTimeout(1000);

  // Click pause
  await page.click('#pause');
  // Spawn a few red guns while paused (DevDiagnostics / UI spawn buttons)
  // The UI has developer buttons; try to click visible spawn controls.
  const spawnRedGun = page.locator('text=/Spawn red gun|Spawn red gun/i');
  if (await spawnRedGun.count()) {
    await spawnRedGun.first().click();
  } else {
    // Dev diagnostics fallback
    const devRedGun = page.locator('button', { hasText: '+ Red Gun' });
    if (await devRedGun.count()) {
      await devRedGun.first().click();
    }
  }

  // Wait to observe that nothing is visibly moving while paused
  await page.waitForTimeout(1200);

  // Resume
  await page.click('#pause');

  // Let it run for a short while to capture motion
  await page.waitForTimeout(1500);

  // End (Playwright will save the video under test-results/playwright-report or as artifact)
  expect(await page.title()).toBeTruthy();
});