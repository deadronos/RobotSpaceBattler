import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { BlendFunction } from "postprocessing";
import { ReactNode, Suspense } from "react";

import { useQualitySettings } from "../state/quality/QualityManager";
import { initializeRendererStats } from "../visuals/rendererStats";

const POSTPROCESSING_PRESETS = {
  low: {
    multisampling: 8,
    bloomIntensity: 0.9,
    bloomRadius: 0.35,
    bloomThreshold: 1.35,
    bloomMipmapBlur: false,
    chromaticAberration: false,
    chromaticOffset: [0.001, 0.001] as [number, number],
  },
  high: {
    multisampling: 8,
    bloomIntensity: 1.2,
    bloomRadius: 0.5,
    bloomThreshold: 1.2,
    bloomMipmapBlur: false,
    chromaticAberration: true,
    chromaticOffset: [0.0012, 0.0012] as [number, number],
  },
} as const;

/**
 * Props for the Scene component.
 */
interface SceneProps {
  /** The 3D content to render inside the scene. */
  children?: ReactNode;
}

/**
 * The main 3D scene container.
 * Sets up the Canvas, lights, physics world, and camera controls.
 *
 * @param props - Component props.
 * @returns The rendered scene.
 */
export function Scene({ children }: SceneProps) {
  const qualitySettings = useQualitySettings();
  const { postprocessing, render } = qualitySettings.visuals;
  const postprocessingPreset = POSTPROCESSING_PRESETS[postprocessing.quality];
  const shadowsEnabled = render.shadowsEnabled;
  const shadowMapSize = render.shadowMapSize;
  const starCount = render.dpr >= 1.5 ? 1500 : 900;
  const postprocessingEffects = [
    <Bloom
      key="bloom"
      luminanceThreshold={postprocessingPreset.bloomThreshold}
      mipmapBlur={postprocessingPreset.bloomMipmapBlur}
      intensity={postprocessingPreset.bloomIntensity}
      radius={postprocessingPreset.bloomRadius}
    />,
    ...(postprocessingPreset.chromaticAberration
      ? [
          <ChromaticAberration
            key="chromatic"
            blendFunction={BlendFunction.NORMAL}
            offset={postprocessingPreset.chromaticOffset}
          />,
        ]
      : []),
    <ToneMapping key="tonemap" />,
  ];

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
      <ambientLight intensity={0.2} color="#1a1d35" />
      <hemisphereLight
        groundColor="#03040a"
        intensity={0.3}
        color="#3d4c99"
        position={[0, 34, 0]}
      />
      <directionalLight
        position={[25, 32, 18]}
        intensity={1.5}
        color="#f3f0ff"
        castShadow={shadowsEnabled}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0008}
      />
      <directionalLight
        position={[-28, 26, -24]}
        intensity={1.1}
        color="#c8d7ff"
        castShadow={false}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0006}
      />
      <spotLight
        position={[-30, 22, -20]}
        angle={0.6}
        penumbra={0.4}
        intensity={0.85}
        color="#88aaff"
        castShadow={false}
        distance={120}
      />
      <spotLight
        position={[18, 30, -28]}
        angle={0.55}
        penumbra={0.35}
        intensity={0.9}
        color="#ffcf9b"
        castShadow={false}
        distance={110}
      />
      <spotLight
        position={[0, 42, 0]}
        angle={0.8}
        penumbra={0.5}
        intensity={1.1}
        color="#fff1d7"
        castShadow={false}
        distance={140}
      />
      <Stars
        radius={80}
        depth={50}
        count={starCount}
        factor={3}
        saturation={0.5}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} interpolate={false}>
          {children}
        </Physics>
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />
      {postprocessing.enabled ? (
        <EffectComposer
          enableNormalPass={false}
          multisampling={postprocessingPreset.multisampling}
        >
          {postprocessingEffects}
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
