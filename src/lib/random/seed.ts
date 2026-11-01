/**
 * Top-level seed fallback. This is the only place that reads wall-clock time
 * to produce a seed; callers must let an explicit seed always take precedence
 * (`options.seed ?? generateSeed()`). Simulation systems never call this.
 */
export function generateSeed(): number {
  return Date.now() >>> 0;
}
