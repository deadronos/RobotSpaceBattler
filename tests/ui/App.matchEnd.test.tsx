import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "@/App";
import type { MatchStateMachine } from "@/runtime/state/matchStateMachine";
import { useTelemetryStore } from "@/state/telemetryStore";

const captured = vi.hoisted(() => ({
  machine: null as MatchStateMachine | null,
  world: null as { robots: { entities: unknown[] } } | null,
}));

vi.mock("@/components/Simulation", () => ({
  Simulation: (props: {
    matchMachine: MatchStateMachine;
    battleWorld: { robots: { entities: unknown[] } };
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

function addRobots() {
  const entities = captured.world!.robots.entities;
  entities.length = 0;
  entities.push(
    { id: "red-1", team: "red", role: "assault", health: 100 },
    { id: "blue-1", team: "blue", role: "tank", health: 0 },
  );
}

function recordRoundTelemetry() {
  const store = useTelemetryStore.getState();
  store.recordEvent({
    type: "spawn",
    timestampMs: 0,
    sequenceId: 1,
    entityId: "red-1",
    teamId: "red",
  });
  store.recordEvent({
    type: "spawn",
    timestampMs: 0,
    sequenceId: 2,
    entityId: "blue-1",
    teamId: "blue",
  });
  store.recordEvent({
    type: "death",
    timestampMs: 5000,
    sequenceId: 3,
    entityId: "blue-1",
    teamId: "blue",
    attackerId: "red-1",
  });
}

function endRound(winner: "red" | "blue" | null) {
  act(() => {
    if (winner) {
      captured.machine!.declareVictory(winner, 5000);
    } else {
      captured.machine!.declareDraw(5000);
    }
  });
}

function startRound() {
  act(() => {
    captured.machine!.reset();
    captured.machine!.start();
  });
}

describe("match end: summary, series and auto-restart (#170)", () => {
  beforeEach(() => {
    captured.machine = null;
    captured.world = null;
    window.localStorage.clear();
    useTelemetryStore.getState().reset("app-match-end");
  });

  it("opens the summary at match end and scores the round", () => {
    render(<App />);
    addRobots();
    recordRoundTelemetry();
    act(() => captured.machine!.start());
    endRound("red");

    const dialog = screen.getByRole("dialog", { name: "Match Summary" });
    expect(dialog.textContent).toContain("Crimson Fleet wins");
    expect(screen.getByTestId("match-summary-mvp").textContent).toContain(
      "red-1",
    );
    expect(screen.getByTestId("summary-robot-blue-1").textContent).toContain(
      "Tank",
    );
    expect(screen.getByTestId("series-score").textContent).toBe(
      "Series · Crimson Fleet 1 – 0 Azure Vanguard",
    );
  });

  it("keeps the series across rounds until it is reset", () => {
    render(<App />);
    addRobots();
    recordRoundTelemetry();
    act(() => captured.machine!.start());
    endRound("red");

    fireEvent.click(
      screen.getByRole("button", { name: "Close Match Summary" }),
    );
    startRound();
    expect(screen.queryByRole("dialog", { name: "Match Summary" })).toBeNull();

    endRound(null);
    expect(
      screen.getByRole("dialog", { name: "Match Summary" }).textContent,
    ).toContain("Draw!");
    expect(screen.getByTestId("series-score").textContent).toBe(
      "Series · Crimson Fleet 1 – 0 Azure Vanguard · 1 drawn",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset series" }));
    expect(screen.getByTestId("summary-series-score").textContent).toBe(
      "Series · Crimson Fleet 0 – 0 Azure Vanguard",
    );
    expect(screen.getByTestId("series-score").textContent).toBe(
      "Series · Crimson Fleet 0 – 0 Azure Vanguard",
    );
  });

  it("keeps a closed summary closed while the countdown runs", () => {
    render(<App />);
    addRobots();
    act(() => captured.machine!.start());
    endRound("red");
    fireEvent.click(
      screen.getByRole("button", { name: "Close Match Summary" }),
    );

    // The countdown re-emits the victory snapshot every whole second.
    act(() => {
      captured.machine!.tick(1200);
    });

    expect(screen.queryByRole("dialog", { name: "Match Summary" })).toBeNull();
    expect(screen.getByText("Restarting in 4s")).toBeTruthy();
  });

  it("turns auto-restart off and remembers it", () => {
    render(<App />);
    addRobots();
    act(() => captured.machine!.start());
    endRound("red");

    fireEvent.click(screen.getByRole("checkbox", { name: "Auto-restart" }));

    expect(window.localStorage.getItem("hud.autoRestart")).toBe("0");
    expect(screen.getByText("Auto-restart is off")).toBeTruthy();
    // Nothing restarts on its own any more: the phase stays at victory.
    act(() => {
      captured.machine!.tick(60_000);
    });
    expect(captured.machine!.getSnapshot().phase).toBe("victory");
  });
});
