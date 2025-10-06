import { describe, expect, it } from 'vitest';

import { createTestWorld, type TestWorld } from '../systems/ai/testUtils';
import {
  advanceVictoryCountdown,
  evaluateVictoryState,
} from '../../../src/ecs/systems/victorySystem';

function toVictoryWorld(world: TestWorld) {
  return {
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  };
}

describe('victorySystem', () => {
  it('declares a winner when only one team remains', () => {
    const world = createTestWorld();
    world.teams.blue.activeRobots = 0;

    const nextState = evaluateVictoryState(toVictoryWorld(world));

    expect(nextState.status).toBe('victory');
    expect(nextState.winner).toBe('red');
    expect(nextState.autoRestartCountdown).toBe(5);
  });

  it('handles simultaneous elimination as a draw', () => {
    const world = createTestWorld();
    world.teams.red.activeRobots = 0;
    world.teams.blue.activeRobots = 0;
    world.entities = [];

    const nextState = evaluateVictoryState(toVictoryWorld(world));

    expect(nextState.status).toBe('simultaneous-elimination');
    expect(nextState.winner).toBe('draw');
  });

  it('counts down to restart and triggers callback when finished', () => {
    const world = createTestWorld();
    world.simulation = {
      ...world.simulation,
      status: 'victory',
      winner: 'red',
      autoRestartCountdown: 1,
      countdownPaused: false,
    };

    let restarted = false;
    const nextState = advanceVictoryCountdown(toVictoryWorld(world), 1.1, () => {
      restarted = true;
    });

    expect(nextState.status).toBe('running');
    expect(nextState.winner).toBeNull();
    expect(nextState.autoRestartCountdown).toBeNull();
    expect(restarted).toBe(true);
  });
});
