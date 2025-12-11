import { distanceSquaredVec3, Vec3 } from "../../lib/math/vec3";

/**
 * Interface for entities with a position.
 */
export interface PositionedEntity {
  position: Vec3;
}

/**
 * Finds the closest entity to a given origin point.
 * Performs a single O(N) pass.
 *
 * @param origin - The origin point.
 * @param entities - The list of entities to search.
 * @param filter - Optional filter function.
 * @returns The closest entity, or undefined if no entities match.
 */
export function findClosestEntity<T extends PositionedEntity>(
  origin: Vec3,
  entities: T[],
  filter?: (entity: T) => boolean,
): T | undefined {
  let best: T | undefined;
  let minDistSq = Number.POSITIVE_INFINITY;

  for (const entity of entities) {
    if (filter && !filter(entity)) {
      continue;
    }
    const distSq = distanceSquaredVec3(origin, entity.position);
    if (distSq < minDistSq) {
      minDistSq = distSq;
      best = entity;
    }
  }

  return best;
}

/**
 * Sorts entities based on a computed score.
 * Uses the Schwartzian transform (map-sort-map) to avoid recomputing scores during sort.
 *
 * @param entities - The list of entities to sort.
 * @param scoreFn - Function to compute the score/metrics for an entity.
 * @param compareFn - Function to compare two scores. Returns negative if a < b, positive if a > b.
 * @returns A new array of sorted entities.
 */
export function sortEntities<T, S>(
  entities: T[],
  scoreFn: (entity: T) => S,
  compareFn: (a: S, b: S) => number,
): T[] {
  return entities
    .map((entity) => ({ entity, score: scoreFn(entity) }))
    .sort((a, b) => compareFn(a.score, b.score))
    .map((wrapper) => wrapper.entity);
}
