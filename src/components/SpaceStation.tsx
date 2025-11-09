import { RigidBody } from '@react-three/rapier';

import { ArenaLightRig } from './SpaceStation/ArenaLightRig';
import { LampPanels } from './SpaceStation/LampPanels';
import { Pillars } from './SpaceStation/Pillars';
import { WallGroup } from './SpaceStation/WallGroup';

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles
 * Physics-enabled with proper Rapier configuration
 */
export function SpaceStation() {
  return (
    <>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow castShadow>
          <boxGeometry args={[100, 0.5, 100]} />
          <meshPhysicalMaterial
            color="#262b46"
            emissive="#04060f"
            emissiveIntensity={0.3}
            metalness={0.35}
            roughness={0.55}
          />
        </mesh>
      </RigidBody>

      <WallGroup />
      <LampPanels />
      <Pillars />
      <ArenaLightRig />
    </>
  );
}
