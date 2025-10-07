import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';
import { useSimulationWorld } from '../ecs/world';

export function useUiBridgeSystem() {
  const setHudVisible = useUiStore((s) => s.setHudVisible);
  const showPerformanceOverlay = useUiStore((s) => s.showPerformanceOverlay);
  const hidePerformanceOverlay = useUiStore((s) => s.hidePerformanceOverlay);
  const openStats = useUiStore((s) => s.openStats);
  const openSettings = useUiStore((s) => s.openSettings);

  const world = useSimulationWorld();

  useEffect(() => {
    // subscribe to world simulation changes
    const unsub = world.simulation.onChange?.subscribe(() => {
      const sim = world.simulation;
      setHudVisible(sim.hudVisible ?? true);

      if (sim.performanceStats?.qualityScalingActive) {
        showPerformanceOverlay();
      } else {
        hidePerformanceOverlay();
      }

      if (sim.status === 'victory' || sim.status === 'simultaneous-elimination') {
        openStats();
      }
    });

    return () => unsub?.();
  }, [world, setHudVisible, showPerformanceOverlay, hidePerformanceOverlay, openStats, openSettings]);
}

export default useUiBridgeSystem;
