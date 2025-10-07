import { useEffect, useMemo, useRef, useState } from 'react';

import type { SimulationState } from '../ecs/entities/SimulationState';
import type { TeamEntity } from '../ecs/entities/Team';
import { useSimulationWorld } from '../ecs/world';
import { buildTeamSummaries, formatCountdownLabel } from '../selectors/uiSelectors';
import type { TeamSummaryViewModel, VictorySnapshot } from '../selectors/uiSelectors';
import { useUiStore } from '../store/uiStore';
import type { Team } from '../types';

interface BattleHudSubscriptionSnapshot {
  simulation: Pick<
    SimulationState,
    'status' | 'winner' | 'simulationTime' | 'autoRestartCountdown' | 'countdownPaused'
  > & { performanceStats: SimulationState['performanceStats'] };
  teams: Array<{
    name: TeamEntity['name'];
    activeRobots: TeamEntity['activeRobots'];
    eliminatedRobots: TeamEntity['eliminatedRobots'];
    captainId: TeamEntity['captainId'];
    weaponDistribution: TeamEntity['aggregateStats']['weaponDistribution'];
  }>;
  robots: VictorySnapshot['robots'];
  performanceOverlay: {
    visible: boolean;
    autoScalingEnabled: boolean;
  };
}

export interface BattleHudStatusInfo {
  status: SimulationState['status'];
  label: string;
  winner: SimulationState['winner'];
  countdownSeconds: number | null;
  countdownLabel: string | null;
  countdownPaused: boolean;
  elapsedSeconds: number;
}

export interface BattleHudPerformanceInfo {
  fps: number;
  averageFps: number;
  qualityScalingActive: boolean;
  overlayVisible: boolean;
  autoScalingEnabled: boolean;
}

export interface BattleHudControls {
  isHudVisible: boolean;
  openStats: () => void;
  openSettings: () => void;
  toggleHud: () => void;
}

export interface BattleHudData {
  status: BattleHudStatusInfo;
  teams: TeamSummaryViewModel[];
  controls: BattleHudControls;
  performance: BattleHudPerformanceInfo;
}

function formatTeamLabel(team: Team | string): string {
  switch (team) {
    case 'red':
      return 'Red Team';
    case 'blue':
      return 'Blue Team';
    default:
      return String(team);
  }
}

