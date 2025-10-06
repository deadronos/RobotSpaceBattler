import { create } from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';

import { createRobot } from '../../../src/ecs/entities/Robot';
import type { Robot as RobotEntity } from '../../../src/ecs/entities/Robot';
import type { Vector3 } from '../../../src/types';

function createTestRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const basePosition: Vector3 = { x: 1, y: 2, z: 3 };
  const baseRotation = { x: 0, y: 0, z: 0, w: 1 } as const;

  return createRobot({
    id: overrides.id ?? 'robot-1',
    team: overrides.team ?? 'red',
    position: overrides.position ?? basePosition,
    rotation: overrides.rotation ?? baseRotation,
    velocity: overrides.velocity ?? { x: 0, y: 0, z: 0 },
    weaponType: overrides.weaponType ?? 'laser',
    isCaptain: overrides.isCaptain ?? false,
    maxHealth: overrides.maxHealth ?? 100,
    health: overrides.health ?? 100,
    aiState:
      overrides.aiState ??
      {
        behaviorMode: 'aggressive',
        targetId: null,
        coverPosition: null,
        lastFireTime: 0,
        formationOffset: { x: 0, y: 0, z: 0 },
      },
    stats:
      overrides.stats ??
      {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        timeAlive: 0,
        shotsFired: 0,
      },
  });
}

describe('Robot component', () => {
  it('positions the robot group using entity coordinates', async () => {
    const robot = createTestRobot({ position: { x: 4, y: 0, z: -2 } });

    // Lazy import so the component can be created after test file is evaluated
    const { Robot } = await import('../../../src/components/Robot');

    const renderer = await create(<Robot robot={robot} />);
    const robotInstance = renderer.scene.children[0];
    const testInstance = robotInstance as any;
    const groupObject = testInstance.object ?? testInstance._fiber?.object;

    expect(groupObject).toBeDefined();
    expect(groupObject.position.x).toBeCloseTo(4);
    expect(groupObject.position.y).toBeCloseTo(0);
    expect(groupObject.position.z).toBeCloseTo(-2);

    await renderer.unmount();
  });

  it('applies team color to the robot material', async () => {
    const robot = createTestRobot({ id: 'robot-blue', team: 'blue' });
    const { Robot } = await import('../../../src/components/Robot');

    const renderer = await create(<Robot robot={robot} />);
    const robotInstance = renderer.scene.children[0];
    const testInstance = robotInstance as any;
    const groupObject = testInstance.object ?? testInstance._fiber?.object;
    const bodyMesh = groupObject?.getObjectByName?.('robot-body');

    expect(bodyMesh).toBeDefined();
    const material = (bodyMesh as any).material;
    expect(material.color.getHexString()).toBe('4a90e2');

    await renderer.unmount();
  });

  it('renders health bar scaled to health percentage', async () => {
    const robot = createTestRobot({ id: 'robot-damaged', health: 45, maxHealth: 100 });
    const { Robot } = await import('../../../src/components/Robot');

    const renderer = await create(<Robot robot={robot} />);
    const robotInstance = renderer.scene.children[0];
    const testInstance = robotInstance as any;
    const groupObject = testInstance.object ?? testInstance._fiber?.object;
    const healthBarGroup = groupObject?.getObjectByName?.('health-bar');
    const healthFill = healthBarGroup?.getObjectByName?.('health-bar-fill');

    expect(healthFill).toBeDefined();
    // 45 health out of 100 = 0.45 scale factor
    expect(healthFill.scale.x).toBeCloseTo(0.45, 2);

    await renderer.unmount();
  });

  it('shows captain indicator when robot is captain', async () => {
    const robot = createTestRobot({ id: 'captain', isCaptain: true });
    const { Robot } = await import('../../../src/components/Robot');

    const renderer = await create(<Robot robot={robot} />);
    const robotInstance = renderer.scene.children[0];
    const testInstance = robotInstance as any;
    const groupObject = testInstance.object ?? testInstance._fiber?.object;
    const captainIndicator = groupObject?.getObjectByName?.('captain-indicator');

    expect(captainIndicator).toBeDefined();

    await renderer.unmount();
  });
});
