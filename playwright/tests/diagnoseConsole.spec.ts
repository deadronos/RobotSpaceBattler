import { test } from '@playwright/test'

test('capture page console and errors', async ({ page }) => {
  page.on('console', async (msg) => {
    // Print basic console message
    console.log(`PAGE CONSOLE [${msg.type()}] ${msg.text()}`)
    // Attempt to print args for richer context
    for (const a of msg.args()) {
      try {
        const v = await a.jsonValue()
        console.log('  arg:', v)
      } catch {
        // non-serializable
      }
    }
  })

  page.on('pageerror', (err) => {
    console.log('PAGE ERROR', err.stack || err.message || String(err))
  })

  await page.goto('http://localhost:5173')
  // wait briefly to let the app boot and emit any console errors
  await page.waitForTimeout(2500)
})
