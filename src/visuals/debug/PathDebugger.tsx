/**
 * Debug visualization component for active robot paths
 * T069: Phase 7 - Observability
 */

/* eslint-disable react/no-unknown-property */

import { Line } from '@react-three/drei';
import React, { useMemo } from 'react';

import type { NavigationPath } from '@/simulation/ai/pathfinding/types';

interface PathDebuggerProps {
  paths: NavigationPath[];
  visible?: boolean;
  showWaypoints?: boolean;
  pathColor?: string;
  waypointColor?: string;
}

/**
 * Renders active navigation paths as colored lines with optional waypoint markers
 */
export function PathDebugger({
  paths,
  visible = true,
  showWaypoints = false,
  pathColor = '#ff00ff',
  waypointColor = '#ffff00',
}: PathDebuggerProps) {
  const pathLines = useMemo(() => {
    if (!paths || paths.length === 0) {
      return [];
    }

    return paths.map((path, pathIndex) => {
      if (!path.waypoints || path.waypoints.length < 2) {
        return null;
      }

      const points: [number, number, number][] = path.waypoints.map((wp) => [
        wp.x,
        wp.y + 0.2, // Slightly above robot height
        wp.z,
      ]);

      return {
        pathIndex,
        points,
        waypoints: path.waypoints,
        smoothed: path.smoothed,
      };
    }).filter((line) => line !== null);
  }, [paths]);

  if (!visible || pathLines.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Render path lines */}
      {pathLines.map((line) => (
        <Line
          key={`path-${line.pathIndex}`}
          points={line.points}
          color={line.smoothed ? pathColor : '#ff8800'}
          lineWidth={3}
          dashed={!line.smoothed}
        />
      ))}

      {/* Render waypoint markers if enabled */}
      {showWaypoints &&
        pathLines.map((line) =>
          line.waypoints.map((wp: { x: number; y: number; z: number }, wpIndex: number) => (
            <mesh
              key={`waypoint-${line.pathIndex}-${wpIndex}`}
              position={[wp.x, wp.y + 0.2, wp.z]}
            >
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshBasicMaterial color={waypointColor} />
            </mesh>
          )),
        )}
    </group>
  );
}
