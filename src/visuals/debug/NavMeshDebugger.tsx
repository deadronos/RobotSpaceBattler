/**
 * Debug visualization component for NavMesh polygons
 * T068: Phase 7 - Observability
 */

import { Line } from "@react-three/drei";
import React, { useMemo } from "react";

import type { NavigationMesh } from "@/simulation/ai/pathfinding/types";

interface NavMeshDebuggerProps {
  navMesh: NavigationMesh;
  visible?: boolean;
  color?: string;
}

/**
 * Renders NavMesh polygons as wireframe lines for debugging
 */
export function NavMeshDebugger({
  navMesh,
  visible = true,
  color = "#00ff00",
}: NavMeshDebuggerProps) {
  const edgeLines = useMemo(() => {
    if (!navMesh.polygons || navMesh.polygons.length === 0) {
      return [];
    }

    const lines: Array<[number, number, number][]> = [];

    for (const polygon of navMesh.polygons) {
      const points: [number, number, number][] = [];

      // Create line loop for polygon edges
      for (let i = 0; i < polygon.vertices.length; i++) {
        const v = polygon.vertices[i];
        points.push([v.x, 0.1, v.z]); // Slightly above ground
      }

      // Close the loop
      const firstVertex = polygon.vertices[0];
      points.push([firstVertex.x, 0.1, firstVertex.z]);

      lines.push(points);
    }

    return lines;
  }, [navMesh]);

  if (!visible || edgeLines.length === 0) {
    return null;
  }

  return (
    <group>
      {edgeLines.map((points, index) => (
        <Line
          key={`navmesh-edge-${index}`}
          points={points}
          color={color}
          lineWidth={2}
          dashed={false}
        />
      ))}
    </group>
  );
}
