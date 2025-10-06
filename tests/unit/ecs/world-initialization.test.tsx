import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';

import { initializeSimulation, SimulationWorldProvider, useSimulationWorld } from '../../../src/ecs/world';

describe('Simulation world initialization', () => {
  it('creates an ECS registry with robot entities', () => {
    const world = initializeSimulation();

    expect(world.ecs).toBeDefined();
    expect(world.ecs.robots).toBeDefined();
    expect(typeof world.ecs.robots.add).toBe('function');
    expect(world.ecs.robots.entities.length).toBe(world.entities.length);
  });

  it('exposes the simulation world through context provider', () => {
    const world = initializeSimulation();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SimulationWorldProvider value={world}>{children}</SimulationWorldProvider>
    );

    const { result } = renderHook(() => useSimulationWorld(), { wrapper });

    expect(result.current).toBe(world);
  });
});
