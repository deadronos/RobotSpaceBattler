/**
 * In-Memory Telemetry Aggregator
 * Spec: specs/005-weapon-diversity/spec.md (FR-009)
 * 
 * Provides fast in-memory aggregation of weapon telemetry events
 * for test harnesses and live analysis. Complements MatchTrace for
 * persisted replay data.
 */

import type {
  TelemetryAggregator as ITelemetryAggregator,
  WeaponArchetype,
  WeaponTelemetryEvent,
  WeaponTelemetryEventType,
} from '../lib/weapons/types';

/**
 * Match statistics tracked by the aggregator
 */
interface MatchStats {
  matchId: string;
  startTimeMs: number;
  eventCountsByType: Record<WeaponTelemetryEventType, number>;
  damageTotalsByWeapon: Record<string, number>;
  damageByArchetype: Record<WeaponArchetype, number>;
  pickupsByWeapon: Record<string, number>;
  shotsFiredByWeapon: Record<string, number>;
  hitsRegisteredByWeapon: Record<string, number>;
  events: WeaponTelemetryEvent[];
}

/**
 * In-memory telemetry aggregator for test harness and live runs
 */
export class TelemetryAggregator {
  private activeMatch: MatchStats | null = null;
  private completedMatches: Map<string, MatchStats> = new Map();

  /**
   * Start tracking a new match
   */
  startMatch(matchId: string): void {
    if (this.activeMatch && this.activeMatch.matchId !== matchId) {
      // Save previous match before starting new one
      this.completedMatches.set(this.activeMatch.matchId, this.activeMatch);
    }

    this.activeMatch = {
      matchId,
      startTimeMs: Date.now(),
      eventCountsByType: {
        'pickup-acquired': 0,
        'weapon-fired': 0,
        'weapon-hit': 0,
        'explosion-aoe': 0,
        'weapon-damage': 0,
      },
      damageTotalsByWeapon: {},
      damageByArchetype: {
        gun: 0,
        laser: 0,
        rocket: 0,
      },
      pickupsByWeapon: {},
      shotsFiredByWeapon: {},
      hitsRegisteredByWeapon: {},
      events: [],
    };
  }

  /**
   * Record a weapon telemetry event
   */
  record(event: WeaponTelemetryEvent): void {
    if (!this.activeMatch) {
      console.warn('No active match. Call startMatch() first.');
      return;
    }

    if (event.matchId !== this.activeMatch.matchId) {
      console.warn(`Event matchId ${event.matchId} doesn't match active match ${this.activeMatch.matchId}`);
      return;
    }

    // Increment event type counter
    this.activeMatch.eventCountsByType[event.type]++;

    // Store event for detailed analysis
    this.activeMatch.events.push(event);

    // Update aggregates based on event type
    switch (event.type) {
      case 'pickup-acquired':
        this.activeMatch.pickupsByWeapon[event.weaponProfileId] =
          (this.activeMatch.pickupsByWeapon[event.weaponProfileId] || 0) + 1;
        break;

      case 'weapon-fired':
        this.activeMatch.shotsFiredByWeapon[event.weaponProfileId] =
          (this.activeMatch.shotsFiredByWeapon[event.weaponProfileId] || 0) + 1;
        break;

      case 'weapon-hit':
        this.activeMatch.hitsRegisteredByWeapon[event.weaponProfileId] =
          (this.activeMatch.hitsRegisteredByWeapon[event.weaponProfileId] || 0) + 1;
        break;

      case 'weapon-damage':
        if (event.amount !== undefined) {
          // Aggregate by weapon profile
          this.activeMatch.damageTotalsByWeapon[event.weaponProfileId] =
            (this.activeMatch.damageTotalsByWeapon[event.weaponProfileId] || 0) + event.amount;

          // Aggregate by archetype
          if (event.archetype) {
            this.activeMatch.damageByArchetype[event.archetype] += event.amount;
          }
        }
        break;

      case 'explosion-aoe':
        // AoE events are tracked in counts but don't aggregate separately
        break;
    }
  }

  /**
   * Get summary of current match
   */
  summary(): ITelemetryAggregator {
    if (!this.activeMatch) {
      throw new Error('No active match. Call startMatch() first.');
    }

    return {
      matchId: this.activeMatch.matchId,
      eventCountsByType: { ...this.activeMatch.eventCountsByType },
      damageTotalsByWeapon: { ...this.activeMatch.damageTotalsByWeapon },
      winCountsByArchetype: { gun: 0, laser: 0, rocket: 0 }, // Updated externally
      timestampMs: Date.now() - this.activeMatch.startTimeMs,
    };
  }

  /**
   * Get detailed stats for current match (for test assertions)
   */
  getMatchStats(): MatchStats | null {
    return this.activeMatch;
  }

  /**
   * End current match and archive it
   */
  endMatch(): void {
    if (this.activeMatch) {
      this.completedMatches.set(this.activeMatch.matchId, this.activeMatch);
      this.activeMatch = null;
    }
  }

  /**
   * Get stats for a completed match
   */
  getCompletedMatch(matchId: string): MatchStats | undefined {
    return this.completedMatches.get(matchId);
  }

  /**
   * Get all events for current or completed match
   */
  getEvents(matchId?: string): WeaponTelemetryEvent[] {
    if (matchId) {
      const match = this.completedMatches.get(matchId);
      return match ? match.events : [];
    }
    return this.activeMatch ? this.activeMatch.events : [];
  }

  /**
   * Clear all data (for test cleanup)
   */
  reset(): void {
    this.activeMatch = null;
    this.completedMatches.clear();
  }

  /**
   * Calculate accuracy for a weapon
   */
  getAccuracy(weaponProfileId: string): number {
    if (!this.activeMatch) return 0;

    const shots = this.activeMatch.shotsFiredByWeapon[weaponProfileId] || 0;
    const hits = this.activeMatch.hitsRegisteredByWeapon[weaponProfileId] || 0;

    return shots > 0 ? hits / shots : 0;
  }

  /**
   * Get damage statistics by archetype
   */
  getDamageByArchetype(): Record<WeaponArchetype, number> {
    if (!this.activeMatch) {
      return { gun: 0, laser: 0, rocket: 0 };
    }

    return { ...this.activeMatch.damageByArchetype };
  }
}

/**
 * Global singleton instance for easy access in tests and runtime
 */
export const globalTelemetryAggregator = new TelemetryAggregator();
