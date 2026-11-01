// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readStoredBoolean,
  writeStoredBoolean,
} from "../../src/lib/storedBoolean";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("storedBoolean", () => {
  it("round-trips a flag", () => {
    writeStoredBoolean("k", false);
    expect(readStoredBoolean("k", true)).toBe(false);
    writeStoredBoolean("k", true);
    expect(readStoredBoolean("k", false)).toBe(true);
  });

  it("returns the default when nothing is stored", () => {
    expect(readStoredBoolean("missing", true)).toBe(true);
    expect(readStoredBoolean("missing", false)).toBe(false);
  });

  it("falls back to the default when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(readStoredBoolean("k", true)).toBe(true);
  });

  it("does not throw when writing to blocked storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => writeStoredBoolean("k", true)).not.toThrow();
  });
});
