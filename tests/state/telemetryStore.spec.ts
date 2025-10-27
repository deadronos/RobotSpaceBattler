import { afterEach, describe, expect, it } from 'vitest';

import { useTelemetryStore } from '../../src/state/telemetryStore';

describe('telemetryStore', () => {
  afterEach(() => {
    useTelemetryStore.getState().reset('cleanup');
  });

  it('records spawn, fire, damage, and death events', () => {
    const store = useTelemetryStore.getState();
    store.reset('match-1');

    store.recordEvent({
      type: 'spawn',
      timestampMs: 0,
      sequenceId: 1,
      entityId: 'red-1',
      teamId: 'red',
    });
    store.recordEvent({
      type: 'spawn',
      timestampMs: 0,
      sequenceId: 2,
      entityId: 'blue-1',
      teamId: 'blue',
    });
    store.recordEvent({
      type: 'fire',
      timestampMs: 100,
      sequenceId: 3,
      entityId: 'red-1',
      teamId: 'red',
    });
    store.recordEvent({
      type: 'damage',
      timestampMs: 200,
      sequenceId: 4,
      attackerId: 'red-1',
      targetId: 'blue-1',
      teamId: 'red',
      amount: 15,
    });
    store.recordEvent({
      type: 'death',
      timestampMs: 300,
      sequenceId: 5,
      entityId: 'blue-1',
      attackerId: 'red-1',
      teamId: 'blue',
    });

    const state = useTelemetryStore.getState();
    const redRobot = state.robots['red-1'];
    expect(redRobot.shotsFired).toBe(1);
    expect(redRobot.damageDealt).toBe(15);
    expect(redRobot.kills).toBe(1);

    const blueTotals = state.teamTotals.blue;
    expect(blueTotals.deaths).toBe(1);
    expect(blueTotals.damageTaken).toBe(15);
  });
});
