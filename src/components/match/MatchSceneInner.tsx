import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  type MatchSimulationState,
  useMatchSimulation,
} from "../../hooks/useMatchSimulation";
import { useVisualQuality } from "../../hooks/useVisualQuality";
import type {
  MatchTrace,
  VisualQualityProfile,
} from "../../systems/matchTrace/types";
import styles from "../Scene.module.css";
import {
  extractProjectileTrails,
  type ProjectileTrail,
  RenderedProjectile,
} from "./RenderedProjectile";
import { getTeamColor, RenderedRobot } from "./RenderedRobot";

export interface MatchSceneProps {
  matchTrace: MatchTrace;
  autoPlay?: boolean;
  renderMatch?: boolean;
  visualQuality?: "high" | "medium" | "low";
}

export const MatchSceneInner: React.FC<MatchSceneProps> = ({
  matchTrace,
  autoPlay = true,
  renderMatch = true,
  visualQuality,
}) => {
  const { qualityLevel, qualityProfile } = useVisualQuality();
  const appliedQuality = visualQuality ?? qualityLevel;

  const simulationState = useMatchSimulation({
    trace: matchTrace,
    autoPlay,
    playbackRate: 1.0,
    debugMode: false,
    onVictory: (winnerId, survivors) => {
      console.log("🎉 Victory!", { winnerId, survivors });
    },
    onDraw: () => {
      console.log("🤝 Draw!");
    },
    onTimeout: () => {
      console.log("⏱️ Timeout!");
    },
  });

  if (!renderMatch) {
    return null;
  }

  return (
    <MatchSceneRenderer
      matchTrace={matchTrace}
      simulationState={simulationState}
      appliedQuality={appliedQuality}
      qualityProfile={qualityProfile}
    />
  );
};

interface MatchSceneRendererProps {
  matchTrace: MatchTrace;
  simulationState: MatchSimulationState;
  appliedQuality: "high" | "medium" | "low";
  qualityProfile?: VisualQualityProfile;
}

const MatchSceneRenderer: React.FC<MatchSceneRendererProps> = ({
  matchTrace,
  simulationState,
  appliedQuality,
  qualityProfile,
}) => {
  const [projectiles, setProjectiles] = useState<ProjectileTrail[]>([]);
  const projectileTimerRef = useRef<number | undefined>(undefined);
  // Keep the last projectiles in a ref to avoid setting state with the same
  // array on every frame which can cause render loops.
  const lastProjectilesRef = useRef<ProjectileTrail[]>([]);
  const {
    entities,
    aliveEntities,
    currentTimestampMs,
    matchOutcome,
    matchMessage,
  } = simulationState;

  useEffect(() => {
    const trails = extractProjectileTrails(matchTrace.events || []);
    setProjectiles(trails);
    lastProjectilesRef.current = trails;

    if (projectileTimerRef.current !== undefined) {
      clearTimeout(projectileTimerRef.current);
    }
    projectileTimerRef.current = window.setTimeout(() => {
      setProjectiles([]);
      lastProjectilesRef.current = [];
    }, 2000);

    return () => {
      if (projectileTimerRef.current !== undefined) {
        clearTimeout(projectileTimerRef.current);
      }
    };
  // Only run this effect when the trace itself changes. `currentTimestampMs`
  // updates every tick and should not re-run this initialization effect —
  // per-frame updates are handled in `handleFrame` below.
  }, [matchTrace]);

  const handleFrame = useCallback(() => {
    const trails = extractProjectileTrails(matchTrace.events || []);
    const recentTrails = trails.filter(
      (trail) => currentTimestampMs - trail.timestamp < 1000,
    );
    // Avoid unnecessary state updates every frame by comparing to last value.
    const prev = lastProjectilesRef.current;
    const changed =
      prev.length !== recentTrails.length ||
      prev.some((p, i) => p.id !== recentTrails[i]?.id || p.timestamp !== recentTrails[i]?.timestamp);
    if (changed) {
      lastProjectilesRef.current = recentTrails;
      setProjectiles(recentTrails);
    }
  }, [matchTrace, currentTimestampMs]);

  try {
    useFrame(handleFrame);
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

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#081029" />
      </mesh>

      {entities.map((entity) => (
        <RenderedRobot
          key={entity.id}
          entity={entity}
          teamColor={getTeamColor(entity.teamId)}
          scale={1.0}
          showHealthBar
          quality={appliedQuality}
          qualityProfile={qualityProfile}
        />
      ))}

      {projectiles.map((trail) => (
        <RenderedProjectile
          key={trail.id}
          trail={trail}
          teamColor={getTeamColor(trail.teamId)}
          lifetime={1000}
          trailWidth={0.1}
          showImpact
          quality={appliedQuality}
          qualityProfile={qualityProfile}
        />
      ))}

      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div className={styles.hudContainer}>
          <div className={styles.hudItem}>
            Time: {(currentTimestampMs / 1000).toFixed(1)}s
          </div>
          <div className={styles.hudItem}>Entities: {entities.length}</div>
          <div className={styles.hudItem}>Alive: {aliveEntities.length}</div>
          <div className={styles.hudItem}>
            Status: {matchOutcome || "in-progress"}
          </div>
          {matchMessage && (
            <div className={styles.hudMessage}>{matchMessage}</div>
          )}
        </div>
      </Html>
    </>
  );
};
