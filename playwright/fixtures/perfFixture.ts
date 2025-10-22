import { test as baseTest } from '@playwright/test';
import {
  ensurePerfHarness,
  startPerfMeasurement,
  stopPerfMeasurement,
  measureWithAction,
  PerfReport,
  PerfOptions,
} from '../utils/perfHelper';

export type PerfAPI = {
  start: (opts?: PerfOptions) => Promise<void>;
  stop: () => Promise<PerfReport>;
  measure: <T = void>(action: () => Promise<T>, opts?: PerfOptions & { postActionBufferMs?: number }) => Promise<{ report: PerfReport; result: T }>;
};

export const test = baseTest.extend<{ perf: PerfAPI }>({
  perf: async ({ page }, use) => {
    // ensure the harness is present before tests using the perf fixture run
    await ensurePerfHarness(page, 20_000);

    const perfObj: PerfAPI = {
      start: (opts?: PerfOptions) => startPerfMeasurement(page, opts),
      stop: () => stopPerfMeasurement(page),
      measure: (action, opts) => measureWithAction(page, action, opts),
    };

    await use(perfObj);
  },
});

export { expect } from '@playwright/test';
export type { PerfReport } from '../utils/perfHelper';
