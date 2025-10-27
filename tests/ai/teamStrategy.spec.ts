import { describe, expect, it } from 'vitest';

import { RobotEntity, toVec3 } from '../../src/ecs/world';
import {
  buildFormationAnchor,
  buildTeamDirectives,
  computeEnemyCentroid,
  findCoverPoint,
} from '../../src/simulation/ai/teamStrategy';
import { computeTeamAnchors } from '../../src/simulation/ai/captainCoordinator';
import { TEAM_CONFIGS } from '../../src/lib/teamConfig';

function createRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const base: RobotEntity = {
    id: 'robot',
    kind: 'robot',
    team: 'red',
    position: toVec3(0, 0, 0),
    velocity: toVec3(0, 0, 0),
    orientation: 0,
    weapon: 'laser',
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'seek',
      directive: 'balanced',
      anchorPosition: null,
      strafeSign: 1,
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
    ai: { ...base.ai, ...overrides.ai },
  };
}

describe('teamStrategy', () => {
  it('marks advantaged team as offense and disadvantaged as defense', () => {
    const robots = [
      createRobot({ id: 'r1', team: 'red' }),
      createRobot({ id: 'r2', team: 'red' }),
      createRobot({ id: 'r3', team: 'red' }),
      createRobot({ id: 'b1', team: 'blue' }),
    ];

    const directives = buildTeamDirectives(robots);
    expect(directives.red).toBe('offense');
    expect(directives.blue).toBe('defense');
  });

  it('computes enemy centroid', () => {
    const robots = [
      createRobot({ id: 'r1', team: 'red' }),
      createRobot({ id: 'b1', team: 'blue', position: toVec3(10, 0, 0) }),
      createRobot({ id: 'b2', team: 'blue', position: toVec3(0, 0, 10) }),
    ];

    const centroid = computeEnemyCentroid('red', robots);
    expect(centroid).toBeTruthy();
    expect(centroid?.x).toBeCloseTo(5, 5);
    expect(centroid?.z).toBeCloseTo(5, 5);
  });

  it('builds formation anchor around target', () => {
    const robot = createRobot({ id: 'attacker', spawnIndex: 3 });
    const target = createRobot({
      id: 'target',
      team: 'blue',
      position: toVec3(10, 0, 0),
    });

    const anchor = buildFormationAnchor(robot, target);
    const radius = Math.hypot(anchor.x - target.position.x, anchor.z - target.position.z);
    expect(radius).toBeCloseTo(5.5, 1);
  });

  it('finds cover point near spawn away from enemies', () => {
    const robot = createRobot({ id: 'defender', position: toVec3(-5, 0, 0) });
    const enemyCentroid = toVec3(10, 0, 0);
    const cover = findCoverPoint(robot, enemyCentroid);
    expect(cover.x).toBeLessThan(robot.position.x);
  });

  it('computes captain anchors per robot', () => {
    const captain = createRobot({
      id: 'captain-red',
      team: 'red',
      isCaptain: true,
      ai: { mode: 'seek', targetId: 'target', directive: 'offense' },
    });
    const ally = createRobot({ id: 'ally', team: 'red', spawnIndex: 2 });
    const target = createRobot({
      id: 'target',
      team: 'blue',
      position: toVec3(20, 0, 0),
    });

    const anchors = computeTeamAnchors([captain, ally, target]);
    expect(anchors.ally.anchorPosition).toBeTruthy();
  });

  it('assigns spaced anchors for balanced directives', () => {
    const spawnCenter = TEAM_CONFIGS.red.spawnCenter;
    const robots = [
      createRobot({
        id: 'r0',
        team: 'red',
        spawnIndex: 0,
        position: spawnCenter,
      }),
      createRobot({
        id: 'r1',
        team: 'red',
        spawnIndex: 1,
        position: spawnCenter,
      }),
      createRobot({
        id: 'b1',
        team: 'blue',
        spawnIndex: 0,
        position: toVec3(30, 0, 0),
      }),
    ];

    const anchors = computeTeamAnchors(robots);
    const r0 = anchors.r0.anchorPosition;
    const r1 = anchors.r1.anchorPosition;
    expect(r0).toBeTruthy();
    expect(r1).toBeTruthy();
    const centroid = computeEnemyCentroid('red', robots);
    expect(centroid).toBeTruthy();
    const r0Radius = Math.hypot(
      (r0?.x ?? 0) - (centroid?.x ?? 0),
      (r0?.z ?? 0) - (centroid?.z ?? 0),
    );
    expect(r0Radius).toBeGreaterThan(1);
    expect(anchors.r0.strafeSign).toBe(1);
    expect(anchors.r1.strafeSign).toBe(-1);
  });
});
