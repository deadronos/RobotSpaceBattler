import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { FixedStepDriver } from "../utils/fixedStepDriver";

type StepContext = ReturnType<FixedStepDriver["stepOnce"]>;
type PauseToken = ReturnType<FixedStepDriver["pause"]>;
type OnStep = (ctx: StepContext) => void;

const DEFAULT_MAX_STEPS_PER_FRAME = 5;
const DEFAULT_BACKLOG_MULTIPLIER = 8; // allows up to 8 frames worth of backlog before clamping

export type FixedStepLoopOptions = {
  enabled: boolean;
  seed: number;
  step: number;
  maxStepsPerFrame?: number;
  maxAccumulatedSteps?: number;
  testMode?: boolean;
  friendlyFire?: boolean;
};

// Test-only instrumentation for T074/T076
type TestInstrumentationHook = (event: string, context?: unknown) => void;

export type FixedStepLoopHandle = {
  step: () => StepContext | null;
  pause: () => PauseToken | undefined;
  resume: (token?: PauseToken) => void;
  reset: (options?: { seed?: number; step?: number }) => void;
  getDriver: () => FixedStepDriver | null;
  getLastStepContext: () => StepContext | null;
  getMetrics: () => { stepsLastFrame: number; backlog: number };
  // Test-only: hook to observe internal events (guarded by NODE_ENV === 'test')
  __testSetInstrumentationHook?: (hook: TestInstrumentationHook | null) => void;
};

