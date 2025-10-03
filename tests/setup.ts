// add any global test setup here
import '@testing-library/jest-dom'

// Import test harness helpers to ensure they're available globally
import './helpers/fixedStepHarness';

globalThis.ResizeObserver = class ResizeObserver {
  constructor(cb: any) {
    this.cb = cb;
  }
  cb: any;
  observe() {}
  unobserve() {}
  disconnect() {}
};