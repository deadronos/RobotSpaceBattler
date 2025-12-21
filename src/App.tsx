import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Import the sample fixture directly so the dev server doesn't need to serve
// the file path for tests and local development. This provides a robust
// default while still allowing live updates via fetch.
import sampleObstacleFixture from "../specs/fixtures/dynamic-arena-sample.json";
import { ObstacleEditor } from "./components/debug/ObstacleEditor";
import { ObstacleSpawner } from "./components/debug/ObstacleSpawner";
import { PerfToggles } from "./components/debug/PerfToggles";
import { Simulation } from "./components/Simulation";
import { SettingsModal } from "./components/ui/SettingsModal";
import { createBattleWorld } from "./ecs/world";
import {
  AUTO_RESTART_DELAY_MS,
  VICTORY_OVERLAY_BACKGROUND,
} from "./lib/constants";
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
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div id="status" className="match-status" role="status">
        {statusText}
      </div>

      <button
        className="settings-button"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Open settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showDebugUI={showDebugUI}
        onToggleDebugUI={setShowDebugUI}
      />

      <Suspense fallback={<div className="match-status">Loading arena...</div>}>
        <Simulation
          battleWorld={battleWorld}
          matchMachine={matchMachine}
          telemetry={telemetryPort}
          onRunnerReady={handleRunnerReady}
          obstacleFixture={obstacleFixture}
        />
      </Suspense>
      {showDebugUI && (
        <div
          style={{
            position: "absolute",
            left: 16,
            top: 72,
            maxWidth: 440,
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <ObstacleEditor world={battleWorld} sampleFixture={obstacleFixture} />
          <ObstacleSpawner world={battleWorld} />
          <PerfToggles />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "flex-end",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>Alive</div>
        <div>{`${TEAM_CONFIGS.red.label}: ${aliveCounts.red}`}</div>
        <div>{`${TEAM_CONFIGS.blue.label}: ${aliveCounts.blue}`}</div>
      </div>
      {matchSnapshot.phase === "victory" && winnerLabel ? (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "24px 32px",
            borderRadius: 12,
            background: VICTORY_OVERLAY_BACKGROUND,
            color: "#f7f8ff",
            textAlign: "center",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22 }}>{winnerLabel} Triumphs!</h2>
          {restartSeconds != null ? (
            <p
              style={{ margin: "12px 0 0 0" }}
            >{`Restarting in ${restartSeconds}s`}</p>
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
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
        }}
      >
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
