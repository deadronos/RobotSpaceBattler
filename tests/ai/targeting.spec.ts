import { describe, expect, it } from 'vitest';

import { findClosestEnemy, pickCaptainTarget } from '../../src/simulation/ai/targeting';
import { createTestRobot } from '../helpers/robotFactory';

describe('findClosestEnemy', () => {
  it('prioritizes nearest enemy with deterministic tie-breakers', () => {
    const seeker = createTestRobot({ id: 'seeker', team: 'red' });
    const closerHealth = createTestRobot({
      id: 'blue-1',
      team: 'blue',
      position: { x: 5, y: 0, z: 0 },
      kills: 1,
      health: 75,
    });
    const tieDistanceHigherKills = createTestRobot({
      id: 'blue-2',
      team: 'blue',
      position: { x: 0, y: 0, z: 5 },
      kills: 3,
      health: 75,
    });
    const farEnemy = createTestRobot({
      id: 'blue-3',
      team: 'blue',
      position: { x: 20, y: 0, z: 0 },
      kills: 10,
    });

    const result = findClosestEnemy(seeker, [seeker, closerHealth, tieDistanceHigherKills, farEnemy]);
    expect(result?.id).toBe('blue-2');
  });

  it('ignores defeated robots and falls back to spawn distance', () => {
    const seeker = createTestRobot({ id: 'alpha', team: 'red' });
    const defeated = createTestRobot({
      id: 'blue-defeated',
      team: 'blue',
      position: { x: 6, y: 0, z: 0 },
      health: 0,
    });
    const tieKillsDifferentSpawn = createTestRobot({
      id: 'blue-near-spawn',
      team: 'blue',
      position: { x: 6, y: 0, z: 0 },
      kills: 2,
      health: 60,
    });
    const fartherFromSpawn = createTestRobot({
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
    const seeker = createTestRobot({ id: 'captain-red', team: 'red', isCaptain: true });
    const captain = createTestRobot({
      id: 'blue-captain',
      team: 'blue',
      isCaptain: true,
      kills: 4,
      health: 90,
    });
    const strongNonCaptain = createTestRobot({
      id: 'blue-heavy',
      team: 'blue',
      kills: 6,
      health: 100,
    });

    const result = pickCaptainTarget(seeker, [seeker, captain, strongNonCaptain]);
    expect(result?.id).toBe('blue-captain');
  });

  it('applies deterministic ordering when no captains remain', () => {
    const seeker = createTestRobot({ id: 'red-1', team: 'red', isCaptain: true });
    const highHealth = createTestRobot({
      id: 'blue-high-health',
      team: 'blue',
      health: 80,
      kills: 1,
    });
    const equalHealthMoreKills = createTestRobot({
      id: 'blue-ace',
      team: 'blue',
      health: 80,
      kills: 5,
    });
    const tieBreakBySpawn = createTestRobot({
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
