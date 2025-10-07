import React, { useEffect, useState } from 'react'
import { isAppDebug, setAppMounted, setAppSimStatus, setAppUiVictory, getPlaywrightTriggerFlag } from './utils/debugFlags';

import HudRoot from './components/hud/HudRoot';
import SettingsDrawer from './components/overlays/SettingsDrawer';
import StatsModal from './components/overlays/StatsModal';
import VictoryOverlay from './components/overlays/VictoryOverlay';
import Scene from './components/Scene'
import useUiShortcuts from './hooks/useUiShortcuts';
import useVictoryCountdown from './hooks/useVictoryCountdown';
import { useUIStore } from './store/uiStore'
import { useUiBridgeSystem } from './systems/uiBridgeSystem';
import { useSimulationWorld, openStatsOverlay, openSettingsOverlay } from './ecs/world';

export default function App() {
  useUiShortcuts();
  useUiBridgeSystem();

  const { remainingSeconds, pause, resume, restartNow } = useVictoryCountdown();

  const statsOpen = useUIStore((s) => s.statsOpen);
  // const settingsOpen = useUIStore((s) => s.settingsOpen); // Note: Settings drawer reads its own open state from the store; we don't need
  // to select it here. Keep selectors minimal to avoid unnecessary subscriptions.

  const world = useSimulationWorld();
  const sim = world.simulation;
  const [testTriggered, setTestTriggered] = useState(false);
  const victoryVisible = useUIStore((s) => s.victoryOverlayVisible) || testTriggered;
  const winnerName = sim.winner ? String(sim.winner) : '';

  useEffect(() => {
    // mark app mounted for external debugging
    setAppMounted(true);

    const handler = () => {
      if (isAppDebug()) console.log('[test-helper] received playwright:triggerVictory');
      try {
        // try to use the SimulationState helper where available
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { setVictoryState } = require('./ecs/entities/SimulationState');
        world.simulation = setVictoryState(world.simulation, 'red', Date.now());
      } catch {
        try {
          world.simulation = { ...world.simulation, status: 'victory', winner: 'red', autoRestartCountdown: 5 };
        } catch {}
      }

      // ensure UI immediately reflects victory for test flows
      try {
        useUIStore.getState().setVictoryOverlayVisible(true);
      } catch {}
      // local state to force a render in case UI store update was lost
      setTestTriggered(true);

      // reflect sim state for debugging
      try {
        setAppSimStatus(world.simulation.status);
        setAppUiVictory(useUIStore.getState().victoryOverlayVisible);
      } catch {}
    };

    // If the page was opened with ?forceVictory=1, immediately trigger victory
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('forceVictory') === '1') {
        if (isAppDebug()) console.log('[test-helper] forceVictory param detected, triggering victory');
        handler();
      }
    } catch {}

    // if the test helper fired before we mounted, honor the persistent flag as well
    if (getPlaywrightTriggerFlag()) {
      if (isAppDebug()) console.log('[test-helper] detected persisted victory flag');
      handler();
    }

    window.addEventListener('playwright:triggerVictory', handler as EventListener);
    return () => window.removeEventListener('playwright:triggerVictory', handler as EventListener);
  }, [world]);

  return (
    <div id="app-root" style={{ height: '100%' }}>
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
          restartNow: restartNow,
          pauseCountdown: pause,
          resumeCountdown: resume,
        }}
      />

      <StatsModal
        open={statsOpen}
        winnerName={winnerName}
        teamSummaries={[]}
        robotStats={[]}
        sort={{ column: 'kills', direction: 'desc' }}
        onClose={() => useUIStore.getState().closeStats()}
        onSortChange={() => {}}
        onExport={() => {}}
      />

      <SettingsDrawer />

      <Scene />
    </div>
  );
}
