import "@testing-library/jest-dom/vitest";
import { vi } from 'vitest';

// Mock multithreading library globally
vi.mock('multithreading', () => ({
  initRuntime: vi.fn(),
  spawn: vi.fn(async (data: any, func: Function) => {
    // Execute the function synchronously (but wrapped in async) for tests
    return func(data);
  }),
  move: vi.fn((data) => data),
  Transfer: vi.fn((data) => data),
}));

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
