import { render, screen, within } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { useUIStore } from '../../../../src/store/uiStore';
import * as worldModule from '../../../../src/ecs/world';

describe('StatsModal', () => {
  let useWorldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset zustand UI store
    useUIStore.getState().reset();
    useWorldSpy = vi
      .spyOn(worldModule, 'useSimulationWorld')
      .mockImplementation(() => ({ simulation: { postBattleStats: null } } as any));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when statsOpen is false', async () => {
    const { StatsModal } = await import('../../../../src/components/ui/StatsModal');
    render(<StatsModal />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders team and robot details when open and snapshot exists', async () => {
    const snapshot = {
      perRobot: {
        r1: { kills: 2, damageDealt: 40, damageTaken: 10, timeAlive: 12, shotsFired: 5 },
        r2: { kills: 0, damageDealt: 0, damageTaken: 40, timeAlive: 3, shotsFired: 1 },
      },
      perTeam: {
        red: { totalKills: 2, totalDamageDealt: 40, totalDamageTaken: 10, averageHealthRemaining: 50, weaponDistribution: { laser: 1, gun: 0, rocket: 0 } },
        blue: { totalKills: 0, totalDamageDealt: 0, totalDamageTaken: 40, averageHealthRemaining: 0, weaponDistribution: { laser: 0, gun: 0, rocket: 0 } },
      },
      computedAt: 123,
    } as any;

    // Mock the world hook to return our snapshot
    useWorldSpy.mockImplementation(() => ({ simulation: { postBattleStats: snapshot } } as any));

    // Open the modal via zustand
    useUIStore.getState().setStatsOpen(true);

    const { StatsModal } = await import('../../../../src/components/ui/StatsModal');
    render(<StatsModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Team table should show team red with kills
    expect(screen.getByRole('columnheader', { name: 'Team' })).toBeInTheDocument();
    const redCell = screen.getByRole('cell', { name: 'red' });
    const redRow = redCell.closest('tr');
    expect(redRow).not.toBeNull();
    expect(within(redRow as HTMLTableRowElement).getByRole('cell', { name: '2' })).toBeInTheDocument();
    // Robot row should show robot id r1
    expect(screen.getByText(/r1/)).toBeInTheDocument();
  });
});
