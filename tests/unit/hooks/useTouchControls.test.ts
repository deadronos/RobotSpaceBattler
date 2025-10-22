import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createDefaultArena } from '../../../src/ecs/entities/Arena';
import { useCameraControls } from '../../../src/hooks/useCameraControls';
import { useTouchControls } from '../../../src/hooks/useTouchControls';
import type { Vector3 } from '../../../src/types';

const distance = (a: Vector3, b: Vector3) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
};

interface TouchPoint {
  identifier: number;
  clientX: number;
  clientY: number;
}

const createTouchList = (points: TouchPoint[]) => {
  const list: any = {
    length: points.length,
    item: (index: number) => points[index] ?? null,
  };
  points.forEach((point, index) => {
    list[index] = point;
  });
  list[Symbol.iterator] = function* iterator() {
    for (const point of points) {
      yield point;
    }
  };
  return list as TouchList;
};

const createTouchEvent = (points: TouchPoint[]) =>
  ({
    touches: createTouchList(points),
    preventDefault: () => {},
  }) as unknown as TouchEvent;

describe('useTouchControls', () => {
  it('maps single-finger drags to orbit operations', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => {
      const controls = useCameraControls({ arena });
      const touch = useTouchControls(controls);
      return { controls, touch };
    });

    const initialPosition = result.current.controls.position;

    act(() => {
      result.current.touch.onTouchStart(
        createTouchEvent([
          { identifier: 1, clientX: 200, clientY: 200 },
        ]),
      );
      result.current.touch.onTouchMove(
        createTouchEvent([
          { identifier: 1, clientX: 160, clientY: 260 },
        ]),
      );
      result.current.touch.onTouchEnd(createTouchEvent([]));
    });

    expect(result.current.controls.position.x).not.toBeCloseTo(initialPosition.x, 3);
    expect(result.current.controls.position.z).not.toBeCloseTo(initialPosition.z, 3);
  });

  it('performs pinch-to-zoom when two touches change their spacing', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => {
      const controls = useCameraControls({ arena });
      const touch = useTouchControls(controls);
      return { controls, touch };
    });

    const initialDistance = distance(
      result.current.controls.position,
      result.current.controls.target,
    );

    act(() => {
      result.current.touch.onTouchStart(
        createTouchEvent([
          { identifier: 1, clientX: 100, clientY: 100 },
          { identifier: 2, clientX: 200, clientY: 100 },
        ]),
      );
      result.current.touch.onTouchMove(
        createTouchEvent([
          { identifier: 1, clientX: 90, clientY: 100 },
          { identifier: 2, clientX: 210, clientY: 100 },
        ]),
      );
    });

    const zoomedDistance = distance(
      result.current.controls.position,
      result.current.controls.target,
    );
    expect(zoomedDistance).toBeLessThan(initialDistance);
  });

  it('supports two-finger pans while respecting arena boundaries', () => {
    const arena = createDefaultArena();
    const { result } = renderHook(() => {
      const controls = useCameraControls({ arena });
      const touch = useTouchControls(controls);
      return { controls, touch };
    });

    act(() => {
      result.current.touch.onTouchStart(
        createTouchEvent([
          { identifier: 1, clientX: 120, clientY: 120 },
          { identifier: 2, clientX: 180, clientY: 120 },
        ]),
      );
      result.current.touch.onTouchMove(
        createTouchEvent([
          { identifier: 1, clientX: 200, clientY: 120 },
          { identifier: 2, clientX: 260, clientY: 120 },
        ]),
      );
      result.current.touch.onTouchEnd(createTouchEvent([]));
    });

    const { target, position } = result.current.controls;
    expect(target.x).toBeLessThanOrEqual(arena.boundaries.max.x);
    expect(target.x).toBeGreaterThanOrEqual(arena.boundaries.min.x);
    expect(position.x).toBeLessThanOrEqual(arena.boundaries.max.x);
    expect(position.x).toBeGreaterThanOrEqual(arena.boundaries.min.x);
  });
});
