import { TeamId } from "../../lib/teamConfig";

/**
 * Enumeration of possible phases in a match lifecycle.
 */
export type MatchRuntimePhase =
  | "initializing"
  | "running"
  | "paused"
  | "victory";

/**
 * Snapshot of the current match state.
 */
export interface MatchStateSnapshot {
  /** Current phase of the match. */
  phase: MatchRuntimePhase;
  /** Elapsed time in milliseconds since the match started. */
  elapsedMs: number;
  /** Time remaining until auto-restart (if in victory phase). */
  restartTimerMs: number | null;
  /** The winning team ID (if victory declared). */
  winner: TeamId | null;
  /** True when the match ended with no winner (both teams wiped or timeout tie). */
  isDraw: boolean;
  /**
   * Whether a finished round restarts by itself (#170). When false the victory
   * phase lasts until the user starts the next round, so `restartTimerMs` is
   * null.
   */
  autoRestartEnabled: boolean;
}

/**
 * Configuration options for the state machine.
 */
export interface MatchStateOptions {
  /** Delay in ms before restarting after victory (default 2000). */
  autoRestartDelayMs?: number;
  /** Whether a finished round restarts by itself (default true). */
  autoRestartEnabled?: boolean;
  /**
   * Callback triggered on observable state changes: phase transitions, resets,
   * and the whole-second tick of the victory restart countdown. It is NOT
   * called for per-step elapsed-time updates; read getSnapshot() for those.
   */
  onChange?: (snapshot: MatchStateSnapshot) => void;
}

/**
 * Interface for controlling the match state.
 */
export interface MatchStateMachine {
  /** Starts or unpauses the match. */
  start: () => void;
  /** Pauses the match execution. */
  pause: () => void;
  /** Resumes a paused match. */
  resume: () => void;
  /**
   * Declares a winner and transitions to victory phase.
   * @param winner - The ID of the winning team.
   * @param restartDelayMs - Optional delay before restart.
   */
  declareVictory: (winner: TeamId, restartDelayMs?: number) => void;
  /**
   * Ends the match with no winner and transitions to the victory phase.
   * @param restartDelayMs - Optional delay before restart.
   */
  declareDraw: (restartDelayMs?: number) => void;
  /** Resets the match to the initializing phase. */
  reset: () => void;
  /**
   * Turns the victory auto-restart countdown on or off. Enabling it during the
   * victory phase restarts that countdown; disabling it keeps the match frozen
   * until `reset()` (or the user) starts the next round.
   */
  setAutoRestartEnabled: (enabled: boolean) => void;
  /**
   * Advances the state machine by a time delta.
   * Handles timer countdowns.
   * @param deltaMs - Time elapsed in ms.
   * @returns True if the match should be restarted immediately.
   */
  tick: (deltaMs: number) => boolean;
  /** Returns the current state snapshot. */
  getSnapshot: () => MatchStateSnapshot;
}

const INITIAL_STATE: Omit<MatchStateSnapshot, "autoRestartEnabled"> = {
  phase: "initializing",
  elapsedMs: 0,
  restartTimerMs: null,
  winner: null,
  isDraw: false,
};

function createInitialState(autoRestartEnabled: boolean): MatchStateSnapshot {
  return { ...INITIAL_STATE, autoRestartEnabled };
}

/**
 * Creates a state machine to manage the lifecycle of a match.
 * @param options - Configuration options.
 * @returns A MatchStateMachine instance.
 */
export function createMatchStateMachine(
  options: MatchStateOptions = {},
): MatchStateMachine {
  const autoRestartDelayMs = options.autoRestartDelayMs ?? 2000;
  let autoRestartEnabled = options.autoRestartEnabled ?? true;
  let current: MatchStateSnapshot = createInitialState(autoRestartEnabled);

  // Without auto-restart the victory phase has no countdown at all; the world
  // stays frozen and the summary stays on screen.
  const victoryTimer = (restartDelayMs?: number): number | null =>
    autoRestartEnabled ? (restartDelayMs ?? autoRestartDelayMs) : null;

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
        isDraw: false,
        restartTimerMs: victoryTimer(restartDelayMs),
      });
    },
    declareDraw: (restartDelayMs) => {
      transition({
        phase: "victory",
        winner: null,
        isDraw: true,
        restartTimerMs: victoryTimer(restartDelayMs),
      });
    },
    reset: () => {
      current = createInitialState(autoRestartEnabled);
      emit();
    },
    setAutoRestartEnabled: (enabled) => {
      if (autoRestartEnabled === enabled) {
        return;
      }
      autoRestartEnabled = enabled;
      const inVictory = current.phase === "victory";
      transition({
        autoRestartEnabled: enabled,
        restartTimerMs: inVictory
          ? enabled
            ? (current.restartTimerMs ?? autoRestartDelayMs)
            : null
          : current.restartTimerMs,
      });
    },
    tick: (deltaMs: number) => {
      if (current.phase === "running") {
        current = {
          ...current,
          elapsedMs: current.elapsedMs + deltaMs,
        };
        // Deliberately silent: elapsedMs advances every simulation step and
        // nothing in the UI renders it. Notifying here would re-render React
        // at frame rate. Consumers that need it call getSnapshot().
        return false;
      }

      if (current.phase === "victory" && current.restartTimerMs != null) {
        const nextTimer = current.restartTimerMs - deltaMs;
        if (nextTimer > 0) {
          const secondsChanged =
            Math.ceil(nextTimer / 1000) !==
            Math.ceil(current.restartTimerMs / 1000);
          current = {
            ...current,
            restartTimerMs: nextTimer,
          };
          // The HUD shows whole seconds, so only notify when they change.
          if (secondsChanged) emit();
          return false;
        }

        current = createInitialState(autoRestartEnabled);
        emit();
        return true;
      }

      return false;
    },
    getSnapshot: () => current,
  };
}
