/**
 * Reduced-motion visual budget (#166).
 *
 * Rendering-only: this resolves which optional visual layers may run. The
 * simulation is untouched, so reduced motion cannot change a match outcome.
 */
export interface MotionEffects {
  /** Post-processing composer (bloom, chromatic aberration, tone mapping). */
  postprocessing: boolean;
  /** Additive hit and muzzle flash layer. */
  hitAndMuzzleFlashes: boolean;
  /** OrbitControls inertia after a drag or key release. */
  cameraDamping: boolean;
}

export interface MotionEffectInput {
  /** Whether the quality settings currently allow post-processing. */
  postprocessingEnabled: boolean;
  /** The user/OS reduced-motion preference. */
  reducedMotion: boolean;
}

/**
 * Reduces post-processing, flashes and camera inertia when reduced motion is
 * requested. Projectiles, lasers and health feedback stay on: they carry
 * gameplay information, while the optional layers above are decoration.
 */
export function resolveMotionEffects({
  postprocessingEnabled,
  reducedMotion,
}: MotionEffectInput): MotionEffects {
  if (reducedMotion) {
    return {
      postprocessing: false,
      hitAndMuzzleFlashes: false,
      cameraDamping: false,
    };
  }
  return {
    postprocessing: postprocessingEnabled,
    hitAndMuzzleFlashes: true,
    cameraDamping: true,
  };
}
