import type { Page } from 'playwright';

export interface LatencyMeasurement {
  eventToVisibleMs: number;
  timestamp: number;
}

/**
 * Measures latency from an event trigger to the first visible frame of the battle UI.
 * 
 * This helper is optimized for E2E latency measurements and records performance marks
 * in the browser's Performance API for post-mortem analysis.
 * 
 * @param page - Playwright page object
 * @param triggerFn - Async function that triggers the event (e.g., round start, UI toggle)
 * @param options - Configuration options
 * @returns Latency measurement in milliseconds
 */
export async function measureEventToFirstVisible(
  page: Page,
  triggerFn: () => Promise<void>,
  options: {
    /** Selector for the battle UI root element (default: '[data-testid="battle-ui"]') */
    selector?: string;
    /** Maximum time to wait for visibility in ms (default: 5000) */
    timeout?: number;
  } = {},
): Promise<LatencyMeasurement> {
  const { selector = '[data-testid="battle-ui"]', timeout = 5000 } = options;

  // Inject a performance mark helper into the page
  await page.evaluate(() => {
    (window as any).__latencyMeasureStart = performance.now();
  });

  // Trigger the event
  const eventStartTime = Date.now();
  await triggerFn();

  // Wait for the battle UI to become visible and measure end time
  await page.waitForSelector(selector, { state: 'visible', timeout });

  const measurement = await page.evaluate((sel) => {
    const start = (window as any).__latencyMeasureStart;
    const end = performance.now();
    const element = document.querySelector(sel);
    
    if (!element) {
      throw new Error(`Element ${sel} not found after visibility check`);
    }

    return {
      eventToVisibleMs: end - start,
      timestamp: Date.now(),
    };
  }, selector);

  return measurement;
}
