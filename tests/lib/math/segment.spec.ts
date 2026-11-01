import { describe, expect, it } from "vitest";

import {
  segmentAABBHitT,
  segmentCircleHitT,
  segmentIntersectsSphere,
  segmentSphereHitT,
} from "../../../src/lib/math/segment";
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

describe("segmentSphereHitT", () => {
  const center = vec3(10, 0, 0);

  it("returns the entry parameter for a segment through the sphere", () => {
    expect(
      segmentSphereHitT(vec3(0, 0, 0), vec3(20, 0, 0), center, 1.2),
    ).toBeCloseTo((10 - 1.2) / 20, 6);
  });

  it("returns 0 when the segment starts inside the sphere", () => {
    expect(segmentSphereHitT(vec3(10, 0, 0), vec3(20, 0, 0), center, 1.2)).toBe(
      0,
    );
  });

  it("returns null for misses and degenerate segments outside", () => {
    expect(
      segmentSphereHitT(vec3(0, 0, 0), vec3(5, 0, 0), center, 1.2),
    ).toBeNull();
    expect(
      segmentSphereHitT(vec3(0, 3, 0), vec3(20, 3, 0), center, 1.2),
    ).toBeNull();
    expect(
      segmentSphereHitT(vec3(0, 0, 0), vec3(0, 0, 0), center, 1.2),
    ).toBeNull();
  });
});

describe("segmentAABBHitT", () => {
  const center = { x: 10, z: 0 };

  it("returns the entry parameter for a segment through a thin wall", () => {
    const t = segmentAABBHitT({ x: 0, z: 0 }, { x: 100, z: 0 }, center, 0.2, 5);
    expect(t).toBeCloseTo(9.8 / 100, 6);
  });

  it("returns 0 when the segment starts inside the box", () => {
    expect(
      segmentAABBHitT({ x: 10, z: 0 }, { x: 100, z: 0 }, center, 0.2, 5),
    ).toBe(0);
  });

  it("returns null when the segment misses or stops short", () => {
    expect(
      segmentAABBHitT({ x: 0, z: 20 }, { x: 100, z: 20 }, center, 0.2, 5),
    ).toBeNull();
    expect(
      segmentAABBHitT({ x: 0, z: 0 }, { x: 5, z: 0 }, center, 0.2, 5),
    ).toBeNull();
  });
});

describe("segmentCircleHitT", () => {
  const center = { x: 10, z: 0 };

  it("returns the entry parameter for a segment through a pillar", () => {
    expect(
      segmentCircleHitT({ x: 0, z: 0 }, { x: 20, z: 0 }, center, 2),
    ).toBeCloseTo(8 / 20, 6);
  });

  it("returns 0 when the segment starts inside the circle", () => {
    expect(segmentCircleHitT({ x: 10, z: 0 }, { x: 20, z: 0 }, center, 2)).toBe(
      0,
    );
  });

  it("returns null when the segment misses the circle", () => {
    expect(
      segmentCircleHitT({ x: 0, z: 5 }, { x: 20, z: 5 }, center, 2),
    ).toBeNull();
    expect(
      segmentCircleHitT({ x: 0, z: 0 }, { x: 0, z: 0 }, center, 2),
    ).toBeNull();
  });
});
