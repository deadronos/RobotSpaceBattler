import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TeamStatusPanel } from '../../../../src/components/hud/TeamStatusPanel';
import type { TeamSummaryViewModel } from '../../../../src/selectors/uiSelectors';

const team: TeamSummaryViewModel = {
  teamId: 'red',
  label: 'Red Team',
  alive: 3,
  eliminated: 2,
  weaponDistribution: { laser: 2, gun: 1, rocket: 0 },
  captain: { id: 'red-1', name: 'R-1', alive: true },
};

describe('TeamStatusPanel', () => {
  it('displays counts, captain info, and weapon distribution', () => {
    render(<TeamStatusPanel team={team} />);

    expect(screen.getByRole('heading', { name: /Red Team/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Alive/i, { selector: 'dt' }).nextElementSibling?.textContent,
    ).toBe('3');
    expect(
      screen
        .getByText(/Eliminated/i, { selector: 'dt' })
        .nextElementSibling?.textContent,
    ).toBe('2');
    expect(screen.getByText(/Captain:/i).textContent).toMatch(/R-1/);
    expect(screen.getByText(/laser: 2/i)).toBeInTheDocument();
  });

  it('falls back when captain metadata missing', () => {
    const withoutCaptain: TeamSummaryViewModel = {
      ...team,
      captain: null,
    };

    render(<TeamStatusPanel team={withoutCaptain} />);

    expect(screen.getByText(/Captain: Unknown/i)).toBeInTheDocument();
  });
});
