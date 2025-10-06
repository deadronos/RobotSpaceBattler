import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Robot } from '../../../src/ecs/entities/Robot';

function createRobot(id: string, overrides: Partial<Robot> = {}): Robot {
  return {
    id,
    team: overrides.team ?? 'red',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    velocity: overrides.velocity ?? { x: 0, y: 0, z: 0 },
    health: overrides.health ?? 100,
    maxHealth: overrides.maxHealth ?? 100,
    weaponType: overrides.weaponType ?? 'laser',
    isCaptain: overrides.isCaptain ?? false,
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
  };
}

describe('useCinematicMode', () => {
  it('focuses on robots with the highest combat intensity', async () => {
    const robots: Robot[] = [
      createRobot('idle-1', { position: { x: -10, y: 0, z: -10 } }),
      createRobot('hotspot-1', {
        position: { x: 20, y: 0, z: 10 },
        health: 30,
        stats: { kills: 2, damageDealt: 200, damageTaken: 50, timeAlive: 40, shotsFired: 25 },
      }),
      createRobot('idle-2', { position: { x: -15, y: 0, z: 5 }, health: 90 }),
    ];

    const { useCinematicMode } = await import('../../../src/hooks/useCinematicMode');
    const { result } = renderHook(() => useCinematicMode({ robots, initiallyActive: true, followStrength: 1 }));

    act(() => {
      result.current.update(0.016);
    });

    expect(result.current.focus.x).toBeCloseTo(20, 1);
    expect(result.current.focus.z).toBeCloseTo(10, 1);
  });

  it('averages the top hotspots to compute focus', async () => {
    const robots: Robot[] = [
      createRobot('hotspot-a', {
        position: { x: 20, y: 0, z: 20 },
        health: 40,
        stats: { kills: 1, damageDealt: 150, damageTaken: 100, timeAlive: 60, shotsFired: 40 },
      }),
      createRobot('hotspot-b', {
        position: { x: 0, y: 0, z: -10 },
        health: 50,
        stats: { kills: 3, damageDealt: 220, damageTaken: 80, timeAlive: 55, shotsFired: 60 },
      }),
      createRobot('support', { position: { x: -40, y: 0, z: 0 }, health: 100 }),
    ];

    const { useCinematicMode } = await import('../../../src/hooks/useCinematicMode');
    const { result } = renderHook(() => useCinematicMode({ robots, initiallyActive: true, followStrength: 1 }));

    act(() => {
      result.current.update(0.016);
    });

    expect(result.current.focus.x).toBeCloseTo((20 + 0) / 2, 1);
    expect(result.current.focus.z).toBeCloseTo((20 - 10) / 2, 1);
  });

  it('toggles active state when pressing the C key', async () => {
    const robots: Robot[] = [createRobot('one')];

    const { useCinematicMode } = await import('../../../src/hooks/useCinematicMode');
    const { result } = renderHook(() => useCinematicMode({ robots, initiallyActive: false, followStrength: 1 }));

    act(() => {
      result.current.handleKeyDown({ code: 'KeyC' } as KeyboardEvent);
    });

    expect(result.current.isActive).toBe(true);
  });
});
