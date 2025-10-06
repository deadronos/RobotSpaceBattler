import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useReducer, useRef } from "react";

import type { PerformanceOverlayState } from "../ecs/simulation/performance";
import type { SimulationWorld } from "../ecs/world";
import {
  getPerformanceOverlayState,
  getSimulationState,
  recordFrameMetrics,
  setAutoScalingEnabled,
} from "../ecs/world";
import type { PerformanceStats } from "../types";

export interface FrameSubscriber {
  (callback: (state: unknown, delta: number) => void): void | (() => void);
}

export interface UsePerformanceManagerOptions {
  world: SimulationWorld;
  /** Optional override for registering frame callbacks (defaults to @react-three/fiber useFrame). */
  useFrameHook?: FrameSubscriber;
  /** Minimum delta time to consider when computing FPS to avoid division by zero. */
  minDelta?: number;
  /** Maximum delta time to clamp spikes, keeping FPS calculations stable. */
  maxDelta?: number;
}

export interface PerformanceManagerHandle {
  /** Latest performance statistics mirrored from the simulation state. */
  stats: PerformanceStats;
  /** Overlay visibility/auto-scaling state. */
  overlay: PerformanceOverlayState;
  /** Record a manual FPS sample (used in tests or external integrations). */
  recordSample: (fps: number) => void;
  /** Toggle automatic quality scaling. */
  setAutoScaling: (enabled: boolean) => void;
}

const DEFAULT_MIN_DELTA = 1 / 240; // 240 fps upper bound
const DEFAULT_MAX_DELTA = 0.25; // 4 fps lower bound

export function usePerformanceManager({
  world,
  useFrameHook,
  minDelta = DEFAULT_MIN_DELTA,
  maxDelta = DEFAULT_MAX_DELTA,
}: UsePerformanceManagerOptions): PerformanceManagerHandle {
  const statsRef = useRef<PerformanceStats>(
    getSimulationState(world).performanceStats,
  );
  const overlayRef = useRef<PerformanceOverlayState>(
    getPerformanceOverlayState(world),
  );

  const [, forceUpdate] = useReducer((value) => value + 1, 0);

  const clampDelta = useCallback(
    (delta: number) => {
      if (!Number.isFinite(delta) || delta <= 0) {
        return minDelta;
      }
      return Math.min(Math.max(delta, minDelta), maxDelta);
    },
    [maxDelta, minDelta],
  );

  const syncFromWorld = useCallback(
    (fps: number) => {
      const safeFps = Number.isFinite(fps) && fps >= 0 ? fps : 0;
      recordFrameMetrics(world, safeFps);
      statsRef.current = getSimulationState(world).performanceStats;
      overlayRef.current = getPerformanceOverlayState(world);
      forceUpdate();
    },
    [world],
  );

  const stepRef = useRef(syncFromWorld);
  stepRef.current = syncFromWorld;

  const frameHookRef = useRef(useFrameHook);
  frameHookRef.current = useFrameHook;

  const handleFrame = useCallback(
    (_state: unknown, delta: number) => {
      const clamped = clampDelta(delta);
      const fps = clamped > 0 ? 1 / clamped : 0;
      stepRef.current(fps);
    },
    [clampDelta],
  );

  try {
    useFrame((state, delta) => {
      if (frameHookRef.current) {
        return;
      }
      handleFrame(state, delta);
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
    const unsubscribe = subscribe(handleFrame);
    if (typeof unsubscribe === "function") {
      return () => {
        unsubscribe();
      };
    }
    return undefined;
  }, [handleFrame, useFrameHook]);

  const recordSample = useCallback((fps: number) => {
    stepRef.current(fps);
  }, []);

  const setAutoScaling = useCallback(
    (enabled: boolean) => {
      setAutoScalingEnabled(world, enabled);
      overlayRef.current = getPerformanceOverlayState(world);
      forceUpdate();
    },
    [world],
  );

  return {
    stats: statsRef.current,
    overlay: overlayRef.current,
    recordSample,
    setAutoScaling,
  };
}
