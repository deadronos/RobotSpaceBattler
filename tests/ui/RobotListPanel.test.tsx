import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RobotListPanel } from "@/components/ui/RobotListPanel";
import { TEAM_CONFIGS } from "@/lib/teamConfig";

describe("RobotListPanel", () => {
  it("starts collapsed by default", () => {
    const battleWorld = {
      robots: {
        entities: [
          {
            id: "red-1",
            spawnIndex: 0,
            health: 100,
            maxHealth: 100,
            team: "red",
            ai: { mode: "roam", targetId: null },
          },
        ],
      },
    } as any;

    render(<RobotListPanel battleWorld={battleWorld} />);

    expect(
      screen.getByText(`${TEAM_CONFIGS.red.label} (1/1)`),
    ).toBeInTheDocument();
    expect(screen.getAllByText("▶").length).toBeGreaterThan(0);
    expect(screen.queryByText("ROAM")).not.toBeInTheDocument();
  });
});
