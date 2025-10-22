import { expect, test } from '@playwright/test';

import { measureEventToFirstVisible } from '../utils/latency';

test.describe('Toggle Latency', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (adjust URL based on your dev server)
    await page.goto('http://localhost:5173');
  });

  test('measures latency from round start to battle UI visibility', async ({ page }) => {
    // This test expects the battle UI to not be visible initially
    await expect(page.locator('[data-testid="battle-ui"]')).not.toBeVisible();

    // Measure latency of triggering a round start
    const measurement = await measureEventToFirstVisible(page, async () => {
      // Simulate starting a round (adjust based on your app's actual trigger)
      // For now, this is a placeholder that will fail until implementation
      await page.click('[data-testid="start-round-button"]');
    });

    // Assert that latency is positive (event happened and UI became visible)
    expect(measurement.eventToVisibleMs).toBeGreaterThan(0);
    
    // Assert reasonable upper bound (should be under 1 second for responsive UI)
    expect(measurement.eventToVisibleMs).toBeLessThan(1000);
    
    // Verify timestamp is recent
    expect(measurement.timestamp).toBeGreaterThan(Date.now() - 5000);
  });

  test('measures latency for UI toggle hotkey', async ({ page }) => {
    // First, ensure we're in a round with battle UI visible
    await page.click('[data-testid="start-round-button"]');
    await expect(page.locator('[data-testid="battle-ui"]')).toBeVisible();

    // Hide the UI
    await page.keyboard.press('h');
    await expect(page.locator('[data-testid="battle-ui"]')).not.toBeVisible();

    // Measure latency of toggling UI back on
    const measurement = await measureEventToFirstVisible(page, async () => {
      await page.keyboard.press('h');
    });

    expect(measurement.eventToVisibleMs).toBeGreaterThan(0);
    expect(measurement.eventToVisibleMs).toBeLessThan(500); // Toggle should be very fast
  });

  test('times out if battle UI never becomes visible', async ({ page }) => {
    // This test expects a timeout error when the trigger doesn't make UI visible
    await expect(async () => {
      await measureEventToFirstVisible(
        page,
        async () => {
          // Do nothing—UI won't become visible
        },
        { timeout: 1000 },
      );
    }).rejects.toThrow();
  });
});
