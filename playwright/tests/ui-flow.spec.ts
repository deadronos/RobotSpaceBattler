import { test, expect } from '@playwright/test';

test('basic UI flow', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('.hud-root')).toBeVisible();
});
