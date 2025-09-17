import React from 'react';
import { Material } from 'three';

export interface WallTileProps {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  material?: Material;
}

export default function WallTile({
  width = 4,
  height = 4,
  depth = 0.4,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  material,
}: WallTileProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow material={material}>
      <boxGeometry args={[width, height, depth]} />
    </mesh>
  );
}
