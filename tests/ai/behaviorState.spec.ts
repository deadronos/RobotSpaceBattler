import { describe, expect, it } from 'vitest';
import {
  nextBehaviorState,
  RobotBehaviorContext,
  RobotBehaviorMode,
  RobotBehaviorSnapshot,
} from '../../src/simulation/ai/behaviorState';

function evaluate(
  snapshot: Partial<RobotBehaviorSnapshot>,
  context: Partial<RobotBehaviorContext>,
): RobotBehaviorMode {
  const fullSnapshot: RobotBehaviorSnapshot = {
    health: 100,
    maxHealth: 100,
    mode: RobotBehaviorMode.Seek,
    role: 'assault',
    ...snapshot,
  };

  const fullContext: RobotBehaviorContext = {
    targetDistance: null,
    anchorDistance: 10,
    rng: () => 0.5,
    ...context,
  };

  return nextBehaviorState(fullSnapshot, fullContext);
}

describe('nextBehaviorState', () => {
  it('returns seek when no target is available', () => {
    const result = evaluate(
      { mode: RobotBehaviorMode.Engage },
      { targetDistance: null },
    );
    expect(result).toBe(RobotBehaviorMode.Seek);
  });

  it('engages when within range', () => {
    const result = evaluate(
      { mode: RobotBehaviorMode.Seek },
      { targetDistance: 8, anchorDistance: 20 },
    );
    expect(result).toBe(RobotBehaviorMode.Engage);
  });

  it('retreats when low health and threatened', () => {
    const result = evaluate(
      { health: 20, maxHealth: 100, mode: RobotBehaviorMode.Engage },
      { targetDistance: 6, anchorDistance: 20 },
    );
    expect(result).toBe(RobotBehaviorMode.Retreat);
  });

  it('switches back to engage once safely anchored', () => {
    const result = evaluate(
      { health: 20, maxHealth: 100, mode: RobotBehaviorMode.Retreat },
      { targetDistance: 6, anchorDistance: 2 },
    );
    expect(result).toBe(RobotBehaviorMode.Engage);
  });

  it('uses rng when exactly on the engage boundary', () => {
    const engage = evaluate(
      {},
      {
        targetDistance: 18,
        rng: () => 0.75,
      },
    );
    const seek = evaluate(
      {},
      {
        targetDistance: 18,
        rng: () => 0.25,
      },
    );

    expect(engage).toBe(RobotBehaviorMode.Engage);
    expect(seek).toBe(RobotBehaviorMode.Seek);
  });

  // Role based tests
  it('tank engages closer', () => {
      // Default is 18. Tank is 14.
      // At 16, assault engages, tank seeks.
      const assault = evaluate({ role: 'assault' }, { targetDistance: 16 });
      const tank = evaluate({ role: 'tank' }, { targetDistance: 16 });

      expect(assault).toBe(RobotBehaviorMode.Engage);
      expect(tank).toBe(RobotBehaviorMode.Seek);
  });

  it('sniper engages farther', () => {
      // Default 18. Sniper 30.
      // At 25, assault seeks, sniper engages.
      const assault = evaluate({ role: 'assault' }, { targetDistance: 25 });
      const sniper = evaluate({ role: 'sniper' }, { targetDistance: 25 });

      expect(assault).toBe(RobotBehaviorMode.Seek);
      expect(sniper).toBe(RobotBehaviorMode.Engage);
  });
});
