import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { SimulationWorld } from "../ecs/world";
import { stepSimulation } from "../ecs/world";

export interface FrameSubscription {
  (callback: (state: unknown, delta: number) => void): void | (() => void);
}

export interface UsePhysicsSyncOptions {
  world: SimulationWorld;
  /** Fixed simulation step in seconds (default: 1/60). */
  fixedDelta?: number;
  /** Maximum number of fixed steps to process per frame to avoid spiral of death (default: 5). */
  maxSubSteps?: number;
  /** Optional frame hook override for testing (defaults to @react-three/fiber useFrame). */
  useFrameHook?: FrameSubscription;
}

export interface PhysicsSyncController {
  /** Manually advance the simulation by an arbitrary delta time. */
  step: (deltaTime: number) => void;
  /** Reset the internal time accumulator. */
  reset: () => void;
}

const DEFAULT_FIXED_DELTA = 1 / 60;
const DEFAULT_MAX_SUB_STEPS = 5;

export function usePhysicsSync({
  world,
  fixedDelta = DEFAULT_FIXED_DELTA,
  maxSubSteps = DEFAULT_MAX_SUB_STEPS,
  useFrameHook,
}: UsePhysicsSyncOptions): PhysicsSyncController {
  const accumulatorRef = useRef(0);
  const stepRef = useRef<(deltaTime: number) => void>(() => undefined);

  const applyStep = useCallback(
    (deltaTime: number) => {
      if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
        return;
      }

      accumulatorRef.current += deltaTime;
      let steps = 0;
      while (accumulatorRef.current >= fixedDelta && steps < maxSubSteps) {
        stepSimulation(world, fixedDelta);
        accumulatorRef.current -= fixedDelta;
        steps += 1;
      }

      if (steps === maxSubSteps) {
        accumulatorRef.current = 0;
      }
    },
    [fixedDelta, maxSubSteps, world],
  );

  stepRef.current = applyStep;

  const frameHookRef = useRef(useFrameHook);
  frameHookRef.current = useFrameHook;

  const processFrame = useCallback((delta: number) => {
    stepRef.current(delta);
  }, []);

  try {
    useFrame((_, delta) => {
      if (frameHookRef.current) {
        return;
      }
      processFrame(delta);
    });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes(
        "Hooks can only be used within the Canvas component",
      )
    ) {
      throw error;
    }
  }

  useEffect(() => {
    const subscribe = frameHookRef.current;
    if (!subscribe) {
      return undefined;
    }

    const unsubscribe = subscribe((_, delta) => {
      processFrame(delta);
    });

    if (typeof unsubscribe === "function") {
      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [processFrame, useFrameHook]);

  const reset = useCallback(() => {
    accumulatorRef.current = 0;
  }, []);

  return useMemo(
    () => ({
      step: applyStep,
      reset,
    }),
    [applyStep, reset],
  );
}
