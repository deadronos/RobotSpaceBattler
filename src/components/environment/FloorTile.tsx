import React from "react";
import { Material } from "three";

export interface FloorTileProps {
  size?: number;
  thickness?: number;
  position?: [number, number, number];
  material?: Material;
}

export default function FloorTile({
  size = 4,
  thickness = 0.2,
  position = [0, 0, 0],
  material,
}: FloorTileProps) {
  return (
    <mesh position={position} receiveShadow material={material}>
      <boxGeometry args={[size, thickness, size]} />
    </mesh>
  );
}
