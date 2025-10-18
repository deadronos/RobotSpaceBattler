import React, { useEffect, useMemo, useRef } from "react";

import { useSimulationWorld } from "../ecs/world";
import { useLiveMatchTrace } from "../hooks/useLiveMatchTrace";
import { useVisualQuality } from "../hooks/useVisualQuality";
import type { FrameSubscription } from "../systems/physicsSync";
import { usePhysicsSync } from "../systems/physicsSync";
import { MatchSceneInner } from "./match/MatchSceneInner";

type SimulationProps = {
  /** Optional override for frame subscription (testing). */
  useFrameHook?: FrameSubscription;
};

export default function Simulation({
  useFrameHook: frameSubscription,
}: SimulationProps) {
  const world = useSimulationWorld();

  const frameSubscribersRef = useRef<
    Array<(state: unknown, delta: number) => void>
  >([]);

  const sharedFrameHook = useMemo<FrameSubscription | undefined>(() => {
    if (!frameSubscription) {
      return undefined;
    }

    return (callback) => {
      frameSubscribersRef.current.push(callback);
      return () => {
        frameSubscribersRef.current = frameSubscribersRef.current.filter(
          (existing) => existing !== callback,
        );
      };
    };
  }, [frameSubscription]);

  useEffect(() => {
    if (!frameSubscription) {
      return undefined;
    }

    const forwarder = (state: unknown, delta: number) => {
      frameSubscribersRef.current.forEach((callback) => {
        callback(state, delta);
      });
    };

    const unsubscribe = frameSubscription(forwarder);

    return () => {
      frameSubscribersRef.current = [];
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [frameSubscription]);

  usePhysicsSync({ world, useFrameHook: sharedFrameHook });
  const trace = useLiveMatchTrace({ world, useFrameHook: sharedFrameHook });
  const { qualityLevel } = useVisualQuality();

  return (
    <MatchSceneInner
      matchTrace={trace}
      autoPlay
      renderMatch={frameSubscription === undefined}
      visualQuality={qualityLevel}
    />
  );
}
