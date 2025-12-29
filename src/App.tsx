import "./App.css";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import sampleObstacleFixture from "../specs/fixtures/dynamic-arena-sample.json";
import { ObstacleEditor } from "./components/debug/ObstacleEditor";
import { ObstacleSpawner } from "./components/debug/ObstacleSpawner";
import { PerfToggles } from "./components/debug/PerfToggles";
import { Simulation } from "./components/Simulation";
import { SettingsIcon } from "./components/ui/SettingsIcon";
import { SettingsModal } from "./components/ui/SettingsModal";
import { createBattleWorld } from "./ecs/world";
import { AUTO_RESTART_DELAY_MS } from "./lib/constants";
import { isActiveRobot } from "./lib/robotHelpers";
import { TEAM_CONFIGS } from "./lib/teamConfig";
import { BattleRunner } from "./runtime/simulation/battleRunner";
import { createTelemetryPort } from "./runtime/simulation/telemetryAdapter";
import {
  createMatchStateMachine,
  MatchStateSnapshot,
} from "./runtime/state/matchStateMachine";
import { ObstacleFixture } from "./simulation/match/matchSpawner";
import { useTelemetryStore } from "./state/telemetryStore";

function formatStatus({
  phase,
  winner,
  restartTimerMs,
}: MatchStateSnapshot): string {
  switch (phase) {
    case "running":
      return "Battle in progress";
    case "paused":
      return "Simulation paused";
    case "victory": {
      const countdown =
        restartTimerMs != null ? Math.ceil(restartTimerMs / 1000) : null;
      return `Victory: ${winner ?? "unknown"}${countdown != null ? ` · restart in ${countdown}s` : ""}`;
    }
    default:
      return "Initializing space match...";
  }
}

export default function App() {
  const battleWorld = useMemo(() => createBattleWorld(), []);
  const telemetryPort = useMemo(() => createTelemetryPort(), []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as Window & {
          __battleWorld?: ReturnType<typeof createBattleWorld>;
        }
      ).__battleWorld = battleWorld;
    }
  }, [battleWorld]);
  const [matchSnapshot, setMatchSnapshot] = useState<MatchStateSnapshot>({
    phase: "initializing",
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDebugUI, setShowDebugUI] = useState(false);
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);

  const [obstacleFixture, setObstacleFixture] = useState<
    ObstacleFixture | undefined
  >(
    // Use the compiled-in sample fixture as the initial state to ensure the
    // world has obstacles even if the network fetch fails in some environments.
    sampleObstacleFixture as unknown as ObstacleFixture,
  );

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
    fetch("/specs/fixtures/dynamic-arena-sample.json")
      .then(async (res) => {
        if (!res.ok)
          throw new Error(`Failed to load obstacle fixture: ${res.status}`);
        return (await res.json()) as ObstacleFixture;
      })
      .then((fixture) => {
        if (!cancelled) setObstacleFixture(fixture);
      })
      .catch(() => {
        // Keep the compiled-in sample fixture if the network fetch fails in
        // this environment (e.g., Playwright dev server path differences).
        if (!cancelled) {
          // Optional: preserve existing fixture state. Log for debug.
          // console.warn('Obstacle fixture fetch failed, using default sample fixture', err);
        }
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
    if (snapshot.phase === "running") {
      matchMachine.pause();
    } else if (snapshot.phase === "paused") {
      matchMachine.resume();
    }
  }, [matchMachine]);

  const handleReset = useCallback(() => {
    runnerRef.current?.reset();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen) return;
      if (e.repeat) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handlePauseResume();
      } else if (e.key === "r" || e.key === "R") {
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen, handlePauseResume, handleReset]);

  const statusText = formatStatus(matchSnapshot);
  const pauseLabel = matchSnapshot.phase === "paused" ? "Resume" : "Pause";

  const winnerLabel =
    matchSnapshot.phase === "victory" && matchSnapshot.winner
      ? TEAM_CONFIGS[matchSnapshot.winner].label
      : null;

  const restartSeconds =
    matchSnapshot.phase === "victory" && matchSnapshot.restartTimerMs != null
      ? Math.ceil(matchSnapshot.restartTimerMs / 1000)
      : null;

  return (
    <div className="app-root">
      <div id="status" className="match-status" role="status">
        {statusText}
      </div>

      <button
        className="settings-button"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Open settings"
      >
        <SettingsIcon />
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showDebugUI={showDebugUI}
        onToggleDebugUI={setShowDebugUI}
        showPerfOverlay={showPerfOverlay}
        onTogglePerfOverlay={setShowPerfOverlay}
      />

      <Suspense fallback={<div className="match-status">Loading arena...</div>}>
        <Simulation
          battleWorld={battleWorld}
          matchMachine={matchMachine}
          telemetry={telemetryPort}
          onRunnerReady={handleRunnerReady}
          obstacleFixture={obstacleFixture}
          showPerfOverlay={showPerfOverlay}
        />
      </Suspense>
      {showDebugUI && (
        <div className="app-debug-ui">
          <ObstacleEditor world={battleWorld} sampleFixture={obstacleFixture} />
          <ObstacleSpawner world={battleWorld} />
          <PerfToggles />
        </div>
      )}
      <div className="app-alive-panel">
        <div className="app-alive-title">Alive</div>
        <div>{`${TEAM_CONFIGS.red.label}: ${aliveCounts.red}`}</div>
        <div>{`${TEAM_CONFIGS.blue.label}: ${aliveCounts.blue}`}</div>
      </div>
      {matchSnapshot.phase === "victory" && winnerLabel ? (
        <div className="app-victory-overlay">
          <h2 className="app-victory-title">{winnerLabel} Triumphs!</h2>
          {restartSeconds != null ? (
            <p className="app-victory-subtitle">{`Restarting in ${restartSeconds}s`}</p>
          ) : null}
          <button
            type="button"
            className="app-victory-button"
            onClick={() => {
              // Placeholder for stats modal trigger
            }}
          >
            View Battle Stats
          </button>
        </div>
      ) : null}
      <div className="app-controls">
        <button
          type="button"
          onClick={handlePauseResume}
          title="Pause/Resume (Space)"
        >
          {pauseLabel}
        </button>
        <button type="button" onClick={handleReset} title="Reset (R)">
          Reset
        </button>
      </div>
    </div>
  );
}
