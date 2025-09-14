import { test, expect } from '@playwright/test';

test('capture rapier diagnostics and network', async ({ page }) => {
  const results: any = { console: [], requests: [] };

  page.on('console', (msg) => {
    results.console.push({ type: msg.type(), text: msg.text() });
  });

  page.on('requestfinished', async (req) => {
    try {
      const url = req.url();
      if (/rapier|rapier_wasm|\.wasm$/i.test(url)) {
        const resp = await req.response();
        results.requests.push({ url, status: resp ? resp.status() : null });
      }
    } catch (e) {
      // ignore
    }
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // click the status diagnostics toggle if present
  const statusButton = await page.locator('#status button.pause-button');
  if (await statusButton.count() > 0) {
    await statusButton.click();
  }

  // read dev diagnostics panel
  const diag = await page.locator('.dev-diagnostics').innerText().catch(() => '');

  // also grab the status text
  const statusText = await page.locator('#status').innerText().catch(() => '');

  console.log('DEV_DIAGNOSTICS_START');
  console.log(diag || '<no-dev-diagnostics>');
  console.log('DEV_DIAGNOSTICS_END');

  console.log('STATUS_START');
  console.log(statusText || '<no-status>');
  console.log('STATUS_END');

  // dump captured console entries
  console.log('CONSOLE_ENTRIES_START');
  for (const c of results.console) console.log(JSON.stringify(c));
  console.log('CONSOLE_ENTRIES_END');

  // dump captured network entries
  console.log('NETWORK_ENTRIES_START');
  for (const r of results.requests) console.log(JSON.stringify(r));
  console.log('NETWORK_ENTRIES_END');

  // ensure test exits
  expect(true).toBeTruthy();
});