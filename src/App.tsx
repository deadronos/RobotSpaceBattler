import "./App.css";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import sampleObstacleFixture from "./simulation/match/fixtures/dynamic-arena-sample.json";
import { Simulation } from "./components/Simulation";
import { BattleStatsModal } from "./components/ui/BattleStatsModal";
import { MatchEndOverlay } from "./components/ui/MatchEndOverlay";
import { MatchSummaryModal } from "./components/ui/MatchSummaryModal";
import { RobotListPanel } from "./components/ui/RobotListPanel";
import { SettingsIcon } from "./components/ui/SettingsIcon";
import { SettingsModal } from "./components/ui/SettingsModal";
import { SimSpeedControl } from "./components/ui/SimSpeedControl";
import { useAppShortcuts } from "./components/useAppShortcuts";
import { TeamHud } from "./components/ui/TeamHud";
import { createBattleWorld } from "./ecs/world";
import { MATCH_END_RESTART_DELAY_MS } from "./lib/constants";
import { DEFAULT_SIM_SPEED, type SimSpeed } from "./lib/simSpeed";
import { readStoredBoolean, writeStoredBoolean } from "./lib/storedBoolean";
import { BattleRunner } from "./runtime/simulation/battleRunner";
import { createTelemetryPort } from "./runtime/simulation/telemetryAdapter";
import {
  createMatchStateMachine,
  MatchStateSnapshot,
} from "./runtime/state/matchStateMachine";
import { useMatchSummaryTracker } from "./runtime/state/useMatchSummary";
import { ObstacleFixture } from "./simulation/match/matchSpawner";
const OBSTACLE_FIXTURE = sampleObstacleFixture as unknown as ObstacleFixture;
const ROBOT_LIST_STORAGE_KEY = "hud.showRobotList";
const AUTO_RESTART_STORAGE_KEY = "hud.autoRestart";

function readAutoRestartPreference(): boolean {
  return readStoredBoolean(AUTO_RESTART_STORAGE_KEY, true);
}

function createIdleSnapshot(): MatchStateSnapshot {
  return {
    phase: "initializing",
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
    isDraw: false,
    autoRestartEnabled: readAutoRestartPreference(),
  };
}

const ObstacleEditor = lazy(async () => {
  const module = await import("./components/debug/ObstacleEditor");
  return { default: module.ObstacleEditor };
});

const ObstacleSpawner = lazy(async () => {
  const module = await import("./components/debug/ObstacleSpawner");
  return { default: module.ObstacleSpawner };
});

const PerfToggles = lazy(async () => {
  const module = await import("./components/debug/PerfToggles");
  return { default: module.PerfToggles };
});

function formatStatus({
  phase,
  winner,
  isDraw,
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
      return `${isDraw ? "Draw" : `Victory: ${winner ?? "unknown"}`}${countdown != null ? ` · restart in ${countdown}s` : ""}`;
    }
    default:
      return "Initializing space match...";
  }
}

