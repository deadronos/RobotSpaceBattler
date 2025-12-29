import { test, expect } from '@playwright/test';

test('verify neon visuals (local port 5175)', async ({ page }) => {
  page.on('console', (m) => console.log('PAGE LOG:', m.text()));
  // Try to navigate to the dev server on 5175 where Vite started in this run.
  // Retry the navigation for up to 20s to handle startup races.
  const start = Date.now();
  let navigated = false;
  while (Date.now() - start < 20000) {
    try {
      await page.goto('http://localhost:5175/RobotSpaceBattler/', { timeout: 3000 });
      navigated = true;
      break;
    } catch (e) {
      // wait a bit and retry
      await page.waitForTimeout(500);
    }
  }
  if (!navigated) throw new Error('Could not reach http://localhost:5175/RobotSpaceBattler/ after 20s');

  // Wait for the canvas to be present
  await page.waitForSelector('canvas', { timeout: 10000 });

  // Wait a bit for the scene to render and effects to settle
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'verification/visuals-5175.png' });

  // Inspect instance colors for bullets, rockets, lasers, and effects via the
  // exposed scene object so we can detect whether instanceColor values are
  // initialized and non-zero.
  const instanceData = await page.evaluate(() => {
    const debug = (window as any).__robotScene as any;
    if (debug && debug.scene) {
      const scene = debug.scene as any;
      const names = [
        'instanced-bullets',
        'instanced-rockets',
        'instanced-lasers',
        'instanced-effects',
      ];

      const result: Record<string, { hasInstanceColor: boolean; sample: number[] | null }> = {};

      for (const name of names) {
        const mesh = scene.getObjectByName(name);
        if (!mesh) {
          result[name] = { hasInstanceColor: false, sample: null };
          continue;
        }
        const instColor = mesh.instanceColor;
        if (!instColor) {
          result[name] = { hasInstanceColor: false, sample: null };
          continue;
        }

        const arr = instColor.array as Float32Array;
        const sample = arr.length >= 3 ? [arr[0], arr[1], arr[2]] : null;
        result[name] = { hasInstanceColor: true, sample };
      }
      return result;
    }

    const refs = (window as any).__instancedRefs as Record<string, any> | undefined;
    if (!refs) return null;

    const fallbackResult: Record<string, { hasInstanceColor: boolean; sample: number[] | null }> = {};
    for (const key of ['bullets', 'rockets', 'lasers', 'effects']) {
      const mesh = refs[key];
      if (!mesh) {
        fallbackResult[key] = { hasInstanceColor: false, sample: null };
        continue;
      }
      const instColor = mesh.instanceColor;
      if (!instColor) {
        fallbackResult[key] = { hasInstanceColor: false, sample: null };
        continue;
      }
      const arr = instColor.array as Float32Array;
      const sample = arr.length >= 3 ? [arr[0], arr[1], arr[2]] : null;
      fallbackResult[key] = { hasInstanceColor: true, sample };
    }

    return fallbackResult;
  });

  console.log('instanceData', instanceData);
  expect(instanceData).not.toBeNull();
  if (instanceData) {
    const missingAll = Object.values(instanceData).every((v) => v.hasInstanceColor === false);
    expect(missingAll).toBe(false);
  }

});