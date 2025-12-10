import { BattleWorld } from "../world";

/**
 * Updates the state of visual effects in the world.
 * Removes effects that have exceeded their duration.
 *
 * @param world - The battle world containing the effects.
 */
export function updateEffectSystem(world: BattleWorld): void {
  const now = world.state.elapsedMs;
  const effects = world.effects.entities;

  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    if (now - effect.createdAt >= effect.duration) {
      world.removeEffect(effect);
    }
  }
}
