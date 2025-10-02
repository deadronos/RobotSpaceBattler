import React from "react";
import { render, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { world } from "../src/ecs/miniplexStore";
import { useSimulationBootstrap } from "../src/hooks/useSimulationBootstrap";

vi.useFakeTimers();

function BootstrapTest({ invalidate }: { invalidate: () => void }) {
  // create queries that align with the real world instance
  const robotQuery: any = world.with("team") as any;
  const projectileQuery: any = world.with("projectile") as any;
  const beamQuery: any = world.with("beam") as any;
  useSimulationBootstrap(robotQuery, projectileQuery, beamQuery, invalidate);
  return null;
}

describe("useSimulationBootstrap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  it("runs bootstrap on mount and cleanup on unmount", async () => {
    const invalidate = vi.fn();
  // Spy on spawnControls and scoring/respawn helpers that the hook calls
  const spawnControls = await import("../src/robots/spawnControls");
  const scoring = await import("../src/systems/ScoringSystem");
  const respawn = await import("../src/systems/RespawnSystem");
  const resetWorld = await import("../src/ecs/miniplexStore");

  const spawnSpy = vi.spyOn(spawnControls, "resetAndSpawnDefaultTeams");
  const scoreSpy = vi.spyOn(scoring, "resetScores");
  const clearRespawnSpy = vi.spyOn(respawn, "clearRespawnQueue");
  const resetWorldSpy = vi.spyOn(resetWorld, "resetWorld");

    const { unmount } = render(<BootstrapTest invalidate={invalidate} />);

    // Fast-forward timers to trigger deferred spawn
    vi.runAllTimers();

    expect(scoreSpy).toHaveBeenCalled();
    expect(clearRespawnSpy).toHaveBeenCalled();
    expect(spawnSpy).toHaveBeenCalled();
    // unmount => cleanup should call resetWorld
    unmount();
    expect(resetWorldSpy).toHaveBeenCalled();
  });
});
