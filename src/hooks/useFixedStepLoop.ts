import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { FixedStepDriver } from "../utils/fixedStepDriver";
import { RegisteredFixedStepHandle,registerFixedStepHandle, unregisterFixedStepHandle } from "../utils/loopDriverRegistry";

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
  autonomous?: boolean; // whether the RAF-driven autonomous stepping is enabled (default: false)
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
    autonomous: options.autonomous ?? false,
  });
  // Test-only instrumentation hook (guarded by NODE_ENV)
  const instrumentationHookRef = useRef<TestInstrumentationHook | null>(null);
  const lastLogRef = useRef<number>(0);

  onStepRef.current = onStep;
  optionsRef.current.enabled = options.enabled;
  optionsRef.current.seed = options.seed;
  optionsRef.current.step = options.step;
  optionsRef.current.maxStepsPerFrame = options.maxStepsPerFrame;
  optionsRef.current.maxAccumulatedSteps = options.maxAccumulatedSteps;
  optionsRef.current.testMode = options.testMode;
  optionsRef.current.autonomous = options.autonomous ?? false; // default to false

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

  // useFrame stepping is retained as a fallback when consumers opt into
  // autonomous stepping via the `autonomous` option. This keeps compatibility
  // for small demos and local experimentation while encouraging the central
  // LoopDriver for production and tests.
  useFrame((_, delta) => {
    const { enabled, step, maxStepsPerFrame, maxAccumulatedSteps, testMode, autonomous } =
      optionsRef.current;

    if (!autonomous && !(process.env.NODE_ENV === 'test' || optionsRef.current.testMode)) {
      // When not autonomous and not in test mode, do not step in useFrame
      return;
    }

    if (!enabled || testMode) {
      return;
    }

    // Defensive guard: if step is invalid, skip stepping to avoid pathological loops
    if (!step || step <= 0) {
      console.error('[useFixedStepLoop] invalid step value in useFrame:', step);
      metricsRef.current = { stepsLastFrame: 0, backlog: 0 };
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

    // Throttled logging for useFrame path as well
    try {
      const nowMs = performance.now();
      if (nowMs - lastLogRef.current >= 1000) {
        lastLogRef.current = nowMs;
        console.info('[FixedStepLoop][useFrame] stepSeconds=', stepSeconds, 'metrics=', metricsRef.current);
      }
    } catch {
      // ignore
    }
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

  // Build the public handle object and register it with the central LoopDriver
  // so an external LoopDriver component can find and step it.
  const handle = useMemo(() => ({
    step: stepManual,
    pause,
    resume,
    reset,
    getDriver,
    getLastStepContext,
    getMetrics,
    // Only expose instrumentation hook in test mode
    ...(process.env.NODE_ENV === 'test' ? { __testSetInstrumentationHook: setInstrumentationHook } : {}),
  }), [getDriver, getLastStepContext, getMetrics, pause, reset, resume, stepManual, setInstrumentationHook]);

  useEffect(() => {
    // Register this handle so external drivers can step it. The registry only
    // keeps a single handle for now because the repo currently supports a
    // single authoritative simulation instance per Canvas.
    registerFixedStepHandle(handle as RegisteredFixedStepHandle);
    return () => unregisterFixedStepHandle(handle as RegisteredFixedStepHandle);
  }, [handle]);

  return handle;
}
