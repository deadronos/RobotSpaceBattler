import { vi } from 'vitest';

const reactMock = vi.hoisted(() => ({
  useSyncExternalStore: (
    _subscribe: () => () => void,
    getSnapshot: () => unknown,
    getServerSnapshot?: () => unknown,
  ) => {
    const snapshot = getSnapshot();
    return snapshot ?? getServerSnapshot?.();
  },
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useSyncExternalStore: reactMock.useSyncExternalStore,
  };
});

import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { Robot } from '../../../src/ecs/entities/Robot';
import type { TeamStats } from '../../../src/ecs/entities/Team';
import { initializeSimulation, SimulationWorldProvider } from '../../../src/ecs/world';
import { usePostBattleStats } from '../../../src/hooks/usePostBattleStats';

function createRobot(overrides: Partial<Robot>): Robot {
  return {
    id: overrides.id ?? 'robot-1',
    team: overrides.team ?? 'red',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    velocity: overrides.velocity ?? { x: 0, y: 0, z: 0 },
    health: overrides.health ?? 100,
    maxHealth: overrides.maxHealth ?? 100,
    weaponType: overrides.weaponType ?? 'laser',
    isCaptain: overrides.isCaptain ?? false,
    aiState:
      overrides.aiState ?? {
        behaviorMode: 'aggressive',
        targetId: null,
        coverPosition: null,
        lastFireTime: 0,
        formationOffset: { x: 0, y: 0, z: 0 },
      },
    stats:
      overrides.stats ?? {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        timeAlive: 0,
        shotsFired: 0,
      },
  };
}

function createWrapper(world: ReturnType<typeof initializeSimulation>) {
  return ({ children }: { children: ReactNode }) => (
    <SimulationWorldProvider value={world}>{children}</SimulationWorldProvider>
  );
}

describe('usePostBattleStats', () => {
  it('returns an empty dataset when no post-battle snapshot is present', () => {
    const world = initializeSimulation();

    const { result } = renderHook(() => usePostBattleStats(), {
      wrapper: createWrapper(world),
    });

    expect(result.current.hasStats).toBe(false);
    expect(result.current.teamSummaries).toHaveLength(0);
    expect(result.current.robotStats).toHaveLength(0);
  });

  it('aggregates post-battle stats with robot metadata and totals', () => {
    const world = initializeSimulation();
    world.simulation.status = 'victory';
    world.simulation.winner = 'red';
    world.simulation.postBattleStats = {
      perRobot: {
        'red-1': { kills: 3, damageDealt: 120, damageTaken: 60, timeAlive: 90, shotsFired: 30 },
        'blue-1': { kills: 1, damageDealt: 40, damageTaken: 120, timeAlive: 45, shotsFired: 12 },
      },
      perTeam: {
        red: {
          totalKills: 3,
          totalDamageDealt: 120,
          totalDamageTaken: 70,
          averageHealthRemaining: 45,
          weaponDistribution: { laser: 1, gun: 0, rocket: 0 },
        } satisfies TeamStats,
        blue: {
          totalKills: 1,
          totalDamageDealt: 40,
          totalDamageTaken: 120,
          averageHealthRemaining: 20,
          weaponDistribution: { laser: 0, gun: 1, rocket: 0 },
        } satisfies TeamStats,
      },
      computedAt: 321,
    };

    world.ecs.robots.clear();
    world.ecs.robots.add(
      createRobot({
        id: 'red-1',
        team: 'red',
        weaponType: 'laser',
        isCaptain: true,
        stats: { kills: 3, damageDealt: 120, damageTaken: 60, timeAlive: 90, shotsFired: 30 },
      }),
    );
    world.ecs.robots.add(
      createRobot({
        id: 'blue-1',
        team: 'blue',
        weaponType: 'gun',
        stats: { kills: 1, damageDealt: 40, damageTaken: 120, timeAlive: 45, shotsFired: 12 },
      }),
    );

    const { result } = renderHook(() => usePostBattleStats(), {
      wrapper: createWrapper(world),
    });

    expect(result.current.hasStats).toBe(true);
    expect(result.current.winner).toBe('red');
    expect(result.current.teamSummaries).toHaveLength(2);
    const redSummary = result.current.teamSummaries.find((team) => team.teamId === 'red');
    expect(redSummary?.totalKills).toBe(3);
    expect(result.current.robotStats[0].id).toBe('red-1');
    expect(result.current.robotStats[0].timeAliveLabel).toBe('1m 30s');
    expect(result.current.totals.kills).toBe(4);
  });
});
