import { RigidBody } from "@react-three/rapier";

import { ArenaLightRig } from "./SpaceStation/ArenaLightRig";
import { LampPanels } from "./SpaceStation/LampPanels";
import { Pillars } from "./SpaceStation/Pillars";
import { WallGroup } from "./SpaceStation/WallGroup";

interface SpaceStationProps {
  shadowsEnabled?: boolean;
  shadowMapSize?: number;
}

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles.
 * Physics-enabled with proper Rapier configuration.
 * Composes various sub-components to build the environment.
 */
export function SpaceStation({
  shadowsEnabled = false,
  shadowMapSize = 512,
}: SpaceStationProps) {
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
      <ArenaLightRig
        shadowsEnabled={shadowsEnabled}
        shadowMapSize={shadowMapSize}
      />
    </>
  );
}
