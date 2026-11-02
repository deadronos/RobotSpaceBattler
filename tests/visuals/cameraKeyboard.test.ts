import { describe, expect, it } from "vitest";

import {
  CAMERA_MAX_POLAR,
  CAMERA_MAX_RADIUS,
  CAMERA_MIN_POLAR,
  CAMERA_MIN_RADIUS,
  CAMERA_TARGET,
  hasOpenModal,
  INITIAL_CAMERA_POSITION,
  isTypingTarget,
  orbitCameraPosition,
  resolveCameraCommand,
} from "../../src/visuals/cameraKeyboard";

function radiusOf(position: { x: number; y: number; z: number }) {
  return Math.hypot(
    position.x - CAMERA_TARGET.x,
    position.y - CAMERA_TARGET.y,
    position.z - CAMERA_TARGET.z,
  );
}

describe("keyboard camera controls (#166)", () => {
  it("maps orbit, zoom and reset keys", () => {
    expect(resolveCameraCommand("ArrowLeft")).toMatchObject({ kind: "orbit" });
    expect(resolveCameraCommand("ArrowRight")).toMatchObject({ kind: "orbit" });
    expect(resolveCameraCommand("ArrowUp")).toMatchObject({ kind: "orbit" });
    expect(resolveCameraCommand("ArrowDown")).toMatchObject({ kind: "orbit" });
    expect(resolveCameraCommand("+")).toMatchObject({
      kind: "orbit",
      zoom: expect.any(Number),
    });
    expect(resolveCameraCommand("0")).toEqual({ kind: "reset" });
    expect(resolveCameraCommand("r")).toBeNull();
    expect(resolveCameraCommand(" ")).toBeNull();
  });

  it("orbits at a constant distance around the target", () => {
    const start = {
      position: { ...INITIAL_CAMERA_POSITION },
      target: { ...CAMERA_TARGET },
    };
    const before = radiusOf(start.position);
    const next = orbitCameraPosition(start, 0.4, 0, 1);
    expect(radiusOf(next)).toBeCloseTo(before, 6);
    expect(next).not.toEqual(start.position);
  });

  it("zooms within the radius bounds", () => {
    const start = {
      position: { ...INITIAL_CAMERA_POSITION },
      target: { ...CAMERA_TARGET },
    };
    const zoomedIn = orbitCameraPosition(start, 0, 0, 0.5);
    expect(radiusOf(zoomedIn)).toBeCloseTo(
      Math.max(CAMERA_MIN_RADIUS, radiusOf(start.position) * 0.5),
      6,
    );

    const zoomedOut = orbitCameraPosition(start, 0, 0, 1000);
    expect(radiusOf(zoomedOut)).toBeCloseTo(CAMERA_MAX_RADIUS, 6);
  });

  it("clamps the polar angle above the floor", () => {
    const start = {
      position: { ...INITIAL_CAMERA_POSITION },
      target: { ...CAMERA_TARGET },
    };
    const tooHigh = orbitCameraPosition(start, 0, 10, 1);
    const tooLow = orbitCameraPosition(start, 0, -10, 1);

    for (const pose of [tooHigh, tooLow]) {
      const radius = radiusOf(pose);
      const polar = Math.acos(
        Math.min(1, Math.max(-1, (pose.y - CAMERA_TARGET.y) / radius)),
      );
      expect(polar).toBeGreaterThanOrEqual(CAMERA_MIN_POLAR - 1e-9);
      expect(polar).toBeLessThanOrEqual(CAMERA_MAX_POLAR + 1e-9);
    }
  });

  it("ignores keys typed into form fields", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(document.createElement("div"))).toBe(false);
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
    expect(isTypingTarget(document.createElement("select"))).toBe(true);
  });

  it("stops camera shortcuts while a modal dialog is open", () => {
    const container = document.createElement("div");
    expect(hasOpenModal(container)).toBe(false);

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    container.appendChild(dialog);

    expect(hasOpenModal(container)).toBe(true);
    expect(hasOpenModal(null)).toBe(false);
  });
});
