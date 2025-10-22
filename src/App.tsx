import React, { useEffect, useMemo, useState } from "react";

import HudRoot from "./components/hud/HudRoot";
import SettingsDrawer from "./components/overlays/SettingsDrawer";
import VictoryOverlay from "./components/overlays/VictoryOverlay";
import Scene from "./components/Scene";
import StatsModal from "./components/ui/StatsModal";
import { setVictoryState } from "./ecs/entities/SimulationState";
import {
  openSettingsOverlay,
  openStatsOverlay,
  useSimulationWorld,
} from "./ecs/world";
import useUiShortcuts from "./hooks/useUiShortcuts";
import useVictoryCountdown from "./hooks/useVictoryCountdown";
import { useUIStore } from "./store/uiStore";
import { useUiBridgeSystem } from "./systems/uiBridgeSystem";
import {
  getPlaywrightTriggerFlag,
  isAppDebug,
  setAppMounted,
  setAppSimStatus,
  setAppUiVictory,
} from "./utils/debugFlags";

function logDebug(message: string, error?: unknown) {
  if (!isAppDebug()) {
    return;
  }

  if (error) {
    console.warn(`[test-helper] ${message}`, error);
    return;
  }

  console.log(`[test-helper] ${message}`);
}

export default function App() {
  useUiShortcuts();
  useUiBridgeSystem();

  const { remainingSeconds, pause, resume, restartNow } = useVictoryCountdown();
  const world = useSimulationWorld();
  const sim = world.simulation;
  const [testTriggered, setTestTriggered] = useState(false);
  const victoryVisible =
    useUIStore((s) => s.victoryOverlayVisible) || testTriggered;
  const winnerName = sim.winner ? String(sim.winner) : "";

  const forceVictoryFromQuery = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const params = new URLSearchParams(window.location.search ?? "");
      return params.get("forceVictory") === "1";
    } catch (error) {
      logDebug("failed to parse query string for forceVictory flag", error);
      return false;
    }
  }, []);

  useEffect(() => {
    setAppMounted(true);

    const applyVictoryState = () => {
      try {
        world.simulation = setVictoryState(world.simulation, "red", Date.now());
        logDebug("applied SimulationState.setVictoryState helper");
      } catch (error) {
        logDebug("falling back to manual simulation victory patch", error);
        world.simulation = {
          ...world.simulation,
          status: "victory",
          winner: "red",
          autoRestartCountdown: 5,
        };
      }
    };

    const syncUiVictory = () => {
      try {
        useUIStore.getState().setVictoryOverlayVisible(true);
        logDebug("forced victory overlay visible");
      } catch (error) {
        logDebug("failed to set victory overlay visibility", error);
      }
      setTestTriggered(true);
    };

    const syncDebugFlags = () => {
      try {
        setAppSimStatus(world.simulation.status);
        setAppUiVictory(useUIStore.getState().victoryOverlayVisible);
      } catch (error) {
        logDebug("failed to update debug flag mirrors", error);
      }
    };

    const handleVictory = () => {
      logDebug("received playwright:triggerVictory event");
      applyVictoryState();
      syncUiVictory();
      syncDebugFlags();
    };

    if (forceVictoryFromQuery) {
      logDebug("forceVictory query param detected, triggering victory");
      handleVictory();
    }

    if (getPlaywrightTriggerFlag()) {
      logDebug("detected persisted playwright trigger flag");
      handleVictory();
    }

    window.addEventListener(
      "playwright:triggerVictory",
      handleVictory as EventListener,
    );
    return () => {
      setAppMounted(false);
      window.removeEventListener(
        "playwright:triggerVictory",
        handleVictory as EventListener,
      );
    };
  }, [forceVictoryFromQuery, world]);

  return (
    <div id="app-root" style={{ height: "100%" }}>
      <HudRoot onTogglePause={() => {}} onToggleCinematic={() => {}} />
      <VictoryOverlay
        visible={victoryVisible}
        winnerName={winnerName}
        countdownSeconds={remainingSeconds}
        countdownPaused={sim.countdownPaused}
        teamSummaries={[]}
        actions={{
          openStats: () => openStatsOverlay(world),
          openSettings: () => openSettingsOverlay(world),
          restartNow: () => restartNow(),
          pauseCountdown: () => pause(),
          resumeCountdown: () => resume(),
        }}
      />

      <StatsModal />

      <SettingsDrawer />

      <Scene />
    </div>
  );
}
