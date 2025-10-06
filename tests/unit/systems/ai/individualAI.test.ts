import { beforeEach, describe, expect, it } from 'vitest';

import type { Robot } from '../../../../src/ecs/entities/Robot';
import { calculateDistance } from '../../../../src/ecs/world';
import { createTestWorld, type TestWorld } from './testUtils';
import { applyIndividualMovement, evaluateIndividualBehaviors } from '../../../../src/ecs/systems/ai/individualAI';

function getRobots(world: TestWorld, team: 'red' | 'blue'): Robot[] {
  return world.entities.filter((robot) => robot.team === team);
}

describe('individualAI system', () => {
  let world: TestWorld;
  let redLaser: Robot;
  let blueGun: Robot;
  let blueRocket: Robot;

  beforeEach(() => {
    world = createTestWorld();
    const redRobots = getRobots(world, 'red');
    const blueRobots = getRobots(world, 'blue');

    redLaser = redRobots.find((robot) => robot.weaponType === 'laser')!;
    blueGun = blueRobots.find((robot) => robot.weaponType === 'gun')!;
    blueRocket = blueRobots.find((robot) => robot.weaponType === 'rocket')!;

    redLaser.position = { x: -5, y: 0, z: 0 };
    blueRocket.position = { x: 5, y: 0, z: 0 };
    blueGun.position = { x: 12, y: 0, z: 0 };
  });

  it('prioritizes weapon advantage when selecting targets', () => {
    evaluateIndividualBehaviors(world);

    expect(redLaser.aiState.targetId).toBe(blueGun.id);
    expect(redLaser.aiState.targetId).not.toBe(blueRocket.id);
  });

  it('assigns cover and retreat states based on health thresholds', () => {
    redLaser.health = 40;
    evaluateIndividualBehaviors(world);
    expect(redLaser.aiState.behaviorMode).toBe('defensive');
    expect(redLaser.aiState.coverPosition).toBeTruthy();

    redLaser.health = 15;
    evaluateIndividualBehaviors(world);
    expect(redLaser.aiState.behaviorMode).toBe('retreating');
  });

  it('moves toward targets, cover, or retreat points accordingly', () => {
    evaluateIndividualBehaviors(world);
    const initialDistanceToGun = calculateDistance(redLaser.position, blueGun.position);
    applyIndividualMovement(world, 1);
    const afterMovement = calculateDistance(redLaser.position, blueGun.position);
    expect(afterMovement).toBeLessThan(initialDistanceToGun);

    redLaser.health = 35;
    evaluateIndividualBehaviors(world);
    const cover = redLaser.aiState.coverPosition!;
    const distanceToCover = calculateDistance(redLaser.position, cover);
    applyIndividualMovement(world, 1);
    const afterCoverMove = calculateDistance(redLaser.position, cover);
    expect(afterCoverMove).toBeLessThan(distanceToCover);

    redLaser.health = 10;
    evaluateIndividualBehaviors(world);
    const retreatPoint = world.teams.red.spawnZone.center;
    const distanceToRetreat = calculateDistance(redLaser.position, retreatPoint);
    applyIndividualMovement(world, 1);
    const afterRetreat = calculateDistance(redLaser.position, retreatPoint);
    expect(afterRetreat).toBeLessThan(distanceToRetreat);
  });
});
