import { useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useEffect, useRef } from 'react';

import { getFixedStepHandle } from '../utils/loopDriverRegistry';
import { updateFixedStepMetrics } from '../utils/sceneMetrics';

export type LoopDriverOptions = {
  enabled?: boolean;
  hz?: number; // target invalidation Hz
  stepSeconds?: number; // fixed-step seconds (simulation timestep)
  maxStepsPerFrame?: number;
  maxAccumulatedSteps?: number;
  manualRapierStep?: boolean; // when true attempt to call Rapier world.step() after each sim step
};

// Hook-based loop driver. Mount as a component (see LoopDriver.tsx) but internals
// are kept in a hook to allow programmatic control in tests if needed.
export function useLoopDriver(options: LoopDriverOptions = {}) {
  const {
    enabled = true,
    hz = 60,
    stepSeconds = 1 / 60,
    maxStepsPerFrame = 5,
    maxAccumulatedSteps = undefined,
    manualRapierStep = true,
  } = options;

  const { invalidate } = useThree();
  const rapier = useRapier() as unknown;

  const accumulatorRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    lastTimeRef.current = performance.now();

    const maxAccumSteps = Math.max(
      maxStepsPerFrame,
      maxAccumulatedSteps ?? maxStepsPerFrame * 8,
    );

    const loop = (now: number) => {
      try {
        if (!mounted) return;
        rafRef.current = requestAnimationFrame(loop);

        if (lastTimeRef.current === null) lastTimeRef.current = now;
        let deltaMs = now - lastTimeRef.current;
        lastTimeRef.current = now;

        // Cap delta to avoid spiral of death
        const cappedDeltaSec = Math.min(deltaMs / 1000, stepSeconds * maxAccumSteps);
        accumulatorRef.current = Math.min(accumulatorRef.current + cappedDeltaSec, stepSeconds * maxAccumSteps);

        let stepsThisFrame = 0;
        const handle = getFixedStepHandle();
        while (accumulatorRef.current >= stepSeconds && stepsThisFrame < maxStepsPerFrame) {
          try {
            handle?.step?.();
          } catch (err) {
            console.error('[LoopDriver] error stepping fixed-step handle:', err);
          }

          // Optionally attempt to step Rapier manually. This is guarded and
          // tolerant of varying wrapper shapes — we only call when explicitly enabled.
          if (manualRapierStep && rapier) {
            try {
              // Prefer the top-level `step` helper when available: `const { step } = useRapier(); step(dt)`
              const rapierAny = rapier as unknown as { step?: (dt?: number) => void; world?: unknown };
              if (typeof rapierAny.step === 'function') {
                rapierAny.step?.(stepSeconds);
              } else if (rapierAny.world) {
                const rw = rapierAny.world as unknown as {
                  step?: () => void;
                  raw?: { step?: () => void; physics?: { step?: () => void } };
                };
                if (typeof rw.step === 'function') {
                  // Some wrappers expose a world.step() expecting no args
                  rw.step();
                } else if (rw.raw && typeof rw.raw.step === 'function') {
                  rw.raw.step();
                } else if (rw.raw && rw.raw.physics && typeof rw.raw.physics.step === 'function') {
                  rw.raw.physics.step();
                }
              }
            } catch (err) {
              // Don't escalate — Rapier wrappers can vary across versions.
              console.warn('[LoopDriver] manualRapierStep requested but stepping failed:', err);
            }
          }

          accumulatorRef.current -= stepSeconds;
          stepsThisFrame++;
        }

        // Invalidate once after performing steps so the Canvas renders the
        // authoritative state. If nothing changed, invalidate() is still safe.
        try {
          invalidate();
        } catch {
          // swallow in non-render contexts or tests
        }

        updateFixedStepMetrics({
          lastRafTimestamp: now,
          invalidationsPerRaf: 1,
          stepsLastFrame: stepsThisFrame,
          backlog: Math.floor(accumulatorRef.current / stepSeconds),
        });
      } catch (err) {
        console.error('[LoopDriver] loop error:', err);
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, hz, stepSeconds, maxStepsPerFrame, maxAccumulatedSteps, invalidate, rapier, manualRapierStep]);
}