export default function App() {
  const battleWorld = useMemo(() => createBattleWorld(), []);
  const telemetryPort = useMemo(() => createTelemetryPort(), []);
  const [matchSnapshot, setMatchSnapshot] =
    useState<MatchStateSnapshot>(createIdleSnapshot);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBattleStatsOpen, setIsBattleStatsOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [simSpeed, setSimSpeed] = useState<SimSpeed>(DEFAULT_SIM_SPEED);
  const [showDebugUI, setShowDebugUI] = useState(false);
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);
  const [showRobotList, setShowRobotList] = useState(() =>
    readStoredBoolean(ROBOT_LIST_STORAGE_KEY, true),
  );

  const { summary, series, trackSnapshot, resetSeries } =
    useMatchSummaryTracker(battleWorld);

  const handleSnapshotChange = useCallback(
    (snapshot: MatchStateSnapshot) => {
      setMatchSnapshot(snapshot);
      // Opens on a new round only, so closing the summary is not undone by the
      // victory countdown re-emitting the same snapshot.
      if (trackSnapshot(snapshot)) {
        setIsSummaryOpen(true);
      } else if (snapshot.phase === "running") {
        setIsSummaryOpen(false);
      }
    },
    [trackSnapshot],
  );

  const matchMachine = useMemo(
    () =>
      createMatchStateMachine({
        autoRestartDelayMs: MATCH_END_RESTART_DELAY_MS,
        autoRestartEnabled: readAutoRestartPreference(),
        onChange: handleSnapshotChange,
      }),
    [handleSnapshotChange],
  );

  useEffect(() => {
    setMatchSnapshot(matchMachine.getSnapshot());
  }, [matchMachine]);

  useEffect(() => {
    writeStoredBoolean(ROBOT_LIST_STORAGE_KEY, showRobotList);
  }, [showRobotList]);

  const runnerRef = useRef<BattleRunner | null>(null);

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

  const handleNextRound = useCallback(() => {
    setIsSummaryOpen(false);
    runnerRef.current?.reset();
  }, []);

  const handleAutoRestartChange = useCallback(
    (enabled: boolean) => {
      writeStoredBoolean(AUTO_RESTART_STORAGE_KEY, enabled);
      matchMachine.setAutoRestartEnabled(enabled);
    },
    [matchMachine],
  );

  useAppShortcuts({
    enabled: !isSettingsOpen && !isBattleStatsOpen && !isSummaryOpen,
    onPauseResume: handlePauseResume,
    onReset: handleReset,
  });

  const statusText = formatStatus(matchSnapshot);
  const pauseLabel = matchSnapshot.phase === "paused" ? "Resume" : "Pause";

  const isDraw = matchSnapshot.phase === "victory" && !!matchSnapshot.isDraw;

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
        showRobotList={showRobotList}
        onToggleRobotList={setShowRobotList}
      />

      {showRobotList && <RobotListPanel battleWorld={battleWorld} />}

      <BattleStatsModal
        isOpen={isBattleStatsOpen}
        onClose={() => setIsBattleStatsOpen(false)}
        winner={matchSnapshot.phase === "victory" ? matchSnapshot.winner : null}
      />

      <Suspense fallback={<div className="match-status">Loading arena...</div>}>
        <Simulation
          battleWorld={battleWorld}
          matchMachine={matchMachine}
          telemetry={telemetryPort}
          onRunnerReady={handleRunnerReady}
          obstacleFixture={OBSTACLE_FIXTURE}
          showPerfOverlay={showPerfOverlay}
          speed={simSpeed}
        />
      </Suspense>
      {showDebugUI && (
        <Suspense fallback={null}>
          <div className="app-debug-ui">
            <ObstacleEditor
              world={battleWorld}
              sampleFixture={OBSTACLE_FIXTURE}
            />
            <ObstacleSpawner world={battleWorld} />
            <PerfToggles />
          </div>
        </Suspense>
      )}
      <TeamHud battleWorld={battleWorld} />
      {matchSnapshot.phase === "victory" ? (
        <MatchEndOverlay
          winner={matchSnapshot.winner}
          isDraw={isDraw}
          restartSeconds={restartSeconds}
          autoRestartEnabled={matchSnapshot.autoRestartEnabled}
          series={series}
          onOpenSummary={() => setIsSummaryOpen(true)}
          onOpenBattleStats={() => setIsBattleStatsOpen(true)}
          onNextRound={handleNextRound}
          onToggleAutoRestart={handleAutoRestartChange}
        />
      ) : null}
      <MatchSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        summary={summary}
        series={series}
        onResetSeries={resetSeries}
      />
      <div className="app-controls">
        <button
          type="button"
          onClick={handlePauseResume}
          title="Pause/Resume (Space)"
        >
          <span>
            {pauseLabel === "Pause" ? "⏸" : "▶"} {pauseLabel}
          </span>
        </button>
        <button type="button" onClick={handleReset} title="Reset (R)">
          <span>🔄 Reset</span>
        </button>
        <SimSpeedControl value={simSpeed} onChange={setSimSpeed} />
      </div>
    </div>
  );
}
