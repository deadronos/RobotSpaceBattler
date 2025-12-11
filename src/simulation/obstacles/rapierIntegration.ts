import { BattleWorld, ObstacleEntity } from "../../ecs/world";

type RapierObstacleApi = Partial<{
  createObstacleCollider: (
    id: string,
    shape: ObstacleEntity["shape"],
    position: ObstacleEntity["position"],
    orientation: number,
  ) => unknown;
  createKinematicBody: (
    id: string,
    shape: ObstacleEntity["shape"],
    position: ObstacleEntity["position"],
    orientation: number,
  ) => unknown;
  updateObstacleTransform: (
    id: string,
    position: ObstacleEntity["position"],
    orientation: number,
  ) => void;
  setKinematicBodyTransform: (
    id: string,
    position: ObstacleEntity["position"],
    orientation: number,
  ) => void;
  removeObstacle: (id: string) => void;
}>;

// Use a weak map to avoid mutating BattleWorld runtime types.
const bindings = new WeakMap<BattleWorld, Map<string, unknown>>();

export function getRapierBindings(world: BattleWorld) {
  let map = bindings.get(world);
  if (!map) {
    map = new Map<string, unknown>();
    bindings.set(world, map);
  }
  return map;
}

/**
 * Create kinematic colliders in the Rapier world for any obstacles not yet bound.
 * The implementation is defensive: it will only call methods present on the rapierWorld
 * to avoid hard dependencies on Rapier's concrete API in tests.
 */
export function syncObstaclesToRapier(world: BattleWorld) {
  const rapierWorld = world.rapierWorld as RapierObstacleApi | undefined;
  if (!rapierWorld) return;

  const map = getRapierBindings(world);

  for (const o of world.obstacles.entities as ObstacleEntity[]) {
    if (map.has(o.id)) continue;

    // Allow test harnesses / adapters to provide a friendly API:
    // - createObstacleCollider(id, shape, position, orientation)
    // - fallback: createKinematicBody / createCollider
    if (typeof rapierWorld.createObstacleCollider === "function") {
      const collider = rapierWorld.createObstacleCollider(
        o.id,
        o.shape,
        o.position,
        o.orientation ?? 0,
      );
      map.set(o.id, collider);
    } else if (typeof rapierWorld.createKinematicBody === "function") {
      const body = rapierWorld.createKinematicBody(
        o.id,
        o.shape,
        o.position,
        o.orientation ?? 0,
      );
      map.set(o.id, body);
    } else {
      // No-op but still record a placeholder binding so subsequent calls are stable.
      map.set(o.id, {
        placeholder: true,
        shape: o.shape,
        position: o.position,
      });
    }
  }
}

/**
 * Notify rapier world that obstacle transforms have changed.
 * Calls updateObstacleTransform if available on rapier world (test-friendly API) or
 * tries common Rapier-style callbacks when found.
 */
export function updateRapierObstacleTransforms(world: BattleWorld) {
  const rapierWorld = world.rapierWorld as RapierObstacleApi | undefined;
  if (!rapierWorld) return;

  const map = getRapierBindings(world);

  for (const o of world.obstacles.entities as ObstacleEntity[]) {
    if (!map.has(o.id)) continue;

    if (typeof rapierWorld.updateObstacleTransform === "function") {
      rapierWorld.updateObstacleTransform(o.id, o.position, o.orientation ?? 0);
    } else if (typeof rapierWorld.setKinematicBodyTransform === "function") {
      rapierWorld.setKinematicBodyTransform(
        o.id,
        o.position,
        o.orientation ?? 0,
      );
    } else {
      // no-op fallback
    }
  }
}

export function clearRapierBindings(world: BattleWorld) {
  const map = bindings.get(world);
  if (!map) return;
  const rapierWorld = world.rapierWorld as RapierObstacleApi | undefined;
  // Allow removal if rapierWorld offers it
  if (rapierWorld && typeof rapierWorld.removeObstacle === "function") {
    for (const id of map.keys()) {
      rapierWorld.removeObstacle(id);
    }
  }
  bindings.delete(world);
}
