import { useEffect, useState } from 'react';
import { useSimulationWorld } from '../ecs/world';
import { useUiStore } from '../store/uiStore';

export function useVictoryCountdown() {
  const world = useSimulationWorld();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const countdownPaused = world.simulation.countdownPaused ?? false;
  const override = useUiStore((s) => s.countdownOverrideSeconds);
  const setCountdownOverride = useUiStore((s) => s.setCountdownOverride);

  useEffect(() => {
    let interval: number | undefined;

    function compute() {
      const base = override ?? world.simulation.autoRestartCountdown ?? null;
      setRemainingSeconds(base === null ? null : Math.max(0, Math.floor(base)));
    }

    compute();

    if (world.simulation.status === 'victory' || world.simulation.status === 'simultaneous-elimination') {
      if (!countdownPaused) {
        interval = window.setInterval(() => {
          // world.simulation.autoRestartCountdown is expected to be updated by simulation loop
          compute();
        }, 250);
      }
    } else {
      setRemainingSeconds(null);
    }

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [world, override, countdownPaused]);

  const pause = () => {
    setCountdownOverride(remainingSeconds);
  };

  const resume = () => {
    setCountdownOverride(null);
  };

  const restartNow = () => {
    // call into world to trigger restart pathway
    if (typeof world.openSettingsOverlay === 'function') {
      // no-op for now; real restart should be simulation API
    }
  };

  return {
    remainingSeconds,
    pause,
    resume,
    restartNow,
  } as const;
}

export default useVictoryCountdown;
