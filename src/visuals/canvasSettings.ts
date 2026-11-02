/**
 * Canvas creation flags (#232).
 *
 * `antialias` is a WebGL context creation flag: it cannot be toggled without
 * recreating the context. When the post-processing composer runs, it renders
 * the scene into its own multisampled target, so the canvas MSAA is paid for
 * and thrown away. Decide it once, from the settings the app starts with.
 */
export function resolveCanvasAntialias(options: {
  postprocessingEnabled: boolean;
  reducedMotion: boolean;
}): boolean {
  // Reduced motion drops the composer (#166), so the canvas has to antialias.
  const composerRuns = options.postprocessingEnabled && !options.reducedMotion;
  return !composerRuns;
}
