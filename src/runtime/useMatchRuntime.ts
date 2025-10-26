import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { updateAiSystem } from "../ecs/systems/aiSystem";
import { cleanupSystem } from "../ecs/systems/cleanupSystem";
import { updateMovementSystem } from "../ecs/systems/movementSystem";
import { checkVictory } from "../ecs/systems/victorySystem";
import {
  updateProjectileSystem,
  updateWeaponSystem,
} from "../ecs/systems/weaponSystem";
import { BattleWorld, TeamId } from "../ecs/world";
import { useSimulationStore } from "../state/simulationStore";
import { MatchTraceEvent, MatchTraceEventInput } from "./matchTrace";
import {
  createMatchStateMachine,
  MatchStateMachine,
} from "./state/matchStateMachine";
import { setupWorld } from "./world/setupWorld";

export interface UseMatchRuntimeOptions {
  onEvent?: (event: MatchTraceEvent) => void;
  autoRestartDelayMs?: number;
}

function buildTeamRobotCounts(
  teams: { id: TeamId; robotCount: number }[],
): Record<TeamId, number> {
  const counts: Record<TeamId, number> = { red: 0, blue: 0 };
  teams.forEach((team) => {
    counts[team.id] = team.robotCount;
  });
  return counts;
}

export function useMatchRuntime({
  onEvent,
  autoRestartDelayMs = 5000,
}: UseMatchRuntimeOptions = {}) {
  const initialMatch = useSimulationStore((state) => state.initialMatch);
  const setBattleWorld = useSimulationStore((state) => state.setBattleWorld);
  const setPhase = useSimulationStore((state) => state.setPhase);
  const setWinner = useSimulationStore((state) => state.setWinner);
  const setRestartTimer = useSimulationStore((state) => state.setRestartTimer);
  const setElapsedMs = useSimulationStore((state) => state.setElapsedMs);
  const updateTeamStats = useSimulationStore((state) => state.updateTeamStats);
  const requestedPhase = useSimulationStore((state) => state.phase);
  const requestedRestartTimer = useSimulationStore(
    (state) => state.restartTimer,
  );

  const worldRef = useRef<BattleWorld | null>(null);
  const stateMachineRef = useRef<MatchStateMachine>();
  const sequenceRef = useRef(0);
  const teamRobotCountsRef = useRef<Record<TeamId, number>>({
    red: 0,
    blue: 0,
  });

  const teamRobotCounts = useMemo(() => {
    if (!initialMatch) {
      return { red: 0, blue: 0 } as Record<TeamId, number>;
    }
    return buildTeamRobotCounts(initialMatch.teams);
  }, [initialMatch]);

  useEffect(() => {
    teamRobotCountsRef.current = teamRobotCounts;
  }, [teamRobotCounts]);

  if (!stateMachineRef.current) {
    stateMachineRef.current = createMatchStateMachine({
      autoRestartDelayMs,
      onChange: (snapshot) => {
        setPhase(snapshot.phase);
        setWinner(snapshot.winner);
        setRestartTimer(snapshot.restartTimerMs);
        setElapsedMs(snapshot.elapsedMs);
      },
    });
  }

  const emitTraceEvent = useCallback(
    (event: MatchTraceEventInput) => {
      if (!onEvent) {
        return;
      }

      sequenceRef.current += 1;
      onEvent({ ...event, sequenceId: sequenceRef.current });
    },
    [onEvent],
  );

  const initializeWorld = useCallback(() => {
    if (!initialMatch) {
      return;
    }

    const stateMachine = stateMachineRef.current;
    if (!stateMachine) {
      return;
    }

    stateMachine.reset();
    sequenceRef.current = 0;

    const { world, robotsByTeam } = setupWorld({
      initialMatch,
      emitEvent: emitTraceEvent,
    });

    worldRef.current = world;
    setBattleWorld(world);

    (Object.keys(robotsByTeam) as TeamId[]).forEach((team) => {
      const robots = robotsByTeam[team];
      updateTeamStats(team, {
        active: robots.length,
        eliminations: Math.max(
          0,
          (teamRobotCountsRef.current[team] ?? robots.length) - robots.length,
        ),
        captainId: robots.find((robot) => robot.isCaptain)?.id ?? null,
        totalKills: robots.reduce((total, robot) => total + robot.kills, 0),
      });
    });

    stateMachine.start();
  }, [emitTraceEvent, initialMatch, setBattleWorld, updateTeamStats]);

  useEffect(() => {
    if (!initialMatch) {
      return undefined;
    }

    initializeWorld();

    return () => {
      setBattleWorld(null);
      worldRef.current = null;
      stateMachineRef.current?.reset();
    };
  }, [initializeWorld, initialMatch, setBattleWorld]);

  useEffect(() => {
    const stateMachine = stateMachineRef.current;
    if (!stateMachine) {
      return;
    }

    const snapshot = stateMachine.getSnapshot();
    if (requestedPhase === "paused" && snapshot.phase === "running") {
      stateMachine.pause();
    } else if (requestedPhase === "running" && snapshot.phase === "paused") {
      stateMachine.resume();
    }
  }, [requestedPhase]);

  useEffect(() => {
    const stateMachine = stateMachineRef.current;
    if (!stateMachine) {
      return;
    }

    const snapshot = stateMachine.getSnapshot();
    if (requestedRestartTimer !== snapshot.restartTimerMs) {
      stateMachine.setRestartTimer(requestedRestartTimer ?? null);
    }
  }, [requestedRestartTimer]);

  useFrame((_, delta) => {
    const world = worldRef.current;
    const stateMachine = stateMachineRef.current;
    if (!world || !stateMachine) {
      return;
    }

    const deltaSeconds = Math.min(delta, 0.05);
    const deltaMs = deltaSeconds * 1000;
    const snapshot = stateMachine.getSnapshot();

    if (snapshot.phase === "running") {
      updateAiSystem(world);
      updateMovementSystem(world, deltaSeconds);
      updateWeaponSystem(world, deltaSeconds);
      updateProjectileSystem(world, deltaSeconds);

      const teamStats = cleanupSystem(world, {
        totalRobotsPerTeam: teamRobotCountsRef.current,
      });

      (Object.keys(teamStats) as TeamId[]).forEach((team) => {
        updateTeamStats(team, teamStats[team]);
      });

      const winner = checkVictory(world);
      if (winner) {
        emitTraceEvent({
          type: "score",
          timestampMs: snapshot.elapsedMs,
          entityId: winner,
          teamId: winner,
        });
        stateMachine.declareVictory(winner);
      }
    } else if (snapshot.phase === "victory") {
      const teamStats = cleanupSystem(world, {
        totalRobotsPerTeam: teamRobotCountsRef.current,
      });

      (Object.keys(teamStats) as TeamId[]).forEach((team) => {
        updateTeamStats(team, teamStats[team]);
      });
    }

    const shouldRestart = stateMachine.tick(deltaMs);

    if (shouldRestart) {
      stateMachine.reset();
      initializeWorld();
    }
  });

  return { worldRef };
}
