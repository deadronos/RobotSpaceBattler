
import { test, expect } from '@playwright/test';

test('verify neon visuals', async ({ page }) => {
  // Go to localhost:5173
  await page.goto('http://localhost:5173');

  // Wait for the canvas to be present
  await page.waitForSelector('canvas');

  // Wait a bit for the scene to render and effects to settle
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'verification/visuals.png' });
});
