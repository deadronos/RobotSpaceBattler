import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createProjectile } from '../../../src/ecs/entities/Projectile';
import { initializeSimulation, setPhysicsBodyPosition, getPhysicsSnapshot } from '../../../src/ecs/world';
import type { SimulationWorld } from '../../../src/ecs/world';
import type { Vector3 } from '../../../src/types';
import { usePhysicsSync } from '../../../src/systems/physicsSync';

type FrameCallback = (delta: number) => void;

describe('usePhysicsSync', () => {
  const createFrameStub = () => {
    const callbacks: FrameCallback[] = [];
    const useFrameHook = (cb: (state: unknown, delta: number) => void) => {
      callbacks.push((delta) => cb({}, delta));
    };
    return { callbacks, useFrameHook } as const;
  };

  it('advances the simulation using a fixed timestep', () => {
    const world = initializeSimulation();
    const { callbacks, useFrameHook } = createFrameStub();

    const { result } = renderHook(() =>
      usePhysicsSync({
        world,
        fixedDelta: 1 / 60,
        maxSubSteps: 5,
        useFrameHook,
      }),
    );

    expect(callbacks).toHaveLength(1);
    expect(world.simulation.totalFrames).toBe(0);

    act(() => {
      result.current.step(1 / 30);
    });

    expect(world.simulation.totalFrames).toBeGreaterThanOrEqual(2);

    act(() => {
      callbacks[0](1 / 30);
    });

    expect(world.simulation.totalFrames).toBeGreaterThanOrEqual(4);
  });

  it('syncs projectile collisions and cleans up removed entities', () => {
    const world: SimulationWorld = initializeSimulation();
    const { result } = renderHook(() =>
      usePhysicsSync({
        world,
        fixedDelta: 1 / 120,
        maxSubSteps: 10,
        useFrameHook: (cb) => {
          // no-op stub for registering frames
          cb({}, 0);
        },
      }),
    );

    const red = world.entities.find((robot) => robot.team === 'red')!;
    const blue = world.entities.find((robot) => robot.team === 'blue')!;

    const redTarget: Vector3 = { x: -2, y: 0, z: 0 };
    const blueTarget: Vector3 = { x: 0, y: 0, z: 0 };

    act(() => {
      setPhysicsBodyPosition(world, red.id, redTarget);
      setPhysicsBodyPosition(world, blue.id, blueTarget);
    });

    const projectile = createProjectile({
      id: 'test-projectile',
      ownerId: red.id,
      weaponType: red.weaponType,
      position: { ...redTarget },
      velocity: { x: 25, y: 0, z: 0 },
      damage: blue.maxHealth,
      distanceTraveled: 0,
      maxDistance: 20,
      spawnTime: world.simulation.simulationTime,
      maxLifetime: 2,
    });

    world.projectiles.push(projectile);

    act(() => {
      for (let i = 0; i < 240; i += 1) {
        result.current.step(1 / 240);
      }
    });

    const snapshot = getPhysicsSnapshot(world);
    expect(world.entities.find((robot) => robot.id === blue.id)).toBeUndefined();
    expect(snapshot.robots[blue.id]).toBeUndefined();
    expect(world.projectiles.find((item) => item.id === projectile.id)).toBeUndefined();
    expect(snapshot.projectiles[projectile.id]).toBeUndefined();
  });
});
