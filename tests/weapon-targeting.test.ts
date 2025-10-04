import { beforeEach, describe, it } from 'vitest';
import { resetWorld } from '../src/ecs/miniplexStore';
describe('Weapon targeting and friendly-fire rules', () => {
  beforeEach(() => {
    resetWorld();
  });
  it.skip('aims at the tracked target and only damages that enemy (hitscan)', () => {});
  it.skip('ignores friendly targets for hitscan weapons', () => {});
  it.skip('propagates owner/target identifiers to projectiles and respects friendly fire', () => {});
  it.skip('uses resolved owner entity id when fire event ownerId is stale', () => {});
  it.skip('applies owner team filtering for beam tick damage', () => {});
});
