
import { test, expect } from '@playwright/test';

test('verify neon visuals', async ({ page }) => {
  page.on('console', (m) => console.log('PAGE LOG:', m.text()));
  // Go to the dev server (Playwright config starts the server at 5174)
  await page.goto('http://localhost:5174/RobotSpaceBattler/');

  // Wait for the canvas to be present
  await page.waitForSelector('canvas');

  // Wait a bit for the scene to render and effects to settle
  await page.waitForTimeout(5000);

  // Take a screenshot
  await page.screenshot({ path: 'verification/visuals.png' });

  // Inspect instance colors for bullets, rockets, lasers, and effects via the
  // exposed scene object so we can detect whether instanceColor values are
  // initialized and non-zero.
  const instanceData = await page.evaluate(() => {
    // First try the Scene-level debug handle we attach from onCreated
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

    // Fallback: check direct ref plumbing from the components (useful when
    // WebGL context couldn't be created but R3F still mounted component refs)
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

  // Print info for manual debugging and fail the test if all instance colors are missing
  console.log('instanceData', instanceData);
  expect(instanceData).not.toBeNull();
  if (instanceData) {
    const missingAll = Object.values(instanceData).every((v) => v.hasInstanceColor === false);
    expect(missingAll).toBe(false);
  }

});
