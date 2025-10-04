import { describe, it, expect } from 'vitest';
import { resetWorld, createRobotEntity, world } from '../../src/ecs/miniplexStore';
import { resolveEntity, resolveOwner } from '../../src/ecs/ecsResolve';

describe('ecsResolve helpers', () => {
  it('resolveEntity should find entities by gameplayId and numeric id as string', () => {
    resetWorld();
    const a = createRobotEntity({ gameplayId: 'robot-alpha', team: 'red' });
    const b = createRobotEntity({ gameplayId: 'robot-beta', team: 'blue' });
    // DEBUG: print created entities to understand ID assignment
    // eslint-disable-next-line no-console
    console.log('DEBUG createRobotEntity a:', JSON.stringify(a));
    // eslint-disable-next-line no-console
    console.log('DEBUG createRobotEntity b:', JSON.stringify(b));

    // Resolve by gameplayId string
    const ra = resolveEntity(world, 'robot-alpha');
    expect(ra).toBeDefined();
    expect(ra!.gameplayId).toBe('robot-alpha');

    // Resolve by numeric id (coerced to string)
    const bid = b.id ? String(b.id) : undefined;
    expect(bid).toBeDefined();
    const rb = resolveEntity(world, bid);
    expect(rb).toBeDefined();
    expect(rb!.gameplayId).toBe('robot-beta');
  });

  it('resolveOwner should find owner by ownerId or weaponId', () => {
    resetWorld();
    const owner = createRobotEntity({ gameplayId: 'owner-1', team: 'red' });
    // Attach a weapon id to the owner
    const weaponId = 'weapon-xyz';
    if (owner.weapon) {
      owner.weapon.id = weaponId;
      owner.weapon.ownerId = 'owner-1';
    }

    const foundByOwner = resolveOwner(world, { ownerId: 'owner-1' });
    expect(foundByOwner).toBeDefined();
    expect(foundByOwner!.gameplayId).toBe('owner-1');

    const foundByWeapon = resolveOwner(world, { weaponId });
    expect(foundByWeapon).toBeDefined();
    expect(foundByWeapon!.weapon?.id).toBe(weaponId);
  });
});