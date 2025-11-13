/**
 * Laser Beam System
 * Task: T018
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Implements continuous beam damage with 60Hz tick rate
 * Tracks frameIndex for deterministic replay
 */

import type { WeaponTelemetryEvent } from "../../lib/weapons/types";

/**
 * Default laser tick rate (60Hz = ~16.67ms per tick)
 */
const DEFAULT_TICK_RATE = 60;

/**
 * Laser beam parameters
 */
export interface LaserBeamParams {
  id: string;
  weaponProfileId: string;
  ownerId: string;
  targetId?: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  baseDamage: number;
  duration: number; // in seconds
  startTimeMs: number;
  matchId?: string;
  tickRate?: number; // Hz, default 60
}

/**
 * Active laser beam instance
 */
export interface LaserBeam {
  id: string;
  weaponProfileId: string;
  ownerId: string;
  targetId?: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  baseDamage: number;
  damagePerTick: number;
  duration: number;
  startTimeMs: number;
  endTimeMs: number;
  lastTickMs: number;
  tickRate: number;
  tickIntervalMs: number;
  frameIndex: number;
  matchId?: string;
}

/**
 * Create a laser beam instance
 */
export function createLaserBeam(params: LaserBeamParams): LaserBeam {
  const tickRate = params.tickRate ?? DEFAULT_TICK_RATE;
  const tickIntervalMs = 1000 / tickRate;
  const durationMs = params.duration * 1000;
  const expectedTicks = Math.ceil(durationMs / tickIntervalMs);
  const damagePerTick = params.baseDamage / expectedTicks;

  return {
    id: params.id,
    weaponProfileId: params.weaponProfileId,
    ownerId: params.ownerId,
    targetId: params.targetId,
    startPosition: [...params.startPosition] as [number, number, number],
    endPosition: [...params.endPosition] as [number, number, number],
    baseDamage: params.baseDamage,
    damagePerTick,
    duration: params.duration,
    startTimeMs: params.startTimeMs,
    endTimeMs: params.startTimeMs + durationMs,
    lastTickMs: params.startTimeMs,
    tickRate,
    tickIntervalMs,
    frameIndex: 0,
    matchId: params.matchId,
  };
}

/**
 * Laser beam system managing active beams
 */
export class LaserBeamSystem {
  private beams: Map<string, LaserBeam>;

  constructor() {
    this.beams = new Map();
  }

  /**
   * Start a new laser beam
   */
  startBeam(
    params: LaserBeamParams,
    recordEvent?: (event: WeaponTelemetryEvent) => void,
  ): LaserBeam {
    const beam = createLaserBeam(params);
    this.beams.set(beam.id, beam);

    // Emit weapon-fired event
    if (recordEvent && beam.matchId) {
      recordEvent({
        type: "weapon-fired",
        matchId: beam.matchId,
        weaponProfileId: beam.weaponProfileId,
        attackerId: beam.ownerId,
        targetId: beam.targetId,
        timestampMs: beam.startTimeMs,
        archetype: "laser",
      });
    }

    return beam;
  }

  /**
   * Update all active beams and emit damage events
   */
  update(
    currentMs: number,
    matchId: string,
    recordEvent?: (event: WeaponTelemetryEvent) => void,
  ): void {
    const beamsToRemove: string[] = [];

    this.beams.forEach((beam) => {
      // Check if beam has expired
      if (currentMs >= beam.endTimeMs) {
        beamsToRemove.push(beam.id);
        return;
      }

      // Check if it's time for next tick (with tolerance)
      const timeSinceLastTick = currentMs - beam.lastTickMs;
      const tickTolerance = 16; // ±16ms tolerance as per spec

      if (timeSinceLastTick >= beam.tickIntervalMs - tickTolerance) {
        // Emit damage event for this tick
        beam.frameIndex++;
        beam.lastTickMs = currentMs;

        if (recordEvent) {
          recordEvent({
            type: "weapon-damage",
            matchId,
            weaponProfileId: beam.weaponProfileId,
            attackerId: beam.ownerId,
            targetId: beam.targetId,
            amount: beam.damagePerTick,
            timestampMs: currentMs,
            frameIndex: beam.frameIndex,
            archetype: "laser",
          });
        }
      }
    });

    // Remove expired beams
    beamsToRemove.forEach((id) => this.beams.delete(id));
  }

  /**
   * Get all active beams
   */
  getActiveBeams(): LaserBeam[] {
    return Array.from(this.beams.values());
  }

  /**
   * Get beam by ID
   */
  getBeam(id: string): LaserBeam | undefined {
    return this.beams.get(id);
  }

  /**
   * Remove a specific beam
   */
  removeBeam(id: string): void {
    this.beams.delete(id);
  }

  /**
   * Clear all beams
   */
  clear(): void {
    this.beams.clear();
  }

  /**
   * Get count of active beams
   */
  count(): number {
    return this.beams.size;
  }
}
