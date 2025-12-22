import { useMemo } from "react";

/**
 * A composite light rig for the space station arena.
 * Includes a central light, corridor lights, and hover beacons.
 * Creates atmosphere and visibility for the scene.
 */
export function ArenaLightRig() {
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
        intensity={0.8}
        color="#5a86ff"
        distance={95}
        decay={2.0}
        castShadow
      />
      <spotLight
        position={[0, 22, 0]}
        angle={0.75}
        penumbra={0.6}
        intensity={1.5}
        color="#d4bbff"
        castShadow
        distance={120}
      />
      {corridorLightPositions.map((position, index) => (
        <pointLight
          key={`corridor-light-${index}`}
          position={position as [number, number, number]}
          intensity={1.5}
          color="#00f3ff"
          distance={35}
          decay={2.2}
          castShadow={false}
        />
      ))}
      {hoverBeaconPositions.map((position, index) => (
        <pointLight
          key={`hover-beacon-${index}`}
          position={position as [number, number, number]}
          intensity={1.2}
          color="#ff00aa"
          distance={30}
          decay={2.0}
          castShadow={false}
        />
      ))}
    </>
  );
}
