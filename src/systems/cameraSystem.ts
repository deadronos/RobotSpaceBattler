import type { Vector3 } from "../types";

export type CameraMode = "free" | "touch" | "cinematic";

export interface CameraBounds {
  min: Vector3;
  max: Vector3;
}

export interface CameraSnapshot {
  mode: CameraMode;
  position: Vector3;
  desiredPosition: Vector3;
  smoothing: number;
  bounds: CameraBounds;
  target: Vector3 | null;
  cinematicOffset: Vector3;
  lastUpdateTime: number;
}

type FreeInput = {
  type: "free";
  movement?: {
    forward?: number;
    right?: number;
    up?: number;
  };
  deltaTime: number;
};

type TouchInput = {
  type: "touch";
  pan: {
    x: number;
    y: number;
  };
  pinch?: {
    scale: number;
  };
};

export type CameraInput = FreeInput | TouchInput;

export interface CameraSystemConfig {
  initialPosition?: Vector3;
  bounds?: CameraBounds;
  smoothing?: number;
  cinematicOffset?: Vector3;
  maxFreeSpeed?: number;
  touchPanSpeed?: number;
}

export interface CameraSystem {
  getState(): CameraSnapshot;
  setMode(mode: CameraMode): void;
  setSmoothing(smoothing: number): void;
  setBounds(bounds: CameraBounds): void;
  setTarget(target: Vector3 | null): void;
  applyInput(input: CameraInput): void;
  update(deltaTime: number): void;
}

const DEFAULT_POSITION: Vector3 = { x: 0, y: 12, z: 16 };
const DEFAULT_BOUNDS: CameraBounds = {
  min: { x: -80, y: 4, z: -80 },
  max: { x: 80, y: 60, z: 80 },
};
const DEFAULT_SMOOTHING = 0.25;
const DEFAULT_OFFSET: Vector3 = { x: 0, y: 8, z: -18 };
const DEFAULT_FREE_SPEED = 18;
const DEFAULT_TOUCH_PAN_SPEED = 0.6;
const ZOOM_HEIGHT = 6;

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampVector(value: Vector3, bounds: CameraBounds): Vector3 {
  return {
    x: clampValue(value.x, bounds.min.x, bounds.max.x),
    y: clampValue(value.y, bounds.min.y, bounds.max.y),
    z: clampValue(value.z, bounds.min.z, bounds.max.z),
  };
}

function cloneVector(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function addVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vectorDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function lerpVector(a: Vector3, b: Vector3, factor: number): Vector3 {
  return {
    x: a.x + (b.x - a.x) * factor,
    y: a.y + (b.y - a.y) * factor,
    z: a.z + (b.z - a.z) * factor,
  };
}

function sanitizeSmoothing(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SMOOTHING;
  }
  return clampValue(value, 0.05, 0.95);
}

function sanitizeBounds(bounds: CameraBounds | undefined): CameraBounds {
  if (!bounds) {
    return {
      min: cloneVector(DEFAULT_BOUNDS.min),
      max: cloneVector(DEFAULT_BOUNDS.max),
    };
  }

  return {
    min: {
      x: Math.min(bounds.min.x, bounds.max.x),
      y: Math.min(bounds.min.y, bounds.max.y),
      z: Math.min(bounds.min.z, bounds.max.z),
    },
    max: {
      x: Math.max(bounds.min.x, bounds.max.x),
      y: Math.max(bounds.min.y, bounds.max.y),
      z: Math.max(bounds.min.z, bounds.max.z),
    },
  };
}

