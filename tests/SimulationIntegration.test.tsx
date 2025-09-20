import React, { useMemo } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { Query } from 'miniplex';
import { describe, it, expect, beforeEach } from 'vitest';

import { useEcsQuery } from '../src/ecs/hooks';
import type { Entity } from '../src/ecs/miniplexStore';
import { world } from '../src/ecs/miniplexStore';
import { resetAndSpawnDefaultTeams } from '../src/robots/spawnControls';

function RobotsIndicator() {
  const robotsQuery = useMemo(() => world.with('team', 'weapon', 'weaponState') as Query<Entity>, []);
  const robots = useEcsQuery(robotsQuery);
  return <div data-testid="robots-count">{robots.length}</div>;
}

describe('Simulation integration (React path)', () => {
  beforeEach(() => {
    // Spawn default teams fresh before each run
    resetAndSpawnDefaultTeams();
  });

  it('renders with at least one robot on first paint', async () => {
    render(<RobotsIndicator />);

    await waitFor(() => {
      const el = screen.getByTestId('robots-count');
      const n = Number(el.textContent || '0');
      expect(n).toBeGreaterThan(0);
    });
  });
});
