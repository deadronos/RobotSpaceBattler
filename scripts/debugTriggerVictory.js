const { chromium } = require('playwright');

(async () => {
  const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183, 5184, 5185, 5186, 5187, 5188, 5189];

  const browser = await chromium.launch();
  let page;
  let found = false;
  for (const port of ports) {
    const url = `http://localhost:${port}/`;
    try {
      page = await (await browser.newContext()).newPage();
      const response = await page.goto(url, { waitUntil: 'load', timeout: 2000 });
      if (response && response.ok()) {
        console.log('Connected to', url);
        found = true;
        break;
      }
    } catch (e) {
      // ignore and try next port
      try { await page.close(); } catch {};
    }
  }

  if (!found) {
    console.error('Could not find preview server on expected ports');
    await browser.close();
    process.exit(2);
  }

  page.on('console', (msg) => {
    console.log('[page]', msg.type(), msg.text());
  });

  console.log('Page loaded, evaluating triggerVictory existence');

  const hasTrigger = await page.evaluate(() => typeof window['triggerVictory'] === 'function');
  console.log('has triggerVictory:', hasTrigger);

  if (hasTrigger) {
    await page.evaluate(() => {
      // @ts-ignore
      window['triggerVictory']();
    });
    console.log('triggerVictory called');
  } else {
    console.log('triggerVictory not found');
  }

  await page.waitForTimeout(2000);

  const overlayCount = await page.evaluate(() => document.querySelectorAll('.victory-overlay').length);
  console.log('overlay count after trigger:', overlayCount);

  await browser.close();
  process.exit(0);
})();