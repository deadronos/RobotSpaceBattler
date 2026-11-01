import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import { TEAM_CONFIGS } from "@/lib/teamConfig";
import type { MatchStateMachine } from "@/runtime/state/matchStateMachine";

const captured = vi.hoisted(() => ({
  machine: null as MatchStateMachine | null,
  world: null as { robots: { entities: any[] } } | null,
}));

vi.mock("@/components/Simulation", () => ({
  Simulation: (props: {
    matchMachine: MatchStateMachine;
    battleWorld: any;
  }) => {
    captured.machine = props.matchMachine;
    captured.world = props.battleWorld;
    return <div data-testid="simulation-mock" />;
  },
}));
vi.mock("@/components/debug/ObstacleEditor", () => ({
  ObstacleEditor: () => null,
}));
vi.mock("@/components/debug/ObstacleSpawner", () => ({
  ObstacleSpawner: () => null,
}));
vi.mock("@/components/debug/PerfToggles", () => ({ PerfToggles: () => null }));
vi.mock("@/components/ui/RobotListPanel", () => ({
  RobotListPanel: () => null,
}));

function addRobots(count: number, health = 100) {
  const entities = captured.world!.robots.entities;
  entities.length = 0;
  for (const team of ["red", "blue"] as const) {
    for (let i = 0; i < count; i++) {
      entities.push({ id: `${team}-${i}`, team, health });
    }
  }
}

function alivePanel() {
  return screen.getByText("Alive").parentElement!.textContent;
}

describe("Alive HUD", () => {
  beforeEach(() => {
    captured.machine = null;
    captured.world = null;
  });

  it("tracks alive robots as they spawn, die and reset", () => {
    render(<App />);
    expect(alivePanel()).toContain("0");

    act(() => {
      addRobots(10);
      captured.machine!.reset();
      captured.machine!.start();
    });
    expect(alivePanel()).toMatch(/10.*10/);

    const strengthBar = screen.getByTestId("team-strength-bar");
    expect(strengthBar.textContent).toContain(TEAM_CONFIGS.red.label);
    expect(strengthBar.textContent).toContain(TEAM_CONFIGS.blue.label);
    expect(strengthBar.textContent).toContain("1000 HP");

    act(() => {
      captured.world!.robots.entities[0].health = 0;
      captured.world!.robots.entities[1].health = 0;
      captured.machine!.tick(16);
    });
    expect(alivePanel()).toMatch(/8.*10/);
    expect(strengthBar.textContent).toContain("800 HP");

    // Reset / auto-restart repopulates the world.
    act(() => {
      addRobots(10);
      captured.machine!.reset();
      captured.machine!.start();
    });
    expect(alivePanel()).toMatch(/10.*10/);
  });
});
