import { beforeEach, describe, expect, it } from 'vitest';
import type { SimulationStatus, Team, Vector3 } from '../../src/types';

type RobotId = string;

declare interface Robot {
  id: RobotId;
  team: Team;
  position: Vector3;
  health: number;
}

declare interface SimulationWorld {
  entities: Robot[];
}

declare interface SimulationState {
  status: SimulationStatus;
  winner: Team | 'draw' | null;
  autoRestartCountdown: number | null;
  countdownPaused: boolean;
  ui: {
    statsOpen: boolean;
    settingsOpen: boolean;
  };
  pendingTeamConfig: Record<Team, unknown> | null;
  postBattleStats?: {
    perRobot: Record<string, { kills: number; damageDealt: number; damageTaken: number; timeAlive: number; shotsFired: number }>;
    perTeam: Record<Team, { totalKills: number; totalDamageDealt: number; totalDamageTaken: number; averageHealthRemaining: number; weaponDistribution: Record<'laser' | 'gun' | 'rocket', number> }>;
    computedAt: number;
  } | null;
}

declare function initializeSimulation(): SimulationWorld;
declare function stepSimulation(world: SimulationWorld, deltaTime: number): void;

declare const getSimulationState: (world: SimulationWorld) => SimulationState;
declare const pauseAutoRestart: (world: SimulationWorld) => void;
declare const resumeAutoRestart: (world: SimulationWorld) => void;
declare const resetAutoRestartCountdown: (world: SimulationWorld) => void;
declare const openStatsOverlay: (world: SimulationWorld) => void;
declare const closeStatsOverlay: (world: SimulationWorld) => void;
declare const openSettingsOverlay: (world: SimulationWorld) => void;
declare const closeSettingsOverlay: (world: SimulationWorld) => void;
declare const applyTeamComposition: (
  world: SimulationWorld,
  config: Record<Team, unknown>
) => void;

declare const eliminateRobot: (world: SimulationWorld, robotId: RobotId) => void;

describe('Integration Test: Victory Flow (FR-006)', () => {
  let world: SimulationWorld;

  const stepForSeconds = (seconds: number, dt = 0.1) => {
    const iterations = Math.ceil(seconds / dt);
    for (let i = 0; i < iterations; i += 1) {
      stepSimulation(world, dt);
    }
  };

  const eliminateTeam = (team: Team) => {
    world.entities
      .filter((robot) => robot.team === team)
      .forEach((robot) => eliminateRobot(world, robot.id));
  };

  beforeEach(() => {
    world = initializeSimulation();
  });

  it('detects elimination and starts a 5-second countdown', () => {
    eliminateTeam('blue');
    stepForSeconds(0.2);

    const state = getSimulationState(world);
    expect(state.status).toBe<'victory'>('victory');
    expect(state.winner).toBe('red');
    expect(state.autoRestartCountdown).toBeGreaterThan(0);
    expect(state.autoRestartCountdown).toBeLessThanOrEqual(5);
  });

  it('allows pausing, resuming, and resetting the countdown', () => {
    eliminateTeam('blue');
    stepForSeconds(0.2);

    const initialState = getSimulationState(world);
    expect(initialState.autoRestartCountdown).toBeTruthy();

    pauseAutoRestart(world);
    const pausedValue = getSimulationState(world).autoRestartCountdown;
    stepForSeconds(1);
    expect(getSimulationState(world).autoRestartCountdown).toBeCloseTo(pausedValue!, 2);

    resumeAutoRestart(world);
    stepForSeconds(1);
    const resumedValue = getSimulationState(world).autoRestartCountdown!;
    expect(resumedValue).toBeLessThan(pausedValue!);

    resetAutoRestartCountdown(world);
    const resetValue = getSimulationState(world).autoRestartCountdown;
    expect(resetValue).toBeCloseTo(5, 2);
  });

  it('opens stats/settings overlays and tracks pending team changes', () => {
    eliminateTeam('blue');
    stepForSeconds(0.2);

    openStatsOverlay(world);
    expect(getSimulationState(world).ui.statsOpen).toBe(true);
    const postStats = getSimulationState(world).postBattleStats;
    expect(postStats).toBeDefined();
    expect(Object.keys(postStats!.perTeam).length).toBe(2);
    expect(Object.keys(postStats!.perRobot).length).toBeGreaterThan(0);
    closeStatsOverlay(world);
    expect(getSimulationState(world).ui.statsOpen).toBe(false);

    openSettingsOverlay(world);
    expect(getSimulationState(world).ui.settingsOpen).toBe(true);

    const newConfig = {
      red: { weaponWeights: { laser: 0.5, gun: 0.3, rocket: 0.2 } },
      blue: { weaponWeights: { laser: 0.2, gun: 0.5, rocket: 0.3 } },
    } as Record<Team, unknown>;
    applyTeamComposition(world, newConfig);
    expect(getSimulationState(world).pendingTeamConfig).toEqual(newConfig);

    closeSettingsOverlay(world);
    expect(getSimulationState(world).ui.settingsOpen).toBe(false);
  });

  it('auto-restarts the battle when the countdown completes', () => {
    eliminateTeam('blue');
    stepForSeconds(0.2);
    resumeAutoRestart(world);

    stepForSeconds(6);

    const state = getSimulationState(world);
    expect(state.status).toBe<'running'>('running');
    expect(state.winner).toBeNull();
    expect(world.entities.filter((robot) => robot.team === 'red').length).toBe(10);
    expect(world.entities.filter((robot) => robot.team === 'blue').length).toBe(10);
  });
});
