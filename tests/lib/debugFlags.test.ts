import { describe, expect, it } from "vitest";

import { shouldExposeDebugGlobals } from "@/lib/debugFlags";

describe("shouldExposeDebugGlobals", () => {
  it("returns false in non-dev mode without a debug query", () => {
    expect(
      shouldExposeDebugGlobals({
        isDev: false,
        search: "",
      }),
    ).toBe(false);
  });

  it("returns true when the debug query parameter is present", () => {
    expect(
      shouldExposeDebugGlobals({
        isDev: false,
        search: "?debug=1",
      }),
    ).toBe(true);
  });

  it("returns true in dev mode", () => {
    expect(
      shouldExposeDebugGlobals({
        isDev: true,
        search: "",
      }),
    ).toBe(true);
  });
});
