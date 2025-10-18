/**
 * RNG Manager — Deterministic Random Number Generation for Replay
 *
 * Provides seeded PRNG implementations for deterministic simulation replay.
 * Enables recording and replaying matches with exact RNG state for validation.
 * Implements xorshift32 algorithm for fast, deterministic number generation (T035, US3).
 *
 * Responsibilities:
 * - Initialize PRNG with explicit seed
 * - Generate sequences of deterministic random numbers
 * - Seed and reset operations for replay
 * - Algorithm identification for cross-implementation verification
 */

// ============================================================================
// Constants & Algorithm Identification
// ============================================================================

export const RNG_ALGORITHM_ID = 'xorshift32-v1';
export const RNG_ALGORITHM_VERSION = 1;

// ============================================================================
// RNG Manager Class (xorshift32 implementation)
// ============================================================================

/**
 * Deterministic PRNG using xorshift32 algorithm.
 *
 * Properties:
 * - Fast: O(1) per number generation
 * - Deterministic: Same seed → same sequence
 * - Portable: Standard algorithm, reproducible across languages
 * - Single state variable: Easy to serialize and reset
 *
 * Mathematical basis: Xorshift (Marsaglia, 2003)
 * Period: ~2^32 - 1 (sufficient for match-duration randomness)
 */
export class RNGManager {
  private seed: number;
  private state: number;
  private callCount: number = 0;
  private algorithmId: string = RNG_ALGORITHM_ID;

  /**
   * Initialize RNG with a seed value.
   *
   * @param seed - Initial seed (unsigned 32-bit integer, 0 means no state)
   * @throws Error if seed is 0 (invalid for xorshift32)
   */
  constructor(seed: number = 1) {
    // Normalize seed to unsigned 32-bit range
    this.seed = Math.abs(seed) >>> 0; // Convert to unsigned 32-bit

    // Ensure non-zero seed for xorshift32 (zero would never change state)
    if (this.seed === 0) {
      this.seed = 1;
      console.warn(
        'RNGManager: seed was 0, reset to 1. xorshift32 requires non-zero seed.',
      );
    }

    this.state = this.seed;
  }

  /**
   * Generate next deterministic random number in range [0, 1).
   * Uses xorshift32 transformation.
   *
   * @returns Floating-point number in range [0, 1)
   */
  public next(): number {
    // xorshift32 state update
    // x ^= x << 13
    // x ^= x >> 17
    // x ^= x << 5
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0; // Keep as unsigned 32-bit

    this.callCount++;

    // Normalize to [0, 1) by dividing by 2^32
    return this.state / 0x100000000;
  }

  /**
   * Generate random integer in range [0, max).
   *
   * @param max - Upper bound (exclusive)
   * @returns Random integer in [0, max)
   */
  public nextInt(max: number): number {
    if (max <= 0) {
      throw new Error(`RNGManager.nextInt: max must be > 0, got ${max}`);
    }
    return Math.floor(this.next() * max);
  }

  /**
   * Generate random float in range [min, max).
   *
   * @param min - Lower bound (inclusive)
   * @param max - Upper bound (exclusive)
   * @returns Random float in [min, max)
   */
  public nextRange(min: number, max: number): number {
    if (min >= max) {
      throw new Error(
        `RNGManager.nextRange: min (${min}) must be < max (${max})`,
      );
    }
    return min + this.next() * (max - min);
  }

  /**
   * Generate random boolean with optional bias (default: 50/50).
   *
   * @param probability - Probability of true (0-1), default 0.5
   * @returns Random boolean
   */
  public nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Reset RNG state to initial seed.
   * Useful for replaying from a recorded trace.
   */
  public reset(): void {
    this.state = this.seed;
    this.callCount = 0;
  }

  /**
   * Seed the RNG with a new value and reset state.
   *
   * @param newSeed - New seed value
   */
  public setSeed(newSeed: number): void {
    this.seed = Math.abs(newSeed) >>> 0;
    if (this.seed === 0) {
      this.seed = 1;
    }
    this.state = this.seed;
    this.callCount = 0;
  }

  /**
   * Get current seed (for recording in MatchTrace).
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Get current state (for serialization if needed).
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Get algorithm identifier for cross-implementation validation.
   */
  public getAlgorithmId(): string {
    return this.algorithmId;
  }

  /**
   * Get number of random values generated since creation/reset.
   */
  public getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get metadata for recording in MatchTrace.
   */
  public getMetadata(): { rngSeed: number; rngAlgorithm: string } {
    return {
      rngSeed: this.seed,
      rngAlgorithm: this.algorithmId,
    };
  }

  /**
   * Debug string representation.
   */
  public toString(): string {
    return `RNGManager(seed=${this.seed}, state=${this.state}, calls=${this.callCount})`;
  }
}

// ============================================================================
// Singleton Instance & Factory
// ============================================================================

let globalRNG: RNGManager | null = null;

/**
 * Initialize and return global RNG instance.
 * Useful for replay scenarios where we need a consistent PRNG.
 *
 * @param seed - Seed value for initialization
 * @returns Initialized RNG instance
 */
export function initializeGlobalRNG(seed: number): RNGManager {
  globalRNG = new RNGManager(seed);
  return globalRNG;
}

/**
 * Get global RNG instance (must be initialized first).
 *
 * @returns Global RNG instance
 * @throws Error if not initialized
 */
export function getGlobalRNG(): RNGManager {
  if (!globalRNG) {
    throw new Error(
      'Global RNG not initialized. Call initializeGlobalRNG(seed) first.',
    );
  }
  return globalRNG;
}

/**
 * Reset global RNG to initial seed.
 */
export function resetGlobalRNG(): void {
  if (globalRNG) {
    globalRNG.reset();
  }
}

/**
 * Clean up global RNG instance (for testing).
 */
export function clearGlobalRNG(): void {
  globalRNG = null;
}
