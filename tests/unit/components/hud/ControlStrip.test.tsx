import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ControlStrip } from '../../../../src/components/hud/ControlStrip';
import type {
  BattleHudControls,
  BattleHudPerformanceInfo,
  BattleHudStatusInfo,
} from '../../../../src/hooks/useBattleHudData';
import { useUiStore } from '../../../../src/store/uiStore';

const status: BattleHudStatusInfo = {
  status: 'running',
  label: 'Battle in progress',
  winner: null,
  countdownSeconds: null,
  countdownLabel: null,
  countdownPaused: false,
  elapsedSeconds: 12,
};

const performance: BattleHudPerformanceInfo = {
  fps: 58,
  averageFps: 55,
  qualityScalingActive: false,
  overlayVisible: true,
  autoScalingEnabled: true,
};

describe('ControlStrip', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useUiStore.getState().reset();
  });

  it('invokes pause and cinematic callbacks with toggled state', () => {
    const controls: BattleHudControls = {
      isHudVisible: true,
      toggleHud: vi.fn(),
      openStats: vi.fn(),
      openSettings: vi.fn(),
    };
    const handlePause = vi.fn();
    const handleCinematic = vi.fn();

    render(
      <ControlStrip
        status={status}
        controls={controls}
        performance={performance}
        onTogglePause={handlePause}
        onToggleCinematic={handleCinematic}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Pause Battle/i }));
    expect(handlePause).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: /Enable Cinematic/i }));
    expect(handleCinematic).toHaveBeenCalledWith(true);
    expect(
      screen.getByRole('button', { name: /Disable Cinematic/i }),
    ).toBeInTheDocument();
  });

  it('disables interactive controls while overlays are active', () => {
    const controls: BattleHudControls = {
      isHudVisible: true,
      toggleHud: vi.fn(),
      openStats: vi.fn(),
      openSettings: vi.fn(),
    };
    useUiStore.getState().setStatsOpen(true);

    render(
      <ControlStrip
        status={status}
        controls={controls}
        performance={performance}
      />,
    );

    expect(
      screen.getByRole('button', { name: /Pause Battle/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Enable Cinematic/i }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /Settings/i })).toBeDisabled();
  });

  it('toggles HUD visibility through provided controls', () => {
    const toggleHud = vi.fn();
    const controls: BattleHudControls = {
      isHudVisible: true,
      toggleHud,
      openStats: vi.fn(),
      openSettings: vi.fn(),
    };

    render(
      <ControlStrip
        status={status}
        controls={controls}
        performance={performance}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hide HUD/i }));
    expect(toggleHud).toHaveBeenCalledTimes(1);
  });
});
