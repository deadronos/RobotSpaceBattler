/**
 * Gun Tracer Visual Component
 * Task: T019
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Minimal stub implementation using placeholder VFX assets
 */

/* eslint-disable react/no-unknown-property */
import { Billboard, Line, useTexture } from "@react-three/drei";

interface GunTracerProps {
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  color?: string;
  lineWidth?: number;
  fadeTime?: number;
}

/**
 * Gun tracer VFX component
 * Shows ballistic projectile trail
 */
export function GunTracer({
  startPosition,
  endPosition,
  color = "#ffaa00",
  lineWidth = 0.1,
}: GunTracerProps) {
  return (
    <Line
      name="gun-tracer-line"
      points={[startPosition, endPosition]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={0.7}
    />
  );
}

/**
 * Gun tracer with impact VFX
 */
export function GunTracerWithImpact({
  startPosition,
  endPosition,
  impactPosition,
  color = "#ffaa00",
  lineWidth = 0.1,
}: GunTracerProps & { impactPosition: [number, number, number] }) {
  const texture = useTexture(
    "/assets/vfx/weapon-placeholders/gun-placeholder.png",
  );

  return (
    <>
      <Line
        name="gun-tracer-with-impact-line"
        points={[startPosition, endPosition]}
        color={color}
        lineWidth={lineWidth}
        transparent
        opacity={0.7}
      />
      <Billboard position={impactPosition}>
        <sprite scale={[0.3, 0.3, 1]}>
          <spriteMaterial map={texture} transparent opacity={0.8} />
        </sprite>
      </Billboard>
    </>
  );
}
