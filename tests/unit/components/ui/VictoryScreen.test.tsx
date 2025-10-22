import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimulationState } from '../../../../src/ecs/entities/SimulationState';

function createSimulationState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: overrides.status ?? 'victory',
    winner: overrides.winner ?? 'red',
    frameTime: overrides.frameTime ?? 0,
    totalFrames: overrides.totalFrames ?? 0,
    simulationTime: overrides.simulationTime ?? 0,
    timeScale: overrides.timeScale ?? 1,
    victoryScreenStartTime: overrides.victoryScreenStartTime ?? 0,
    autoRestartCountdown: overrides.autoRestartCountdown ?? 3.2,
    countdownPaused: overrides.countdownPaused ?? false,
    performanceStats:
      overrides.performanceStats ??
      {
        currentFPS: 60,
        averageFPS: 58,
        qualityScalingActive: false,
      },
    pendingTeamConfig: overrides.pendingTeamConfig ?? null,
    ui:
      overrides.ui ??
      {
        statsOpen: false,
        settingsOpen: false,
      },
  };
}

describe('VictoryScreen', () => {
  beforeEach(async () => {
    const { useUIStore } = await import('../../../../src/store/uiStore');
    const reset = useUIStore.getState().reset;
    reset();
  });

  it('displays the winning team and countdown timer', async () => {
    const simulation = createSimulationState({ winner: 'blue', autoRestartCountdown: 4.6 });
    const { VictoryScreen } = await import('../../../../src/components/ui/VictoryScreen');

    render(<VictoryScreen simulation={simulation} />);

    expect(screen.getByText(/Blue Team Wins/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-restart in 5s/i)).toBeInTheDocument();
  });

  it('allows pausing the countdown', async () => {
    const simulation = createSimulationState({ countdownPaused: false });
    const onTogglePause = vi.fn();
    const { VictoryScreen } = await import('../../../../src/components/ui/VictoryScreen');

    render(<VictoryScreen simulation={simulation} onTogglePause={onTogglePause} />);

    fireEvent.click(screen.getByRole('button', { name: /Pause/i }));
    expect(onTogglePause).toHaveBeenCalledWith(true);
  });

  it('opens stats via zustand store when stats button clicked', async () => {
    const simulation = createSimulationState();
    const { VictoryScreen } = await import('../../../../src/components/ui/VictoryScreen');
    const { useUIStore } = await import('../../../../src/store/uiStore');

    render(<VictoryScreen simulation={simulation} />);

    fireEvent.click(screen.getByRole('button', { name: /Stats/i }));
    expect(useUIStore.getState().statsOpen).toBe(true);
  });

  it('opens settings via zustand store when settings button clicked', async () => {
    const simulation = createSimulationState();
    const { VictoryScreen } = await import('../../../../src/components/ui/VictoryScreen');
    const { useUIStore } = await import('../../../../src/store/uiStore');

    render(<VictoryScreen simulation={simulation} />);

    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    expect(useUIStore.getState().settingsOpen).toBe(true);
  });

  it('renders a concise post-battle summary when a snapshot is present', async () => {
    const simulation = createSimulationState();
    simulation.postBattleStats = {
      perRobot: {
        'robot-1': { kills: 2, damageDealt: 40, damageTaken: 12, timeAlive: 10, shotsFired: 4 },
      },
      perTeam: {
        red: {
          totalKills: 2,
          totalDamageDealt: 40,
          totalDamageTaken: 12,
          averageHealthRemaining: 50,
          weaponDistribution: { laser: 1, gun: 0, rocket: 0 },
        },
        blue: {
          totalKills: 0,
          totalDamageDealt: 0,
          totalDamageTaken: 40,
          averageHealthRemaining: 0,
          weaponDistribution: { laser: 0, gun: 0, rocket: 0 },
        },
      },
      computedAt: 123,
    };

    const { VictoryScreen } = await import('../../../../src/components/ui/VictoryScreen');
    render(<VictoryScreen simulation={simulation} />);

    expect(screen.getByText(/Post-battle Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Team red: 2 kills/i)).toBeInTheDocument();
    expect(screen.getByText(/Top performer: robot-1/i)).toBeInTheDocument();
  });
});
