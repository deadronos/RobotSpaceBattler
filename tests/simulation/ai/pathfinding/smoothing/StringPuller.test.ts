/**
 * Unit tests for StringPuller (funnel algorithm)
 * @module pathfinding/smoothing
 */

import { describe, expect, it } from 'vitest';

import { StringPuller } from '@/simulation/ai/pathfinding/smoothing/StringPuller';
import type { Point2D } from '@/simulation/ai/pathfinding/types';

describe('StringPuller', () => {
  it('[T036] reduces waypoint count by >50%', () => {
    const stringPuller = new StringPuller();
    
    // Create a zigzag path with many waypoints
    const rawPath: Point2D[] = [
      { x: 0, z: 0 },
      { x: 10, z: 5 },
      { x: 20, z: 0 },
      { x: 30, z: 5 },
      { x: 40, z: 0 },
      { x: 50, z: 5 },
      { x: 60, z: 0 },
      { x: 70, z: 5 },
      { x: 80, z: 0 },
      { x: 90, z: 5 },
      { x: 100, z: 0 },
    ];
    
    const smoothedPath = stringPuller.smoothPath(rawPath);
    
    // Should reduce waypoints by more than 50%
    expect(smoothedPath.length).toBeLessThan(rawPath.length * 0.5);
    expect(smoothedPath.length).toBeGreaterThan(1); // At least start and end
  });

  it('[T037] maintains path validity (all waypoints walkable)', () => {
    const stringPuller = new StringPuller();
    
    const rawPath: Point2D[] = [
      { x: 0, z: 0 },
      { x: 25, z: 25 },
      { x: 50, z: 50 },
      { x: 75, z: 75 },
      { x: 100, z: 100 },
    ];
    
    const smoothedPath = stringPuller.smoothPath(rawPath);
    
    // All waypoints should be within bounds
    for (const point of smoothedPath) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(100);
      expect(point.z).toBeGreaterThanOrEqual(0);
      expect(point.z).toBeLessThanOrEqual(100);
    }
    
    // First and last points should be preserved
    expect(smoothedPath[0]).toEqual(rawPath[0]);
    expect(smoothedPath[smoothedPath.length - 1]).toEqual(
      rawPath[rawPath.length - 1],
    );
  });
});
