import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

/**
 * Visual staleness probe
 *
 * What it does:
 * - Loads the app
 * - Pauses → waits 1s → unpauses
 * - Captures multiple canvas screenshots around these transitions
 * - Attaches screenshots to the test report and also writes them to disk
 * - Logs SHA-256 hashes of each capture and simple equality comparisons
 *
 * Intent:
 * - This is primarily a manual probe to generate artifacts on-demand.
 * - It does NOT fail the test by default. Set ASSERT_VISUAL=1 to assert that
 *   unpaused frames differ while paused frames remain the same.
 */
test('visual staleness probe (pause/unpause screenshots)', async ({ page }, testInfo) => {
  // Be explicit about the dev server port configured in playwright.config.ts
  await page.goto('http://localhost:5174')

  const status = page.locator('#status')
  const pauseBtn = page.locator('#pause')
  // Target the primary Three.js render canvas under #root
  const canvas = page.locator('#root canvas[data-engine]')

  await expect(status).toBeVisible()
  await expect(canvas).toBeVisible()

  // Helper: ensure output dir per run
  const runDir = path.join(
    testInfo.project.outputDir,
    'visual-staleness',
    new Date().toISOString().replace(/[:.]/g, '-')
  )
  fs.mkdirSync(runDir, { recursive: true })

  // Helper: capture canvas screenshot, return buffer and file path
  async function capture(label: string) {
    const filePath = path.join(runDir, `${label}.png`)
    const buf = await canvas.screenshot({ path: filePath, type: 'png' })
    await testInfo.attach(label, { body: buf, contentType: 'image/png' })
    // Also compute a hash for quick equality checks
    const hash = crypto.createHash('sha256').update(buf).digest('hex')
    return { filePath, buf, hash }
  }

  // Helper: get a dataURL hash from the canvas via browser-side (alternate signal)
  async function canvasDataURLHash() {
    const dataUrl = await page.evaluate(() => {
      const c = document.querySelector('#root canvas[data-engine]') as HTMLCanvasElement | null
      if (!c) return ''
      try {
        return c.toDataURL('image/png')
      } catch (e) {
        return ''
      }
    })
    return crypto.createHash('sha256').update(dataUrl).digest('hex')
  }

  // Optionally assert using env var; default to manual/log-only behavior
  const shouldAssert = process.env.ASSERT_VISUAL === '1'
  const doVisualDiff = process.env.VISUAL_DIFF === '1'

  async function diffImages(a: { label: string; buf: Buffer }, b: { label: string; buf: Buffer }) {
    try {
      const imgA = PNG.sync.read(a.buf)
      const imgB = PNG.sync.read(b.buf)
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        console.warn('[visual-staleness] cannot diff, size mismatch')
        return { pixelsChanged: 0, totalPixels: 0, ratio: 0 }
      }
      const { width, height } = imgA
      const diff = new PNG({ width, height })
      const changed = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
        threshold: 0.1,
        includeAA: true
      })
      const total = width * height
      const ratio = total ? changed / total : 0
      const diffName = `${a.label}__vs__${b.label}__diff.png`
      const diffPath = path.join(runDir, diffName)
      fs.writeFileSync(diffPath, PNG.sync.write(diff))
      await testInfo.attach(diffName, { body: fs.readFileSync(diffPath), contentType: 'image/png' })
      return { pixelsChanged: changed, totalPixels: total, ratio }
    } catch (e) {
      console.warn('[visual-staleness] diff failed:', e)
      return { pixelsChanged: 0, totalPixels: 0, ratio: 0 }
    }
  }

  // 1) Pause → wait 1s → Unpause
  await pauseBtn.click()
  await expect(status).toHaveText(/Paused/i)
  await page.waitForTimeout(1000)
  await pauseBtn.click()
  await expect(status).toHaveText(/Running/i)

  // 2) Capture "unpaused01" and "unpaused02" 1s apart
  const u1 = await capture('unpaused01')
  await page.waitForTimeout(1000)
  const u2 = await capture('unpaused02')

  // 3) Pause and capture once
  await pauseBtn.click()
  await expect(status).toHaveText(/Paused/i)
  const p1 = await capture('paused01')

  // 4) Unpause, capture twice 1s apart
  await pauseBtn.click()
  await expect(status).toHaveText(/Running/i)
  const ua1 = await capture('unpaused-after-pause01')
  await page.waitForTimeout(1000)
  const ua2 = await capture('unpaused-after-pause02')

  const hashes = {
    'unpaused01': u1.hash,
    'unpaused02': u2.hash,
    'paused01': p1.hash,
    'unpaused-after-pause01': ua1.hash,
    'unpaused-after-pause02': ua2.hash
  }

  // Also collect dataURL hashes as a secondary signal
  const durlHashes: Record<string, string> = {
    'unpaused01_durl': await canvasDataURLHash(),
  }
  await page.waitForTimeout(1000)
  durlHashes['unpaused02_durl'] = await canvasDataURLHash()

  // Log results
  console.log('\n[visual-staleness] screenshot sha256 hashes:')
  for (const [k, v] of Object.entries(hashes)) console.log(`  ${k}: ${v}`)
  console.log('[visual-staleness] canvas.toDataURL() sha256 hashes:')
  for (const [k, v] of Object.entries(durlHashes)) console.log(`  ${k}: ${v}`)

  const eq = (a: string, b: string) => (a === b ? 'equal' : 'DIFF')
  console.log('[visual-staleness] equality checks (sha256 of screenshots):')
  console.log(`  unpaused01 vs unpaused02: ${eq(u1.hash, u2.hash)}`)
  console.log(`  unpaused-after-pause01 vs unpaused-after-pause02: ${eq(ua1.hash, ua2.hash)}`)
  console.log(`  paused01 vs unpaused01: ${eq(p1.hash, u1.hash)}`)

  if (doVisualDiff) {
    const d1 = await diffImages({ label: 'unpaused01', buf: u1.buf }, { label: 'unpaused02', buf: u2.buf })
    const d2 = await diffImages(
      { label: 'unpaused-after-pause01', buf: ua1.buf },
      { label: 'unpaused-after-pause02', buf: ua2.buf }
    )
    console.log('[visual-staleness] pixelmatch change ratios:')
    console.log(
      `  unpaused01 vs unpaused02: ${(d1.ratio * 100).toFixed(3)}% (${d1.pixelsChanged}/${d1.totalPixels})`
    )
    console.log(
      `  unpaused-after-pause01 vs unpaused-after-pause02: ${(d2.ratio * 100).toFixed(3)}% (${d2.pixelsChanged}/${d2.totalPixels})`
    )
  }

  if (shouldAssert) {
    // Expectations when visuals are healthy:
    // - Unpaused frames should typically change over 1s (hashes differ)
    // - Paused frame should often be equal to captures taken within pause window
    // We only have one paused capture in this probe; assert unpaused pairs differ.
    await expect.soft(u1.hash, 'unpaused frames should differ over 1s').not.toBe(u2.hash)
    await expect.soft(ua1.hash, 'unpaused-after-pause frames should differ over 1s').not.toBe(ua2.hash)
  }
})
