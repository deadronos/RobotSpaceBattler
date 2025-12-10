/**
 * Utility to extract arena geometry for NavMesh generation
 * @module pathfinding/navmesh
 */

import {
  ARENA_BOUNDS,
  ARENA_PILLARS,
  ARENA_WALLS,
  type ArenaPillar,
  type ArenaWall,
} from '../../../environment/arenaGeometry';
import { ArenaConfiguration, ObstacleGeometry, ObstacleType, Point2D } from '../types';

/**
 * Convert arena wall to obstacle geometry
 */
function wallToObstacle(wall: ArenaWall): ObstacleGeometry {
  const minX = wall.x - wall.halfWidth;
  const maxX = wall.x + wall.halfWidth;
  const minZ = wall.z - wall.halfDepth;
  const maxZ = wall.z + wall.halfDepth;

  const footprint: Point2D[] = [
    { x: minX, z: minZ },
    { x: maxX, z: minZ },
    { x: maxX, z: maxZ },
    { x: minX, z: maxZ },
  ];

  return {
    id: `wall-${wall.x}-${wall.z}`,
    type: ObstacleType.WALL,
    footprint,
    height: 2.5, // Standard wall height
    passable: false,
  };
}

/**
 * Convert arena pillar to obstacle geometry
 * Approximates cylinder as octagon for NavMesh generation
 */
function pillarToObstacle(pillar: ArenaPillar): ObstacleGeometry {
  const sides = 8; // Octagon approximation
  const footprint: Point2D[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides;
    footprint.push({
      x: pillar.x + pillar.radius * Math.cos(angle),
      z: pillar.z + pillar.radius * Math.sin(angle),
    });
  }

  return {
    id: `pillar-${pillar.x}-${pillar.z}`,
    type: ObstacleType.PILLAR,
    footprint,
    height: 2.5, // Standard pillar height
    passable: false,
  };
}

/**
 * Extract arena configuration from existing arena geometry data
 * Converts walls and pillars to obstacle geometry for NavMesh generation
 */
export function extractArenaConfiguration(): ArenaConfiguration {
  const obstacles: ObstacleGeometry[] = [];

  // Convert walls to obstacles
  for (const wall of ARENA_WALLS) {
    obstacles.push(wallToObstacle(wall));
  }

  // Convert pillars to obstacles
  for (const pillar of ARENA_PILLARS) {
    obstacles.push(pillarToObstacle(pillar));
  }

  return {
    size: {
      width: ARENA_BOUNDS.max.x - ARENA_BOUNDS.min.x,
      depth: ARENA_BOUNDS.max.z - ARENA_BOUNDS.min.z,
    },
    obstacles,
  };
}
