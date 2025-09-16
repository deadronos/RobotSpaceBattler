import type { World } from 'miniplex';

import type { Entity } from '../ecs/miniplexStore';
import { performLineOfSight } from './perception';

export type AIState = 'idle' | 'patrol' | 'engage' | 'flee';

export interface AIComponent {
  state: AIState;
  stateSince: number; // timestamp ms
}

function now() {
  return Date.now();
}

function chooseNearestEnemy(self: Entity, world: World<Entity>) {
  if (!self.rigid || !self.position) return undefined;
  const p = self.position;
  let best: { e: Entity; d2: number } | undefined;
  for (const e of world.entities) {
    if (e === self) continue;
    if (!e.position || !e.team || e.team === self.team) continue;
    if (e.alive === false) continue;
    const dx = e.position[0] - p[0];
    const dz = e.position[2] - p[2];
    const d2 = dx * dx + dz * dz;
    if (!best || d2 < best.d2) best = { e, d2 };
  }
  return best?.e;
}

/**
 * Simple AI system implementing a tiny state machine and perception checks.
 * - Idle: stand still
 * - Patrol: wander (slow random velocity)
 * - Engage: move to and fire at target
 * - Flee: back off when low HP
 */
export function aiSystem(world: World<Entity>, rng: () => number, rapierWorld?: unknown) {
  for (const e of world.entities) {
    const entity = e as Entity & {
      ai?: AIComponent;
      weaponState?: { firing?: boolean; cooldownRemaining?: number };
      weapon?: { range?: number } & Record<string, unknown>;
      position?: [number, number, number];
      rigid?: { setLinvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void } | null;
      hp?: number;
      maxHp?: number;
      speed?: number;
    };

    if (!entity.weapon || !entity.weaponState || !entity.position) continue;

    // ensure an AI component
    if (!entity.ai) {
      entity.ai = { state: 'idle', stateSince: now() } as AIComponent;
    }

    // health-based transition
    if ((entity.hp ?? 0) < ((entity.maxHp ?? 100) * 0.25)) {
      entity.ai.state = 'flee';
    }

    switch (entity.ai.state) {
      case 'idle': {
        // occasionally switch to patrol or look for enemies
        if (rng() < 0.02) {
          entity.ai.state = 'patrol';
          entity.ai.stateSince = now();
        }
        const target = chooseNearestEnemy(entity, world);
  if (target && performLineOfSight(entity.position, target, world, entity.weapon.range || 10, rapierWorld)) {
          entity.ai.state = 'engage';
          entity.ai.stateSince = now();
          entity.targetId = target.id as unknown as number;
        }
        break;
      }
      case 'patrol': {
        // simple wander by nudging velocity (if rigid present)
        if (entity.rigid && entity.speed) {
          const angle = rng() * Math.PI * 2;
          const vx = Math.cos(angle) * (entity.speed * 0.5);
          const vz = Math.sin(angle) * (entity.speed * 0.5);
          entity.rigid.setLinvel?.({ x: vx, y: 0, z: vz }, true);
        }
        // revert to idle after a bit
        if (now() - entity.ai.stateSince > 3000) {
          entity.ai.state = 'idle';
          entity.ai.stateSince = now();
        }

        // check for enemies
        const target = chooseNearestEnemy(entity, world);
  if (target && performLineOfSight(entity.position, target, world, entity.weapon.range || 10, rapierWorld)) {
          entity.ai.state = 'engage';
          entity.ai.stateSince = now();
          entity.targetId = target.id as unknown as number;
        }
        break;
      }
      case 'engage': {
        const target = chooseNearestEnemy(entity, world);
        if (!target) {
          entity.ai.state = 'idle';
          entity.ai.stateSince = now();
          entity.weaponState.firing = false;
          entity.targetId = undefined;
          break;
        }

        // check LOS
  const hasLOS = performLineOfSight(entity.position, target, world, entity.weapon.range || 10, rapierWorld);
        if (!hasLOS) {
          entity.weaponState.firing = false;
          entity.targetId = undefined;
          // try to move to get LOS (simple approach: set a small wander)
          if (entity.rigid && entity.speed) {
            const angle = rng() * Math.PI * 2;
            const vx = Math.cos(angle) * (entity.speed * 0.6);
            const vz = Math.sin(angle) * (entity.speed * 0.6);
            entity.rigid.setLinvel?.({ x: vx, y: 0, z: vz }, true);
          }
          break;
        }

        // in range and visible -> set target and fire
        entity.targetId = target.id as unknown as number;
        entity.weaponState.firing = true;

        // if too close, back off a bit (guard speed)
        if (entity.rigid && entity.position && target.position && entity.speed) {
          const dx = target.position[0] - entity.position[0];
          const dz = target.position[2] - entity.position[2];
          const dist = Math.hypot(dx, dz) || 1;
          if (dist < (entity.weapon.range || 10) * 0.5) {
            const bx = -(dx / dist) * entity.speed;
            const bz = -(dz / dist) * entity.speed;
            entity.rigid.setLinvel?.({ x: bx, y: 0, z: bz }, true);
          }
        }

        break;
      }
      case 'flee': {
        // back off from nearest enemy and stop firing
        entity.weaponState.firing = false;
        const target = chooseNearestEnemy(entity, world);
        if (entity.rigid && entity.position) {
          if (target && target.position && entity.speed) {
            const dx = entity.position[0] - target.position[0];
            const dz = entity.position[2] - target.position[2];
            const len = Math.hypot(dx, dz) || 1;
            const vx = (dx / len) * entity.speed;
            const vz = (dz / len) * entity.speed;
            entity.rigid.setLinvel?.({ x: vx, y: 0, z: vz }, true);
          } else if (entity.speed) {
            // random flee
            const angle = rng() * Math.PI * 2;
            const vx = Math.cos(angle) * entity.speed;
            const vz = Math.sin(angle) * entity.speed;
            entity.rigid.setLinvel?.({ x: vx, y: 0, z: vz }, true);
          }
        }

        // if healed above threshold, return to idle
        if ((entity.hp ?? 0) > ((entity.maxHp ?? 100) * 0.5)) {
          entity.ai.state = 'idle';
          entity.ai.stateSince = now();
        }
        break;
      }
      default:
        entity.ai.state = 'idle';
        entity.ai.stateSince = now();
    }
  }
}
