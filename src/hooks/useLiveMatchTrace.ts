import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";

import { cloneVector, distance } from "../ecs/utils/vector";
import type { SimulationWorld } from "../ecs/world";
import {
  type LiveTraceEvent,
  subscribeLiveTraceEvents,
} from "../systems/matchTrace/liveTraceEmitter";
import { RNG_ALGORITHM_ID } from "../systems/matchTrace/rngManager";
import {
  type MatchTrace,
  type MatchTraceEvent,
  type Position,
} from "../systems/matchTrace/types";
import type { FrameSubscription } from "../systems/physicsSync";

export interface UseLiveMatchTraceOptions {
  world: SimulationWorld;
  useFrameHook?: FrameSubscription;
  movementThreshold?: number;
}

interface RobotSnapshot {
  position: Position;
}

function createInitialTrace(seed: number): MatchTrace {
  return {
    rngSeed: seed,
    rngAlgorithm: RNG_ALGORITHM_ID,
    meta: {
      rngSeed: seed,
      rngAlgorithm: RNG_ALGORITHM_ID,
      source: "live",
    },
    events: [],
  };
}

function getTimestampMs(world: SimulationWorld): number {
  return Math.round(world.simulation.simulationTime * 1000);
}

function getFrameIndex(world: SimulationWorld): number {
  return world.simulation.totalFrames;
}

export function useLiveMatchTrace({
  world,
  useFrameHook,
  movementThreshold = 0.05,
}: UseLiveMatchTraceOptions): MatchTrace {
  const seedRef = useRef<number>(Math.floor(Math.random() * 0xffffffff));
  const traceRef = useRef<MatchTrace>(createInitialTrace(seedRef.current));
  const sequenceIdRef = useRef(0);
  const robotsRef = useRef<Map<string, RobotSnapshot>>(new Map());
  const spawnedRef = useRef<Set<string>>(new Set());
  const frameHookRef = useRef<FrameSubscription | undefined>(useFrameHook);
  frameHookRef.current = useFrameHook;

  const [, forceUpdate] = useState(0);

  const appendEvent = useCallback(
    (event: MatchTraceEvent) => {
      const nextSequence = sequenceIdRef.current + 1;
      sequenceIdRef.current = nextSequence;
      traceRef.current.events.push({
        ...event,
        sequenceId: nextSequence,
        frameIndex: event.frameIndex ?? getFrameIndex(world),
      });
      forceUpdate((value) => value + 1);
    },
    [world],
  );

  const handleLiveEvent = useCallback(
    (event: LiveTraceEvent) => {
      const frameIndex = getFrameIndex(world);
      switch (event.type) {
        case "spawn": {
          if (spawnedRef.current.has(event.entityId)) {
            return;
          }
          spawnedRef.current.add(event.entityId);
          robotsRef.current.set(event.entityId, {
            position: cloneVector(event.position),
          });
          appendEvent({
            type: "spawn",
            entityId: event.entityId,
            teamId: event.teamId,
            position: cloneVector(event.position),
            timestampMs: event.timestampMs,
            frameIndex,
          });
          break;
        }
        case "fire": {
          appendEvent({
            type: "fire",
            attackerId: event.attackerId,
            projectileId: event.projectileId,
            position: cloneVector(event.position),
            timestampMs: event.timestampMs,
            frameIndex,
          });
          break;
        }
        case "damage": {
          appendEvent({
            type: "damage",
            targetId: event.targetId,
            attackerId: event.attackerId ?? "unknown",
            amount: event.amount,
            resultingHealth: event.resultingHealth,
            timestampMs: event.timestampMs,
            frameIndex,
          });
          break;
        }
        case "death": {
          spawnedRef.current.delete(event.entityId);
          robotsRef.current.delete(event.entityId);
          appendEvent({
            type: "death",
            entityId: event.entityId,
            killedBy: event.killedBy,
            timestampMs: event.timestampMs,
            frameIndex,
          });
          break;
        }
        default:
          break;
      }
    },
    [appendEvent, world],
  );

  useEffect(() => {
    const unsubscribe = subscribeLiveTraceEvents(handleLiveEvent);
    return () => unsubscribe();
  }, [handleLiveEvent]);

  useEffect(() => {
    traceRef.current = createInitialTrace(seedRef.current);
    sequenceIdRef.current = 0;
    robotsRef.current.clear();
    spawnedRef.current.clear();

    const timestampMs = getTimestampMs(world);
    const frameIndex = getFrameIndex(world);
    world.entities.forEach((robot) => {
      spawnedRef.current.add(robot.id);
      const position = cloneVector(robot.position);
      robotsRef.current.set(robot.id, { position });
      appendEvent({
        type: "spawn",
        entityId: robot.id,
        teamId: robot.team,
        position,
        timestampMs,
        frameIndex,
      });
    });
  }, [appendEvent, world]);

  const processFrame = useCallback(() => {
    const timestampMs = getTimestampMs(world);
    const frameIndex = getFrameIndex(world);
    const seen = new Set<string>();

    world.entities.forEach((robot) => {
      seen.add(robot.id);
      const previous = robotsRef.current.get(robot.id);
      const currentPosition = cloneVector(robot.position);

      if (!previous) {
        robotsRef.current.set(robot.id, { position: currentPosition });
        if (!spawnedRef.current.has(robot.id)) {
          spawnedRef.current.add(robot.id);
          appendEvent({
            type: "spawn",
            entityId: robot.id,
            teamId: robot.team,
            position: currentPosition,
            timestampMs,
            frameIndex,
          });
        }
        return;
      }

      const moved =
        distance(previous.position, currentPosition) > movementThreshold;
      if (moved) {
        previous.position = currentPosition;
        appendEvent({
          type: "move",
          entityId: robot.id,
          position: currentPosition,
          timestampMs,
          frameIndex,
        });
      }
    });

    Array.from(robotsRef.current.keys()).forEach((id) => {
      if (!seen.has(id)) {
        robotsRef.current.delete(id);
        spawnedRef.current.delete(id);
      }
    });
  }, [appendEvent, movementThreshold, world]);

  const frameCallback = useCallback(() => {
    processFrame();
  }, [processFrame]);

  try {
    useFrame(frameCallback);
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

    const unsubscribe = subscribe(frameCallback);
    if (typeof unsubscribe === "function") {
      return () => unsubscribe();
    }
    return undefined;
  }, [frameCallback]);

  return traceRef.current;
}
