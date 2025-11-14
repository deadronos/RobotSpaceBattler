/**
 * Laser Beam Visual Component
 * Task: T019
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Minimal stub implementation using placeholder VFX assets
 */

/* eslint-disable react/no-unknown-property */
import { Line, useTexture } from "@react-three/drei";

interface LaserBeamProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  color?: string;
  lineWidth?: number;
}

/**
 * Laser beam VFX component
 * Shows continuous beam between two points
 */
export function LaserBeam({
  startPosition,
  endPosition,
  color = "#00ff88",
  lineWidth = 0.15,
}: LaserBeamProps) {
  return (
    <group name="laser-beam-line">
      <Line
        points={[startPosition, endPosition]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={0.9}
      />
      <pointLight
        name="laser-beam-start-light"
        position={startPosition}
        color={color}
        intensity={0.5}
        distance={2}
      />
      <pointLight
        name="laser-beam-end-light"
        position={endPosition}
        color={color}
        intensity={0.5}
        distance={2}
      />
    </group>
  );
}

/**
 * Laser beam with texture support (enhanced version)
 */
export function LaserBeamTextured({
  startPosition,
  endPosition,
  color = "#00ff88",
}: LaserBeamProps) {
  const texture = useTexture(
    "/assets/vfx/weapon-placeholders/laser-placeholder.png",
  );

  return (
    <>
      <Line
        name="laser-beam-textured-line"
        points={[startPosition, endPosition]}
        color={color}
        lineWidth={0.2}
        transparent
        opacity={0.9}
      />
      <mesh position={endPosition}>
        <sprite scale={[0.5, 0.5, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={0.8}
            color={color}
          />
        </sprite>
      </mesh>
    </>
  );
}
