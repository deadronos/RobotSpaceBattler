/**
 * Neon pulse curve, shared by every arena pulse group (#229).
 *
 * The old `NeonGeometry` ran one `useFrame` per strip (34 of them) and wrote an
 * `emissiveIntensity` each. Now one callback per frame scales the material
 * colour of each pulsing group, so this is a pure function with a test.
 */
export const NEON_PULSE_RANGE = 0.2;

/** Smooth pulse between 0.8× and 1.2×; exactly 1 when the group is static. */
export function neonPulse(
  elapsedSeconds: number,
  flickerSpeed: number,
): number {
  if (flickerSpeed <= 0) return 1;
  return Math.sin(elapsedSeconds * flickerSpeed) * NEON_PULSE_RANGE + 1;
}
