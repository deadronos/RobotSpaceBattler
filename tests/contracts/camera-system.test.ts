import { describe, expect, it } from 'vitest';

import { createCameraSystem, distanceToTarget } from '../../src/systems/cameraSystem';
import type { Vector3 } from '../../src/types';

const ARENA_BOUNDS = {
  min: { x: -60, y: 6, z: -60 },
  max: { x: 60, y: 42, z: 60 },
};

function cloneVector(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

describe('Contract Test: Camera System — Hybrid Controls (FR-003)', () => {
  it('supports free camera controls with keyboard-style movement', () => {
    const system = createCameraSystem({
      initialPosition: { x: 0, y: 15, z: 10 },
      bounds: ARENA_BOUNDS,
      smoothing: 0.35,
    });

    system.setMode('free');
    const start = system.getState().position;
    system.applyInput({
      type: 'free',
      movement: { forward: 1, right: 0.5, up: 0.2 },
      deltaTime: 0.5,
    });
    system.update(0.5);

    const end = system.getState().position;
    expect(end.z).toBeLessThan(start.z);
    expect(end.x).toBeGreaterThan(start.x);
    expect(end.y).toBeGreaterThan(start.y);
  });

  it('supports touch input (pan + pinch) with bounds enforcement', () => {
    const system = createCameraSystem({
      initialPosition: { x: -5, y: 12, z: 8 },
      bounds: ARENA_BOUNDS,
    });

    system.setMode('touch');
    const before = system.getState().position;
    system.applyInput({
      type: 'touch',
      pan: { x: -6, y: 4 },
      pinch: { scale: 0.85 },
    });
    system.update(0.016);
    const afterFirst = system.getState().position;

    expect(afterFirst.x).toBeGreaterThan(before.x);
    expect(afterFirst.z).toBeLessThan(before.z);
    expect(afterFirst.y).toBeLessThan(before.y);

    system.applyInput({
      type: 'touch',
      pan: { x: 400, y: -400 },
    });
    system.update(0.5);
    const clamped = system.getState().position;

    expect(clamped.x).toBeGreaterThanOrEqual(ARENA_BOUNDS.min.x);
    expect(clamped.x).toBeLessThanOrEqual(ARENA_BOUNDS.max.x);
    expect(clamped.z).toBeGreaterThanOrEqual(ARENA_BOUNDS.min.z);
    expect(clamped.z).toBeLessThanOrEqual(ARENA_BOUNDS.max.z);
  });

  it('provides cinematic auto-follow with smoothing towards a moving target', () => {
    const cinematicOffset = { x: 0, y: 10, z: -15 };
    const system = createCameraSystem({
      initialPosition: { x: -20, y: 18, z: 35 },
      bounds: ARENA_BOUNDS,
      cinematicOffset,
      smoothing: 0.4,
    });

    system.setTarget({ x: 40, y: 5, z: 0 });
    system.setMode('cinematic');

    const before = system.getState().position;
    system.update(0.2);
    const mid = system.getState().position;

    const desired = cloneVector({ x: 40, y: 5, z: 0 });
    const distanceBefore = distanceToTarget(before, desired, cinematicOffset, ARENA_BOUNDS);
    const distanceMid = distanceToTarget(mid, desired, cinematicOffset, ARENA_BOUNDS);
    expect(distanceMid).toBeLessThan(distanceBefore);

    system.setTarget({ x: -90, y: 8, z: 90 });
    const beforeRetarget = system.getState().position;
    const newDesired = cloneVector({ x: -90, y: 8, z: 90 });
    const distanceBeforeRetarget = distanceToTarget(
      beforeRetarget,
      newDesired,
      cinematicOffset,
      ARENA_BOUNDS,
    );

    system.update(0.3);
    const after = system.getState().position;

    expect(after.x).toBeGreaterThanOrEqual(ARENA_BOUNDS.min.x);
    expect(after.x).toBeLessThanOrEqual(ARENA_BOUNDS.max.x);
    expect(after.z).toBeGreaterThanOrEqual(ARENA_BOUNDS.min.z);
    expect(after.z).toBeLessThanOrEqual(ARENA_BOUNDS.max.z);

    const distanceAfter = distanceToTarget(after, newDesired, cinematicOffset, ARENA_BOUNDS);
    expect(distanceAfter).toBeLessThan(distanceBeforeRetarget);
  });

  it('allows tuning smoothing without desynchronising state snapshots', () => {
    const system = createCameraSystem({
      initialPosition: { x: 10, y: 20, z: -10 },
      bounds: ARENA_BOUNDS,
      smoothing: 0.2,
    });

    const snapshot = system.getState();
    snapshot.position.x = 999;

    const stateBefore = system.getState();
    expect(stateBefore.position.x).not.toBe(999);

    system.setSmoothing(0.6);
    expect(system.getState().smoothing).toBeCloseTo(0.6, 5);

    system.setMode('free');
    system.applyInput({
      type: 'free',
      movement: { forward: 0.5 },
      deltaTime: 0.25,
    });
    system.update(0.25);

    const stateAfter = system.getState();
    expect(stateAfter.lastUpdateTime).toBeGreaterThan(stateBefore.lastUpdateTime);
    expect(distance(stateAfter.position, stateBefore.position)).toBeGreaterThan(0);
  });
});
