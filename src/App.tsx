import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Simulation } from './components/Simulation';
import { createBattleWorld } from './ecs/world';
import { AUTO_RESTART_DELAY_MS, VICTORY_OVERLAY_BACKGROUND } from './lib/constants';
import { isActiveRobot } from './lib/robotHelpers';
import { TEAM_CONFIGS } from './lib/teamConfig';
import { BattleRunner } from './runtime/simulation/battleRunner';
import { createTelemetryPort } from './runtime/simulation/telemetryAdapter';
import { ObstacleFixture } from './simulation/match/matchSpawner';
import {
  createMatchStateMachine,
  MatchStateSnapshot,
} from './runtime/state/matchStateMachine';
import { useTelemetryStore } from './state/telemetryStore';

function formatStatus({
  phase,
  winner,
  restartTimerMs,
}: MatchStateSnapshot): string {
  switch (phase) {
    case 'running':
      return 'Battle in progress';
    case 'paused':
      return 'Simulation paused';
    case 'victory': {
      const countdown = restartTimerMs != null ? Math.ceil(restartTimerMs / 1000) : null;
      return `Victory: ${winner ?? 'unknown'}${countdown != null ? ` · restart in ${countdown}s` : ''}`;
    }
    default:
      return 'Initializing space match...';
  }
}

export default function App() {
  const battleWorld = useMemo(() => createBattleWorld(), []);
  const telemetryPort = useMemo(() => createTelemetryPort(), []);
  const [matchSnapshot, setMatchSnapshot] = useState<MatchStateSnapshot>({
    phase: 'initializing',
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
  });
  const [obstacleFixture, setObstacleFixture] = useState<ObstacleFixture | undefined>(undefined);

  const matchMachine = useMemo(
    () =>
      createMatchStateMachine({
        autoRestartDelayMs: AUTO_RESTART_DELAY_MS,
        onChange: (snapshot) => setMatchSnapshot(snapshot),
      }),
    [],
  );

  useEffect(() => {
    setMatchSnapshot(matchMachine.getSnapshot());
  }, [matchMachine]);

  useEffect(() => {
    let cancelled = false;
    fetch('/specs/fixtures/dynamic-arena-sample.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load obstacle fixture: ${res.status}`);
        return (await res.json()) as ObstacleFixture;
      })
      .then((fixture) => {
        if (!cancelled) setObstacleFixture(fixture);
      })
      .catch(() => {
        if (!cancelled) setObstacleFixture(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const runnerRef = useRef<BattleRunner | null>(null);
  const telemetryEvents = useTelemetryStore((state) => state.events);

  const aliveCounts = useMemo(() => {
    void telemetryEvents;
    const counts = { red: 0, blue: 0 };
    battleWorld.robots.entities.forEach((robot) => {
      if (isActiveRobot(robot)) {
        counts[robot.team] += 1;
      }
    });
    return counts;
  }, [battleWorld, telemetryEvents]);

  const handleRunnerReady = useCallback((runner: BattleRunner) => {
    runnerRef.current = runner;
  }, []);

  const handlePauseResume = useCallback(() => {
    const snapshot = matchMachine.getSnapshot();
    if (snapshot.phase === 'running') {
      matchMachine.pause();
    } else if (snapshot.phase === 'paused') {
      matchMachine.resume();
    }
  }, [matchMachine]);

  const handleReset = useCallback(() => {
    runnerRef.current?.reset();
  }, []);

  const statusText = formatStatus(matchSnapshot);
  const pauseLabel = matchSnapshot.phase === 'paused' ? 'Resume' : 'Pause';

  const winnerLabel =
    matchSnapshot.phase === 'victory' && matchSnapshot.winner
      ? TEAM_CONFIGS[matchSnapshot.winner].label
      : null;

  const restartSeconds =
    matchSnapshot.phase === 'victory' && matchSnapshot.restartTimerMs != null
      ? Math.ceil(matchSnapshot.restartTimerMs / 1000)
      : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="status" className="match-status" role="status">
        {statusText}
      </div>
      <Suspense fallback={<div className="match-status">Loading arena...</div>}>
        <Simulation
          battleWorld={battleWorld}
          matchMachine={matchMachine}
          telemetry={telemetryPort}
          onRunnerReady={handleRunnerReady}
          obstacleFixture={obstacleFixture}
        />
      </Suspense>
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>Alive</div>
        <div>{`${TEAM_CONFIGS.red.label}: ${aliveCounts.red}`}</div>
        <div>{`${TEAM_CONFIGS.blue.label}: ${aliveCounts.blue}`}</div>
      </div>
      {matchSnapshot.phase === 'victory' && winnerLabel ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '24px 32px',
            borderRadius: 12,
            background: VICTORY_OVERLAY_BACKGROUND,
            color: '#f7f8ff',
            textAlign: 'center',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22 }}>{winnerLabel} Triumphs!</h2>
          {restartSeconds != null ? (
            <p style={{ margin: '12px 0 0 0' }}>{`Restarting in ${restartSeconds}s`}</p>
          ) : null}
          <button
            type="button"
            style={{ marginTop: 16 }}
            onClick={() => {
              // Placeholder for stats modal trigger
            }}
          >
            View Battle Stats
          </button>
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
        }}
      >
        <button type="button" onClick={handlePauseResume}>
          {pauseLabel}
        </button>
        <button type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
