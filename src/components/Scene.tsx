import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ComponentRef, lazy, ReactNode, Suspense, useRef } from "react";

import { canExposeDebugGlobals } from "../lib/debugFlags";
import { useQualitySettings } from "../state/quality/QualityManager";
import { INITIAL_CAMERA_POSITION } from "../visuals/cameraKeyboard";
import { DynamicResScaler } from "../visuals/DynamicResScaler";
import { Lighting } from "../visuals/Lighting";
import { resolveMotionEffects } from "../visuals/reducedMotion";
import { initializeRendererStats } from "../visuals/rendererStats";
import { CameraKeyboardControls } from "./CameraKeyboardControls";

const PostProcessing = lazy(async () => {
  const module = await import("../visuals/PostProcessing");
  return { default: module.PostProcessing };
});

const PerfMonitorOverlay = lazy(async () => {
  const module = await import("./debug/PerfMonitorOverlay");
  return { default: module.PerfMonitorOverlay };
});

/**
 * Props for the Scene component.
 */
interface SceneProps {
  /** The 3D content to render inside the scene. */
  children?: ReactNode;
  /** Whether to render the performance overlay (off by default). */
  showPerfOverlay?: boolean;
  /** Reduced motion disables post-processing and camera inertia (#166). */
  reducedMotion?: boolean;
}

/**
 * The main 3D scene container.
 * Sets up the Canvas, lights, physics world, and camera controls.
 *
 * @param props - Component props.
 * @returns The rendered scene.
 */
export function Scene({
  children,
  showPerfOverlay = false,
  reducedMotion = false,
}: SceneProps) {
  const qualitySettings = useQualitySettings();
  const { postprocessing, render } = qualitySettings.visuals;
  const shadowsEnabled = render.shadowsEnabled;
  const shadowMapSize = render.shadowMapSize;
  const starCount = render.dpr >= 1.5 ? 1500 : 900;
  const motion = resolveMotionEffects({
    postprocessingEnabled: postprocessing.enabled,
    reducedMotion,
  });
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  return (
    <Canvas
      role="img"
      aria-label="3D battle arena. Team strength and alive counts are shown in the on-screen HUD. Camera: arrow keys orbit, plus and minus zoom, 0 resets."
      shadows={shadowsEnabled ? "percentage" : false}
      dpr={render.dpr}
      camera={{
        position: [
          INITIAL_CAMERA_POSITION.x,
          INITIAL_CAMERA_POSITION.y,
          INITIAL_CAMERA_POSITION.z,
        ],
        fov: 45,
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene, camera }) => {
        initializeRendererStats(gl);
        if (!canExposeDebugGlobals()) {
          return;
        }
        const win = window as unknown as {
          __robotScene?: Record<string, unknown>;
        };
        win.__robotScene = { scene, camera, gl } as Record<string, unknown>;
      }}
    >
      <color attach="background" args={["#010208"]} />

      <Lighting shadowsEnabled={shadowsEnabled} shadowMapSize={shadowMapSize} />

      <Stars
        radius={80}
        depth={50}
        count={starCount}
        factor={3}
        saturation={0.5}
      />
      <DynamicResScaler />
      {showPerfOverlay ? (
        <Suspense fallback={null}>
          <PerfMonitorOverlay />
        </Suspense>
      ) : null}
      <Suspense fallback={null}>{children}</Suspense>
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        enableDamping={motion.cameraDamping}
      />
      <CameraKeyboardControls controlsRef={controlsRef} />

      {motion.postprocessing ? (
        <Suspense fallback={null}>
          <PostProcessing
            enabled={motion.postprocessing}
            quality={postprocessing.quality}
          />
        </Suspense>
      ) : null}
    </Canvas>
  );
}
