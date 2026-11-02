import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchEndOverlay } from "@/components/ui/MatchEndOverlay";
import { EMPTY_SERIES } from "@/runtime/state/seriesScore";

function renderOverlay(
  overrides: Partial<Parameters<typeof MatchEndOverlay>[0]> = {},
) {
  const props = {
    winner: "red" as const,
    isDraw: false,
    restartSeconds: 3,
    autoRestartEnabled: true,
    series: { red: 2, blue: 1, draws: 1, rounds: 4 },
    onOpenSummary: vi.fn<() => void>(),
    onOpenBattleStats: vi.fn<() => void>(),
    onNextRound: vi.fn<() => void>(),
    onToggleAutoRestart: vi.fn<(enabled: boolean) => void>(),
    ...overrides,
  };
  render(<MatchEndOverlay {...props} />);
  return props;
}

describe("MatchEndOverlay (#170)", () => {
  it("shows the winner, countdown and series score", () => {
    renderOverlay();

    expect(screen.getByText("Crimson Fleet Triumphs!")).toBeTruthy();
    expect(screen.getByText("Restarting in 3s")).toBeTruthy();
    expect(screen.getByTestId("series-score").textContent).toBe(
      "Series · Crimson Fleet 2 – 1 Azure Vanguard · 1 drawn",
    );
  });

  it("shows a draw and the disabled restart state", () => {
    renderOverlay({
      winner: null,
      isDraw: true,
      restartSeconds: null,
      autoRestartEnabled: false,
      series: EMPTY_SERIES,
    });

    expect(screen.getByText("Draw!")).toBeTruthy();
    expect(screen.getByText("Auto-restart is off")).toBeTruthy();
    expect(screen.getByTestId("series-score").textContent).toBe(
      "Series · Crimson Fleet 0 – 0 Azure Vanguard",
    );
  });

  it("opens the summary, the battle stats and the next round", () => {
    const props = renderOverlay();

    fireEvent.click(screen.getByRole("button", { name: "Match summary" }));
    expect(props.onOpenSummary).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Battle stats" }));
    expect(props.onOpenBattleStats).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Next round" }));
    expect(props.onNextRound).toHaveBeenCalledTimes(1);
  });

  it("toggles the auto-restart preference", () => {
    const props = renderOverlay();

    const toggle = screen.getByRole("checkbox", { name: "Auto-restart" });
    expect((toggle as HTMLInputElement).checked).toBe(true);
    fireEvent.click(toggle);
    expect(props.onToggleAutoRestart).toHaveBeenCalledWith(false);
  });
});
