import { ArenaLightRig } from "./SpaceStation/ArenaLightRig";
import { LampPanels } from "./SpaceStation/LampPanels";
import { Pillars } from "./SpaceStation/Pillars";
import { WallGroup } from "./SpaceStation/WallGroup";

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles.
 * Composes various sub-components to build the environment.
 *
 * The floor receives shadows (robots and walls fall on it) but never casts:
 * there is nothing below it (#231).
 */
export function SpaceStation() {
  return (
    <>
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[100, 0.5, 100]} />
        <meshPhysicalMaterial
          color="#262b46"
          emissive="#04060f"
          emissiveIntensity={0.3}
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>

      <WallGroup />
      <LampPanels />
      <Pillars />
      <ArenaLightRig />
    </>
  );
}
