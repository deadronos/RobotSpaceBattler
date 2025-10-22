import { beforeEach, describe, expect, it } from 'vitest';
import type { Team, Vector3, WeaponType } from '../../src/types';

type RobotId = string;

declare interface Robot {
  id: RobotId;
  team: Team;
  position: Vector3;
  health: number;
  maxHealth: number;
  weaponType: WeaponType;
}

declare interface SimulationWorld {
  entities: Robot[];
}

declare interface PhysicsBodySnapshot {
  position: Vector3;
  velocity: Vector3;
}

declare interface PhysicsSnapshot {
  robots: Record<RobotId, PhysicsBodySnapshot>;
  projectiles: Record<string, PhysicsBodySnapshot>;
}

declare function initializeSimulation(): SimulationWorld;
declare function stepSimulation(world: SimulationWorld, deltaTime: number): void;

declare const getPhysicsSnapshot: (world: SimulationWorld) => PhysicsSnapshot;
declare const setPhysicsBodyPosition: (
  world: SimulationWorld,
  robotId: RobotId,
  position: Vector3
) => void;
declare const applyPhysicsImpulse: (
  world: SimulationWorld,
  robotId: RobotId,
  impulse: Vector3
) => void;
declare const spawnPhysicsProjectile: (
  world: SimulationWorld,
  config: {
    id?: string;
    ownerId: RobotId;
    weaponType: WeaponType;
    position: Vector3;
    velocity: Vector3;
    damage?: number;
  }
) => string;

declare const getRobotById: (world: SimulationWorld, robotId: RobotId) => Robot | undefined;

const STEP = 1 / 60;

const stepFrames = (world: SimulationWorld, frames: number) => {
  for (let i = 0; i < frames; i += 1) {
    stepSimulation(world, STEP);
  }
};

describe('Integration Test: Physics Sync (FR-012)', () => {
  let world: SimulationWorld;

  beforeEach(() => {
    world = initializeSimulation();
  });

  it('keeps ECS robot transforms in sync with physics bodies', () => {
    const robot = world.entities.find((entity) => entity.team === 'red')!;
    const newPosition: Vector3 = { x: 5, y: 0, z: -2 };

    setPhysicsBodyPosition(world, robot.id, newPosition);
    stepFrames(world, 1);

    const updatedRobot = getRobotById(world, robot.id)!;
    expect(updatedRobot.position.x).toBeCloseTo(newPosition.x, 0);
    expect(updatedRobot.position.y).toBeCloseTo(newPosition.y, 0);
    expect(updatedRobot.position.z).toBeCloseTo(newPosition.z, 0);

    const physics = getPhysicsSnapshot(world);
    const robotSnapshot = physics.robots[robot.id];
    expect(robotSnapshot).toBeDefined();
    expect(robotSnapshot!.position.x).toBeCloseTo(newPosition.x, 0);
    expect(robotSnapshot!.position.y).toBeCloseTo(newPosition.y, 0);
    expect(robotSnapshot!.position.z).toBeCloseTo(newPosition.z, 0);
  });

  it('applies impulses and advances projectiles using physics integration', () => {
    const robot = world.entities.find((entity) => entity.team === 'red')!;
    const initialX = robot.position.x;
    applyPhysicsImpulse(world, robot.id, { x: 10, y: 0, z: 0 });
    stepFrames(world, 10);

    const movedRobot = getRobotById(world, robot.id)!;
    expect(movedRobot.position.x).toBeGreaterThan(initialX);

    const projectileId = spawnPhysicsProjectile(world, {
      ownerId: robot.id,
      weaponType: robot.weaponType,
      position: { ...movedRobot.position },
      velocity: { x: 20, y: 0, z: 0 },
    });

    stepFrames(world, 5);

    const physics = getPhysicsSnapshot(world);
    const projectileSnapshot = physics.projectiles[projectileId];
    expect(projectileSnapshot).toBeDefined();
    expect(projectileSnapshot!.position.x).toBeGreaterThan(movedRobot.position.x);
  });

  it('resolves collisions, applies damage, and removes eliminated robots from physics', () => {
    const red = world.entities.find((entity) => entity.team === 'red')!;
    const blue = world.entities.find((entity) => entity.team === 'blue')!;

    setPhysicsBodyPosition(world, red.id, { x: -2, y: 0, z: 0 });
    setPhysicsBodyPosition(world, blue.id, { x: 0, y: 0, z: 0 });
    stepFrames(world, 1);

    const projectileId = spawnPhysicsProjectile(world, {
      ownerId: red.id,
      weaponType: red.weaponType,
      position: { x: -1.5, y: 0, z: 0 },
      velocity: { x: 30, y: 0, z: 0 },
      damage: blue.maxHealth,
    });

    stepFrames(world, 30);

    const postCollisionBlue = getRobotById(world, blue.id);
    expect(postCollisionBlue).toBeUndefined();

    const physics = getPhysicsSnapshot(world);
    expect(physics.projectiles[projectileId]).toBeUndefined();
    expect(physics.robots[blue.id]).toBeUndefined();
  });
});
