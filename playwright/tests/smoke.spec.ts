import { test, expect } from '@playwright/test'

test('app smoke: status and canvas present', async ({ page }) => {
  // Playwright config starts a webServer on port 5174; be explicit here.
  await page.goto('http://localhost:5174')

  // Wait for the status element and the canvas to appear.
  await expect(page.locator('#status')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
})
