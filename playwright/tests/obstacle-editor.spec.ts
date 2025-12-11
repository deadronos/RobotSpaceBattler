import { test, expect } from '@playwright/test';

test.describe('Obstacle editor', () => {
  test('changing movement speed affects runtime position', async ({ page }) => {
    await page.goto('/');

    // Ensure the app has loaded and network activity has finished
    await page.waitForLoadState('networkidle');

    // Open settings to enable Debug UI so the Obstacle Editor is visible
    await page.getByRole('button', { name: 'Open settings' }).click();
    await page.getByLabel('Show Debug UI').check();
    // Close settings by clicking the close button
    await page.getByRole('button', { name: 'Close settings' }).click();

    // Now wait for the Obstacle Editor to appear
    await page.getByText('Obstacle Editor').waitFor();

    await page.waitForFunction(() => {
      const world = (window as any).__battleWorld;
      return !!world?.obstacles?.entities?.length;
    });

    await page.getByRole('button', { name: /barrier-a/i }).click();

    const getX = async () =>
      page.evaluate(() => {
        const world = (window as any).__battleWorld;
        const obs = world?.obstacles?.entities?.find((o: any) => o.id === 'barrier-a');
        return obs?.position?.x ?? 0;
      });

    const speedInput = page.getByLabel('Speed');

    await speedInput.fill('0');
    await page.waitForTimeout(500);
    const pausedA = await getX();
    await page.waitForTimeout(500);
    const pausedB = await getX();
    expect(Math.abs(pausedB - pausedA)).toBeLessThan(0.05);

    await speedInput.fill('5');
    await page.waitForTimeout(1200);
    const moved = await getX();
    expect(Math.abs(moved - pausedB)).toBeGreaterThan(0.2);
  });
});
