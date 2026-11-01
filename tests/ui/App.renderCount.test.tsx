import { act, render } from "@testing-library/react";
import { memo, useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import App from "@/App";
import { createBattleRunner } from "@/runtime/simulation/battleRunner";
import type { TelemetryPort } from "@/runtime/simulation/ports";

const counters = vi.hoisted(() => ({
  simulation: 0,
  app: 0,
  ticks: 0,
  bumpSimulation() {
    this.simulation += 1;
  },
  bumpApp() {
    this.app += 1;
  },
}));
const captured = vi.hoisted(() => ({ runner: null as any }));

// SettingsIcon is an un-memoised child rendered directly by App, so its render
// count equals App's render count.
vi.mock("@/components/ui/SettingsIcon", () => ({
  SettingsIcon: () => {
    counters.bumpApp();
    return null;
  },
}));

// Stand-in for the R3F Simulation: counts its own renders and drives the real
// battle runner for N ticks, like useFrame does in the browser.
vi.mock("@/components/Simulation", () => ({
  Simulation: memo(function SimulationMock(props: any) {
    counters.bumpSimulation();
    useEffect(() => {
      const telemetry = {
        reset: () => {},
        recordSpawn: () => {},
        recordFire: () => {},
        recordDamage: () => {},
        recordDeath: () => {},
      } as TelemetryPort;
      const runner = createBattleRunner(props.battleWorld, {
        seed: 7,
        telemetry,
        matchMachine: props.matchMachine,
        maxMatchDurationMs: null,
      });
      captured.runner = runner;
      return () => runner.dispose();
    }, []);
    return <div data-testid="simulation-mock" />;
  }),
}));

describe("render decoupling (#162)", () => {
  it("does not re-render App or Simulation per simulation tick", () => {
    render(<App />);
    // Step outside the mount effect: updates inside a nested act() would be
    // batched into the outer one and hide per-tick renders.
    const baselineApp = counters.app;
    const baselineSim = counters.simulation;
    for (let i = 0; i < 300; i += 1) {
      act(() => captured.runner.step(1 / 60));
      counters.ticks += 1;
    }

    expect(counters.ticks).toBe(300);
    // Simulation is memoised: it only re-renders when App re-renders with new
    // props. Before #162 App re-rendered on every tick (300+ renders here).
    // Allow the mount render and the initializing -> running phase change.
    expect(counters.simulation - baselineSim).toBeLessThanOrEqual(2);
    expect(counters.app - baselineApp).toBeLessThanOrEqual(3);
  });
});
