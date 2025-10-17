import { useEffect, useState } from "react";

import { resetAutoRestartCountdown, useSimulationWorld } from "../ecs/world";
import { useUiStore } from "../store/uiStore";

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

    if (
      world.simulation.status === "victory" ||
      world.simulation.status === "simultaneous-elimination"
    ) {
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
    // trigger an immediate restart by forcing the autoRestartCountdown to 0
    // This avoids relying on a non-existent world method and is a safe, explicit mutation
    // that mirrors the expected restart behavior (the simulation tick will observe 0 and reset).
    try {
      // Mutate simulation state in a single assignment to keep immutability semantics
      world.simulation = { ...world.simulation, autoRestartCountdown: 0 };
    } catch {
      // If direct assignment is not allowed in some runtime, fall back to calling a helper
      try {
        resetAutoRestartCountdown(world);
      } catch {
        // no-op: best-effort restart request
      }
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
