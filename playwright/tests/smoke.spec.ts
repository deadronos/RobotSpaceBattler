import { test, expect } from '@playwright/test'

test('page loads and canvas exists', async ({ page }) => {
  await page.goto('http://localhost:5173')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('#status')).toContainText('Space Station')
})