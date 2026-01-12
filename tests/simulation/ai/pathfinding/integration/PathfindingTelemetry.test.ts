import { describe, test, expect } from "vitest";
import { PathfindingTelemetry } from "@/simulation/ai/pathfinding/integration/PathfindingTelemetry";

describe("PathfindingTelemetry", () => {
  test("calls registered callbacks", () => {
    const t = new PathfindingTelemetry();
    const events: any[] = [];
    t.on((e) => events.push(e));

    t.emit({ type: "path-calculation-start", timestamp: Date.now(), from: { x:0,y:0,z:0 }, to: { x:1,y:0,z:1 } });

    expect(events.length).toBe(1);
    expect(events[0].type).toBe("path-calculation-start");
  });
});
