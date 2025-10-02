import type { World } from "miniplex";

import type { Entity } from "../../ecs/miniplexStore";

/**
 * Query helpers for AI system to efficiently find candidate entities
 * without full world scans.
 */

export interface EnemyCandidate {
  entity: Entity;
  distanceSquared: number;
}

/**
 * Find all living enemies of the given entity, sorted by distance.
 * Returns empty array if self has no position or team.
 */
export function queryEnemies(
  world: World<Entity>,
  self: Entity,
): EnemyCandidate[] {
  if (!self.position || !self.team) return [];

  const [sx, , sz] = self.position;
  const candidates: EnemyCandidate[] = [];

  for (const e of world.entities) {
    if (e === self) continue;
    if (!e.position || !e.team) continue;
    if (e.team === self.team) continue;
    if (e.alive === false) continue;

    const dx = e.position[0] - sx;
    const dz = e.position[2] - sz;
    const distanceSquared = dx * dx + dz * dz;

    candidates.push({ entity: e, distanceSquared });
  }

  // Sort by distance (ascending)
  candidates.sort((a, b) => a.distanceSquared - b.distanceSquared);

  return candidates;
}

/**
 * Find the nearest living enemy of the given entity.
 * Returns undefined if no enemies found.
 */
export function findNearestEnemy(
  world: World<Entity>,
  self: Entity,
): Entity | undefined {
  const enemies = queryEnemies(world, self);
  return enemies.length > 0 ? enemies[0].entity : undefined;
}
