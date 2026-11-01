import { describe, expect, it } from "vitest";

import { segmentIntersectsSphere } from "../../../src/lib/math/segment";
import { vec3 } from "../../../src/lib/math/vec3";

describe("segmentIntersectsSphere", () => {
  const center = vec3(10, 0, 0);

  it("detects a segment that passes straight through the sphere", () => {
    expect(
      segmentIntersectsSphere(vec3(0, 0, 0), vec3(20, 0, 0), center, 1.2),
    ).toBe(true);
  });

  it("detects a segment that ends inside the sphere", () => {
    expect(
      segmentIntersectsSphere(vec3(0, 0, 0), vec3(10.5, 0, 0), center, 1.2),
    ).toBe(true);
  });

  it("misses a segment that stops short", () => {
    expect(
      segmentIntersectsSphere(vec3(0, 0, 0), vec3(5, 0, 0), center, 1.2),
    ).toBe(false);
  });

  it("misses a segment passing beside the sphere", () => {
    expect(
      segmentIntersectsSphere(vec3(0, 3, 0), vec3(20, 3, 0), center, 1.2),
    ).toBe(false);
  });

  it("misses when the sphere is behind the start point", () => {
    expect(
      segmentIntersectsSphere(vec3(12, 0, 0), vec3(30, 0, 0), center, 1.2),
    ).toBe(false);
  });

  it("handles a zero-length segment as a point test", () => {
    expect(
      segmentIntersectsSphere(vec3(10, 0, 0), vec3(10, 0, 0), center, 1.2),
    ).toBe(true);
    expect(
      segmentIntersectsSphere(vec3(0, 0, 0), vec3(0, 0, 0), center, 1.2),
    ).toBe(false);
  });
});
