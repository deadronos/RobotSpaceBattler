import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RobotListPanel } from "@/components/ui/RobotListPanel";
import { TEAM_IDENTITIES } from "@/lib/teamConfig";

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
      screen.getByText(`${TEAM_IDENTITIES.red.label} (1/1)`),
    ).toBeInTheDocument();
    expect(screen.getAllByText("▶").length).toBeGreaterThan(0);
    expect(screen.queryByText("ROAM")).not.toBeInTheDocument();
  });
});

describe("RobotListPanel render rate", () => {
  it("does not re-render when telemetry events are recorded", async () => {
    const { Profiler } = await import("react");
    const { act } = await import("@testing-library/react");
    const { useTelemetryStore } = await import("@/state/telemetryStore");
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

    let commits = 0;
    render(
      <Profiler id="panel" onRender={() => (commits += 1)}>
        <RobotListPanel battleWorld={battleWorld} />
      </Profiler>,
    );
    const afterMount = commits;

    act(() => {
      for (let i = 0; i < 50; i += 1) {
        useTelemetryStore.getState().recordEvent({
          type: "fire",
          timestampMs: i,
          sequenceId: i,
          entityId: "red-1",
          teamId: "red",
        });
      }
    });

    expect(commits).toBe(afterMount);
  });
});
