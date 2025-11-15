import { BattleWorld } from '../world';

export function updateEffectSystem(world: BattleWorld): void {
  const now = world.state.elapsedMs;
  const effects = [...world.effects.entities];

  effects.forEach((effect) => {
    if (now - effect.createdAt >= effect.duration) {
      world.world.remove(effect);
    }
  });
}
