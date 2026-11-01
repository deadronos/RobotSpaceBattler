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

import sampleObstacleFixture from "../specs/006-dynamic-arena-obstacles/dynamic-arena-sample.json";
import { Simulation } from "./components/Simulation";
import { BattleStatsModal } from "./components/ui/BattleStatsModal";
import { RobotListPanel } from "./components/ui/RobotListPanel";
import { SettingsIcon } from "./components/ui/SettingsIcon";
import { SettingsModal } from "./components/ui/SettingsModal";
import { TeamHud } from "./components/ui/TeamHud";
import { createBattleWorld } from "./ecs/world";
import { MATCH_END_RESTART_DELAY_MS } from "./lib/constants";
import { readStoredBoolean, writeStoredBoolean } from "./lib/storedBoolean";
import { TEAM_CONFIGS } from "./lib/teamConfig";
import { BattleRunner } from "./runtime/simulation/battleRunner";
import { createTelemetryPort } from "./runtime/simulation/telemetryAdapter";
import {
  createMatchStateMachine,
  MatchStateSnapshot,
} from "./runtime/state/matchStateMachine";
import { ObstacleFixture } from "./simulation/match/matchSpawner";
const OBSTACLE_FIXTURE = sampleObstacleFixture as unknown as ObstacleFixture;
const ROBOT_LIST_STORAGE_KEY = "hud.showRobotList";

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
  const [matchSnapshot, setMatchSnapshot] = useState<MatchStateSnapshot>({
    phase: "initializing",
    elapsedMs: 0,
    restartTimerMs: null,
    winner: null,
    isDraw: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBattleStatsOpen, setIsBattleStatsOpen] = useState(false);
  const [showDebugUI, setShowDebugUI] = useState(false);
  const [showPerfOverlay, setShowPerfOverlay] = useState(false);
  const [showRobotList, setShowRobotList] = useState(() =>
    readStoredBoolean(ROBOT_LIST_STORAGE_KEY, true),
  );

  const matchMachine = useMemo(
    () =>
      createMatchStateMachine({
        autoRestartDelayMs: MATCH_END_RESTART_DELAY_MS,
        onChange: (snapshot) => setMatchSnapshot(snapshot),
      }),
    [],
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || isBattleStatsOpen) return;
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
  }, [isSettingsOpen, isBattleStatsOpen, handlePauseResume, handleReset]);

  const statusText = formatStatus(matchSnapshot);
  const pauseLabel = matchSnapshot.phase === "paused" ? "Resume" : "Pause";

  const winnerLabel =
    matchSnapshot.phase === "victory" && matchSnapshot.winner
      ? TEAM_CONFIGS[matchSnapshot.winner].label
      : null;
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
      {matchSnapshot.phase === "victory" && (winnerLabel || isDraw) ? (
        <div className="app-victory-overlay">
          <h2 className="app-victory-title">
            {isDraw ? "Draw!" : `${winnerLabel} Triumphs!`}
          </h2>
          {restartSeconds != null ? (
            <p className="app-victory-subtitle">{`Restarting in ${restartSeconds}s`}</p>
          ) : null}
          <button
            type="button"
            className="app-button app-victory-button"
            onClick={() => {
              setIsBattleStatsOpen(true);
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
          <span>
            {pauseLabel === "Pause" ? "⏸" : "▶"} {pauseLabel}
          </span>
        </button>
        <button type="button" onClick={handleReset} title="Reset (R)">
          <span>🔄 Reset</span>
        </button>
      </div>
    </div>
  );
}
