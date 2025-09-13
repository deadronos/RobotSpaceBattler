import store from "../ecs/miniplexStore";

// Mirrors Rapier RigidBody translations back into ECS entity.position arrays.
// Keep simple and side-effectful by design for the prototype.
export function syncRigidBodiesToECS() {
  for (const ent of [...store.entities.values()]) {
    // entity may not have rb yet
    const rb = (ent as any).rb;
    if (rb && Array.isArray(ent.position) && ent.position.length >= 3) {
      const t = rb.translation();
      ent.position[0] = t.x;
      ent.position[1] = t.y;
      ent.position[2] = t.z;
    }
  }
}
