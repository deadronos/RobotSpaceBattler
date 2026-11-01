import { NeonGeometry } from "../vfx/NeonGeometry";

const PILLAR_POSITIONS: [number, number, number][] = [
  [-30, 1.5, -30],
  [30, 1.5, -30],
  [-30, 1.5, 30],
  [30, 1.5, 30],
];

/**
 * Renders the set of static pillars in the arena.
 * Handles both visual representation and physics bodies.
 */
export function Pillars() {
  return (
    <>
      {PILLAR_POSITIONS.map((position, index) => (
        <Pillar key={`pillar-${index}`} position={position} />
      ))}
    </>
  );
}

interface PillarProps {
  position: [number, number, number];
}

/**
 * A single cylindrical pillar.
 */
function Pillar({ position }: PillarProps) {
  return (
    <group position={position}>
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[1.2, 1.2, 3, 6]} />
        <meshPhysicalMaterial color="#3a4560" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Neon Rings */}
      <NeonGeometry
        color="#00f3ff"
        intensity={3}
        position={[0, 0.5, 0]}
        flickerSpeed={4}
      >
        <cylinderGeometry args={[1.25, 1.25, 0.1, 16]} />
      </NeonGeometry>
      <NeonGeometry
        color="#ff00aa"
        intensity={3}
        position={[0, -0.5, 0]}
        flickerSpeed={4}
      >
        <cylinderGeometry args={[1.25, 1.25, 0.1, 16]} />
      </NeonGeometry>
    </group>
  );
}
