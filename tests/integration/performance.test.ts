import { beforeEach, describe, expect, it } from 'vitest';
import type { Team, Vector3 } from '../../src/types';

type RobotId = string;

declare interface Robot {
  id: RobotId;
  team: Team;
  position: Vector3;
}

declare interface LightingConfig {
  shadowsEnabled: boolean;
}

declare interface ArenaConfig {
  lightingConfig: LightingConfig;
}

declare interface PerformanceOverlayState {
  visible: boolean;
  autoScalingEnabled: boolean;
}

declare interface SimulationState {
  performanceStats: {
    currentFPS: number;
    averageFPS: number;
    qualityScalingActive: boolean;
  };
  timeScale: number;
}

declare interface SimulationWorld {
  entities: Robot[];
}

declare function initializeSimulation(): SimulationWorld;
declare function stepSimulation(world: SimulationWorld, deltaTime: number): void;

declare const getSimulationState: (world: SimulationWorld) => SimulationState;
declare const getArenaConfig: (world: SimulationWorld) => ArenaConfig;
declare const recordFrameMetrics: (world: SimulationWorld, fps: number) => void;
declare const setAutoScalingEnabled: (world: SimulationWorld, enabled: boolean) => void;
declare const getPerformanceOverlayState: (world: SimulationWorld) => PerformanceOverlayState;

const stepSeconds = (world: SimulationWorld, seconds: number, dt = 1 / 60) => {
  const iterations = Math.ceil(seconds / dt);
  for (let i = 0; i < iterations; i += 1) {
    stepSimulation(world, dt);
  }
};

describe('Integration Test: Performance Management (FR-010, FR-021-023)', () => {
  let world: SimulationWorld;

  beforeEach(() => {
    world = initializeSimulation();
  });

  it('maintains 60fps baseline before scaling engages', () => {
    const state = getSimulationState(world);
    expect(state.performanceStats.currentFPS).toBeGreaterThanOrEqual(60);
    expect(state.performanceStats.averageFPS).toBeGreaterThanOrEqual(60);
    expect(state.performanceStats.qualityScalingActive).toBe(false);
  });

  it('activates quality scaling and disables shadows below 30fps', () => {
    recordFrameMetrics(world, 25);
    stepSeconds(world, 1);

    const state = getSimulationState(world);
    expect(state.performanceStats.qualityScalingActive).toBe(true);
    expect(getPerformanceOverlayState(world).visible).toBe(true);
    expect(getArenaConfig(world).lightingConfig.shadowsEnabled).toBe(false);
  });

  it('reduces time scale when FPS is critically low and allows recovery', () => {
    recordFrameMetrics(world, 10);
    stepSeconds(world, 1);

    let state = getSimulationState(world);
    expect(state.timeScale).toBeLessThan(1);
    expect(getPerformanceOverlayState(world).visible).toBe(true);

    recordFrameMetrics(world, 60);
    stepSeconds(world, 1);

    state = getSimulationState(world);
    expect(state.timeScale).toBeCloseTo(1, 2);
    expect(state.performanceStats.qualityScalingActive).toBe(false);
    expect(getPerformanceOverlayState(world).visible).toBe(false);
    expect(getArenaConfig(world).lightingConfig.shadowsEnabled).toBe(true);
  });

  it('allows disabling auto-scaling through the overlay controls', () => {
    setAutoScalingEnabled(world, false);
    recordFrameMetrics(world, 20);
    stepSeconds(world, 1);

    const state = getSimulationState(world);
    const overlay = getPerformanceOverlayState(world);
    expect(overlay.autoScalingEnabled).toBe(false);
    expect(state.performanceStats.qualityScalingActive).toBe(false);
    expect(getArenaConfig(world).lightingConfig.shadowsEnabled).toBe(true);
  });
});
