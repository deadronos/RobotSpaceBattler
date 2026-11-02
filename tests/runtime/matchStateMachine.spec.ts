import { describe, expect, it } from "vitest";

import {
  createMatchStateMachine,
  MatchRuntimePhase,
  MatchStateSnapshot,
} from "../../src/runtime/state/matchStateMachine";

function snapshotPhases(sequence: MatchStateSnapshot[]): MatchRuntimePhase[] {
  return sequence.map((snapshot) => snapshot.phase);
}

describe("matchStateMachine", () => {
  it("transitions through start, pause, resume, and victory", () => {
    const snapshots: MatchStateSnapshot[] = [];
    const machine = createMatchStateMachine({
      autoRestartDelayMs: 2000,
      onChange: (snapshot) => snapshots.push(snapshot),
    });

    machine.start();
    machine.pause();
    machine.resume();
    machine.declareVictory("red", 1000);

    expect(snapshotPhases(snapshots)).toEqual([
      "running",
      "paused",
      "running",
      "victory",
    ]);

    const afterVictory = machine.getSnapshot();
    expect(afterVictory.restartTimerMs).toBe(1000);
  });

  it("counts elapsed time and auto restarts after victory countdown", () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 500 });
    machine.start();

    machine.tick(100);
    expect(machine.getSnapshot().elapsedMs).toBe(100);

    machine.declareVictory("blue");
    expect(machine.getSnapshot().restartTimerMs).toBe(500);

    let shouldRestart = machine.tick(400);
    expect(shouldRestart).toBe(false);
    shouldRestart = machine.tick(100);
    expect(shouldRestart).toBe(true);
  });

  it("resets snapshot to initializing state", () => {
    const machine = createMatchStateMachine();
    machine.start();
    machine.declareVictory("red");
    machine.reset();

    expect(machine.getSnapshot()).toEqual({
      phase: "initializing",
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
      isDraw: false,
      autoRestartEnabled: true,
    });
  });

  it("declares a draw with no winner and auto-restarts", () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
    machine.start();
    machine.declareDraw();

    expect(machine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: null,
      isDraw: true,
      restartTimerMs: 1000,
    });
    expect(machine.tick(1500)).toBe(true);
    expect(machine.getSnapshot().isDraw).toBe(false);
  });
});

describe("matchStateMachine auto restart (#170)", () => {
  it("can be disabled, which removes the countdown and blocks the restart", () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
    machine.start();
    machine.setAutoRestartEnabled(false);
    machine.declareVictory("red");

    expect(machine.getSnapshot()).toMatchObject({
      phase: "victory",
      winner: "red",
      restartTimerMs: null,
      autoRestartEnabled: false,
    });
    for (let i = 0; i < 100; i += 1) {
      expect(machine.tick(100)).toBe(false);
    }
    expect(machine.getSnapshot().phase).toBe("victory");
  });

  it("starts disabled when the option says so", () => {
    const machine = createMatchStateMachine({
      autoRestartEnabled: false,
      autoRestartDelayMs: 1000,
    });
    machine.start();
    machine.declareDraw();

    expect(machine.getSnapshot().restartTimerMs).toBeNull();
    expect(machine.getSnapshot().isDraw).toBe(true);
  });

  it("resumes the countdown when re-enabled during victory", () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
    machine.start();
    machine.setAutoRestartEnabled(false);
    machine.declareVictory("blue");
    expect(machine.getSnapshot().restartTimerMs).toBeNull();

    machine.setAutoRestartEnabled(true);
    expect(machine.getSnapshot().restartTimerMs).toBe(1000);
    expect(machine.tick(1000)).toBe(true);
  });

  it("keeps the setting across a reset", () => {
    const machine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
    machine.start();
    machine.setAutoRestartEnabled(false);
    machine.reset();

    expect(machine.getSnapshot()).toMatchObject({
      phase: "initializing",
      autoRestartEnabled: false,
    });
  });

  it("notifies subscribers when toggled", () => {
    const emitted: MatchStateSnapshot[] = [];
    const machine = createMatchStateMachine({
      onChange: (snapshot) => emitted.push(snapshot),
    });
    machine.setAutoRestartEnabled(false);
    machine.setAutoRestartEnabled(false);

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.autoRestartEnabled).toBe(false);
  });
});

describe("matchStateMachine emission rate (#162)", () => {
  it("does not notify on per-step elapsed updates while running", () => {
    const emitted: MatchStateSnapshot[] = [];
    const machine = createMatchStateMachine({
      onChange: (s) => emitted.push(s),
    });
    machine.start();
    emitted.length = 0;

    for (let i = 0; i < 600; i += 1) machine.tick(1000 / 60);

    expect(emitted).toHaveLength(0);
    expect(machine.getSnapshot().elapsedMs).toBeCloseTo(10_000, 3);
  });

  it("notifies the victory countdown only when the whole second changes", () => {
    const emitted: MatchStateSnapshot[] = [];
    const machine = createMatchStateMachine({
      autoRestartDelayMs: 2000,
      onChange: (s) => emitted.push(s),
    });
    machine.start();
    machine.declareVictory("red", 2000);
    emitted.length = 0;

    for (let i = 0; i < 12; i += 1) machine.tick(100);

    expect(emitted.length).toBeLessThanOrEqual(2);
    expect(emitted[0]?.restartTimerMs).toBeLessThanOrEqual(1000);
  });
});
