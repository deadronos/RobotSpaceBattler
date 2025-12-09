import { TeamId } from '../../lib/teamConfig';

/**
 * Enumeration of possible phases in a match lifecycle.
 */
export type MatchRuntimePhase = 'initializing' | 'running' | 'paused' | 'victory';

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
}

/**
 * Configuration options for the state machine.
 */
export interface MatchStateOptions {
  /** Delay in ms before restarting after victory (default 2000). */
  autoRestartDelayMs?: number;
  /** Callback triggered whenever the state changes. */
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
  /** Resets the match to the initializing phase. */
  reset: () => void;
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

const INITIAL_STATE: MatchStateSnapshot = {
  phase: 'initializing',
  elapsedMs: 0,
  restartTimerMs: null,
  winner: null,
};

/**
 * Creates a state machine to manage the lifecycle of a match.
 * @param options - Configuration options.
 * @returns A MatchStateMachine instance.
 */
export function createMatchStateMachine(options: MatchStateOptions = {}): MatchStateMachine {
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
        phase: 'running',
        restartTimerMs: null,
      });
    },
    pause: () => {
      if (current.phase === 'running') {
        transition({ phase: 'paused' });
      }
    },
    resume: () => {
      if (current.phase === 'paused') {
        transition({ phase: 'running' });
      }
    },
    declareVictory: (winner, restartDelayMs) => {
      transition({
        phase: 'victory',
        winner,
        restartTimerMs: restartDelayMs ?? autoRestartDelayMs,
      });
    },
    reset: () => {
      current = { ...INITIAL_STATE };
      emit();
    },
    tick: (deltaMs: number) => {
      if (current.phase === 'running') {
        current = {
          ...current,
          elapsedMs: current.elapsedMs + deltaMs,
        };
        emit();
        return false;
      }

      if (current.phase === 'victory' && current.restartTimerMs != null) {
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
