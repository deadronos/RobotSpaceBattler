/**
 * Deterministic Beam component schema.
 */

import { ensureGameplayId } from "../id";

export interface BeamComponent {
  id: string;
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  ticksRemaining: number;
  tickIntervalMs: number;
  damagePerTick: number;
  spawnedAtMs: number;
}

export interface BeamInit {
  id: string | number;
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  ticksRemaining: number;
  tickIntervalMs: number;
  damagePerTick: number;
  spawnedAtMs: number;
}

export function createBeamComponent(init: BeamInit): BeamComponent {
  return {
    id: ensureGameplayId(init.id),
    origin: { ...init.origin },
    direction: { ...init.direction },
    ticksRemaining: init.ticksRemaining,
    tickIntervalMs: init.tickIntervalMs,
    damagePerTick: init.damagePerTick,
    spawnedAtMs: init.spawnedAtMs,
  };
}
