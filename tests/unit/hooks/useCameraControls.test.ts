import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createDefaultArena } from '../../../src/ecs/entities/Arena';
import type { Vector3 } from '../../../src/types';
import { useCameraControls } from '../../../src/hooks/useCameraControls';

const distance = (a: Vector3, b: Vector3) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
};

describe('useCameraControls', () => {
  it('initializes with an elevated orbit around the arena center', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => useCameraControls({ arena }));

    expect(result.current.target.x).toBeGreaterThanOrEqual(arena.boundaries.min.x);
    expect(result.current.target.x).toBeLessThanOrEqual(arena.boundaries.max.x);
    expect(result.current.target.z).toBeGreaterThanOrEqual(arena.boundaries.min.z);
    expect(result.current.target.z).toBeLessThanOrEqual(arena.boundaries.max.z);
    expect(result.current.position.y).toBeGreaterThan(result.current.target.y);
    expect(distance(result.current.position, result.current.target)).toBeGreaterThan(20);
  });

  it('rotates around the target when dragging with the primary mouse button', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => useCameraControls({ arena }));
    const initialPosition = result.current.position;

    act(() => {
      result.current.pointer.onPointerDown({ button: 0, clientX: 100, clientY: 100 } as PointerEvent);
    });
    act(() => {
      result.current.pointer.onPointerMove({ clientX: 40, clientY: 140 } as PointerEvent);
    });
    act(() => {
      result.current.pointer.onPointerUp();
    });

    expect(distance(result.current.position, result.current.target)).toBeCloseTo(
      distance(initialPosition, result.current.target),
      2,
    );
    expect(result.current.position.x).not.toBeCloseTo(initialPosition.x, 4);
    expect(result.current.position.z).not.toBeCloseTo(initialPosition.z, 4);
  });

  it('zooms in and clamps zoom distance when using the mouse wheel', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => useCameraControls({ arena }));

    const initialDistance = distance(result.current.position, result.current.target);

    act(() => {
      result.current.pointer.onWheel({ deltaY: -240 } as WheelEvent);
    });

    const zoomedDistance = distance(result.current.position, result.current.target);
    expect(zoomedDistance).toBeLessThan(initialDistance);
    expect(zoomedDistance).toBeGreaterThanOrEqual(10);

    act(() => {
      result.current.pointer.onWheel({ deltaY: 10000 } as WheelEvent);
    });

    const clampedDistance = distance(result.current.position, result.current.target);
    expect(clampedDistance).toBeLessThanOrEqual(120);
  });

  it('pans when using the secondary mouse button and keeps the camera within arena bounds', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => useCameraControls({ arena }));

    act(() => {
      result.current.pointer.onPointerDown({ button: 2, clientX: 50, clientY: 50 } as PointerEvent);
    });
    act(() => {
      result.current.pointer.onPointerMove({ clientX: 250, clientY: 30 } as PointerEvent);
    });
    act(() => {
      result.current.pointer.onPointerUp();
    });

    expect(result.current.target.x).toBeLessThanOrEqual(arena.boundaries.max.x);
    expect(result.current.target.x).toBeGreaterThanOrEqual(arena.boundaries.min.x);
    expect(result.current.target.z).toBeLessThanOrEqual(arena.boundaries.max.z);
    expect(result.current.target.z).toBeGreaterThanOrEqual(arena.boundaries.min.z);
    expect(result.current.position.x).toBeLessThanOrEqual(arena.boundaries.max.x);
    expect(result.current.position.x).toBeGreaterThanOrEqual(arena.boundaries.min.x);
  });

  it('responds to keyboard input for rotation, zoom, and strafing', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => useCameraControls({ arena }));

    const originalDistance = distance(result.current.position, result.current.target);
    const originalTarget = result.current.target;
    const originalPosition = result.current.position;

    act(() => {
      result.current.keyboard.onKeyDown({ code: 'ArrowLeft' } as KeyboardEvent);
      result.current.keyboard.onKeyDown({ code: 'KeyW' } as KeyboardEvent);
      result.current.keyboard.onKeyDown({ code: 'KeyA' } as KeyboardEvent);
      result.current.update(0.5);
      result.current.keyboard.onKeyUp({ code: 'ArrowLeft' } as KeyboardEvent);
      result.current.keyboard.onKeyUp({ code: 'KeyW' } as KeyboardEvent);
      result.current.keyboard.onKeyUp({ code: 'KeyA' } as KeyboardEvent);
    });

    expect(distance(result.current.position, result.current.target)).toBeLessThan(originalDistance);
    expect(result.current.position.x).not.toBeCloseTo(originalPosition.x, 3);
    expect(result.current.target.x).not.toBeCloseTo(originalTarget.x, 3);
  });
});
