import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MatchSummaryModal } from "@/components/ui/MatchSummaryModal";
import type { MatchSummaryInput } from "@/runtime/state/matchSummary";
import { buildMatchSummary } from "@/runtime/state/matchSummary";
import type { SeriesScore } from "@/runtime/state/seriesScore";

function summaryInput(): MatchSummaryInput {
  return {
    winner: "red",
    isDraw: false,
    durationMs: 125_000,
    robots: {
      "red-1": {
        id: "red-1",
        teamId: "red",
        shotsFired: 12,
        damageDealt: 220,
        damageTaken: 40,
        kills: 3,
        deaths: 0,
      },
      "red-2": {
        id: "red-2",
        teamId: "red",
        shotsFired: 8,
        damageDealt: 60,
        damageTaken: 90,
        kills: 1,
        deaths: 1,
      },
      "blue-1": {
        id: "blue-1",
        teamId: "blue",
        shotsFired: 10,
        damageDealt: 120,
        damageTaken: 150,
        kills: 1,
        deaths: 2,
      },
    },
    teamTotals: {
      red: {
        spawns: 2,
        shotsFired: 20,
        damageDealt: 280,
        damageTaken: 130,
        deaths: 1,
      },
      blue: {
        spawns: 1,
        shotsFired: 10,
        damageDealt: 120,
        damageTaken: 280,
        deaths: 2,
      },
    },
    roles: { "red-1": "assault", "red-2": "tank", "blue-1": "sniper" },
  };
}

const SERIES: SeriesScore = { red: 1, blue: 0, draws: 0, rounds: 1 };

function renderModal(
  overrides: Partial<Parameters<typeof MatchSummaryModal>[0]> = {},
) {
  const props = {
    isOpen: true,
    onClose: vi.fn<() => void>(),
    summary: buildMatchSummary(summaryInput()),
    series: SERIES,
    onResetSeries: vi.fn<() => void>(),
    ...overrides,
  };
  const view = render(<MatchSummaryModal {...props} />);
  return { props, view };
}

describe("MatchSummaryModal (#170)", () => {
  it("renders the result, duration and MVP in a labelled dialog", () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Match Summary" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(within(dialog).getByText("Crimson Fleet wins")).toBeTruthy();
    expect(
      within(dialog).getByText("Match duration 2:05 · 3 robots"),
    ).toBeTruthy();

    const mvp = screen.getByTestId("match-summary-mvp");
    expect(mvp.textContent).toContain("Crimson Fleet Assault red-1");
    expect(mvp.textContent).toContain("3 kills · 220 damage · 0 deaths");
  });

  it("shows per-team totals and per-role breakdowns", () => {
    renderModal();

    const red = screen.getByTestId("summary-team-red");
    expect(red.textContent).toContain("Crimson Fleet");
    expect(red.textContent).toContain("4"); // kills summed from the robots
    expect(red.textContent).toContain("Assault × 1");
    expect(red.textContent).toContain("Tank × 1");
    expect(within(red).getByTestId("role-row-assault").textContent).toContain(
      "3 kills · 220 dmg · 0 deaths",
    );

    const blue = screen.getByTestId("summary-team-blue");
    expect(within(blue).getByTestId("role-row-sniper")).toBeTruthy();
  });

  it("lists every robot with role, kills, damage and deaths", () => {
    renderModal();

    const rows = screen
      .getAllByTestId(/^summary-robot-/)
      .map((row) => row.textContent);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("red-1");
    expect(rows[0]).toContain("Assault");
    expect(screen.getByTestId("summary-robot-blue-1").textContent).toContain(
      "Sniper",
    );
  });

  it("shows the series and can reset it", () => {
    const { props } = renderModal();

    expect(screen.getByTestId("summary-series-score").textContent).toBe(
      "Series · Crimson Fleet 1 – 0 Azure Vanguard",
    );
    fireEvent.click(screen.getByRole("button", { name: "Reset series" }));
    expect(props.onResetSeries).toHaveBeenCalledTimes(1);
  });

  it("disables the series reset before any round is scored", () => {
    renderModal({ series: { red: 0, blue: 0, draws: 0, rounds: 0 } });

    const reset = screen.getByRole("button", {
      name: "Reset series",
    }) as HTMLButtonElement;
    expect(reset.disabled).toBe(true);
  });

  it("closes from the dialog close button", () => {
    const { props } = renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Close Match Summary" }),
    );
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without a summary", () => {
    const { view } = renderModal({ summary: null, isOpen: true });

    expect(view.container.innerHTML).toBe("");
  });
});
