/**
 * Rocket Explosion Visual Component
 * Task: T019
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Minimal stub implementation using placeholder VFX assets
 */

/* eslint-disable react/no-unknown-property */
import { Billboard, useTexture } from "@react-three/drei";

interface RocketExplosionProps {
  position: [number, number, number];
  radius?: number;
  scale?: number;
}

/**
 * Rocket explosion VFX component
 * Shows AoE explosion using placeholder asset
 */
export function RocketExplosion({
  position,
  radius = 2.5,
  scale = 1.0,
}: RocketExplosionProps) {
  const texture = useTexture(
    "/assets/vfx/weapon-placeholders/rocket-placeholder.png",
  );

  const effectiveScale = (radius / 2.5) * scale * 3;

  return (
    <Billboard position={position}>
      <sprite scale={[effectiveScale, effectiveScale, 1]}>
        <spriteMaterial map={texture} transparent opacity={0.8} />
      </sprite>
    </Billboard>
  );
}