export function useFixedStepLoop(
  options: FixedStepLoopOptions,
  onStep: OnStep,
): FixedStepLoopHandle {
  const driverRef = useRef<FixedStepDriver | null>(null);
  const accumulatorRef = useRef(0);
  const lastStepContextRef = useRef<StepContext | null>(null);
  const metricsRef = useRef({ stepsLastFrame: 0, backlog: 0 });
  const onStepRef = useRef(onStep);
  const optionsRef = useRef({
    enabled: options.enabled,
    seed: options.seed,
    step: options.step,
    maxStepsPerFrame: options.maxStepsPerFrame,
    maxAccumulatedSteps: options.maxAccumulatedSteps,
    testMode: options.testMode,
  });
  // Test-only instrumentation hook (guarded by NODE_ENV)
  const instrumentationHookRef = useRef<TestInstrumentationHook | null>(null);

  // Flag indicating the RAF-driven autonomous stepping is active. When true
  // we avoid useFrame-driven stepping to prevent double-stepping.
  const autonomousActiveRef = useRef(false);

  onStepRef.current = onStep;
  optionsRef.current.enabled = options.enabled;
  optionsRef.current.seed = options.seed;
  optionsRef.current.step = options.step;
  optionsRef.current.maxStepsPerFrame = options.maxStepsPerFrame;
  optionsRef.current.maxAccumulatedSteps = options.maxAccumulatedSteps;
  optionsRef.current.testMode = options.testMode;

  useEffect(() => {
    driverRef.current = new FixedStepDriver(options.seed, options.step);
    accumulatorRef.current = 0;
    lastStepContextRef.current = null;
    return () => {
      driverRef.current = null;
    };
  }, [options.seed, options.step]);

  // Keep driver flags in sync when friendlyFire option changes
  useEffect(() => {
    if (driverRef.current) {
      driverRef.current.setFlags({ friendlyFire: options.friendlyFire });
    }
  }, [options.friendlyFire]);

  const runStep = useCallback((): StepContext | null => {
    const driver = driverRef.current;
    if (!driver) return null;
    // Test-only instrumentation: emit before stepping
    if (process.env.NODE_ENV === 'test' && instrumentationHookRef.current) {
      instrumentationHookRef.current('beforeStep', {});
    }
    const context = driver.stepOnce();
    lastStepContextRef.current = context;
    onStepRef.current?.(context);
    // Test-only instrumentation: emit after stepping
    if (process.env.NODE_ENV === 'test' && instrumentationHookRef.current) {
      instrumentationHookRef.current('afterStep', { frameCount: context.frameCount });
    }
    return context;
  }, []);

  // Autonomous RAF loop: steps the simulation even when three.js Canvas is
  // using frameloop="demand". Disabled for tests (testMode) so unit tests
  // can retain deterministic manual stepping.
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    if (process.env.NODE_ENV === 'test') return; // do not start RAF in tests

    let rafId: number | null = null;
    let lastTime = performance.now();

    autonomousActiveRef.current = true;

    const loop = (now: number) => {
      const { enabled, step, maxStepsPerFrame, maxAccumulatedSteps, testMode } =
        optionsRef.current;

      // Always schedule next RAF so loop remains active; only perform stepping
      // when enabled and not in test mode.
      try {
        // Schedule next frame first to ensure consistent cadence even if stepping throws
        rafId = requestAnimationFrame(loop);

        if (!enabled || testMode) {
          lastTime = now;
          // still update metrics to show zero steps and current backlog
          metricsRef.current = { stepsLastFrame: 0, backlog: Math.floor(accumulatorRef.current / (step || 1)) };
          return;
        }

        const stepSeconds = step;
        const stepsPerFrame = Math.max(1, maxStepsPerFrame ?? DEFAULT_MAX_STEPS_PER_FRAME);
        const maxAccumSteps = Math.max(
          stepsPerFrame,
          maxAccumulatedSteps ?? stepsPerFrame * DEFAULT_BACKLOG_MULTIPLIER,
        );

        // accumulate delta time in seconds
        const deltaSeconds = Math.min((now - lastTime) / 1000, stepSeconds * maxAccumSteps);
        accumulatorRef.current = Math.min(accumulatorRef.current + deltaSeconds, stepSeconds * maxAccumSteps);
        lastTime = now;

        let stepsThisFrame = 0;
        while (accumulatorRef.current >= stepSeconds && stepsThisFrame < stepsPerFrame) {
          runStep();
          accumulatorRef.current -= stepSeconds;
          stepsThisFrame++;
        }

        metricsRef.current = {
          stepsLastFrame: stepsThisFrame,
          backlog: Math.floor(accumulatorRef.current / stepSeconds),
        };
      } catch {
        // swallow errors in RAF loop to keep simulation resilient; continue scheduling
        lastTime = now;
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      autonomousActiveRef.current = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // Intentionally no dependencies - reads latest options via optionsRef
  }, [runStep]);

  // useFrame stepping is retained as a fallback when RAF autonomous stepping
  // is not active (for example in test environments). Guard against
  // double-stepping by returning early if the RAF driver is active.
  useFrame((_, delta) => {
    if (autonomousActiveRef.current) return;

    const { enabled, step, maxStepsPerFrame, maxAccumulatedSteps, testMode } =
      optionsRef.current;

    if (!enabled || testMode) {
      return;
    }

    const stepSeconds = step;
    const stepsPerFrame = Math.max(1, maxStepsPerFrame ?? DEFAULT_MAX_STEPS_PER_FRAME);
    const maxAccumSteps = Math.max(
      stepsPerFrame,
      maxAccumulatedSteps ?? stepsPerFrame * DEFAULT_BACKLOG_MULTIPLIER,
    );

    accumulatorRef.current = Math.min(
      accumulatorRef.current + delta,
      stepSeconds * maxAccumSteps,
    );

    let stepsThisFrame = 0;
    while (accumulatorRef.current >= stepSeconds && stepsThisFrame < stepsPerFrame) {
      runStep();
      accumulatorRef.current -= stepSeconds;
      stepsThisFrame++;
    }

    // Update metrics for diagnostics
    metricsRef.current = {
      stepsLastFrame: stepsThisFrame,
      backlog: Math.floor(accumulatorRef.current / stepSeconds),
    };
  });

  const pause = useCallback(() => {
    return driverRef.current?.pause();
  }, []);

  const resume = useCallback((token?: PauseToken) => {
    driverRef.current?.resume(token);
  }, []);

  const reset = useCallback((resetOptions?: { seed?: number; step?: number }) => {
    const driver = driverRef.current;
    if (!driver) return;
    const nextSeed = resetOptions?.seed ?? optionsRef.current.seed;
    const nextStep = resetOptions?.step ?? optionsRef.current.step;
    driver.reset(nextSeed, nextStep);
    optionsRef.current.seed = nextSeed;
    optionsRef.current.step = nextStep;
    accumulatorRef.current = 0;
    lastStepContextRef.current = null;
  }, []);

  const getDriver = useCallback(() => driverRef.current, []);

  const getLastStepContext = useCallback(() => lastStepContextRef.current, []);

  const getMetrics = useCallback(
    () => metricsRef.current,
    [],
  );

  const stepManual = useCallback(() => {
    return runStep();
  }, [runStep]);

  // Test-only hook setter (guarded by NODE_ENV)
  const setInstrumentationHook = useCallback((hook: TestInstrumentationHook | null) => {
    if (process.env.NODE_ENV === 'test') {
      instrumentationHookRef.current = hook;
    }
  }, []);

  return useMemo(
    () => ({
      step: stepManual,
      pause,
      resume,
      reset,
      getDriver,
      getLastStepContext,
      getMetrics,
      // Only expose instrumentation hook in test mode
      ...(process.env.NODE_ENV === 'test' ? { __testSetInstrumentationHook: setInstrumentationHook } : {}),
    }),
    [getDriver, getLastStepContext, getMetrics, pause, reset, resume, stepManual, setInstrumentationHook],
  );
}
