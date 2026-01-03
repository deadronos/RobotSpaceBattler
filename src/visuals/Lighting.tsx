import { ReactNode } from "react";

/**
 * Props for the Lighting component.
 */
interface LightingProps {
  shadowsEnabled: boolean;
  shadowMapSize: number;
}

/**
 * Sets up the lighting for the scene.
 *
 * @param props - Component props.
 * @returns The lighting elements.
 */
export function Lighting({ shadowsEnabled, shadowMapSize }: LightingProps) {
  return (
    <>
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
    </>
  );
}
