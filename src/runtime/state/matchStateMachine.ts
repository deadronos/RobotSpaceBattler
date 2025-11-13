import { TeamId } from "../../lib/teamConfig";

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

export interface MatchStateOptions {
  autoRestartDelayMs?: number;
  onChange?: (snapshot: MatchStateSnapshot) => void;
}

export interface MatchStateMachine {
  start: () => void;
  pause: () => void;
  resume: () => void;
  declareVictory: (winner: TeamId, restartDelayMs?: number) => void;
  reset: () => void;
  tick: (deltaMs: number) => boolean;
  getSnapshot: () => MatchStateSnapshot;
}

const INITIAL_STATE: MatchStateSnapshot = {
  phase: "initializing",
  elapsedMs: 0,
  restartTimerMs: null,
  winner: null,
};

export function createMatchStateMachine(
  options: MatchStateOptions = {},
): MatchStateMachine {
  const autoRestartDelayMs = options.autoRestartDelayMs ?? 2000;
  let current: MatchStateSnapshot = { ...INITIAL_STATE };

  function emit() {
    options.onChange?.(current);
  }

  function transition(partial: Partial<MatchStateSnapshot>) {
    current = { ...current, ...partial };
    emit();
  }

  return {
    start: () => {
      transition({
        phase: "running",
        restartTimerMs: null,
      });
    },
    pause: () => {
      if (current.phase === "running") {
        transition({ phase: "paused" });
      }
    },
    resume: () => {
      if (current.phase === "paused") {
        transition({ phase: "running" });
      }
    },
    declareVictory: (winner, restartDelayMs) => {
      transition({
        phase: "victory",
        winner,
        restartTimerMs: restartDelayMs ?? autoRestartDelayMs,
      });
    },
    reset: () => {
      current = { ...INITIAL_STATE };
      emit();
    },
    tick: (deltaMs: number) => {
      if (current.phase === "running") {
        current = {
          ...current,
          elapsedMs: current.elapsedMs + deltaMs,
        };
        emit();
        return false;
      }

      if (current.phase === "victory" && current.restartTimerMs != null) {
        const nextTimer = current.restartTimerMs - deltaMs;
        if (nextTimer > 0) {
          current = {
            ...current,
            restartTimerMs: nextTimer,
          };
          emit();
          return false;
        }

        current = { ...INITIAL_STATE };
        emit();
        return true;
      }

      return false;
    },
    getSnapshot: () => current,
  };
}
