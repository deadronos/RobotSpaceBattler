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

export type FixedStepLoopHandle = {
  step: () => StepContext | null;
  pause: () => PauseToken | undefined;
  resume: (token?: PauseToken) => void;
  reset: (options?: { seed?: number; step?: number }) => void;
  getDriver: () => FixedStepDriver | null;
  getLastStepContext: () => StepContext | null;
};

export function useFixedStepLoop(
  options: FixedStepLoopOptions,
  onStep: OnStep,
): FixedStepLoopHandle {
  const driverRef = useRef<FixedStepDriver | null>(null);
  const accumulatorRef = useRef(0);
  const lastStepContextRef = useRef<StepContext | null>(null);
  const onStepRef = useRef(onStep);
  const optionsRef = useRef({
    enabled: options.enabled,
    seed: options.seed,
    step: options.step,
    maxStepsPerFrame: options.maxStepsPerFrame,
    maxAccumulatedSteps: options.maxAccumulatedSteps,
    testMode: options.testMode,
  });

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
    const context = driver.stepOnce();
    lastStepContextRef.current = context;
    onStepRef.current?.(context);
    return context;
  }, []);

  useFrame((_, delta) => {
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

  const stepManual = useCallback(() => {
    return runStep();
  }, [runStep]);

  return useMemo(
    () => ({
      step: stepManual,
      pause,
      resume,
      reset,
      getDriver,
      getLastStepContext,
    }),
    [getDriver, getLastStepContext, pause, reset, resume, stepManual],
  );
}
