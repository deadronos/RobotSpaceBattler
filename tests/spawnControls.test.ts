import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resetWorld, world } from '../src/ecs/miniplexStore';
import { resetAndSpawnDefaultTeams, spawnRobot, spawnTeam } from '../src/robots/spawnControls';

function getRobots() {
  return Array.from(world.entities).filter((entity) => {
    if (!entity.team) return false;
    if ((entity as { projectile?: unknown }).projectile) return false;
    if ((entity as { beam?: unknown }).beam) return false;
    return true;
  });
}

describe('spawnControls', () => {
  beforeEach(() => {
    resetWorld();
  });

  afterEach(() => {
    resetWorld();
  });

  it('spawns individual robots with weapon loadout', () => {
    const robot = spawnRobot('red', 'gun');

    expect(robot.team).toBe('red');
    expect(robot.weapon?.type).toBe('gun');
    expect(robot.weaponState?.cooldownRemaining).toBe(0);
  });

  it('spawnTeam enqueues multiple robots using provided loadout', () => {
    spawnTeam('blue', ['laser', 'rocket'], 3);

    const robots = getRobots();
    const blueRobots = robots.filter((entity) => entity.team === 'blue');

    expect(blueRobots).toHaveLength(3);
    expect(blueRobots.map((entity) => entity.weapon!.type)).toEqual(['laser', 'rocket', 'laser']);
  });

  it('resetAndSpawnDefaultTeams resets world and seeds both teams', () => {
    spawnRobot('red', 'laser');
    resetAndSpawnDefaultTeams();

    const robots = getRobots();
    const red = robots.filter((entity) => entity.team === 'red');
    const blue = robots.filter((entity) => entity.team === 'blue');

    expect(red).toHaveLength(10);
    expect(blue).toHaveLength(10);
  });
});





