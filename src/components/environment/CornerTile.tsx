import React from "react";
import { Material } from "three";

export interface CornerTileProps {
  size?: number;
  height?: number;
  position?: [number, number, number];
  material?: Material;
}

export default function CornerTile({
  size = 1.2,
  height = 4,
  position = [0, 0, 0],
  material,
}: CornerTileProps) {
  return (
    <mesh position={position} castShadow receiveShadow material={material}>
      <boxGeometry args={[size, height, size]} />
    </mesh>
  );
}
