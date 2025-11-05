import { describe, expect, it } from 'vitest';
import { RobotEntity } from '../../src/ecs/world';
import { findClosestEnemy, pickCaptainTarget } from '../../src/simulation/ai/targeting';

function createRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const base: RobotEntity = {
    id: 'robot-0',
    kind: 'robot',
    team: 'red',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: 0,
    weapon: 'laser',
    speed: 0,
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'seek',
      targetId: undefined,
      directive: 'balanced',
      anchorPosition: null,
      anchorDistance: null,
      strafeSign: 1,
      targetDistance: null,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  };

  return {
    ...base,
    ...overrides,
    position: overrides.position ?? { ...base.position },
    velocity: overrides.velocity ?? { ...base.velocity },
    ai: { ...base.ai, ...(overrides.ai ?? {}) },
  };
}

describe('findClosestEnemy', () => {
  it('prioritizes nearest enemy with deterministic tie-breakers', () => {
    const seeker = createRobot({ id: 'seeker', team: 'red' });
    const closerHealth = createRobot({
      id: 'blue-1',
      team: 'blue',
      position: { x: 5, y: 0, z: 0 },
      kills: 1,
      health: 75,
    });
    const tieDistanceHigherKills = createRobot({
      id: 'blue-2',
      team: 'blue',
      position: { x: 0, y: 0, z: 5 },
      kills: 3,
      health: 75,
    });
    const farEnemy = createRobot({
      id: 'blue-3',
      team: 'blue',
      position: { x: 20, y: 0, z: 0 },
      kills: 10,
    });

    const result = findClosestEnemy(seeker, [seeker, closerHealth, tieDistanceHigherKills, farEnemy]);
    expect(result?.id).toBe('blue-2');
  });

  it('ignores defeated robots and falls back to spawn distance', () => {
    const seeker = createRobot({ id: 'alpha', team: 'red' });
    const defeated = createRobot({
      id: 'blue-defeated',
      team: 'blue',
      position: { x: 6, y: 0, z: 0 },
      health: 0,
    });
    const tieKillsDifferentSpawn = createRobot({
      id: 'blue-near-spawn',
      team: 'blue',
      position: { x: 6, y: 0, z: 0 },
      kills: 2,
      health: 60,
    });
    const fartherFromSpawn = createRobot({
      id: 'blue-far-spawn',
      team: 'blue',
      position: { x: -6, y: 0, z: 0 },
      kills: 2,
      health: 60,
    });

    const result = findClosestEnemy(seeker, [seeker, defeated, tieKillsDifferentSpawn, fartherFromSpawn]);
    expect(result?.id).toBe('blue-near-spawn');
  });
});

describe('pickCaptainTarget', () => {
  it('prefers enemy captains when available', () => {
    const seeker = createRobot({ id: 'captain-red', team: 'red', isCaptain: true });
    const captain = createRobot({
      id: 'blue-captain',
      team: 'blue',
      isCaptain: true,
      kills: 4,
      health: 90,
    });
    const strongNonCaptain = createRobot({
      id: 'blue-heavy',
      team: 'blue',
      kills: 6,
      health: 100,
    });

    const result = pickCaptainTarget(seeker, [seeker, captain, strongNonCaptain]);
    expect(result?.id).toBe('blue-captain');
  });

  it('applies deterministic ordering when no captains remain', () => {
    const seeker = createRobot({ id: 'red-1', team: 'red', isCaptain: true });
    const highHealth = createRobot({
      id: 'blue-high-health',
      team: 'blue',
      health: 80,
      kills: 1,
    });
    const equalHealthMoreKills = createRobot({
      id: 'blue-ace',
      team: 'blue',
      health: 80,
      kills: 5,
    });
    const tieBreakBySpawn = createRobot({
      id: 'blue-flanker',
      team: 'blue',
      health: 80,
      kills: 5,
      position: { x: 40, y: 0, z: 0 },
    });

    const result = pickCaptainTarget(seeker, [
      seeker,
      highHealth,
      equalHealthMoreKills,
      tieBreakBySpawn,
    ]);
    expect(result?.id).toBe('blue-ace');
  });
});
