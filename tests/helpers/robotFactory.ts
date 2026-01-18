import { RobotEntity, toVec3 } from '../../src/ecs/world';
import { createPathComponent } from '../../src/simulation/ai/pathfinding/integration/PathComponent';

/**
 * Creates a test robot with default values and optional overrides.
 * This factory function provides a consistent way to create robot entities for testing,
 * reducing duplication across test files.
 */
export function createTestRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const baseAI: RobotEntity['ai'] = {
    mode: 'seek',
    targetId: undefined,
    directive: 'balanced',
    anchorPosition: null,
    anchorDistance: null,
    strafeSign: 1,
    targetDistance: null,
  };

  const base: RobotEntity = {
    id: 'robot-0',
    kind: 'robot',
    team: 'red',
    role: 'assault',
    position: toVec3(0, 0, 0),
    velocity: toVec3(0, 0, 0),
    orientation: 0,
    weapon: 'laser',
    speed: 0,
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: baseAI,
    kills: 0,
    isCaptain: false,

    spawnIndex: 0,
    lastDamageTimestamp: 0,
    pathComponent: createPathComponent(),
  };

  return {
    ...base,
    ...overrides,
    position: overrides.position ?? { ...base.position },
    velocity: overrides.velocity ?? { ...base.velocity },
    ai: { ...baseAI, ...(overrides.ai ?? {}) },
  };
}
