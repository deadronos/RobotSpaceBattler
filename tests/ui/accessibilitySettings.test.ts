import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESSIBILITY_STORAGE_KEYS,
  readAccessibilitySettings,
  REDUCED_MOTION_QUERY,
  systemPrefersReducedMotion,
  useAccessibilitySettings,
  writeAccessibilitySettings,
} from "@/state/accessibility/accessibilitySettings";

function setSystemReducedMotion(matches: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query === REDUCED_MOTION_QUERY ? matches : false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

describe("accessibility settings (#166)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inherits the OS reduced-motion preference on a first visit", () => {
    setSystemReducedMotion(true);

    expect(systemPrefersReducedMotion()).toBe(true);
    expect(readAccessibilitySettings()).toEqual({
      reducedMotion: true,
      colorBlindPalette: false,
    });
  });

  it("lets a stored choice override the OS preference", () => {
    setSystemReducedMotion(true);
    window.localStorage.setItem(ACCESSIBILITY_STORAGE_KEYS.reducedMotion, "0");
    window.localStorage.setItem(
      ACCESSIBILITY_STORAGE_KEYS.colorBlindPalette,
      "1",
    );

    expect(readAccessibilitySettings()).toEqual({
      reducedMotion: false,
      colorBlindPalette: true,
    });
  });

  it("round-trips through storage and the hook", () => {
    setSystemReducedMotion(false);
    writeAccessibilitySettings({
      reducedMotion: true,
      colorBlindPalette: true,
    });
    expect(readAccessibilitySettings()).toEqual({
      reducedMotion: true,
      colorBlindPalette: true,
    });

    const { result } = renderHook(() => useAccessibilitySettings());
    expect(result.current.accessibility.reducedMotion).toBe(true);

    act(() => {
      result.current.updateAccessibility({ reducedMotion: false });
    });

    expect(result.current.accessibility).toEqual({
      reducedMotion: false,
      colorBlindPalette: true,
    });
    expect(
      window.localStorage.getItem(ACCESSIBILITY_STORAGE_KEYS.reducedMotion),
    ).toBe("0");
  });
});
