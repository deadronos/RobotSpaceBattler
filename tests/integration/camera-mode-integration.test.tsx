import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BattleUI } from "../../src/components/battle/BattleUI";
import { RobotOverlay } from "../../src/components/battle/RobotOverlay";
import type { BattleSelectorsContext } from "../../src/selectors/battleSelectors";
import { createUiAdapter } from "../../src/systems/uiAdapter";

describe("camera mode integration", () => {
  const baseContext: BattleSelectorsContext = {
    round: {
      id: "round-1",
      status: "running",
      startTime: 0,
      endTime: null,
      map: "arena-01",
    },
    robots: [
      {
        id: "robot-alpha",
        team: "red",
        health: 75,
        maxHealth: 100,
        name: "Alpha",
        statusFlags: ["shielded"],
        isCaptain: true,
        currentTarget: null,
        currentTargetId: null,
      },
    ],
    camera: {
      mode: "follow",
      targetEntityId: "robot-alpha",
    },
    ui: {
      inRound: true,
      activeUI: "battle",
      lastToggleTime: null,
      userPreferences: {
        reducedMotion: false,
        minimalUi: false,
        followModeShowsPerRobot: true,
      },
    },
  };

  it("hides robot overlay and shows cinematic HUD when switching to cinematic mode", async () => {
    const adapter = createUiAdapter(baseContext);

    render(
      <>
        <BattleUI adapter={adapter} />
        <RobotOverlay adapter={adapter} robotId="robot-alpha" />
      </>,
    );

    expect(await screen.findByTestId("robot-overlay")).toBeInTheDocument();

    await act(async () => {
      adapter.updateContext({
        ...baseContext,
        camera: { mode: "cinematic", targetEntityId: null },
      });
    });

    expect(screen.queryByTestId("robot-overlay")).toBeNull();
    expect(screen.getByTestId("cinematic-hud")).toBeInTheDocument();
  });
});
