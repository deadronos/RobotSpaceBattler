import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  StatsModal,
  type StatsModalProps,
} from '../../../src/components/overlays/StatsModal';

const baseProps: StatsModalProps = {
  open: true,
  winnerName: 'Blue Team',
  teamSummaries: [
    {
      teamId: 'red',
      label: 'Red Team',
      totalKills: 7,
      totalDamageDealt: 420,
      totalDamageTaken: 1000,
      averageHealthRemaining: 0,
    },
    {
      teamId: 'blue',
      label: 'Blue Team',
      totalKills: 10,
      totalDamageDealt: 1000,
      totalDamageTaken: 420,
      averageHealthRemaining: 56,
    },
  ],
  robotStats: [
    {
      id: 'b-07',
      name: 'B-07',
      team: 'blue',
      weaponType: 'laser',
      kills: 4,
      damageDealt: 350,
      damageTaken: 50,
      timeAliveSeconds: 180,
      isCaptain: true,
    },
    {
      id: 'r-01',
      name: 'R-01',
      team: 'red',
      weaponType: 'rocket',
      kills: 2,
      damageDealt: 200,
      damageTaken: 300,
      timeAliveSeconds: 95,
      isCaptain: false,
    },
  ],
  sort: { column: 'kills', direction: 'desc' },
  onClose: vi.fn(),
  onSortChange: vi.fn(),
  onExport: vi.fn(),
};

describe('StatsModal', () => {
  it('renders winner summary, team aggregates, and robot rows', () => {
    render(<StatsModal {...baseProps} />);

    expect(
      screen.getByRole('heading', { name: /blue team victory stats/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/red team/)).toBeInTheDocument();
    expect(screen.getByText(/blue team/)).toBeInTheDocument();
    expect(screen.getByText(/average health remaining: 56%/i)).toBeInTheDocument();

    expect(screen.getByRole('row', { name: /b-07/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /r-01/ })).toBeInTheDocument();
    expect(screen.getByText(/captain/i)).toBeInTheDocument();
  });

  it('invokes callbacks for sort and close actions', () => {
    const props: StatsModalProps = {
      ...baseProps,
      onClose: vi.fn(),
      onSortChange: vi.fn(),
      onExport: vi.fn(),
    };

    render(<StatsModal {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /export stats/i }));
    expect(props.onExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /sort by damage/i }));
    expect(props.onSortChange).toHaveBeenCalledWith({ column: 'damageDealt', direction: 'desc' });
  });

  it('does not render when closed', () => {
    render(<StatsModal {...baseProps} open={false} />);
    expect(
      screen.queryByRole('heading', { name: /victory stats/i }),
    ).not.toBeInTheDocument();
  });
});
