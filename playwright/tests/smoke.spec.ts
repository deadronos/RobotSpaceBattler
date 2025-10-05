import { test, expect } from '@playwright/test'

test('app smoke: status and canvas present', async ({ page }) => {
  // Playwright config starts a webServer on port 5174; be explicit here.
  await page.goto('http://localhost:5174')

  // Wait for the status element and the canvas to appear.
  await expect(page.locator('#status')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
})

// New smoke test: verify pause control toggles the status text
test('pause control toggles simulation status', async ({ page }) => {
  await page.goto('http://localhost:5174')

  const status = page.locator('#status')
  const pauseBtn = page.locator('#pause')

  await expect(status).toBeVisible()
  // Wait a short time for initial state to settle
  await expect(status).toHaveText(/Running|Paused/)

  // Click the pause button and assert the status updates
  await pauseBtn.click()
  await expect(status).toHaveText(/Paused/)

  // Click again to resume
  await pauseBtn.click()
  await expect(status).toHaveText(/Running/)
})
