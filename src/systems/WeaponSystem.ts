import type { World } from "miniplex";

import { resolveEntity } from "../ecs/ecsResolve";
import { type Entity,getGameplayId } from "../ecs/miniplexStore";
import type {
  DamageEvent,
  WeaponComponent,
  WeaponStateComponent,
} from "../ecs/weapons";
import type { Rng } from "../utils/seededRng";

export interface WeaponFiredEvent {
  weaponId: string;
  ownerId: string;
  type: WeaponComponent["type"];
  origin: [number, number, number];
  direction: [number, number, number];
  targetId?: number | string;
  timestamp: number;
  id?: string;
}

type RigidBodyLike = {
  translation: () => { x: number; y: number; z: number };
};

function getEntityPosition(
  entity: Entity & { position?: [number, number, number] },
): [number, number, number] | undefined {
  const rigid = entity.rigid as RigidBodyLike | null;
  if (rigid) {
    const { x, y, z } = rigid.translation();
    return [x, y, z];
  }
  if (entity.position) {
    return [entity.position[0], entity.position[1], entity.position[2]];
  }
  return undefined;
}

/**
 * Weapon system coordinator - manages cooldowns, ammo, and firing decisions.
 * Emits WeaponFired events rather than directly resolving hits.
 */
export function weaponSystem(...args: unknown[]) {
  // Support two calling styles:
  // 1) positional: weaponSystem(world, dt, rng, events, simNowMs?)
  // 2) object param: weaponSystem({ world, stepContext, events, rng, idFactory })
  let world: World<Entity>;
  let dt: number = 1 / 60;
  let rng: Rng | undefined;
  let events: { weaponFired: WeaponFiredEvent[]; damage: DamageEvent[] } = { weaponFired: [], damage: [] };
  let simNowMs: number | undefined;
  let idFactory: (() => string) | undefined;

  if (args.length === 1 && args[0] && typeof args[0] === 'object' && 'world' in (args[0] as Record<string, unknown>)) {
    const p = args[0] as {
      world: World<Entity>;
      stepContext?: { simNowMs?: number; rng?: Rng; step?: number; idFactory?: () => string };
      rng?: Rng;
      idFactory?: () => string;
      events?: { weaponFired: WeaponFiredEvent[]; damage: DamageEvent[] };
    };
    world = p.world;
    if (p.stepContext) {
      simNowMs = p.stepContext.simNowMs;
      // dt could be derived from stepContext.step but default to 1/60
      dt = p.stepContext.step ?? dt;
      rng = p.stepContext.rng;
      idFactory = p.stepContext.idFactory;
    }
    rng = p.stepContext?.rng ?? p.rng ?? rng;
    idFactory = p.idFactory ?? idFactory;
    events = p.events ?? events;
  } else {
    // Positional fallback
  world = args[0] as World<Entity>;
  dt = (args[1] as number) ?? dt;
  rng = args[2] as Rng | undefined;
  events = (args[3] as { weaponFired: WeaponFiredEvent[]; damage: DamageEvent[] } | undefined) ?? events;
  simNowMs = args[4] as number | undefined;
    // positional idFactory not supported; must be passed via stepContext or object param
  }

  // Enforce deterministic inputs
  if (typeof simNowMs !== 'number') {
    throw new Error('weaponSystem requires stepContext.simNowMs to be provided for deterministic behavior');
  }
  if (typeof rng !== 'function') {
    throw new Error('weaponSystem requires a deterministic rng function (stepContext.rng)');
  }
  if (typeof idFactory !== 'function') {
    throw new Error('weaponSystem requires an idFactory (stepContext.idFactory) to generate deterministic ids');
  }

  for (const entity of world.entities) {
    const e = entity as Entity & {
      weapon?: WeaponComponent;
      weaponState?: WeaponStateComponent;
      position?: [number, number, number];
      team?: "red" | "blue";
      rigid?: unknown;
      targetId?: number;
    };

    const { weapon, weaponState: state, position, team } = e;
    if (!weapon || !state || !position || !team) continue;

    // Update cooldown
    if (state.cooldownRemaining && state.cooldownRemaining > 0) {
      state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dt);
    }

    // Handle reloading
    if (state.reloading && weapon.ammo) {
      // Simple reload logic - could be enhanced with reload time
      weapon.ammo.clip = weapon.ammo.clipSize;
      state.reloading = false;
    }

    // Handle charging (for chargeable weapons like lasers)
    if (state.chargeStart && weapon.flags?.chargeable) {
      // Charging logic would go here
    }

    // Check if we can fire
    const canFire =
      state.firing &&
      (!state.cooldownRemaining || state.cooldownRemaining <= 0) &&
      (!weapon.ammo || weapon.ammo.clip > 0) &&
      !state.reloading;

    if (canFire) {
      if (!weapon.ownerId) {
        const fallbackId =
          getGameplayId(e) ??
          (typeof e.id !== "undefined" ? String(e.id) : undefined);
        if (fallbackId) {
          weapon.ownerId = fallbackId;
        }
      }

      const ownerId = weapon.ownerId;
      if (!ownerId) {
        continue;
      }

      // Set cooldown
      state.cooldownRemaining = weapon.cooldown;
      weapon.lastFiredAt = simNowMs;

      const origin = getEntityPosition(e) ?? position;

      let direction: [number, number, number] = [1, 0, 0];
      let targetId: number | string | undefined = e.targetId;
      if (targetId !== undefined) {
        const targetEntity = resolveEntity(world, targetId);
        if (targetEntity) {
          const targetPosition = getEntityPosition(targetEntity);
          if (targetPosition) {
            const dx = targetPosition[0] - origin[0];
            const dy = targetPosition[1] - origin[1];
            const dz = targetPosition[2] - origin[2];
            const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (length > 1e-5) {
              direction = [dx / length, dy / length, dz / length];
            }
          }
        } else {
          targetId = undefined;
        }
      }

      // Emit weapon fired event
      events.weaponFired.push({
        id: idFactory(),
        weaponId: weapon.id,
        ownerId,
        type: weapon.type,
        origin: [origin[0], origin[1], origin[2]],
        direction,
        targetId,
        timestamp: simNowMs,
      });

      // Consume ammo AFTER firing
      if (weapon.ammo) {
        weapon.ammo.clip = Math.max(0, weapon.ammo.clip - 1);
        if (weapon.ammo.clip === 0 && weapon.ammo.reserve > 0) {
          state.reloading = true;
        }
      }

      // Stop firing after single shot (unless continuous)
      if (!weapon.flags?.continuous) {
        state.firing = false;
      }
    }
  }
}
