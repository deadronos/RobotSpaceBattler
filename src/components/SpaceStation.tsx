import { RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import { Euler, Vector3 } from 'three';

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles
 * Physics-enabled with proper Rapier configuration
 */
export function SpaceStation() {
  return (
    <>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow castShadow>
          <boxGeometry args={[100, 0.5, 100]} />
          <meshStandardMaterial color="#1a1d2e" metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* All walls in one group */}
      <WallGroup />

      {/* Emissive lamp panels */}
      <LampPanels />

      {/* Strategic pillars */}
      <Pillar position={[-30, 1.5, -30]} />
      <Pillar position={[30, 1.5, -30]} />
      <Pillar position={[-30, 1.5, 30]} />
      <Pillar position={[30, 1.5, 30]} />

      {/* Lighting */}
      <pointLight
        position={[0, 12, 0]}
        intensity={0.6}
        color="#7ca5ff"
        distance={70}
        decay={1.5}
        castShadow
      />
      <pointLight
        position={[-25, 6, -25]}
        intensity={0.35}
        color="#ff9966"
        distance={45}
        decay={2}
        castShadow
      />
      <pointLight
        position={[25, 6, 25]}
        intensity={0.35}
        color="#ff9966"
        distance={45}
        decay={2}
        castShadow
      />
    </>
  );
}

function WallGroup() {
  const walls = useMemo(
    () => [
      // Outer perimeter
      { pos: [0, 2.5, -50] as [number, number, number], dim: [100, 5, 2] as [number, number, number] },
      { pos: [0, 2.5, 50] as [number, number, number], dim: [100, 5, 2] as [number, number, number] },
      { pos: [50, 2.5, 0] as [number, number, number], dim: [2, 5, 100] as [number, number, number] },
      { pos: [-50, 2.5, 0] as [number, number, number], dim: [2, 5, 100] as [number, number, number] },
      // Internal corridors
      { pos: [0, 2.5, -20] as [number, number, number], dim: [40, 5, 1.5] as [number, number, number] },
      { pos: [0, 2.5, 20] as [number, number, number], dim: [40, 5, 1.5] as [number, number, number] },
      { pos: [-20, 2.5, 0] as [number, number, number], dim: [1.5, 5, 30] as [number, number, number] },
      { pos: [20, 2.5, 0] as [number, number, number], dim: [1.5, 5, 30] as [number, number, number] },
      // Central obstacle
      { pos: [0, 2.5, 0] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      // Corner structures
      { pos: [-35, 2.5, -35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [35, 2.5, -35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [-35, 2.5, 35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [35, 2.5, 35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
    ],
    [],
  );

  return (
    <>
      {walls.map((wall, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid">
          <mesh position={wall.pos} receiveShadow castShadow>
            <boxGeometry args={wall.dim} />
            <meshStandardMaterial color="#2a3550" metalness={0.6} roughness={0.4} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

interface PillarProps {
  position: [number, number, number];
}

function Pillar({ position }: PillarProps) {
  return (
    <RigidBody type="fixed" colliders="hull">
      <mesh position={position} receiveShadow castShadow>
        <cylinderGeometry args={[1.2, 1.2, 3, 6]} />
        <meshStandardMaterial color="#3a4560" metalness={0.5} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}

function LampPanels() {
  const lampPanels = useMemo(
    () =>
      [
        {
          position: new Vector3(0, 3.5, -48.9),
          rotation: new Euler(0, 0, 0),
          color: '#7ecbff',
        },
        {
          position: new Vector3(0, 3.5, 48.9),
          rotation: new Euler(0, Math.PI, 0),
          color: '#7ecbff',
        },
        {
          position: new Vector3(-48.9, 3.5, 0),
          rotation: new Euler(0, Math.PI / 2, 0),
          color: '#ffb36c',
        },
        {
          position: new Vector3(48.9, 3.5, 0),
          rotation: new Euler(0, -Math.PI / 2, 0),
          color: '#ff6f9f',
        },
        {
          position: new Vector3(-20, 3.25, -20),
          rotation: new Euler(0, Math.PI / 4, 0),
          color: '#8ce2ff',
        },
        {
          position: new Vector3(20, 3.25, 20),
          rotation: new Euler(0, -Math.PI / 4, 0),
          color: '#9cffb5',
        },
      ],
    [],
  );

  return (
    <>
      {lampPanels.map((panel, index) => (
        <group key={`lamp-${index}`} position={panel.position} rotation={panel.rotation}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 2.2, 0.3]} />
            <meshStandardMaterial color="#141724" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.25]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 1.6, 0.2]} />
            <meshStandardMaterial
              color="#070a12"
              emissive={panel.color}
              emissiveIntensity={4.2}
              metalness={0.2}
              roughness={0.15}
            />
          </mesh>
          <pointLight
            position={[0, 0, 1.3]}
            intensity={1.4}
            distance={28}
            decay={2}
            color={panel.color}
            castShadow
          />
        </group>
      ))}
    </>
  );
}
