import { test, expect } from '@playwright/test';

// Smoke test: open the app and fail if Rapier initialization errors appear in the console.
// Looks for common error signatures: raweventqueue_new undefined and physics-failed-all-candidates.

test('no-rapier-init-errors-in-console', async ({ page, baseURL }) => {
  const consoleMessages: { type: string; text: string }[] = [];
  page.on('console', (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Navigate to the app (playwright config should set baseURL to dev server).
  await page.goto(baseURL ?? 'http://localhost:5173/', { waitUntil: 'networkidle' });

  // wait a bit longer for Rapier wasm and wrapper initialization to complete
  // some environments or cold caches can make this take several seconds
  await page.waitForTimeout(8000);

  const bad = consoleMessages.filter((m) => {
    const t = m.text.toLowerCase();
    return t.includes('raweventqueue_new') || t.includes('physics-failed-all-candidates') || t.includes('physics-candidate-error') || t.includes('physics-render-error');
  });

  if (bad.length > 0) {
    // attach the console messages for easier debugging
    console.log('Captured console messages:', JSON.stringify(consoleMessages, null, 2));
  }

  expect(bad, `Rapier initialization errors in console: ${bad.map((b) => b.text).join('\n')}`).toHaveLength(0);
});
