import { act, renderHook } from '@testing-library/react';
import type { Query } from 'miniplex';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useEcsQuery } from '../../src/ecs/hooks';
import {
  notifyEntityChanged,
  resetWorld,
  type Entity,
  world,
} from '../../src/ecs/miniplexStore';

describe('useEcsQuery', () => {
  let teamQuery: Query<Entity & { team: string }>;

  beforeEach(() => {
    resetWorld();
    teamQuery = world.with('team') as Query<Entity & { team: string }>;
  });

  afterEach(() => {
    resetWorld();
  });

  it('returns an updated snapshot when entity data mutates', () => {
    const entity = world.add({ id: 'robot-1', team: 'red' } as Entity);

    const { result } = renderHook(() => useEcsQuery(teamQuery));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].team).toBe('red');

    const initialSnapshot = result.current;

    act(() => {
      entity.team = 'blue';
      notifyEntityChanged(entity);
    });

    expect(result.current).toHaveLength(1);
    expect(result.current[0].team).toBe('blue');
    expect(result.current).not.toBe(initialSnapshot);
  });
});
