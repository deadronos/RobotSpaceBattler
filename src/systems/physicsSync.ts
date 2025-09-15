import store from '../ecs/miniplexStore';
import type { Entity } from "../ecs/types";

// Mirrors Rapier RigidBody translations back into ECS entity.position arrays.
// Accept an optional store override (used by unit tests). In normal runtime
// use the real imported store.
export function syncRigidBodiesToECS(overrideStore?: { entities?: unknown }) {
  // Minimal runtime accessor for the store shape we use in systems/tests
  type MinimalStore = { entities?: unknown };
  const minimal: MinimalStore = (overrideStore ?? (store as unknown)) as MinimalStore;
  // miniplex's World has entities as an array; older or alternative shapes
  // might expose a Map-like object; handle both defensively.
  let ents: Entity[] = [];
  if (Array.isArray(minimal.entities)) {
    ents = minimal.entities as unknown as Entity[];
  } else if (minimal.entities) {
    type HasValues = { values: () => Iterable<unknown> };
    const hv = minimal.entities as HasValues;
    if (typeof hv.values === 'function') {
      ents = [...hv.values()] as Entity[];
    }
  }
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
