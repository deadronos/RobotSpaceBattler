/**
 * Integration test for path smoothing behavior
 * @module pathfinding/integration
 */

import { describe, expect, it } from 'vitest';

import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import { AStarSearch } from '@/simulation/ai/pathfinding/search/AStarSearch';
import { PathOptimizer } from '@/simulation/ai/pathfinding/smoothing/PathOptimizer';
import type { ArenaConfiguration } from '@/simulation/ai/pathfinding/types';

describe('Path Smoothing Integration', () => {
  it('[T039] paths around pillar form smooth arcs not rectangles', () => {
    // Create arena with a pillar obstacle
    const arenaConfig: ArenaConfiguration = {
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: 'central-pillar',
          type: 1, // Pillar
          footprint: [
            { x: 48, z: 48 },
            { x: 52, z: 48 },
            { x: 52, z: 52 },
            { x: 48, z: 52 },
          ],
          height: 2.5,
          passable: false,
        },
      ],
    };

    const generator = new NavMeshGenerator();
    const navMesh = generator.generateFromArena(arenaConfig);
    
    const astar = new AStarSearch(navMesh);
    const optimizer = new PathOptimizer();
    
    // Path that goes around the pillar
    const start = { x: 30, z: 50 };
    const target = { x: 70, z: 50 };
    
    const rawPath = astar.findPath(start, target);
    expect(rawPath).not.toBeNull();
    
    if (rawPath) {
      const smoothedPath = optimizer.smoothPath(rawPath);
      
      // Smoothed path should have fewer or equal waypoints (minimum 2)
      expect(smoothedPath.length).toBeLessThanOrEqual(rawPath.length);
      expect(smoothedPath.length).toBeGreaterThanOrEqual(2);
      
      // Check that path forms a smooth arc (no sharp 90° turns)
      for (let i = 1; i < smoothedPath.length - 1; i++) {
        const prev = smoothedPath[i - 1];
        const curr = smoothedPath[i];
        const next = smoothedPath[i + 1];
        
        // Calculate angle at current waypoint
        const v1x = curr.x - prev.x;
        const v1z = curr.z - prev.z;
        const v2x = next.x - curr.x;
        const v2z = next.z - curr.z;
        
        const dot = v1x * v2x + v1z * v2z;
        const mag1 = Math.sqrt(v1x * v1x + v1z * v1z);
        const mag2 = Math.sqrt(v2x * v2x + v2z * v2z);
        
        if (mag1 > 0.001 && mag2 > 0.001) {
          const cosAngle = dot / (mag1 * mag2);
          const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
          const angleDegrees = (angleRadians * 180) / Math.PI;
          
          // No sharp rectangular turns (less than 80° turns)
          expect(angleDegrees).toBeLessThan(80);
        }
      }
    }
  });
});
