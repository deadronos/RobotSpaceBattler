import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/hooks/useBattleHudData', () => ({
  __esModule: true,
  default: vi.fn(),
}));

import type { Mock } from 'vitest';

import type { BattleHudData } from '../../../../src/hooks/useBattleHudData';
import useBattleHudData from '../../../../src/hooks/useBattleHudData';
import { useUiStore } from '../../../../src/store/uiStore';

const mockedUseBattleHudData = useBattleHudData as unknown as Mock<() => BattleHudData>;

function createHudData(): BattleHudData {
  return {
    status: {
      status: 'running',
      label: 'Battle in progress',
      winner: null,
      countdownSeconds: null,
      countdownLabel: null,
      countdownPaused: false,
      elapsedSeconds: 30,
    },
    teams: [
      {
        teamId: 'red',
        label: 'Red Team',
        alive: 5,
        eliminated: 2,
        weaponDistribution: { laser: 3, gun: 2, rocket: 0 },
        captain: { id: 'red-1', name: 'R-1', alive: true },
      },
    ],
    controls: {
      isHudVisible: true,
      toggleHud: vi.fn(),
      openStats: vi.fn(),
      openSettings: vi.fn(),
    },
    performance: {
      fps: 60,
      averageFps: 59,
      qualityScalingActive: false,
      overlayVisible: true,
      autoScalingEnabled: true,
    },
  };
}

describe('HudRoot', () => {
beforeEach(() => {
  vi.clearAllMocks();
  useUiStore.getState().reset();
  mockedUseBattleHudData.mockReset();
});

  it('shows a toggle affordance when HUD is hidden', async () => {
    const hudData = createHudData();
    const toggleHud = vi.fn();
    hudData.controls.isHudVisible = false;
    hudData.controls.toggleHud = toggleHud;
    mockedUseBattleHudData.mockReturnValue(hudData);

    const { HudRoot } = await import(
      '../../../../src/components/hud/HudRoot'
    );

    render(<HudRoot />);

    fireEvent.click(screen.getByRole('button', { name: /Show HUD/i }));
    expect(toggleHud).toHaveBeenCalledTimes(1);
  });

  it('renders status, timer, and team panels when visible', async () => {
    const hudData = createHudData();
    mockedUseBattleHudData.mockReturnValue(hudData);

    const { HudRoot } = await import(
      '../../../../src/components/hud/HudRoot'
    );

    render(<HudRoot />);

    expect(screen.getByText(/Battle in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Elapsed:/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Red Team/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide HUD/i })).toBeInTheDocument();
  });
});
