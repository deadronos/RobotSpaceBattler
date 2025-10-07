import React from 'react'

import Scene from './components/Scene'
import { useUIStore } from './store/uiStore'

import React from 'react';
import Scene from './components/Scene';
import HudRoot from './components/hud/HudRoot';
import VictoryOverlay from './components/overlays/VictoryOverlay';
import StatsModal from './components/overlays/StatsModal';
import SettingsDrawer from './components/overlays/SettingsDrawer';
import { useUIStore } from './store/uiStore';
import useUiShortcuts from './hooks/useUiShortcuts';
import { useUiBridgeSystem } from './systems/uiBridgeSystem';
import useVictoryCountdown from './hooks/useVictoryCountdown';

export default function App() {
  useUiShortcuts();
  useUiBridgeSystem();

  const { performanceOverlayVisible } = useUIStore();
  const hud = {} as any; // placeholder for props

  const { remainingSeconds, pause, resume, restartNow } = useVictoryCountdown();

  const ui = useUIStore((s) => ({
    statsOpen: s.statsOpen,
    settingsOpen: s.settingsOpen,
  }));

  return (
    <div id="app-root" style={{ height: '100%' }}>
      <HudRoot onTogglePause={() => {}} onToggleCinematic={() => {}} />
      <VictoryOverlay
        visible={false}
        winnerName=""
        countdownSeconds={remainingSeconds}
        countdownPaused={false}
        teamSummaries={[]}
        actions={{ openStats: () => {}, openSettings: () => {}, restartNow: () => {}, pauseCountdown: pause, resumeCountdown: resume }}
      />

      <StatsModal
        open={ui.statsOpen}
        winnerName=""
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
