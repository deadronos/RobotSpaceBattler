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

import { initializeRendererStats } from "../visuals/rendererStats";

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
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [-14, 28, 48], fov: 45 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => initializeRendererStats(gl)}
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
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
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
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
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
        castShadow
        distance={120}
      />
      <spotLight
        position={[18, 30, -28]}
        angle={0.55}
        penumbra={0.35}
        intensity={0.9}
        color="#ffcf9b"
        castShadow
        distance={110}
      />
      <spotLight
        position={[0, 42, 0]}
        angle={0.8}
        penumbra={0.5}
        intensity={1.1}
        color="#fff1d7"
        castShadow
        distance={140}
      />
      <Stars radius={80} depth={50} count={1500} factor={3} saturation={0.5} />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} interpolate={false}>
          {children}
        </Physics>
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={1.2}
          mipmapBlur
          intensity={1.5}
          radius={0.6}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={[0.002, 0.002]}
        />
        <ToneMapping />
      </EffectComposer>
    </Canvas>
  );
}
