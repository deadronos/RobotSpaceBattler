import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BattleTimer } from '../../../../src/components/hud/BattleTimer';
import type { BattleHudStatusInfo } from '../../../../src/hooks/useBattleHudData';

const baseStatus: BattleHudStatusInfo = {
  status: 'running',
  label: 'Battle in progress',
  winner: null,
  countdownSeconds: null,
  countdownLabel: null,
  countdownPaused: false,
  elapsedSeconds: 87,
};

describe('BattleTimer', () => {
  it('renders the elapsed time in mm:ss format', () => {
    render(<BattleTimer status={baseStatus} />);

    expect(screen.getByLabelText(/Elapsed time/i).textContent).toMatch(/1:27/);
  });

  it('displays countdown label and paused hint when countdown is active', () => {
    const status: BattleHudStatusInfo = {
      ...baseStatus,
      status: 'victory',
      countdownSeconds: 4,
      countdownLabel: 'Restarts in 04s',
      countdownPaused: true,
    };

    render(<BattleTimer status={status} />);

    const countdown = screen.getByText(/Restarts in 04s/i);
    expect(countdown).toHaveAttribute('data-paused', 'true');
    expect(countdown.textContent).toMatch(/paused/i);
  });
});
