import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

export interface VisualDiffResult {
  ssim: number;
  pass: boolean;
  diffRatio: number;
}

const DEFAULT_THRESHOLD = 0.97;
const LUMINANCE_RED = 0.2126;
const LUMINANCE_GREEN = 0.7152;
const LUMINANCE_BLUE = 0.0722;
const LUMINANCE_MAX = 255;
const C1 = (0.01 * LUMINANCE_MAX) ** 2;
const C2 = (0.03 * LUMINANCE_MAX) ** 2;

export async function visualDiff(
  baselineImage: Buffer | Uint8Array,
  comparisonImage: Buffer | Uint8Array,
  threshold: number = DEFAULT_THRESHOLD
): Promise<VisualDiffResult> {
  const baselinePng = PNG.sync.read(Buffer.from(baselineImage));
  const comparisonPng = PNG.sync.read(Buffer.from(comparisonImage));

  if (baselinePng.width !== comparisonPng.width || baselinePng.height !== comparisonPng.height) {
    throw new Error('visualDiff requires images with identical dimensions.');
  }

  const totalPixels = baselinePng.width * baselinePng.height;
  if (totalPixels === 0) {
    return { ssim: 1, pass: true, diffRatio: 0 };
  }

  let luminanceSumA = 0;
  let luminanceSumB = 0;
  let luminanceSquaresA = 0;
  let luminanceSquaresB = 0;
  let luminanceProducts = 0;

  for (let i = 0; i < totalPixels; i += 1) {
    const offset = i * 4;
    const lumaA =
      baselinePng.data[offset] * LUMINANCE_RED +
      baselinePng.data[offset + 1] * LUMINANCE_GREEN +
      baselinePng.data[offset + 2] * LUMINANCE_BLUE;
    const lumaB =
      comparisonPng.data[offset] * LUMINANCE_RED +
      comparisonPng.data[offset + 1] * LUMINANCE_GREEN +
      comparisonPng.data[offset + 2] * LUMINANCE_BLUE;

    luminanceSumA += lumaA;
    luminanceSumB += lumaB;
    luminanceSquaresA += lumaA * lumaA;
    luminanceSquaresB += lumaB * lumaB;
    luminanceProducts += lumaA * lumaB;
  }

  const meanA = luminanceSumA / totalPixels;
  const meanB = luminanceSumB / totalPixels;
  const varianceA = luminanceSquaresA / totalPixels - meanA * meanA;
  const varianceB = luminanceSquaresB / totalPixels - meanB * meanB;
  const covariance = luminanceProducts / totalPixels - meanA * meanB;

  const numerator = (2 * meanA * meanB + C1) * (2 * covariance + C2);
  const denominator = (meanA * meanA + meanB * meanB + C1) * (varianceA + varianceB + C2);
  const ssim = denominator === 0 ? 1 : Math.max(0, Math.min(1, numerator / denominator));

  const diffBuffer = new Uint8Array(totalPixels * 4);
  const diffPixels = pixelmatch(
    baselinePng.data,
    comparisonPng.data,
    diffBuffer,
    baselinePng.width,
    baselinePng.height,
    {
      threshold: 0.1,
      includeAA: true,
    }
  );
  const diffRatio = diffPixels / totalPixels;

  return {
    ssim,
    pass: ssim >= threshold,
    diffRatio,
  };
}
