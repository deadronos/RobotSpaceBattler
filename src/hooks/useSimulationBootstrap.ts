import { useEffect, useRef } from "react";
import type { Query } from "miniplex";
import { resetAndSpawnDefaultTeams } from "../robots/spawnControls";
import { resetScores } from "../systems/ScoringSystem";
import { clearRespawnQueue } from "../systems/RespawnSystem";
import { resetWorld } from "../ecs/miniplexStore";

export function useSimulationBootstrap(
  robotQuery: Query<any>,
  projectileQuery: Query<any>,
  beamQuery: Query<any>,
  invalidate: () => void,
) {
  const spawnInitializedRef = useRef(false);

  useEffect(() => {
    let tid: number | undefined;
    let robotConn: { disconnect?: () => void } | undefined;
    let projectileConn: { disconnect?: () => void } | undefined;
    let beamConn: { disconnect?: () => void } | undefined;

    if (!spawnInitializedRef.current) {
      robotConn = robotQuery.connect();
      projectileConn = projectileQuery.connect();
      beamConn = beamQuery.connect();

      spawnInitializedRef.current = true;
      tid = window.setTimeout(() => {
        resetScores();
        clearRespawnQueue();
        resetAndSpawnDefaultTeams();
        invalidate();
      }, 0);
    }

    return () => {
      if (typeof tid === "number") window.clearTimeout(tid);
      try {
        robotConn?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        projectileConn?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        beamConn?.disconnect?.();
      } catch {
        // ignore
      }

      spawnInitializedRef.current = false;
      clearRespawnQueue();
      resetScores();
      resetWorld();
    };
  }, [robotQuery, projectileQuery, beamQuery, invalidate]);
}
