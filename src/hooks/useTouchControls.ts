import { useCallback, useRef } from "react";

import type { CameraControlsResult } from "./useCameraControls";

interface TouchPointLike {
  identifier: number;
  clientX: number;
  clientY: number;
}

interface TouchEventLike {
  touches: ArrayLike<TouchPointLike>;
  preventDefault?: () => void;
}

export interface TouchControlHandlers {
  onTouchStart: (event: TouchEventLike) => void;
  onTouchMove: (event: TouchEventLike) => void;
  onTouchEnd: (event: TouchEventLike) => void;
  onTouchCancel: (event: TouchEventLike) => void;
}

const ORBIT_SPEED = 0.005;
const PINCH_SPEED = 0.03;

const toArray = (list: ArrayLike<TouchPointLike>): TouchPointLike[] => {
  const points: TouchPointLike[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const value =
      (
        list as Partial<ArrayLike<TouchPointLike>> & {
          item?: (idx: number) => TouchPointLike | null;
        }
      )[index] ??
      (
        list as Partial<ArrayLike<TouchPointLike>> & {
          item?: (idx: number) => TouchPointLike | null;
        }
      ).item?.(index) ??
      null;
    if (value) {
      points.push({
        identifier: value.identifier ?? index,
        clientX: value.clientX,
        clientY: value.clientY,
      });
    }
  }
  return points;
};

const centerPoint = (a: TouchPointLike, b: TouchPointLike) => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});

const pinchDistance = (a: TouchPointLike, b: TouchPointLike) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

export function useTouchControls(
  controls: CameraControlsResult,
): TouchControlHandlers {
  const stateRef = useRef({
    lastCenter: null as { x: number; y: number } | null,
    lastDistance: null as number | null,
    lastPositions: new Map<number, { x: number; y: number }>(),
  });

  const updatePositions = useCallback((touches: TouchPointLike[]) => {
    const map = stateRef.current.lastPositions;
    map.clear();
    touches.forEach((touch) => {
      map.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    });
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEventLike) => {
      const touches = toArray(event.touches);
      updatePositions(touches);
      if (touches.length >= 2) {
        const [first, second] = touches;
        stateRef.current.lastCenter = centerPoint(first, second);
        stateRef.current.lastDistance = pinchDistance(first, second);
      } else {
        stateRef.current.lastCenter = null;
        stateRef.current.lastDistance = null;
      }
      event.preventDefault?.();
    },
    [updatePositions],
  );

  const handleTouchMove = useCallback(
    (event: TouchEventLike) => {
      const touches = toArray(event.touches);
      if (touches.length === 0) {
        return;
      }
      if (touches.length === 1) {
        const point = touches[0];
        const previous =
          stateRef.current.lastPositions.get(point.identifier) ??
          ({ x: point.clientX, y: point.clientY } as const);
        const deltaX = point.clientX - previous.x;
        const deltaY = point.clientY - previous.y;
        controls.orbit(-deltaX * ORBIT_SPEED, deltaY * ORBIT_SPEED);
        updatePositions(touches);
        stateRef.current.lastCenter = null;
        stateRef.current.lastDistance = null;
        event.preventDefault?.();
        return;
      }

      const [first, second] = touches;
      const center = centerPoint(first, second);
      const lastCenter = stateRef.current.lastCenter;
      if (lastCenter) {
        const deltaX = center.x - lastCenter.x;
        const deltaY = center.y - lastCenter.y;
        controls.pan(deltaX, deltaY);
      }

      const distance = pinchDistance(first, second);
      const lastDistance = stateRef.current.lastDistance;
      if (lastDistance !== null) {
        const diff = lastDistance - distance;
        controls.zoom(diff * PINCH_SPEED);
      }

      stateRef.current.lastCenter = center;
      stateRef.current.lastDistance = distance;
      updatePositions(touches);
      event.preventDefault?.();
    },
    [controls, updatePositions],
  );

  const resetState = useCallback(() => {
    stateRef.current.lastCenter = null;
    stateRef.current.lastDistance = null;
    stateRef.current.lastPositions.clear();
  }, []);

  const handleTouchEnd = useCallback(
    (event: TouchEventLike) => {
      const touches = toArray(event.touches);
      if (touches.length === 0) {
        resetState();
      } else {
        updatePositions(touches);
        if (touches.length >= 2) {
          const [first, second] = touches;
          stateRef.current.lastCenter = centerPoint(first, second);
          stateRef.current.lastDistance = pinchDistance(first, second);
        } else {
          stateRef.current.lastCenter = null;
          stateRef.current.lastDistance = null;
        }
      }
      event.preventDefault?.();
    },
    [updatePositions],
  );

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };
}
