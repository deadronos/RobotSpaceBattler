import { useEffect, useState } from "react";

/** HUD refresh rate for values that change continuously (about 4 Hz). */
export const HUD_REFRESH_MS = 250;

/**
 * Returns a counter that increments every `intervalMs`. HUD panels that read
 * mutable ECS data at render time use it to refresh at a throttled rate
 * instead of the simulation frame rate.
 */
export function useHudTick(intervalMs: number = HUD_REFRESH_MS): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => (t + 1) & 0xffff),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}
