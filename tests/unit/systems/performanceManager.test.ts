import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getArenaConfig, initializeSimulation } from '../../../src/ecs/world';
import { usePerformanceManager } from '../../../src/systems/performanceManager';

describe('usePerformanceManager', () => {
  it('records frame metrics and enables quality scaling when needed', () => {
    const world = initializeSimulation();

    const { result } = renderHook(() =>
      usePerformanceManager({
        world,
        useFrameHook: () => undefined,
      }),
    );

    expect(result.current.stats.currentFPS).toBeGreaterThanOrEqual(60);
    expect(result.current.overlay.visible).toBe(false);

    act(() => {
      result.current.recordSample(25);
    });

    expect(result.current.stats.qualityScalingActive).toBe(true);
    expect(result.current.overlay.visible).toBe(true);
    expect(getArenaConfig(world).lightingConfig.shadowsEnabled).toBe(false);
    expect(world.simulation.timeScale).toBeLessThan(1);

    act(() => {
      result.current.recordSample(15);
    });

    expect(result.current.stats.currentFPS).toBeLessThan(60);
    expect(result.current.overlay.visible).toBe(true);
  });

  it('allows disabling auto scaling while keeping stats updated', () => {
    const world = initializeSimulation();

    const { result } = renderHook(() =>
      usePerformanceManager({
        world,
        useFrameHook: () => undefined,
      }),
    );

    act(() => {
      result.current.setAutoScaling(false);
      result.current.recordSample(20);
    });

    expect(result.current.overlay.autoScalingEnabled).toBe(false);
    expect(result.current.stats.qualityScalingActive).toBe(false);
    expect(getArenaConfig(world).lightingConfig.shadowsEnabled).toBe(true);
    expect(world.simulation.timeScale).toBeCloseTo(1, 2);
  });
});
