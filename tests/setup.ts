/**
 * Test Setup - Global Configuration
 *
 * Registers telemetry infrastructure for test harness:
 * - TelemetryAggregator for in-memory event tracking
 * - MatchTrace writer for persistent event logging
 *
 * Cleanup hooks ensure proper teardown between tests.
 */

import "@testing-library/jest-dom/vitest";
import { beforeEach, afterEach } from "vitest";
import { globalTelemetryAggregator } from "../src/telemetry/aggregator";
import { closeAllMatchTraces } from "../src/telemetry/matchTrace";

// Mock matchMedia for browser-dependent tests
Object.defineProperty(globalThis, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

// Global telemetry cleanup between tests
beforeEach(() => {
  // Reset telemetry aggregator for clean state
  globalTelemetryAggregator.reset();
});

afterEach(() => {
  // Clean up any open MatchTrace writers
  closeAllMatchTraces();

  // Reset telemetry aggregator
  globalTelemetryAggregator.reset();
});
