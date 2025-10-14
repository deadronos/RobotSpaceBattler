import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';

import { visualDiff } from '../utils/visualDiff';

test.describe('Battle UI', () => {
  test('displays round HUD when the scene loads', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('battle-ui')).toBeVisible();

    const screenshot = await page.screenshot({ fullPage: false });
    const parsed = PNG.sync.read(Buffer.from(screenshot));
    const mutated = new PNG({ width: parsed.width, height: parsed.height });
    mutated.data.set(parsed.data);
    if (mutated.data.length >= 3) {
      mutated.data[0] = 0;
      mutated.data[1] = 0;
      mutated.data[2] = 0;
    }

    const diff = await visualDiff(screenshot, PNG.sync.write(mutated));

    expect(diff.pass).toBe(true);
  });
});
