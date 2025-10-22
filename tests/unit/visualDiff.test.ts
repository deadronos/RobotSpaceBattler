import { describe, expect, it } from 'vitest';
import { PNG } from 'pngjs';

import { visualDiff } from '../../playwright/utils/visualDiff';

function createSolidPng(width: number, height: number, rgba: [number, number, number, number]) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (width * y + x) << 2;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = rgba[3];
    }
  }

  return PNG.sync.write(png);
}

describe('visualDiff', () => {
  it('passes when SSIM is at or above the default threshold', async () => {
    const base = createSolidPng(2, 2, [255, 255, 255, 255]);
    const comparison = createSolidPng(2, 2, [255, 255, 255, 255]);

    const result = await visualDiff(base, comparison);

    expect(result.pass).toBe(true);
    expect(result.ssim).toBeCloseTo(1, 5);
  });

  it('fails when SSIM drops below the threshold', async () => {
    const base = createSolidPng(2, 2, [255, 255, 255, 255]);
    const comparison = createSolidPng(2, 2, [0, 0, 0, 255]);

    const result = await visualDiff(base, comparison, 0.97);

    expect(result.pass).toBe(false);
    expect(result.ssim).toBeLessThan(0.97);
  });
});
