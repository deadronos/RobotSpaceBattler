/**
 * Simulation speed multipliers (#170).
 *
 * The simulation always steps at a fixed 1/60 s. A speed only scales how much
 * wall-clock time the accumulator is fed per frame, so a seed plays out the
 * same at every speed.
 */
export const SIM_SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

/** A supported simulation speed multiplier. */
export type SimSpeed = (typeof SIM_SPEED_OPTIONS)[number];

/** Speed the app and the runner start at. */
export const DEFAULT_SIM_SPEED: SimSpeed = 1;

/**
 * Snaps an arbitrary value to the nearest supported speed. Non-finite values
 * fall back to 1×.
 */
export function normalizeSimSpeed(value: number): SimSpeed {
  if (!Number.isFinite(value)) {
    return DEFAULT_SIM_SPEED;
  }

  let nearest: SimSpeed = SIM_SPEED_OPTIONS[0];
  for (const option of SIM_SPEED_OPTIONS) {
    if (Math.abs(option - value) < Math.abs(nearest - value)) {
      nearest = option;
    }
  }
  return nearest;
}

/**
 * Scales the per-frame substep budget with the speed, so 4× still has headroom
 * to run four 1/60 s steps per rendered frame. Rounded up and never below one.
 */
export function scaledSubstepCap(baseCap: number, speed: number): number {
  return Math.max(1, Math.ceil(baseCap * normalizeSimSpeed(speed)));
}

/** Display label for a speed, e.g. `0.5×` or `2×`. */
export function formatSimSpeed(speed: number): string {
  return `${normalizeSimSpeed(speed)}×`;
}
