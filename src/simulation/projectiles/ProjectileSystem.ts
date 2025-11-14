/**
 * Enhanced Projectile System
 * Task: T016
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Manages different projectile types: ballistic (gun), beam (laser), and AoE (rocket)
 * Extends existing ECS projectile system with weapon profile support
 */

import type { ProjectileInstance } from "../../lib/weapons/types";

/**
 * Projectile type discriminator
 */
export type ProjectileType = "ballistic" | "beam" | "aoe";

/**
 * Parameters for creating a projectile
 */
export interface CreateProjectileParams {
  type: ProjectileType;
  weaponProfileId: string;
  ownerId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  timestampMs: number;
}

/**
 * Default projectile lifetime in seconds
 */
const DEFAULT_PROJECTILE_LIFETIME_MS = 5000;

/**
 * Generate unique projectile ID
 */
let projectileIdCounter = 0;
function generateProjectileId(): string {
  return `projectile-${++projectileIdCounter}`;
}

/**
 * Create a new projectile instance
 */
export function createProjectile(
  params: CreateProjectileParams,
): ProjectileInstance {
  return {
    id: generateProjectileId(),
    weaponProfileId: params.weaponProfileId,
    ownerId: params.ownerId,
    position: [...params.position] as [number, number, number],
    velocity: [...params.velocity] as [number, number, number],
    timestampMs: params.timestampMs,
  };
}

/**
 * Enhanced projectile system managing different projectile types
 */
export class ProjectileSystem {
  private projectiles: Map<string, ProjectileInstance>;
  private projectileLifetimeMs: number;

  constructor(lifetimeMs: number = DEFAULT_PROJECTILE_LIFETIME_MS) {
    this.projectiles = new Map();
    this.projectileLifetimeMs = lifetimeMs;
  }

  /**
   * Spawn a new projectile
   */
  spawn(projectile: ProjectileInstance): void {
    this.projectiles.set(projectile.id, projectile);
  }

  /**
   * Update all active projectiles
   * @param deltaSeconds - Time elapsed since last update
   * @param currentMs - Current simulation time in milliseconds
   */
  update(deltaSeconds: number, currentMs?: number): void {
    const projectilesToRemove: string[] = [];

    this.projectiles.forEach((projectile) => {
      // Update position based on velocity
      projectile.position[0] += projectile.velocity[0] * deltaSeconds;
      projectile.position[1] += projectile.velocity[1] * deltaSeconds;
      projectile.position[2] += projectile.velocity[2] * deltaSeconds;

      // Check lifetime expiration if currentMs provided
      if (currentMs !== undefined) {
        const age = currentMs - projectile.timestampMs;
        if (age > this.projectileLifetimeMs) {
          projectilesToRemove.push(projectile.id);
        }
      }
    });

    // Remove expired projectiles
    projectilesToRemove.forEach((id) => this.projectiles.delete(id));
  }

  /**
   * Remove a projectile by ID
   */
  remove(id: string): void {
    this.projectiles.delete(id);
  }

  /**
   * Get all active projectiles
   */
  getActiveProjectiles(): ProjectileInstance[] {
    return Array.from(this.projectiles.values());
  }

  /**
   * Get projectiles by weapon profile ID
   */
  getProjectilesByType(weaponProfileId: string): ProjectileInstance[] {
    return this.getActiveProjectiles().filter(
      (p) => p.weaponProfileId === weaponProfileId,
    );
  }

  /**
   * Get projectile by ID
   */
  getProjectile(id: string): ProjectileInstance | undefined {
    return this.projectiles.get(id);
  }

  /**
   * Clear all projectiles (for cleanup)
   */
  clear(): void {
    this.projectiles.clear();
  }

  /**
   * Get count of active projectiles
   */
  count(): number {
    return this.projectiles.size;
  }
}
