import { describe, expect, it } from 'vitest';

import type { Vector3 } from '../../../src/types';
import { createRobot, hasValidCaptainDistribution, normalizeRobot } from '../../../src/ecs/entities/Robot';

const basePosition: Vector3 = { x: 0, y: 0, z: 0 };
const baseRotation = { x: 0, y: 0, z: 0, w: 1 } as const;

function createTestRobot(overrides: Partial<Parameters<typeof createRobot>[0]> = {}) {
  return createRobot({
    id: 'robot-1',
    team: 'red',
    position: basePosition,
    rotation: baseRotation,
    velocity: { x: 0, y: 0, z: 0 },
    weaponType: 'laser',
    maxHealth: 100,
    health: 100,
    isCaptain: false,
    aiState: {
      behaviorMode: 'aggressive',
      targetId: null,
      coverPosition: null,
      lastFireTime: 0,
      formationOffset: { x: 0, y: 0, z: 0 },
    },
    stats: {
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      timeAlive: 0,
      shotsFired: 0,
    },
    ...overrides,
  });
}

describe('Robot entity model', () => {
  it('clamps health within bounds', () => {
    const robot = createTestRobot({ health: 150 });

    expect(robot.health).toBe(100);
  });

  it('normalizes provided robot state to enforce invariants', () => {
    const normalized = normalizeRobot({
      id: 'robot-2',
      team: 'blue',
      position: { x: 2, y: -5, z: 3 },
      rotation: baseRotation,
      velocity: { x: 0, y: 0, z: 0 },
      weaponType: 'rocket',
      maxHealth: 80,
      health: -10,
      isCaptain: true,
      aiState: {
        behaviorMode: 'defensive',
        targetId: 'enemy-1',
        coverPosition: null,
        lastFireTime: 100,
        formationOffset: { x: 1, y: 0, z: -1 },
      },
      stats: {
        kills: 1,
        damageDealt: 10,
        damageTaken: 20,
        timeAlive: 30,
        shotsFired: 4,
      },
    });

    expect(normalized.position.y).toBeGreaterThanOrEqual(0);
    expect(normalized.health).toBeGreaterThanOrEqual(0);
    expect(normalized.health).toBeLessThanOrEqual(normalized.maxHealth);
    expect(normalized.team).toBe('blue');
  });

  it('throws when provided with an invalid team', () => {
    expect(() =>
      createTestRobot({
        team: 'green' as never,
      })
    ).toThrowError(/Invalid team/i);
  });

  it('validates captain distribution per team', () => {
    const robots = [
      createTestRobot({ id: 'r1', team: 'red', isCaptain: true }),
      createTestRobot({ id: 'r2', team: 'red', isCaptain: false }),
      createTestRobot({ id: 'b1', team: 'blue', isCaptain: true }),
    ];

    expect(hasValidCaptainDistribution(robots)).toBe(true);

    const invalid = [
      createTestRobot({ id: 'r1', team: 'red', isCaptain: true }),
      createTestRobot({ id: 'r2', team: 'red', isCaptain: true }),
    ];

    expect(hasValidCaptainDistribution(invalid)).toBe(false);
  });
});
