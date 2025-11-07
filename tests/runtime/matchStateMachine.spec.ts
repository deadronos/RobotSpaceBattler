import { describe, expect, it } from 'vitest';

import {
  createMatchStateMachine,
  MatchRuntimePhase,
  MatchStateSnapshot,
} from '../../src/runtime/state/matchStateMachine';

function snapshotPhases(sequence: MatchStateSnapshot[]): MatchRuntimePhase[] {
  return sequence.map((snapshot) => snapshot.phase);
}

describe('matchStateMachine', () => {
  it('transitions through start, pause, resume, and victory', () => {
    const snapshots: MatchStateSnapshot[] = [];
    const machine = createMatchStateMachine({
      autoRestartDelayMs: 2000,
      onChange: (snapshot) => snapshots.push(snapshot),
    });

    machine.start();
    machine.pause();
    machine.resume();
    machine.declareVictory('red', 1000);

    expect(snapshotPhases(snapshots)).toEqual([
      'running',
      'paused',
      'running',
      'victory',
    ]);

    const afterVictory = machine.getSnapshot();
    expect(afterVictory.restartTimerMs).toBe(1000);
  });

  it('counts elapsed time and auto restarts after victory countdown', () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 500 });
    machine.start();

    machine.tick(100);
    expect(machine.getSnapshot().elapsedMs).toBe(100);

    machine.declareVictory('blue');
    expect(machine.getSnapshot().restartTimerMs).toBe(500);

    let shouldRestart = machine.tick(400);
    expect(shouldRestart).toBe(false);
    shouldRestart = machine.tick(100);
    expect(shouldRestart).toBe(true);
  });

  it('resets snapshot to initializing state', () => {
    const machine = createMatchStateMachine();
    machine.start();
    machine.declareVictory('red');
    machine.reset();

    expect(machine.getSnapshot()).toEqual({
      phase: 'initializing',
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    });
  });
});
