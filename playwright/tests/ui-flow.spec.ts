import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

async function findPreviewPort(start = 5173, end = 5199, timeout = 10000) {
  const ports = [];
  for (let p = start; p <= end; p++) ports.push(p);

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    for (const port of ports) {
      try {
        // node-fetch or global fetch works in Node 18+
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`http://localhost:${port}/`, { method: 'GET' });
        if (res && (res.status === 200 || res.status === 304)) {
          return port;
        }
      } catch (e) {
        // ignore connection errors
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Could not find preview server on ports ' + start + '–' + end);
}

let server: ChildProcess | null = null;

test.describe.serial('UI flow - victory → stats → settings → restart', () => {
  test.beforeAll(async () => {
    // Choose a free port by binding to 0 and letting the OS assign a free port.
    const freePort = await new Promise<number>(async (resolve, reject) => {
      const net = await import('net');
      const s = net.createServer();
      s.listen(0, '127.0.0.1', () => {
        // @ts-ignore
        const addr = s.address();
        if (!addr || typeof addr === 'string') return reject(new Error('Failed to allocate free port'));
        const p = addr.port;
        s.close(() => resolve(p));
      });
      s.on('error', (err: any) => reject(err));
    });

    // Start preview server bound to the chosen free port.
    server = spawn('npm', ['run', 'preview', '--', `--port=${freePort}`], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    // Wait for the preview server to respond on the chosen port.
    const port = freePort;
    const start = Date.now();
    const timeoutMs = 15000;
    while (Date.now() - start < timeoutMs) {
      try {
        // node-fetch or global fetch can be used here
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`http://localhost:${port}/`, { method: 'GET' });
        if (res && (res.status === 200 || res.status === 304)) {
          (global as any).__PREVIEW_PORT__ = port;
          return;
        }
      } catch (e) {
        // ignore and retry
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error('Preview server failed to respond on chosen port ' + port);
  });

  test.afterAll(async () => {
    if (server) {
      server.kill();
      server = null;
    }
  });

  test('triggers victory overlay, opens stats and settings, then auto-restarts', async ({ page }) => {
    const port = (global as any).__PREVIEW_PORT__ ?? 5173;
    await page.goto(`http://localhost:${port}/?forceVictory=1`);

    page.on('console', (msg) => {
      // forward app console logs into the Playwright report
      console.log('[page]', msg.type(), msg.text());
    });
    page.on('pageerror', (err) => {
      console.log('[pageerror]', err && err.message ? err.message : String(err));
    });
    page.on('response', (resp) => {
      try {
        if (resp.request().resourceType() === 'script') console.log('[response]', resp.status(), resp.url());
      } catch (e) {}
    });

    // wait for the app to finish initial mount (test helper sets a flag)
    try {
      await page.waitForFunction(() => (window as any).__APP_MOUNTED__ === true, { timeout: 5000 });
    } catch (e) {
      console.log('app did not set __APP_MOUNTED__ flag within timeout');
    }

    // Attempt to trigger a test-only victory helper if present. Tests are expected
    // to provide a global helper in development/test builds. If not present,
    // this will be a no-op and the test will fail until app implements hooks.
    const helperPresence = await page.evaluate(() => {
      const w = window as any;
      return {
        hasSet: typeof w.__setVictoryVisible === 'function',
        hasTrigger: typeof w.triggerVictory === 'function',
        hasGet: typeof w.__getUiState === 'function',
      };
    });
    console.log('helper presence before trigger:', helperPresence);

    // (no-op: victory requested via URL param)

    // After navigating to the forceVictory URL, inspect UI store state and DOM for debugging
    const uiState = await page.evaluate(() => {
      const w = window as any;
      return w.__getUiState ? w.__getUiState() : null;
    });
    console.log('uiState after force param:', uiState);

    const domOverlayCountImmediate = await page.evaluate(() => document.querySelectorAll('.victory-overlay').length);
    console.log('DOM overlay count immediately after force param:', domOverlayCountImmediate);

    // Expect the victory overlay to appear
    const overlay = page.locator('.victory-overlay');
    await expect(overlay).toHaveCount(1, { timeout: 10000 });

    // Open stats modal
    await page.getByRole('button', { name: /Stats/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 4000 });

    // Close stats (if there is a close button) and open settings
    // try to click the Settings button in the overlay
    await page.getByRole('button', { name: /Settings/i }).click();

    // In settings, attempt to apply a trivial change if controls exist
    const applyBtn = page.getByRole('button', { name: /Apply/i });
    if (await applyBtn.count()) {
      await applyBtn.click();
    }

    // Wait for the auto-restart period (5s expected in spec)
    await page.waitForTimeout(5500);

    // After restart the victory overlay should be gone and HUD root visible
    await expect(page.locator('.victory-overlay')).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('header, .hud-root, .hud')).toHaveCount(1, { timeout: 4000 });
  });

  test('diagnostic checks for module script presence', async ({ page }) => {
    const port = (global as any).__PREVIEW_PORT__ ?? 5173;
    await page.goto(`http://localhost:${port}/?forceVictory=1`);

    // after navigating, dump some diagnostic information about the loaded page and scripts
    const pageHtml = await page.content();
    console.log('page HTML length:', pageHtml.length);
    console.log('page HTML head:', pageHtml.slice(0, 800).replace(/\n/g, ' '));
    const moduleScript = await page.evaluate(() => {
      const s = document.querySelector('script[type="module"]') as HTMLScriptElement | null;
      return s ? s.src : null;
    });
    console.log('module script src:', moduleScript);
    if (moduleScript) {
      const res = await page.request.get(moduleScript);
      console.log('module script response status:', res.status());
      const head = (await res.text()).slice(0, 400);
      console.log('module script head:', head.replace(/\n/g, ' '));
    }
  });
});
