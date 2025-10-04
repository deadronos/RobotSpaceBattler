import { Environment, Lightformer } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import React, { useEffect } from "react";
import { BackSide } from "three";

export interface EnvironmentLightingProps {
  exposure?: number;
  envIntensity?: number;
  dirIntensity?: number;
  castShadows?: boolean;
  shadowSize?: number;
}

export default function EnvironmentLighting({
  exposure = 1.15,
  envIntensity = 0.6,
  dirIntensity = 1.6,
  castShadows = true,
  shadowSize = 1024,
}: EnvironmentLightingProps) {
  const { gl } = useThree();

  useEffect(() => {
    const previousExposure = gl.toneMappingExposure;
    gl.toneMappingExposure = exposure;
    return () => {
      gl.toneMappingExposure = previousExposure;
    };
  }, [exposure, gl]);

  return (
    <group>
      <Environment frames={1}>
        <mesh scale={40}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#1a1f28" side={BackSide} />
        </mesh>
        <Lightformer
          intensity={2.2}
          form="ring"
          scale={[6, 6, 1]}
          color="#3fd9ff"
          position={[0, 4.5, -9]}
        />
      </Environment>
      {/* Ambient light approximates global environment intensity since Environment does not accept an intensity prop */}
      <ambientLight intensity={envIntensity} />
      <directionalLight
        castShadow={castShadows}
        position={[8, 14, 6]}
        intensity={dirIntensity}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-bias={-0.0001}
      />
      <pointLight
        position={[0, 3.5, 0]}
        intensity={0.45}
        distance={40}
        color="#5ec2ff"
      />
      <pointLight
        position={[6, 2.4, -6]}
        intensity={0.3}
        distance={20}
        color="#b7fbff"
      />
      <pointLight
        position={[-6, 2.4, 6]}
        intensity={0.3}
        distance={20}
        color="#b7fbff"
      />
    </group>
  );
}
