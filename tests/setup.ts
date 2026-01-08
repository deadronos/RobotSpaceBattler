import "@testing-library/jest-dom/vitest";
import { vi } from 'vitest';

// Mock multithreading library globally
vi.mock('multithreading', () => ({
  initRuntime: vi.fn(),
  spawn: vi.fn((data: any, func: Function) => {
    // Return a mock JoinHandle
    return {
      join: async () => {
        try {
          // Execute the function synchronously
          const result = func(data);
          // Return success result
          return { ok: true, value: result };
        } catch (error) {
          // Return error result
          return { ok: false, error };
        }
      }
    };
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
