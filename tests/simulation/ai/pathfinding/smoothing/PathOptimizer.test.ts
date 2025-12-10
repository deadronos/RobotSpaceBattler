/**
 * Unit tests for PathOptimizer
 * @module pathfinding/smoothing
 */

import { describe, expect, it } from 'vitest';

import { PathOptimizer } from '@/simulation/ai/pathfinding/smoothing/PathOptimizer';
import type { Point2D } from '@/simulation/ai/pathfinding/types';

describe('PathOptimizer', () => {
  it('[T038] ensures heading changes <5° between segments', () => {
    const optimizer = new PathOptimizer();
    
    // Create a smooth path
    const path: Point2D[] = [
      { x: 0, z: 0 },
      { x: 10, z: 1 },
      { x: 20, z: 2 },
      { x: 30, z: 3 },
      { x: 40, z: 4 },
    ];
    
    const optimizedPath = optimizer.smoothPath(path);
    
    // Calculate heading changes between consecutive segments
    for (let i = 1; i < optimizedPath.length - 1; i++) {
      const prev = optimizedPath[i - 1];
      const curr = optimizedPath[i];
      const next = optimizedPath[i + 1];
      
      // Vector from prev to curr
      const v1x = curr.x - prev.x;
      const v1z = curr.z - prev.z;
      
      // Vector from curr to next
      const v2x = next.x - curr.x;
      const v2z = next.z - curr.z;
      
      // Calculate angle between vectors
      const dot = v1x * v2x + v1z * v2z;
      const mag1 = Math.sqrt(v1x * v1x + v1z * v1z);
      const mag2 = Math.sqrt(v2x * v2x + v2z * v2z);
      
      if (mag1 > 0.001 && mag2 > 0.001) {
        const cosAngle = dot / (mag1 * mag2);
        const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        const angleDegrees = (angleRadians * 180) / Math.PI;
        
        // Heading change should be less than 5 degrees
        expect(angleDegrees).toBeLessThan(5);
      }
    }
  });

  it('[T040] smoothed path length ≤110% of pre-smoothed length', () => {
    const optimizer = new PathOptimizer();
    
    const path: Point2D[] = [
      { x: 0, z: 0 },
      { x: 20, z: 10 },
      { x: 40, z: 20 },
      { x: 60, z: 30 },
      { x: 80, z: 40 },
      { x: 100, z: 50 },
    ];
    
    // Calculate original path length
    let originalLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dz = path[i].z - path[i - 1].z;
      originalLength += Math.sqrt(dx * dx + dz * dz);
    }
    
    const optimizedPath = optimizer.smoothPath(path);
    
    // Calculate smoothed path length
    let smoothedLength = 0;
    for (let i = 1; i < optimizedPath.length; i++) {
      const dx = optimizedPath[i].x - optimizedPath[i - 1].x;
      const dz = optimizedPath[i].z - optimizedPath[i - 1].z;
      smoothedLength += Math.sqrt(dx * dx + dz * dz);
    }
    
    // Smoothed path should be no more than 110% of original
    expect(smoothedLength).toBeLessThanOrEqual(originalLength * 1.1);
  });
});
