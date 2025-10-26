import { TeamId } from "../../ecs/world";

export type MatchRuntimePhase =
  | "initializing"
  | "running"
  | "paused"
  | "victory";

export interface MatchStateSnapshot {
  phase: MatchRuntimePhase;
  elapsedMs: number;
  restartTimerMs: number | null;
  winner: TeamId | null;
}

export interface MatchStateMachineOptions {
  autoRestartDelayMs?: number;
  onChange?: (snapshot: MatchStateSnapshot) => void;
}

export interface MatchStateMachine {
  getSnapshot(): MatchStateSnapshot;
  reset(): void;
  start(): void;
  pause(): void;
  resume(): void;
  declareVictory(winner: TeamId, restartDelayMs?: number): void;
  setRestartTimer(value: number | null): void;
  tick(deltaMs: number): boolean;
}

class MatchStateMachineImpl implements MatchStateMachine {
  private snapshot: MatchStateSnapshot = {
    phase: "initializing",
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
  };

  private readonly onChange?: MatchStateMachineOptions["onChange"];

  private autoRestartDelayMs: number;

  constructor({
    autoRestartDelayMs = 5000,
    onChange,
  }: MatchStateMachineOptions) {
    this.autoRestartDelayMs = autoRestartDelayMs;
    this.onChange = onChange;
  }

  getSnapshot(): MatchStateSnapshot {
    return { ...this.snapshot };
  }

  reset(): void {
    this.snapshot = {
      phase: "initializing",
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    };
    this.emitChange();
  }

  start(): void {
    const nextPhase: MatchRuntimePhase = "running";
    if (this.snapshot.phase === nextPhase) {
      return;
    }

    this.snapshot = {
      ...this.snapshot,
      phase: nextPhase,
      winner: null,
      restartTimerMs: null,
    };
    this.emitChange();
  }

  pause(): void {
    if (this.snapshot.phase !== "running") {
      return;
    }

    this.snapshot = { ...this.snapshot, phase: "paused" };
    this.emitChange();
  }

  resume(): void {
    if (this.snapshot.phase !== "paused") {
      return;
    }

    this.snapshot = { ...this.snapshot, phase: "running" };
    this.emitChange();
  }

  declareVictory(winner: TeamId, restartDelayMs?: number): void {
    this.snapshot = {
      ...this.snapshot,
      phase: "victory",
      winner,
      restartTimerMs:
        restartDelayMs ??
        this.snapshot.restartTimerMs ??
        this.autoRestartDelayMs,
    };
    this.emitChange();
  }

  setRestartTimer(value: number | null): void {
    if (this.snapshot.restartTimerMs === value) {
      return;
    }

    this.snapshot = { ...this.snapshot, restartTimerMs: value };
    this.emitChange();
  }

  tick(deltaMs: number): boolean {
    let shouldRestart = false;
    let changed = false;

    if (this.snapshot.phase === "running") {
      this.snapshot = {
        ...this.snapshot,
        elapsedMs: this.snapshot.elapsedMs + deltaMs,
      };
      changed = true;
    } else if (this.snapshot.phase === "victory") {
      const nextElapsed = this.snapshot.elapsedMs + deltaMs;
      let nextRestart = this.snapshot.restartTimerMs;

      if (nextRestart !== null) {
        nextRestart = Math.max(0, nextRestart - deltaMs);
        if (nextRestart === 0) {
          shouldRestart = true;
        }
      }

      if (
        nextElapsed !== this.snapshot.elapsedMs ||
        nextRestart !== this.snapshot.restartTimerMs
      ) {
        this.snapshot = {
          ...this.snapshot,
          elapsedMs: nextElapsed,
          restartTimerMs: nextRestart,
        };
        changed = true;
      }
    }

    if (changed) {
      this.emitChange();
    }

    return shouldRestart;
  }

  private emitChange(): void {
    this.onChange?.({ ...this.snapshot });
  }
}

export function createMatchStateMachine(
  options: MatchStateMachineOptions = {},
): MatchStateMachine {
  return new MatchStateMachineImpl(options);
}
