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
          <meshStandardMaterial
            color="#262b46"
            emissive="#04060f"
            emissiveIntensity={0.3}
            metalness={0.35}
            roughness={0.55}
          />
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
      <ArenaLightRig />
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
            <meshStandardMaterial color="#313c60" metalness={0.55} roughness={0.45} />
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
            intensity={1.65}
            distance={32}
            decay={1.9}
            color={panel.color}
            // These lamp panel lights are decorative — disable shadows to avoid
            // exceeding the GPU's texture unit limits (many shadow maps increase
            // fragment shader sampler count). Keep them visually bright without
            // casting shadows to reduce GPU resource usage.
            castShadow={false}
          />
        </group>
      ))}
    </>
  );
}

function ArenaLightRig() {
  const corridorLightPositions = useMemo(
    () => [
      [-25, 7, 0],
      [25, 7, 0],
      [0, 7, -25],
      [0, 7, 25],
    ],
    [],
  );

  const hoverBeaconPositions = useMemo(
    () => [
      [-18, 4, -18],
      [18, 4, 18],
      [-18, 4, 18],
      [18, 4, -18],
    ],
    [],
  );

  return (
    <>
      <pointLight
        position={[0, 16, 0]}
        intensity={1.2}
        color="#a5c6ff"
        distance={95}
        decay={1.4}
        // Keep main high-level ambient point light casting shadows for depth
        // while avoiding many smaller shadow-casting lights elsewhere.
        castShadow
      />
      <spotLight
        position={[0, 22, 0]}
        angle={0.75}
        penumbra={0.45}
        intensity={1.15}
        color="#ffe8c7"
        // Keep a single large spotlight casting shadows for dramatic lighting
        castShadow
        distance={120}
      />
      {corridorLightPositions.map((position, index) => (
        <pointLight
          key={`corridor-light-${index}`}
          position={position as [number, number, number]}
          intensity={0.6}
          color="#8ad5ff"
          distance={45}
          decay={1.8}
          // Corridor lights are decorative; disable shadows to reduce the
          // number of shadow maps and avoid shader sampler overflow.
          castShadow={false}
        />
      ))}
      {hoverBeaconPositions.map((position, index) => (
        <pointLight
          key={`hover-beacon-${index}`}
          position={position as [number, number, number]}
          intensity={0.55}
          color="#ffd59a"
          distance={35}
          decay={1.6}
          // Hover beacons are small/local; disable shadows here as well.
          castShadow={false}
        />
      ))}
    </>
  );
}
