import type { Position } from "./types";

export type LiveTraceSpawnEvent = {
  type: "spawn";
  entityId: string;
  teamId: string;
  position: Position;
  timestampMs: number;
};

export type LiveTraceFireEvent = {
  type: "fire";
  attackerId: string;
  projectileId: string;
  position: Position;
  timestampMs: number;
};

export type LiveTraceDamageEvent = {
  type: "damage";
  targetId: string;
  attackerId?: string;
  amount: number;
  resultingHealth: number;
  timestampMs: number;
};

export type LiveTraceDeathEvent = {
  type: "death";
  entityId: string;
  killedBy?: string;
  timestampMs: number;
};

export type LiveTraceEvent =
  | LiveTraceSpawnEvent
  | LiveTraceFireEvent
  | LiveTraceDamageEvent
  | LiveTraceDeathEvent;

type LiveTraceListener = (event: LiveTraceEvent) => void;

const listeners = new Set<LiveTraceListener>();

export function emitLiveTraceEvent(event: LiveTraceEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      // Listener errors should not break simulation; log for visibility.
      console.error("[live-trace] listener error", error);
    }
  });
}

export function subscribeLiveTraceEvents(
  listener: LiveTraceListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearLiveTraceListeners(): void {
  listeners.clear();
}
