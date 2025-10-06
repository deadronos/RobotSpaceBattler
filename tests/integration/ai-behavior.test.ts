import { beforeEach, describe, expect, it } from 'vitest';
import type { AIBehaviorMode, Team, Vector3, WeaponType } from '../../src/types';

type RobotId = string;

declare interface Robot {
  id: RobotId;
  team: Team;
  position: Vector3;
  health: number;
  maxHealth: number;
  weaponType: WeaponType;
  isCaptain: boolean;
  aiState: {
    behaviorMode: AIBehaviorMode;
    targetId: RobotId | null;
    coverPosition: Vector3 | null;
    formationOffset: Vector3;
  };
  stats: {
    shotsFired: number;
  };
}

declare interface SimulationWorld {
  entities: Robot[];
}

declare interface Projectile {
  id: string;
  ownerId: RobotId;
  weaponType: WeaponType;
  position: Vector3;
}

declare function initializeSimulation(): SimulationWorld;
declare function stepSimulation(world: SimulationWorld, deltaTime: number): void;
declare function getProjectiles(world: SimulationWorld): Projectile[];
declare function inflictDamage(world: SimulationWorld, robotId: RobotId, amount: number): void;
declare function eliminateRobot(world: SimulationWorld, robotId: RobotId): void;

describe('Integration Test: AI Behavior (FR-002)', () => {
  let world: SimulationWorld;

  const stepForSeconds = (seconds: number, dt = 0.1) => {
    const iterations = Math.ceil(seconds / dt);
    for (let i = 0; i < iterations; i += 1) {
      stepSimulation(world, dt);
    }
  };

  const getRobotsByTeam = (team: Team) => world.entities.filter((robot) => robot.team === team);

  beforeEach(() => {
    world = initializeSimulation();
  });

  it('assigns targets and advances toward enemies', () => {
    const initialPositions = new Map<RobotId, Vector3>(
      world.entities.map((robot) => [robot.id, { ...robot.position }])
    );

    stepForSeconds(2);

    const redRobots = getRobotsByTeam('red');
    const blueRobots = getRobotsByTeam('blue');

    expect(redRobots.length).toBeGreaterThan(0);
    expect(blueRobots.length).toBeGreaterThan(0);

    redRobots.forEach((robot) => {
      expect(robot.aiState.targetId).toBeTruthy();
      expect(robot.aiState.targetId).not.toBe(robot.id);
      expect(robot.position.x).toBeGreaterThan(initialPositions.get(robot.id)!.x);
    });

    blueRobots.forEach((robot) => {
      expect(robot.aiState.targetId).toBeTruthy();
      expect(robot.aiState.targetId).not.toBe(robot.id);
      expect(robot.position.x).toBeLessThan(initialPositions.get(robot.id)!.x);
    });
  });

  it('fires weapons when in range', () => {
    stepForSeconds(10);

    const projectiles = getProjectiles(world);
    const robotsThatFired = world.entities.filter((robot) => robot.stats.shotsFired > 0);

    expect(projectiles.length).toBeGreaterThan(0);
    expect(robotsThatFired.length).toBeGreaterThan(0);
  });

  it('seeks cover and retreats based on damage state', () => {
    const redRobot = getRobotsByTeam('red')[0];

    inflictDamage(world, redRobot.id, redRobot.maxHealth - 25);
    stepForSeconds(1);

    expect(redRobot.aiState.behaviorMode).toBe('defensive');
    expect(redRobot.aiState.coverPosition).toBeTruthy();

    const defensivePosition = { ...redRobot.position };

    inflictDamage(world, redRobot.id, 20);
    stepForSeconds(1);

    expect(redRobot.aiState.behaviorMode).toBe('retreating');
    expect(redRobot.position.x).toBeLessThan(defensivePosition.x);
  });

  it('maintains formations and follows captain priorities', () => {
    stepForSeconds(3);

    const redRobots = getRobotsByTeam('red');
    const blueRobots = getRobotsByTeam('blue');

    const redCaptain = redRobots.find((robot) => robot.isCaptain);
    const blueCaptain = blueRobots.find((robot) => robot.isCaptain);

    expect(redCaptain).toBeTruthy();
    expect(blueCaptain).toBeTruthy();

    const nonCaptainsShareTarget = redRobots
      .filter((robot) => !robot.isCaptain)
      .filter((robot) => robot.aiState.targetId === redCaptain!.aiState.targetId);

    expect(nonCaptainsShareTarget.length).toBeGreaterThan(0);

    redRobots
      .filter((robot) => !robot.isCaptain)
      .forEach((robot) => {
        expect(robot.aiState.formationOffset).toBeTruthy();
        const relativeX = robot.position.x - redCaptain!.position.x;
        const relativeZ = robot.position.z - redCaptain!.position.z;
        expect(Math.abs(relativeX - robot.aiState.formationOffset.x)).toBeLessThan(5);
        expect(Math.abs(relativeZ - robot.aiState.formationOffset.z)).toBeLessThan(5);
      });
  });

  it('reassigns captaincy and adapts strategy based on team advantage', () => {
    stepForSeconds(1);

    const redRobots = getRobotsByTeam('red');
    const initialCaptain = redRobots.find((robot) => robot.isCaptain)!;

    eliminateRobot(world, initialCaptain.id);
    stepForSeconds(0.5);

    const newCaptain = getRobotsByTeam('red').find((robot) => robot.isCaptain);
    expect(newCaptain).toBeTruthy();
    expect(newCaptain!.id).not.toBe(initialCaptain.id);

    const survivors = getRobotsByTeam('red').slice(0, 3);
    survivors.forEach((robot) => {
      eliminateRobot(world, robot.id);
    });

    stepForSeconds(1);

    getRobotsByTeam('red').forEach((robot) => {
      expect(robot.aiState.behaviorMode === 'defensive' || robot.aiState.behaviorMode === 'retreating').toBe(true);
    });

    const blueRobots = getRobotsByTeam('blue').slice(0, 6);
    blueRobots.forEach((robot) => {
      eliminateRobot(world, robot.id);
    });

    stepForSeconds(1);

    getRobotsByTeam('red').forEach((robot) => {
      expect(robot.aiState.behaviorMode).toBe('aggressive');
    });
  });
});
