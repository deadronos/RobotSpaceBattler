import { useMemo } from 'react';

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
        intensity={1.2}
        color="#a5c6ff"
        distance={95}
        decay={1.4}
        castShadow
      />
      <spotLight
        position={[0, 22, 0]}
        angle={0.75}
        penumbra={0.45}
        intensity={1.25}
        color="#ffe8c7"
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
          castShadow={false}
        />
      ))}
    </>
  );
}
