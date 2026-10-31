import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
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

describe("Draw overlay", () => {
  beforeEach(() => {
    captured.machine = null;
    captured.world = null;
  });

  it("shows a draw overlay when the match ends without a winner", () => {
    render(<App />);
    act(() => {
      captured.world!.robots.entities.length = 0;
      captured.machine!.start();
      captured.machine!.declareDraw(5000);
    });
    expect(screen.getByText("Draw!")).toBeTruthy();
    expect(screen.getByText("Restarting in 5s")).toBeTruthy();
  });
});
