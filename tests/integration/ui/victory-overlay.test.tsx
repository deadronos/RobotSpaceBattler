import { render, screen, within, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  VictoryOverlay,
  type VictoryOverlayProps,
} from '../../../src/components/overlays/VictoryOverlay';

const createProps = (): VictoryOverlayProps => ({
  visible: true,
  winnerName: 'Blue Team',
  countdownSeconds: 3,
  performanceHint: 'Auto-restarts in 03s',
  teamSummaries: [
    {
      teamId: 'red',
      label: 'Red Team',
      alive: 0,
      eliminated: 10,
      weaponDistribution: { laser: 4, gun: 3, rocket: 3 },
      captain: { name: 'R-01', alive: false },
    },
    {
      teamId: 'blue',
      label: 'Blue Team',
      alive: 5,
      eliminated: 5,
      weaponDistribution: { laser: 3, gun: 4, rocket: 3 },
      captain: { name: 'B-07', alive: true },
    },
  ],
  actions: {
    openStats: vi.fn(),
    openSettings: vi.fn(),
    restartNow: vi.fn(),
    pauseCountdown: vi.fn(),
    resumeCountdown: vi.fn(),
  },
});

describe('VictoryOverlay', () => {
  it('renders winner banner, countdown, controls, and team summaries', () => {
    const props = createProps();
    render(<VictoryOverlay {...props} />);

    expect(
      screen.getByRole('heading', { name: /blue team wins/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/auto-restarts in 03s/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /restart now/i }),
    ).toBeInTheDocument();

    const redSummary = screen.getByTestId('team-summary-red');
    expect(within(redSummary).getByText(/alive: 0/i)).toBeInTheDocument();
    expect(
      within(redSummary).getByText(/captain eliminated/i),
    ).toBeInTheDocument();

    const blueSummary = screen.getByTestId('team-summary-blue');
    expect(within(blueSummary).getByText(/alive: 5/i)).toBeInTheDocument();
    expect(
      within(blueSummary).getByText(/captain active/i),
    ).toBeInTheDocument();
  });

  it('invokes callbacks when primary controls are used', () => {
    const props = createProps();
    render(<VictoryOverlay {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /stats/i }));
    expect(props.actions.openStats).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(props.actions.openSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /restart now/i }));
    expect(props.actions.restartNow).toHaveBeenCalledTimes(1);
  });

  it('is visually hidden when visible flag is false', () => {
    const props = createProps();
    render(<VictoryOverlay {...props} visible={false} />);
    expect(
      screen.queryByRole('heading', { name: /wins/i }),
    ).not.toBeInTheDocument();
  });
});
