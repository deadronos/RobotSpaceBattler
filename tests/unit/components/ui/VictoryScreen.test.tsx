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
});
