import type { World } from "miniplex";

import type { Entity } from "../ecs/types";
import { markEntityDestroying } from "../utils/rapierCleanup";

// Handle a projectile hitting another rigid body (other). The Simulation
// onHit handler searches entities by matching `rb === other`. This helper
// centralizes that logic so tests and Simulation can call it.
export function handleProjectileHit(
  proj: Entity,
  other: unknown,
  storeRef: World<Entity>,
) {
  const ents = [...storeRef.entities.values()];
  const victim = ents.find((e) => (e as { rb?: unknown }).rb === other);
  if (victim && victim.team !== proj.team && victim.health) {
    victim.health.hp -= proj.projectile!.damage;
    // Defer removal to the cleanup system to avoid mutating Rapier world
    // during collision callbacks (which can be in the middle of a physics step).
    // Signal expiry by setting TTL to 0 and mark for defensive cleanup.
    try {
      if (proj.projectile) proj.projectile.ttl = 0;
      // mark as destroying to clear any stored rapier refs
      try {
        markEntityDestroying(proj as unknown as Record<string, unknown>);
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  }
}

export default handleProjectileHit;
