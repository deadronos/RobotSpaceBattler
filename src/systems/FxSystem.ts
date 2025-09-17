import type { World } from 'miniplex';

import type { FxComponent } from '../ecs/fx';
import type { Entity } from '../ecs/miniplexStore';
import type { DamageEvent } from '../ecs/weapons';
import { useUI } from '../store/uiStore';
import type { DeathEvent } from './DamageSystem';
import type { ImpactEvent } from './HitscanSystem';

type FxSpawn = {
  type: FxComponent['type'];
  position: [number, number, number];
  color?: string;
  size?: number;
  ttl: number; // seconds
  intensity?: number;
};

function spawnFx(world: World<Entity>, fx: FxSpawn) {
  const e: Entity = {
    id: `fx_${fx.type}_${Math.random().toString(36).slice(2)}`,
    position: [fx.position[0], fx.position[1], fx.position[2]],
    fx: {
      type: fx.type,
      ttl: fx.ttl,
      age: 0,
      color: fx.color,
      size: fx.size,
      intensity: fx.intensity,
    },
  };
  world.add(e);
}

export function fxSystem(
  world: World<Entity>,
  dt: number,
  events: { impact: ImpactEvent[]; death: DeathEvent[]; damage: DamageEvent[] }
) {
  // Read UI flag safely (tests may not have store setup)
  let show = true;
  try {
    show = !!useUI.getState().showFx;
  } catch {
    show = true;
  }

  // Spawn FX for this frame's events when enabled
  if (show) {
    for (const imp of events.impact) {
      // Quick hit flash
      if (imp.position) {
        spawnFx(world, {
          type: 'hitFlash',
          position: imp.position,
          color: '#ffd166',
          size: 0.4,
          ttl: 0.25,
          intensity: 1,
        });

        // Small particle pop
        spawnFx(world, {
          type: 'impactParticles',
          position: imp.position,
          color: '#ffee99',
          size: 0.6,
          ttl: 0.5,
          intensity: 0.8,
        });
      }
    }

    for (const death of events.death) {
      if (death.position) {
        spawnFx(world, {
          type: 'explosion',
          position: death.position,
          color: '#ff6b6b',
          size: 1.2,
          ttl: 0.7,
          intensity: 1,
        });
      }
    }
  }

  // Update and cleanup existing FX
  for (const entity of [...world.entities]) {
    const e = entity as Entity & { fx?: FxComponent; position?: [number, number, number] };
    if (!e.fx) continue;

    e.fx.age += dt;
    if (e.fx.age >= e.fx.ttl) {
      world.remove(e);
    }
  }
}
