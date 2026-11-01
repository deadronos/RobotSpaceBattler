import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("BattleStatsModal render rate", () => {
  it("does not re-render while closed when telemetry events are recorded", async () => {
    const { Profiler } = await import("react");
    const { act } = await import("@testing-library/react");
    const { useTelemetryStore } = await import("@/state/telemetryStore");
    const { BattleStatsModal } =
      await import("@/components/ui/BattleStatsModal");

    let commits = 0;
    render(
      <Profiler id="stats" onRender={() => (commits += 1)}>
        <BattleStatsModal isOpen={false} onClose={() => {}} />
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