function subscribeToWorld(world: ReturnType<typeof useSimulationWorld>) {
  return (listener: () => void) => {
    const unsubscribers: Array<() => void> = [
      world.ecs.teams.onEntityAdded.subscribe(listener),
      world.ecs.teams.onEntityRemoved.subscribe(listener),
      world.ecs.robots.onEntityAdded.subscribe(listener),
      world.ecs.robots.onEntityRemoved.subscribe(listener),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  };
}

function createSnapshot(world: ReturnType<typeof useSimulationWorld>): BattleHudSubscriptionSnapshot {
  const { simulation } = world;
  const teams = world.ecs.teams.entities.map((team) => ({
    name: team.name,
    activeRobots: team.activeRobots,
    eliminatedRobots: team.eliminatedRobots,
    captainId: team.captainId,
    weaponDistribution: { ...team.aggregateStats.weaponDistribution },
  }));

  const robots: VictorySnapshot['robots'] = world.ecs.robots.entities.map((robot) => ({
    id: robot.id,
    name: robot.id,
    team: robot.team,
    weaponType: robot.weaponType,
    isCaptain: robot.isCaptain,
    stats: {
      kills: robot.stats.kills,
      damageDealt: robot.stats.damageDealt,
      damageTaken: robot.stats.damageTaken,
      timeAlive: robot.stats.timeAlive,
      timeAliveSeconds: robot.stats.timeAlive,
      shotsFired: robot.stats.shotsFired,
    },
  }));

  return {
    simulation: {
      status: simulation.status,
      winner: simulation.winner,
      simulationTime: simulation.simulationTime,
      autoRestartCountdown: simulation.autoRestartCountdown,
      countdownPaused: simulation.countdownPaused,
      performanceStats: { ...simulation.performanceStats },
    },
    teams,
    robots,
    performanceOverlay: {
      visible: world.performance.overlay.visible,
      autoScalingEnabled: world.performance.overlay.autoScalingEnabled,
    },
  };
}

function buildStatus(
  simulation: BattleHudSubscriptionSnapshot['simulation'],
  countdownOverride: number | null,
): BattleHudStatusInfo {
  const countdown = countdownOverride ?? simulation.autoRestartCountdown ?? null;
  let label = 'Battle in progress';

  if (simulation.status === 'paused') {
    label = 'Battle paused';
  } else if (
    simulation.status === 'victory' ||
    simulation.status === 'simultaneous-elimination'
  ) {
    if (simulation.winner === 'draw' || simulation.winner === null) {
      label = 'Battle ends in a draw';
    } else {
      label = `${formatTeamLabel(simulation.winner)} Wins`;
    }
  }

  const showCountdown =
    simulation.status === 'victory' || simulation.status === 'simultaneous-elimination';
  const countdownLabel = showCountdown ? formatCountdownLabel(countdown) : null;

  return {
    status: simulation.status,
    label,
    winner: simulation.winner,
    countdownSeconds: countdown,
    countdownLabel,
    countdownPaused: simulation.countdownPaused,
    elapsedSeconds: simulation.simulationTime,
  };
}

function buildPerformanceInfo(
  snapshot: BattleHudSubscriptionSnapshot,
): BattleHudPerformanceInfo {
  return {
    fps: snapshot.simulation.performanceStats.currentFPS,
    averageFps: snapshot.simulation.performanceStats.averageFPS,
    qualityScalingActive: snapshot.simulation.performanceStats.qualityScalingActive,
    overlayVisible: snapshot.performanceOverlay.visible,
    autoScalingEnabled: snapshot.performanceOverlay.autoScalingEnabled,
  };
}

export function useBattleHudData(): BattleHudData {
  const world = useSimulationWorld();
  const [snapshot, setSnapshot] = useState<BattleHudSubscriptionSnapshot>(() =>
    createSnapshot(world),
  );
  const signatureRef = useRef<string>(JSON.stringify(snapshot));

  useEffect(() => {
    const handleUpdate = () => {
      const next = createSnapshot(world);
      const signature = JSON.stringify(next);
      if (signatureRef.current !== signature) {
        signatureRef.current = signature;
        setSnapshot(next);
      }
    };

    const unsubscribe = subscribeToWorld(world)(handleUpdate);
    let intervalId: number | undefined;
    if (typeof window !== 'undefined') {
      intervalId = window.setInterval(handleUpdate, 250);
    }

    return () => {
      unsubscribe();
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [world]);

  const { isHudVisible, toggleHud, openStats, openSettings, countdownOverrideSeconds } =
    useUiStore(
      useMemo(
        () =>
          (state) => ({
            isHudVisible: state.isHudVisible,
            toggleHud: state.toggleHud,
            openStats: state.openStats,
            openSettings: state.openSettings,
            countdownOverrideSeconds: state.countdownOverrideSeconds,
          }),
        [],
      ),
    );

  const teamsSnapshot: VictorySnapshot = {
    teams: snapshot.teams.map((team) => ({
      name: team.name,
      label: formatTeamLabel(team.name),
      activeRobots: team.activeRobots,
      eliminatedRobots: team.eliminatedRobots,
      captainId: team.captainId,
      weaponDistribution: { ...team.weaponDistribution },
    })),
    robots: snapshot.robots,
    simulation: {
      status: snapshot.simulation.status,
      winner: snapshot.simulation.winner,
      simulationTime: snapshot.simulation.simulationTime,
      autoRestartCountdown:
        countdownOverrideSeconds ?? snapshot.simulation.autoRestartCountdown ?? null,
    },
    performance: {
      currentFPS: snapshot.simulation.performanceStats.currentFPS,
      averageFPS: snapshot.simulation.performanceStats.averageFPS,
      qualityScalingActive: snapshot.simulation.performanceStats.qualityScalingActive,
      autoScalingEnabled: snapshot.performanceOverlay.autoScalingEnabled,
    },
  };

  const status = buildStatus(snapshot.simulation, countdownOverrideSeconds ?? null);
  const teams = useMemo(() => buildTeamSummaries(teamsSnapshot), [teamsSnapshot]);
  const performance = useMemo(() => buildPerformanceInfo(snapshot), [snapshot]);

  return {
    status,
    teams,
    controls: {
      isHudVisible,
      toggleHud,
      openStats,
      openSettings,
    },
    performance,
  };
}

export default useBattleHudData;
