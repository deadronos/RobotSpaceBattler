/**
 * RenderedRobot Component — 3D Robot Visualization (T016, US1)
 *
 * r3f component that renders a robot at an interpolated position with team colors.
 * Displays health bar, applies team material, handles rotation/orientation.
 *
 * Input: EntityState from useMatchSimulation
 * Output: Three.js mesh with team color shader
 */

import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import { Group, Material, Mesh } from 'three';

import type { EntityState } from '../../systems/matchTrace/entityMapper';

// ============================================================================
// Component Props
// ============================================================================

export interface RenderedRobotProps {
  entity: EntityState;
  teamColor: string; // hex color "#ff0000" for team 1, "#0000ff" for team 2, etc
  scale?: number;
  showHealthBar?: boolean;
  quality?: 'high' | 'medium' | 'low';
}

// ============================================================================
// Team Color Mapping (T016-A: Visual Quality)
// ============================================================================

const TEAM_COLORS: Record<string, string> = {
  team_1: '#ff4444', // Reddish
  team_2: '#4444ff', // Blueish
  team_3: '#44ff44', // Greenish
  team_4: '#ffff44', // Yellowish
};

// ============================================================================
// RenderedRobot Component
// ============================================================================

export const RenderedRobot: React.FC<RenderedRobotProps> = ({
  entity,
  teamColor,
  scale = 1.0,
  showHealthBar = true,
  quality = 'medium',
}: RenderedRobotProps) => {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const healthBarRef = useRef<Mesh>(null);

  // Convert hex color to RGB
  const colorToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0.5, 0.5, 0.5]; // fallback gray
    return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
  };

  const rgb = colorToRgb(teamColor);

  // Animate idle movement (bobbing effect)
  useFrame(({ clock }) => {
    if (groupRef.current && !entity.isAlive) {
      // Fade out dead robots
      const materials = (groupRef.current as Group).children
        .flatMap((child) => {
          const obj = child as Mesh;
          return Array.isArray(obj.material) ? obj.material : [obj.material];
        })
        .filter((m) => m && 'opacity' in m);

      materials.forEach((mat: Material) => {
        if ('opacity' in mat && 'transparent' in mat) {
          const material = mat as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          material.transparent = true;
          material.opacity = Math.max(0, material.opacity - 0.01);
        }
      });
    }

    if (meshRef.current && entity.isAlive) {
      // Idle bobbing animation
      meshRef.current.position.y += Math.sin(clock.getElapsedTime() * 2) * 0.001;
    }
  });

  // Update health bar width based on health percentage
  const healthPercent = entity.maxHealth ? entity.currentHealth! / entity.maxHealth : 1;

  return (
    <group ref={groupRef} position={[entity.position.x, entity.position.y, entity.position.z]}>
      {/* Main Robot Body */}
      <mesh ref={meshRef} scale={scale} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.0, 0.5]} />
        <meshStandardMaterial
          color={`rgb(${Math.floor(rgb[0] * 255)}, ${Math.floor(rgb[1] * 255)}, ${Math.floor(rgb[2] * 255)})`}
          roughness={quality === 'high' ? 0.4 : 0.6}
          metalness={quality === 'high' ? 0.6 : 0.3}
          emissive={`rgb(${Math.floor(rgb[0] * 50)}, ${Math.floor(rgb[1] * 50)}, ${Math.floor(rgb[2] * 50)})`}
          wireframe={quality === 'low'}
        />
      </mesh>

      {/* Health Bar (above robot) */}
      {showHealthBar && entity.maxHealth && entity.maxHealth > 0 && (
        <group position={[0, 1.2, 0]}>
          {/* Background bar */}
          <mesh position={[0, 0, 0.1]} scale={[0.8, 0.1, 0.1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="#444444" />
          </mesh>

          {/* Health bar fill (dynamic width) */}
          <mesh ref={healthBarRef} position={[(-0.4 + healthPercent * 0.4) / 2, 0, 0.11]} scale={[healthPercent * 0.8, 0.1, 0.1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={healthPercent > 0.5 ? '#44ff44' : healthPercent > 0.25 ? '#ffff44' : '#ff4444'} />
          </mesh>
        </group>
      )}

      {/* Status indicator (dead/alive) */}
      {!entity.isAlive && (
        <mesh position={[0, 0.5, 0.3]} scale={0.3}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      )}

      {/* Turret/Gun (visual indicator) */}
      <mesh position={[0, 0.3, -0.3]} scale={0.15}>
        <cylinderGeometry args={[0.2, 0.2, 0.8, 8]} />
        <meshStandardMaterial color={`rgb(${Math.floor(rgb[0] * 200)}, ${Math.floor(rgb[1] * 200)}, ${Math.floor(rgb[2] * 200)})`} />
      </mesh>
    </group>
  );
};

RenderedRobot.displayName = 'RenderedRobot';

// ============================================================================
// Helper: Get team color from team ID
// ============================================================================

export function getTeamColor(teamId: string): string {
  return TEAM_COLORS[teamId] || TEAM_COLORS.team_1;
}
