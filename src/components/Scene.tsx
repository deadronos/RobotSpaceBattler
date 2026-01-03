import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ReactNode, Suspense } from "react";

import { useQualitySettings } from "../state/quality/QualityManager";
import { DynamicResScaler } from "../visuals/DynamicResScaler";
import { Lighting } from "../visuals/Lighting";
import { PostProcessing } from "../visuals/PostProcessing";
import { initializeRendererStats } from "../visuals/rendererStats";
import { PerfMonitorOverlay } from "./debug/PerfMonitorOverlay";

/**
 * Props for the Scene component.
 */
interface SceneProps {
  /** The 3D content to render inside the scene. */
  children?: ReactNode;
  /** Whether to render the performance overlay (off by default). */
  showPerfOverlay?: boolean;
}

/**
 * The main 3D scene container.
 * Sets up the Canvas, lights, physics world, and camera controls.
 *
 * @param props - Component props.
 * @returns The rendered scene.
 */
export function Scene({ children, showPerfOverlay = false }: SceneProps) {
  const qualitySettings = useQualitySettings();
  const { postprocessing, render } = qualitySettings.visuals;
  const shadowsEnabled = render.shadowsEnabled;
  const shadowMapSize = render.shadowMapSize;
  const starCount = render.dpr >= 1.5 ? 1500 : 900;

  return (
    <Canvas
      shadows={shadowsEnabled}
      dpr={render.dpr}
      camera={{ position: [-14, 28, 48], fov: 45 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, scene, camera }) => {
        initializeRendererStats(gl);
        // Expose the scene for debugging/visual verification in Playwright
        // This is temporary and safe to remove later.
        const win = (window as unknown) as { __robotScene?: Record<string, unknown> };
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
      {showPerfOverlay ? <PerfMonitorOverlay /> : null}
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} interpolate={false}>
          {children}
        </Physics>
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />

      <PostProcessing
        enabled={postprocessing.enabled}
        quality={postprocessing.quality}
      />
    </Canvas>
  );
}
