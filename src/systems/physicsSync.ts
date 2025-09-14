import store from "../ecs/miniplexStore";
import type { Entity } from "../ecs/types";

// Mirrors Rapier RigidBody translations back into ECS entity.position arrays.
// Keep simple and side-effectful by design for the prototype.
export function syncRigidBodiesToECS() {
  const ents = [...store.entities.values()] as unknown as Entity[];
  for (const ent of ents) {
    // entity may not have rb yet
    const rb = ent.rb;
    if (
      rb &&
      Array.isArray(ent.position) &&
      ent.position.length >= 3 &&
      rb.translation
    ) {
      const t = rb.translation();
      ent.position[0] = t.x;
      ent.position[1] = t.y;
      ent.position[2] = t.z;
    }
  }
}
