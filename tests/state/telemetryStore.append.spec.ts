import { afterEach, describe, expect, it } from "vitest";

import {
  TelemetryEvent,
  useTelemetryStore,
} from "../../src/state/telemetryStore";

/** A recorded event that touches a robot and both team totals. */
function fireEvent(i: number): TelemetryEvent {
  return {
    type: "fire",
    timestampMs: i,
    sequenceId: i,
    entityId: `red-${i % 8}`,
    teamId: "red",
  };
}

describe("telemetryStore append (#207)", () => {
  afterEach(() => {
    useTelemetryStore.getState().reset("cleanup");
  });

  it("appends 10k events in place instead of rebuilding the log", () => {
    useTelemetryStore.getState().reset("append-in-place");
    const events = useTelemetryStore.getState().events;

    for (let i = 0; i < 10_000; i += 1) {
      useTelemetryStore.getState().recordEvent(fireEvent(i));
    }

    const state = useTelemetryStore.getState();
    // The array is the same object it was before recording: no copy per event.
    expect(state.events).toBe(events);
    expect(state.events).toHaveLength(10_000);
    expect(state.eventCount).toBe(10_000);
    expect(state.events[9_999]).toMatchObject({
      type: "fire",
      sequenceId: 9_999,
    });
  });

  it("performs no element copies per event, so recording is linear overall", () => {
    useTelemetryStore.getState().reset("no-copies");

    // Count element reads on the log. Copying it (`[...events, event]`) reads
    // every index, which makes each event O(n) and 10k events O(n²); an in-place
    // `push` reads none, so the total work for 10k events is O(n).
    let elementReads = 0;
    const countingLog = new Proxy(useTelemetryStore.getState().events, {
      get(target, property, receiver) {
        if (typeof property === "string" && /^(0|[1-9]\d*)$/.test(property)) {
          elementReads += 1;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    useTelemetryStore.setState({ events: countingLog });

    for (let i = 0; i < 10_000; i += 1) {
      useTelemetryStore.getState().recordEvent(fireEvent(i));
    }

    expect(elementReads).toBe(0);
    // Sanity check: the counter does observe indexing, so the assertion above
    // is meaningful and not a broken trap.
    expect(countingLog[0]).toBeDefined();
    expect(elementReads).toBe(1);
    expect(useTelemetryStore.getState().eventCount).toBe(10_000);
  });

  it("mutates the aggregates in place and aggregates correctly", () => {
    useTelemetryStore.getState().reset("aggregates");
    const robots = useTelemetryStore.getState().robots;
    const teamTotals = useTelemetryStore.getState().teamTotals;

    useTelemetryStore.getState().recordEvent({
      type: "spawn",
      timestampMs: 0,
      sequenceId: 1,
      entityId: "blue-1",
      teamId: "blue",
    });
    useTelemetryStore.getState().recordEvent({
      type: "damage",
      timestampMs: 1,
      sequenceId: 2,
      attackerId: "red-1",
      targetId: "blue-1",
      teamId: "red",
      amount: 20,
    });
    useTelemetryStore.getState().recordEvent({
      type: "death",
      timestampMs: 2,
      sequenceId: 3,
      entityId: "blue-1",
      attackerId: "red-1",
      teamId: "blue",
    });

    const state = useTelemetryStore.getState();
    expect(state.robots).toBe(robots);
    expect(state.teamTotals).toBe(teamTotals);
    expect(robots["red-1"]).toMatchObject({
      damageDealt: 20,
      kills: 1,
    });
    expect(robots["blue-1"]).toMatchObject({
      damageTaken: 20,
      deaths: 1,
    });
    expect(state.teamTotals.red.damageDealt).toBe(20);
    expect(state.teamTotals.blue.damageTaken).toBe(20);
    expect(state.teamTotals.blue.deaths).toBe(1);
  });

  it("still notifies subscribers once per event without replacing collections", () => {
    useTelemetryStore.getState().reset("notifications");
    const before = useTelemetryStore.getState();

    const versions: number[] = [];
    const sameCollections: boolean[] = [];
    const unsubscribe = useTelemetryStore.subscribe((state) => {
      versions.push(state.eventCount);
      sameCollections.push(
        state.events === before.events &&
          state.robots === before.robots &&
          state.teamTotals === before.teamTotals,
      );
    });

    try {
      for (let i = 0; i < 5; i += 1) {
        useTelemetryStore.getState().recordEvent(fireEvent(i));
      }
    } finally {
      unsubscribe();
    }

    expect(versions).toEqual([1, 2, 3, 4, 5]);
    expect(sameCollections.every(Boolean)).toBe(true);
    expect(before.events).toHaveLength(5);
  });

  it("resets the log and the version counter for a new match", () => {
    useTelemetryStore.getState().reset("match-a");
    useTelemetryStore.getState().recordEvent(fireEvent(0));
    useTelemetryStore.getState().recordEvent(fireEvent(1));

    useTelemetryStore.getState().reset("match-b");
    const state = useTelemetryStore.getState();
    expect(state.matchId).toBe("match-b");
    expect(state.events).toHaveLength(0);
    expect(state.eventCount).toBe(0);
    expect(state.robots).toEqual({});
    expect(state.teamTotals.red.spawns).toBe(0);
  });
});
