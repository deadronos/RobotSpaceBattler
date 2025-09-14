import store from "../ecs/miniplexStore";
import type { Entity } from "../ecs/types";

// Extracted projectile cleanup so it can be unit tested.
export function cleanupProjectiles(delta: number, storeRef = store) {
  const allEntities = [...storeRef.entities.values()] as unknown as Entity[];
  for (const p of allEntities) {
    if (!p || !p.projectile) continue;
    p.projectile.ttl -= delta;
    const pos =
      p.rb && p.rb.translation
        ? p.rb.translation()
        : { x: p.position[0], y: p.position[1], z: p.position[2] };
    const OOB =
      Math.abs(pos.x) > 200 ||
      Math.abs(pos.z) > 200 ||
      pos.y < -10 ||
      pos.y > 100;
    if (p.projectile.ttl <= 0 || OOB) {
      storeRef.remove(p);
    }
  }
}

export default cleanupProjectiles;
