import type { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { ComponentRef, RefObject } from "react";
import { useEffect } from "react";

import {
  CAMERA_TARGET,
  hasOpenModal,
  INITIAL_CAMERA_POSITION,
  isTypingTarget,
  orbitCameraPosition,
  resolveCameraCommand,
} from "../visuals/cameraKeyboard";

interface CameraKeyboardControlsProps {
  /** The OrbitControls instance mounted by `Scene`. */
  controlsRef: RefObject<ComponentRef<typeof OrbitControls> | null>;
}

/**
 * Keyboard camera controls (#166).
 *
 * Arrow keys orbit, `+`/`-` zoom and `0` resets, matching the mouse controls.
 * Events are ignored while a field or an open modal dialog owns the keyboard.
 * Movement is applied instantly (no eased tween), so it needs no separate
 * reduced-motion branch.
 */
export function CameraKeyboardControls({
  controlsRef,
}: CameraKeyboardControlsProps) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target) || hasOpenModal(document)) {
        return;
      }

      const command = resolveCameraCommand(event.key);
      if (!command) {
        return;
      }
      event.preventDefault();

      const controls = controlsRef.current;
      if (command.kind === "reset") {
        camera.position.set(
          INITIAL_CAMERA_POSITION.x,
          INITIAL_CAMERA_POSITION.y,
          INITIAL_CAMERA_POSITION.z,
        );
        controls?.target.set(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
        controls?.update();
        return;
      }

      const target = controls?.target ?? CAMERA_TARGET;
      const next = orbitCameraPosition(
        { position: camera.position, target },
        command.azimuth,
        command.polar,
        command.zoom,
      );
      camera.position.set(next.x, next.y, next.z);
      controls?.update();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [camera, controlsRef]);

  return null;
}
