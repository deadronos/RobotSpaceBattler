import { test, expect } from '@playwright/test'

test('page loads and canvas exists', async ({ page }) => {
  await page.goto('http://localhost:5174')
  // debug: print some of the page content to help diagnose CI failures
  const html = await page.content()
  console.log('PAGE HTML START\n' + html.slice(0, 1000) + '\nPAGE HTML END')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.locator('#status')).toHaveCount(1, { timeout: 15000 })
  await expect(page.locator('#status')).toContainText('Space Station')
})