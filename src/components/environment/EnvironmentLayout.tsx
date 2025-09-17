import React, { useEffect, useMemo } from 'react';

import { createMetalGreyMaterial } from '../../utils/materials';
import CornerTile from './CornerTile';
import EmissivePanel from './EmissivePanel';
import FloorTile from './FloorTile';
import WallTile from './WallTile';

export interface EnvironmentLayoutProps {
  tileSize?: number;
  gridSize?: number;
  wallHeight?: number;
  showDebugGrid?: boolean;
}

export default function EnvironmentLayout({
  tileSize = 4,
  gridSize = 10,
  wallHeight = 4,
  showDebugGrid = false,
}: EnvironmentLayoutProps) {
  const floorMaterial = useMemo(() => createMetalGreyMaterial({ roughness: 0.35 }), []);
  const wallMaterial = useMemo(
    () =>
      createMetalGreyMaterial({
        roughness: 0.4,
        metalness: 0.82,
        normalScaleScalar: 0.4,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      floorMaterial.dispose();
      wallMaterial.dispose();
    };
  }, [floorMaterial, wallMaterial]);

  const halfWidth = ((gridSize - 1) * tileSize) / 2;
  const floorTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let x = 0; x < gridSize; x += 1) {
      for (let z = 0; z < gridSize; z += 1) {
        const position: [number, number, number] = [
          -halfWidth + x * tileSize,
          -0.1,
          -halfWidth + z * tileSize,
        ];
        tiles.push(<FloorTile key={`floor-${x}-${z}`} position={position} size={tileSize} material={floorMaterial} />);
      }
    }
    return tiles;
  }, [floorMaterial, gridSize, halfWidth, tileSize]);

  const wallTiles = useMemo(() => {
    const tiles: React.ReactNode[] = [];
    const extent = halfWidth + tileSize / 2;
    for (let i = 0; i < gridSize; i += 1) {
      const offset = -halfWidth + i * tileSize;
      tiles.push(
        <WallTile
          key={`north-${i}`}
          position={[offset, wallHeight / 2, -extent]}
          width={tileSize}
          height={wallHeight}
          material={wallMaterial}
        />,
      );
      tiles.push(
        <WallTile
          key={`south-${i}`}
          position={[offset, wallHeight / 2, extent]}
          width={tileSize}
          height={wallHeight}
          rotation={[0, Math.PI, 0]}
          material={wallMaterial}
        />,
      );
      tiles.push(
        <WallTile
          key={`east-${i}`}
          position={[extent, wallHeight / 2, offset]}
          width={tileSize}
          height={wallHeight}
          rotation={[0, -Math.PI / 2, 0]}
          material={wallMaterial}
        />,
      );
      tiles.push(
        <WallTile
          key={`west-${i}`}
          position={[-extent, wallHeight / 2, offset]}
          width={tileSize}
          height={wallHeight}
          rotation={[0, Math.PI / 2, 0]}
          material={wallMaterial}
        />,
      );
    }
    return tiles;
  }, [gridSize, halfWidth, tileSize, wallHeight, wallMaterial]);

  const cornerTiles = useMemo(() => {
    const extent = halfWidth + tileSize / 2;
    return [
      <CornerTile key="corner-ne" position={[extent, wallHeight / 2, -extent]} height={wallHeight} material={wallMaterial} />,
      <CornerTile key="corner-nw" position={[-extent, wallHeight / 2, -extent]} height={wallHeight} material={wallMaterial} />,
      <CornerTile key="corner-se" position={[extent, wallHeight / 2, extent]} height={wallHeight} material={wallMaterial} />,
      <CornerTile key="corner-sw" position={[-extent, wallHeight / 2, extent]} height={wallHeight} material={wallMaterial} />,
    ];
  }, [halfWidth, tileSize, wallHeight, wallMaterial]);

  const emissivePanels = useMemo(() => {
    const extent = halfWidth + tileSize / 2 - 0.3;
    const y = wallHeight * 0.55;
    const panelZ = extent - 0.01;
    return [
      <EmissivePanel key="panel-north" position={[0, y, -panelZ]} rotation={[0, 0, 0]} />,
      <EmissivePanel key="panel-south" position={[0, y, panelZ]} rotation={[0, Math.PI, 0]} />,
      <EmissivePanel key="panel-east" position={[panelZ, y, 0]} rotation={[0, -Math.PI / 2, 0]} />,
      <EmissivePanel key="panel-west" position={[-panelZ, y, 0]} rotation={[0, Math.PI / 2, 0]} />,
    ];
  }, [halfWidth, tileSize, wallHeight]);

  return (
    <group>
      {showDebugGrid ? <gridHelper args={[gridSize * tileSize, gridSize]} position={[0, -0.05, 0]} /> : null}
      {floorTiles}
      {wallTiles}
      {cornerTiles}
      {emissivePanels}
    </group>
  );
}
