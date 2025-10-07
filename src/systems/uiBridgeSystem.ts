import { useEffect } from 'react';

import { useSimulationWorld } from '../ecs/world';
import { useUiStore } from '../store/uiStore';

export function useUiBridgeSystem() {
  const setHudVisible = useUiStore((s) => s.setHudVisible);
  const showPerformanceOverlay = useUiStore((s) => s.showPerformanceOverlay);
  const hidePerformanceOverlay = useUiStore((s) => s.hidePerformanceOverlay);
  const openStats = useUiStore((s) => s.openStats);
  const openSettings = useUiStore((s) => s.openSettings);

  const world = useSimulationWorld();

  useEffect(() => {
    let raf = 0;
    let lastStatus: string | null = null;

    const tick = () => {
      const sim = world.simulation;

      // keep HUD visible by default; simulations may add a UI flag in the future
      setHudVisible(true);

      if (sim.performanceStats?.qualityScalingActive) {
        showPerformanceOverlay();
      } else {
        hidePerformanceOverlay();
      }

      // sync victory overlay visibility
      const isVictory = sim.status === 'victory' || sim.status === 'simultaneous-elimination';
      // Previously we logged the flag here every tick; that generated
      // thousands of lines in CI and during dev. Remove the noisy log
      // and only keep the state update.
      useUiStore.getState().setVictoryOverlayVisible(!!isVictory);

      // Only react to a status transition into victory to avoid repeated opens
      if (sim.status === 'victory' || sim.status === 'simultaneous-elimination') {
        if (lastStatus !== sim.status) {
          openStats();
        }
      }

      if (sim.ui?.statsOpen) {
        openStats();
      } else {
        // close if it was previously open
        const close = useUiStore.getState().closeStats;
        if (close) close();
      }

      if (sim.ui?.settingsOpen) {
        openSettings();
      } else {
        const closeSettings = useUiStore.getState().closeSettings;
        if (closeSettings) closeSettings();
      }

      lastStatus = sim.status;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [world, setHudVisible, showPerformanceOverlay, hidePerformanceOverlay, openStats, openSettings]);
}

export default useUiBridgeSystem;
