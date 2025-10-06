import { useCallback, useMemo, useRef, useState } from 'react';

import type { ArenaEntity } from '../ecs/entities/Arena';
import type { Vector3 } from '../types';

interface SphericalCoordinates {
  azimuth: number;
  polar: number;
  distance: number;
}

interface PointerHandlers {
  onPointerDown: (event: Pick<PointerEvent, 'button' | 'clientX' | 'clientY'>) => void;
  onPointerMove: (event: Pick<PointerEvent, 'clientX' | 'clientY'>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onWheel: (event: Pick<WheelEvent, 'deltaY'>) => void;
}

interface KeyboardHandlers {
  onKeyDown: (event: Pick<KeyboardEvent, 'code'>) => void;
  onKeyUp: (event: Pick<KeyboardEvent, 'code'>) => void;
}

export interface UseCameraControlsOptions {
  arena: ArenaEntity;
  initialTarget?: Vector3;
  initialAzimuth?: number;
  initialPolar?: number;
  initialDistance?: number;
  minDistance?: number;
  maxDistance?: number;
}

export interface CameraControlsResult {
  position: Vector3;
  target: Vector3;
  pointer: PointerHandlers;
  keyboard: KeyboardHandlers;
  update: (deltaTime: number) => void;
  orbit: (deltaAzimuth: number, deltaPolar: number) => void;
  pan: (deltaX: number, deltaY: number) => void;
  zoom: (delta: number) => void;
}

const TWO_PI = Math.PI * 2;
const DEFAULT_TARGET: Vector3 = { x: 0, y: 5, z: 0 };
const ROTATE_SPEED = 0.005;
const PAN_SPEED = 0.05;
const ZOOM_SPEED = 0.0025;
const KEY_ROTATE_SPEED = Math.PI;
const KEY_PITCH_SPEED = Math.PI / 2;
const KEY_ZOOM_SPEED = 30;
const KEY_STRAFE_SPEED = 30;
const MIN_POLAR = 0.2;
const MAX_POLAR = Math.PI / 2 - 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const wrapAngle = (angle: number) => {
  let wrapped = angle % TWO_PI;
  if (wrapped < 0) {
    wrapped += TWO_PI;
  }
  return wrapped;
};

const toCartesian = (target: Vector3, spherical: SphericalCoordinates, arena: ArenaEntity, minDistance: number) => {
  const sinPolar = Math.sin(spherical.polar);
  const cosPolar = Math.cos(spherical.polar);
  const sinAzimuth = Math.sin(spherical.azimuth);
  const cosAzimuth = Math.cos(spherical.azimuth);

  const radius = Math.max(spherical.distance, minDistance);

  const position: Vector3 = {
    x: target.x + radius * sinPolar * Math.sin(spherical.azimuth),
    y: target.y + radius * cosPolar,
    z: target.z + radius * sinPolar * Math.cos(spherical.azimuth),
  };

  return {
    x: clamp(position.x, arena.boundaries.min.x, arena.boundaries.max.x),
    y: Math.max(target.y + 5, position.y),
    z: clamp(position.z, arena.boundaries.min.z, arena.boundaries.max.z),
  };
};

const buildRightVector = (azimuth: number) => ({
  x: Math.sin(azimuth - Math.PI / 2),
  y: 0,
  z: Math.cos(azimuth - Math.PI / 2),
});

const buildForwardVector = (azimuth: number) => ({
  x: Math.sin(azimuth),
  y: 0,
  z: Math.cos(azimuth),
});

export function useCameraControls({
  arena,
  initialTarget = DEFAULT_TARGET,
  initialAzimuth = Math.PI / 4,
  initialPolar = Math.PI / 3,
  initialDistance = 60,
  minDistance = 12,
  maxDistance = 120,
}: UseCameraControlsOptions): CameraControlsResult {
  const clampTarget = useCallback(
    (candidate: Vector3): Vector3 => ({
      x: clamp(candidate.x, arena.boundaries.min.x, arena.boundaries.max.x),
      y: Math.max(0, candidate.y),
      z: clamp(candidate.z, arena.boundaries.min.z, arena.boundaries.max.z),
    }),
    [arena.boundaries.max.x, arena.boundaries.max.z, arena.boundaries.min.x, arena.boundaries.min.z],
  );

  const [target, setTargetState] = useState<Vector3>(() => clampTarget(initialTarget));
  const targetRef = useRef(target);

  const setTarget = useCallback(
    (updater: Vector3 | ((current: Vector3) => Vector3)) => {
      setTargetState((current) => {
        const next = typeof updater === 'function' ? (updater as (current: Vector3) => Vector3)(current) : updater;
        const clamped = clampTarget(next);
        targetRef.current = clamped;
        return clamped;
      });
    },
    [clampTarget],
  );

  const [spherical, setSphericalState] = useState<SphericalCoordinates>(() => ({
    azimuth: wrapAngle(initialAzimuth),
    polar: clamp(initialPolar, MIN_POLAR, MAX_POLAR),
    distance: clamp(initialDistance, minDistance, maxDistance),
  }));
  const sphericalRef = useRef(spherical);

  const setSpherical = useCallback(
    (updater: SphericalCoordinates | ((current: SphericalCoordinates) => SphericalCoordinates)) => {
      setSphericalState((current) => {
        const next = typeof updater === 'function' ? (updater as (current: SphericalCoordinates) => SphericalCoordinates)(current) : updater;
        const normalized: SphericalCoordinates = {
          azimuth: wrapAngle(next.azimuth),
          polar: clamp(next.polar, MIN_POLAR, MAX_POLAR),
          distance: clamp(next.distance, minDistance, maxDistance),
        };
        sphericalRef.current = normalized;
        return normalized;
      });
    },
    [maxDistance, minDistance],
  );

  const pointerState = useRef<{ button: number; lastX: number; lastY: number } | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const applyPan = useCallback(
    (deltaX: number, deltaY: number) => {
      const azimuth = sphericalRef.current.azimuth;
      const right = buildRightVector(azimuth);
      const forward = buildForwardVector(azimuth);
      const movement = {
        x: right.x * deltaX * PAN_SPEED + forward.x * -deltaY * PAN_SPEED,
        z: right.z * deltaX * PAN_SPEED + forward.z * -deltaY * PAN_SPEED,
      };
      setTarget((current) => ({ x: current.x + movement.x, y: current.y, z: current.z + movement.z }));
    },
    [setTarget],
  );

  const orbit = useCallback(
    (deltaAzimuth: number, deltaPolar: number) => {
      setSpherical((current) => ({
        azimuth: current.azimuth + deltaAzimuth,
        polar: current.polar + deltaPolar,
        distance: current.distance,
      }));
    },
    [setSpherical],
  );

  const pan = useCallback(
    (deltaX: number, deltaY: number) => {
      applyPan(deltaX, deltaY);
    },
    [applyPan],
  );

  const zoom = useCallback(
    (delta: number) => {
      if (delta === 0) {
        return;
      }
      setSpherical((current) => ({
        ...current,
        distance: current.distance + delta,
      }));
    },
    [setSpherical],
  );

  const pointer: PointerHandlers = {
    onPointerDown: (event) => {
      pointerState.current = { button: event.button, lastX: event.clientX, lastY: event.clientY };
    },
    onPointerMove: (event) => {
      if (!pointerState.current) {
        return;
      }
      const deltaX = event.clientX - pointerState.current.lastX;
      const deltaY = event.clientY - pointerState.current.lastY;
      pointerState.current.lastX = event.clientX;
      pointerState.current.lastY = event.clientY;

      if (pointerState.current.button === 0) {
        orbit(-deltaX * ROTATE_SPEED, deltaY * ROTATE_SPEED);
      } else if (pointerState.current.button === 2) {
        pan(deltaX, deltaY);
      }
    },
    onPointerUp: () => {
      pointerState.current = null;
    },
    onPointerLeave: () => {
      pointerState.current = null;
    },
    onWheel: (event) => {
      if (event.deltaY === 0) {
        return;
      }
      zoom(event.deltaY * ZOOM_SPEED);
    },
  };

  const keyboard: KeyboardHandlers = {
    onKeyDown: (event) => {
      keysRef.current.add(event.code);
    },
    onKeyUp: (event) => {
      keysRef.current.delete(event.code);
    },
  };

  const update = useCallback(
    (deltaTime: number) => {
      if (deltaTime <= 0) {
        return;
      }
      const keys = keysRef.current;
      if (keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('ArrowUp') || keys.has('ArrowDown')) {
        const azimuthDelta =
          (keys.has('ArrowLeft') ? KEY_ROTATE_SPEED * deltaTime : 0) -
          (keys.has('ArrowRight') ? KEY_ROTATE_SPEED * deltaTime : 0);
        const polarDelta =
          (keys.has('ArrowDown') ? KEY_PITCH_SPEED * deltaTime : 0) -
          (keys.has('ArrowUp') ? KEY_PITCH_SPEED * deltaTime : 0);
        if (azimuthDelta !== 0 || polarDelta !== 0) {
          orbit(azimuthDelta, polarDelta);
        }
      }

      if (keys.has('KeyW') || keys.has('KeyS')) {
        const zoomDelta =
          (keys.has('KeyS') ? KEY_ZOOM_SPEED * deltaTime : 0) -
          (keys.has('KeyW') ? KEY_ZOOM_SPEED * deltaTime : 0);
        if (zoomDelta !== 0) {
          zoom(zoomDelta);
        }
      }

      if (keys.has('KeyA') || keys.has('KeyD')) {
        const strafe = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
        if (strafe !== 0) {
          const right = buildRightVector(sphericalRef.current.azimuth);
          const offset = KEY_STRAFE_SPEED * deltaTime * strafe;
          setTarget((current) => ({ x: current.x + right.x * offset, y: current.y, z: current.z + right.z * offset }));
        }
      }
    },
    [orbit, setTarget, zoom],
  );

  const position = useMemo(
    () => toCartesian(target, spherical, arena, minDistance),
    [arena, minDistance, spherical, target],
  );

  return { position, target, pointer, keyboard, update, orbit, pan, zoom };
}