export function createCameraSystem(
  config: CameraSystemConfig = {},
): CameraSystem {
  const bounds = sanitizeBounds(config.bounds);
  const smoothing = sanitizeSmoothing(config.smoothing ?? DEFAULT_SMOOTHING);
  const cinematicOffset = cloneVector(config.cinematicOffset ?? DEFAULT_OFFSET);
  const freeSpeed = config.maxFreeSpeed ?? DEFAULT_FREE_SPEED;
  const touchPanSpeed = config.touchPanSpeed ?? DEFAULT_TOUCH_PAN_SPEED;

  const initialPosition = clampVector(
    cloneVector(config.initialPosition ?? DEFAULT_POSITION),
    bounds,
  );

  const state: CameraSnapshot = {
    mode: "free",
    position: initialPosition,
    desiredPosition: initialPosition,
    smoothing,
    bounds,
    target: null,
    cinematicOffset,
    lastUpdateTime: 0,
  };

  function snapshot(): CameraSnapshot {
    return {
      mode: state.mode,
      position: cloneVector(state.position),
      desiredPosition: cloneVector(state.desiredPosition),
      smoothing: state.smoothing,
      bounds: {
        min: cloneVector(state.bounds.min),
        max: cloneVector(state.bounds.max),
      },
      target: state.target ? cloneVector(state.target) : null,
      cinematicOffset: cloneVector(state.cinematicOffset),
      lastUpdateTime: state.lastUpdateTime,
    };
  }

  function setMode(mode: CameraMode): void {
    if (state.mode === mode) {
      return;
    }
    state.mode = mode;
    if (mode === "cinematic" && state.target) {
      const desired = clampVector(
        addVectors(state.target, state.cinematicOffset),
        state.bounds,
      );
      state.desiredPosition = desired;
    }
  }

  function setSmoothing(value: number): void {
    state.smoothing = sanitizeSmoothing(value);
  }

  function setBounds(next: CameraBounds): void {
    state.bounds = sanitizeBounds(next);
    state.position = clampVector(state.position, state.bounds);
    state.desiredPosition = clampVector(state.desiredPosition, state.bounds);
  }

  function setTarget(target: Vector3 | null): void {
    state.target = target ? cloneVector(target) : null;
    if (state.mode === "cinematic" && state.target) {
      state.desiredPosition = clampVector(
        addVectors(state.target, state.cinematicOffset),
        state.bounds,
      );
    }
  }

  function applyInput(input: CameraInput): void {
    if (input.type === "free") {
      if (state.mode !== "free") {
        return;
      }
      const dt = clampValue(input.deltaTime, 0, 1);
      const step = freeSpeed * dt;
      const movement = input.movement ?? {};
      const delta: Vector3 = {
        x: (movement.right ?? 0) * step,
        y: (movement.up ?? 0) * step,
        z: -(movement.forward ?? 0) * step,
      };
      const nextDesired = addVectors(state.desiredPosition, delta);
      state.desiredPosition = clampVector(nextDesired, state.bounds);
    } else if (input.type === "touch") {
      if (state.mode !== "touch") {
        return;
      }
      const panDelta = {
        x: -(input.pan.x ?? 0) * touchPanSpeed,
        z: -(input.pan.y ?? 0) * touchPanSpeed,
      };
      const pinchScale = input.pinch?.scale ?? 1;
      const normalizedScale =
        pinchScale === 0 ? 1 : clampValue(pinchScale, 0.5, 1.5);
      const zoomDelta = (normalizedScale - 1) * ZOOM_HEIGHT;
      const desired = {
        x: state.desiredPosition.x + panDelta.x,
        y: state.desiredPosition.y + zoomDelta,
        z: state.desiredPosition.z + panDelta.z,
      };
      state.desiredPosition = clampVector(desired, state.bounds);
    }
  }

  function update(deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
      return;
    }

    if (state.mode === "cinematic" && state.target) {
      const targetPosition = clampVector(
        addVectors(state.target, state.cinematicOffset),
        state.bounds,
      );
      state.desiredPosition = targetPosition;
    }

    const factor = clampValue(
      state.smoothing * clampValue(deltaTime * 60, 0, 3),
      0,
      1,
    );
    state.position = clampVector(
      lerpVector(state.position, state.desiredPosition, factor),
      state.bounds,
    );
    state.lastUpdateTime += deltaTime;
  }

  return {
    getState: snapshot,
    setMode,
    setSmoothing,
    setBounds,
    setTarget,
    applyInput,
    update,
  };
}

export function distanceToTarget(
  current: Vector3,
  target: Vector3,
  offset: Vector3,
  bounds: CameraBounds,
): number {
  const desired = clampVector(addVectors(target, offset), bounds);
  return vectorDistance(cloneVector(current), desired);
}
