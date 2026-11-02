/**
 * Keyboard camera control (#166).
 *
 * The scene camera was mouse-only. These helpers are pure camera maths plus key
 * mapping, so the keyboard path is testable without a WebGL context. No
 * simulation state is read or written: this only moves the render camera.
 */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface CameraPose {
  position: Vec3Like;
  target: Vec3Like;
}

/** Initial camera pose, shared with `<Canvas camera>` so reset is exact. */
export const INITIAL_CAMERA_POSITION: Vec3Like = { x: -14, y: 28, z: 48 };
export const CAMERA_TARGET: Vec3Like = { x: 0, y: 0, z: 0 };

/** One key press orbits by 10 degrees. */
export const CAMERA_ORBIT_STEP = Math.PI / 18;
export const CAMERA_ZOOM_STEP = 0.88;
export const CAMERA_MIN_RADIUS = 10;
export const CAMERA_MAX_RADIUS = 90;
/** Keep the camera above the floor and out of the exact top-down singularity. */
export const CAMERA_MIN_POLAR = 0.15;
export const CAMERA_MAX_POLAR = Math.PI / 2 - 0.1;

export const OPEN_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]';

export type CameraKeyboardCommand =
  | { kind: "orbit"; azimuth: number; polar: number; zoom: number }
  | { kind: "reset" };

/**
 * Maps a `KeyboardEvent.key` to a camera command. Returns `null` for keys the
 * camera does not handle, so unrelated shortcuts keep working.
 */
export function resolveCameraCommand(
  key: string,
): CameraKeyboardCommand | null {
  switch (key) {
    case "ArrowLeft":
      return {
        kind: "orbit",
        azimuth: -CAMERA_ORBIT_STEP,
        polar: 0,
        zoom: 1,
      };
    case "ArrowRight":
      return { kind: "orbit", azimuth: CAMERA_ORBIT_STEP, polar: 0, zoom: 1 };
    case "ArrowUp":
      return {
        kind: "orbit",
        azimuth: 0,
        polar: -CAMERA_ORBIT_STEP / 2,
        zoom: 1,
      };
    case "ArrowDown":
      return {
        kind: "orbit",
        azimuth: 0,
        polar: CAMERA_ORBIT_STEP / 2,
        zoom: 1,
      };
    case "+":
    case "=":
      return { kind: "orbit", azimuth: 0, polar: 0, zoom: CAMERA_ZOOM_STEP };
    case "-":
    case "_":
      return {
        kind: "orbit",
        azimuth: 0,
        polar: 0,
        zoom: 1 / CAMERA_ZOOM_STEP,
      };
    case "0":
      return { kind: "reset" };
    default:
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Orbits `position` around `target` and returns the next camera position.
 *
 * Spherical coordinates keep the orbit at a constant distance, and the polar
 * angle is clamped so the camera never crosses the floor.
 */
export function orbitCameraPosition(
  pose: CameraPose,
  azimuth: number,
  polar: number,
  zoom: number,
): Vec3Like {
  const dx = pose.position.x - pose.target.x;
  const dy = pose.position.y - pose.target.y;
  const dz = pose.position.z - pose.target.z;
  const radius = Math.hypot(dx, dy, dz);
  if (!Number.isFinite(radius) || radius <= 0) {
    return { x: pose.position.x, y: pose.position.y, z: pose.position.z };
  }

  const theta = Math.atan2(dx, dz) + azimuth;
  const phi = clamp(
    Math.acos(clamp(dy / radius, -1, 1)) + polar,
    CAMERA_MIN_POLAR,
    CAMERA_MAX_POLAR,
  );
  const nextRadius = clamp(radius * zoom, CAMERA_MIN_RADIUS, CAMERA_MAX_RADIUS);

  return {
    x: pose.target.x + nextRadius * Math.sin(phi) * Math.sin(theta),
    y: pose.target.y + nextRadius * Math.cos(phi),
    z: pose.target.z + nextRadius * Math.sin(phi) * Math.cos(theta),
  };
}

/** True when a key event targets a field the camera shortcuts must not steal. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== "string") {
    return false;
  }
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT" ||
    element.isContentEditable === true
  );
}

/** True while a modal dialog is open; the dialog owns the keyboard then. */
export function hasOpenModal(root: ParentNode | null | undefined): boolean {
  return Boolean(root?.querySelector?.(OPEN_MODAL_SELECTOR));
}
