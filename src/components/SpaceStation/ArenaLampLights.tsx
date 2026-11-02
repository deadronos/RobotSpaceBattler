import { ARENA_LAMPS } from "../../visuals/arena/arenaConfig";

/** Distance of a lamp panel's light in front of the panel, along local +z. */
const LAMP_LIGHT_OFFSET = 1.3;

/**
 * One point light per lamp panel.
 *
 * The panels themselves are merged into the arena meshes (#229); only the
 * coloured pools they throw on the floor are still real lights here. #230
 * decides whether that costs more than it is worth.
 */
export function ArenaLampLights() {
  return (
    <>
      {ARENA_LAMPS.map((lamp, index) => (
        <pointLight
          key={`lamp-light-${index}`}
          position={[
            lamp.position[0] + Math.sin(lamp.rotationY) * LAMP_LIGHT_OFFSET,
            lamp.position[1],
            lamp.position[2] + Math.cos(lamp.rotationY) * LAMP_LIGHT_OFFSET,
          ]}
          intensity={1.65}
          distance={32}
          decay={1.9}
          color={lamp.color}
          castShadow={false}
        />
      ))}
    </>
  );
}
