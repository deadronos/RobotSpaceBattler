/**
 * RenderedProjectile Component — Projectile Trail Visualization (T017, US1 / T031, US2)
 *
 * r3f component that renders projectile trails and visual effects.
 * Displays projectile path, impact effects, and team-based color coding.
 * Integrates visual quality profiles (T031) to adjust particle count and trail complexity.
 *
 * Input: Projectile position data from MatchTrace events
 * Output: Three.js mesh + trail particles
 */

import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import { Group, Mesh, Vector3 } from 'three';

import type { VisualQualityProfile } from '../../systems/matchTrace/types';
import { getTrailComplexity } from '../../systems/matchTrace/visualQualityProfile';


// ============================================================================
// Component Props
// ============================================================================

export interface ProjectileTrail {
  id: string;
  teamId: string;
  startPos: { x: number; y: number; z: number };
  endPos: { x: number; y: number; z: number };
  timestamp: number;
  damage: number;
}

export interface RenderedProjectileProps {
  trail: ProjectileTrail;
  teamColor: string; // hex color
  lifetime?: number; // ms before trail fades
  trailWidth?: number;
  showImpact?: boolean;
  quality?: 'high' | 'medium' | 'low';
  qualityProfile?: VisualQualityProfile; // T031: Full quality profile for particle control
}

// ============================================================================
// RenderedProjectile Component
// ============================================================================

export const RenderedProjectile: React.FC<RenderedProjectileProps> = ({
  trail,
  teamColor,
  lifetime = 500, // fade out after 500ms
  trailWidth = 0.05,
  showImpact = true,
  quality = 'medium',
  qualityProfile,
}: RenderedProjectileProps) => {
  const groupRef = useRef<Group>(null);
  const impactMeshRef = useRef<Mesh>(null);
  const createdAtRef = useRef<number>(Date.now());

  // T031: Determine trail complexity from quality profile or fallback to simple quality string
  const trailSegments = qualityProfile
    ? getTrailComplexity(qualityProfile.level)
    : quality === 'high'
      ? 32
      : quality === 'medium'
        ? 16
        : 4;

  const particlesEnabled = !qualityProfile || qualityProfile.particlesEnabled;

  // Convert hex color to RGB
  const colorToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.5, 0.5, 0.5];
    return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
  };

  const rgb = colorToRgb(teamColor);
  const elapsedMs = Date.now() - createdAtRef.current;
  const fadeProgress = Math.max(0, Math.min(1, elapsedMs / lifetime));
  const opacity = 1 - fadeProgress;

  // Update impact animation
  useFrame(() => {
    if (impactMeshRef.current) {
      const scale = 0.5 + fadeProgress * 0.5;
      impactMeshRef.current.scale.set(scale, scale, scale);
      const materials = Array.isArray(impactMeshRef.current.material)
        ? impactMeshRef.current.material
        : [impactMeshRef.current.material];
      materials.forEach((mat: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (mat && 'opacity' in mat) {
          mat.opacity = 0.8 * opacity;
        }
      });
    }

    // Remove component if fully faded
    if (opacity <= 0 && groupRef.current?.parent) {
      groupRef.current.parent.remove(groupRef.current);
    }
  });

  // Create trail points
  const points: Vector3[] = [
    new Vector3(trail.startPos.x, trail.startPos.y, trail.startPos.z),
    new Vector3(trail.endPos.x, trail.endPos.y, trail.endPos.z),
  ];

  // For higher quality, add intermediate points for curve
  if (trailSegments > 16) {
    const midX = (trail.startPos.x + trail.endPos.x) / 2;
    const midY = (trail.startPos.y + trail.endPos.y) / 2 + 0.2; // slight arc
    const midZ = (trail.startPos.z + trail.endPos.z) / 2;
    points.splice(1, 0, new Vector3(midX, midY, midZ));
  }

  const lineColor = `rgb(${Math.floor(rgb[0] * 255)}, ${Math.floor(rgb[1] * 255)}, ${Math.floor(rgb[2] * 255)})`;
  const particleColor = `rgb(${Math.floor(rgb[0] * 200)}, ${Math.floor(rgb[1] * 200)}, ${Math.floor(rgb[2] * 200)})`;

  return (
    <group ref={groupRef}>
      {/* Trail line - render as a stretched box for simplicity */}
      <mesh
        position={[
          (trail.startPos.x + trail.endPos.x) / 2,
          (trail.startPos.y + trail.endPos.y) / 2,
          (trail.startPos.z + trail.endPos.z) / 2,
        ]}
      >
        <boxGeometry
          args={[
            trailWidth,
            trailWidth,
            Math.sqrt(
              (trail.endPos.x - trail.startPos.x) ** 2 +
                (trail.endPos.y - trail.startPos.y) ** 2 +
                (trail.endPos.z - trail.startPos.z) ** 2,
            ),
          ]}
        />
        <meshBasicMaterial color={lineColor} transparent opacity={opacity} />
      </mesh>

      {/* Trail particles - render if particles are enabled (T031) */}
      {particlesEnabled && trailSegments > 4 && (
        <group>
          {points.map((point, idx) => (
            <mesh key={idx} position={[point.x, point.y, point.z]} scale={0.08}>
              <sphereGeometry args={[1, 4, 4]} />
              <meshBasicMaterial color={particleColor} transparent opacity={opacity * 0.6} />
            </mesh>
          ))}
        </group>
      )}

      {/* Impact effect at end position */}
      {showImpact && (
        <mesh ref={impactMeshRef} position={[trail.endPos.x, trail.endPos.y, trail.endPos.z]} scale={0.2}>
          <octahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={lineColor}
            wireframe
            transparent
            opacity={0.8 * opacity}
          />
        </mesh>
      )}
    </group>
  );
};

RenderedProjectile.displayName = 'RenderedProjectile';

// ============================================================================
// Helper: Extract projectile trails from MatchTrace events
// ============================================================================

export function extractProjectileTrails(events: any[]): ProjectileTrail[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  const trails: ProjectileTrail[] = [];

  events.forEach((event) => {
    if (event.type === 'DamageEvent' && event.sourcePos && event.targetPos) {
      trails.push({
        id: `${event.timestamp}-${event.sourceEntityId}`,
        teamId: event.sourceTeamId,
        startPos: event.sourcePos,
        endPos: event.targetPos,
        timestamp: event.timestamp,
        damage: event.damage,
      });
    }
  });

  return trails;
}
