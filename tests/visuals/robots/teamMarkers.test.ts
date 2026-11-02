import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  collectTeamMarkerRobots,
  createTeamMarkerGeometry,
  MAX_ROBOTS_PER_TEAM,
} from "../../../src/visuals/robots/teamMarkers";
import { MAX_ROBOTS } from "../../../src/visuals/robots/robotLayout";

function silhouetteSize(team: "red" | "blue") {
  const geometry = createTeamMarkerGeometry(team);
  geometry.computeBoundingBox();
  return (geometry.boundingBox ?? new Box3()).getSize(new Vector3());
}

describe("team shape markers (#166)", () => {
  it("gives each team a different silhouette", () => {
    const red = silhouetteSize("red");
    const blue = silhouetteSize("blue");

    // A pyramid is pointed (height > depth); a ring is round in the billboard
    // plane and only as deep as its tube.
    expect(red.y).toBeGreaterThan(red.z);
    expect(blue.z).toBeLessThan(blue.y);

    const signature = (size: Vector3) =>
      [size.x, size.y, size.z].map((value) => value.toFixed(2)).join(":");
    expect(signature(red)).not.toBe(signature(blue));
  });

  it("stays within the per-team instanced capacity", () => {
    expect(MAX_ROBOTS_PER_TEAM).toBe(MAX_ROBOTS / 2);
  });

  it("splits living robots into per-team buffers", () => {
    const robots = [
      { id: "r1", team: "red" as const, health: 100, maxHealth: 100 },
      { id: "b1", team: "blue" as const, health: 100, maxHealth: 100 },
      { id: "r2", team: "red" as const, health: 0, maxHealth: 100 },
      { id: "b2", team: "blue" as const, health: 50, maxHealth: 100 },
    ];
    const out = {
      red: new Array<(typeof robots)[number] | undefined>(4),
      blue: new Array<(typeof robots)[number] | undefined>(4),
    };

    const counts = collectTeamMarkerRobots(robots, out);

    expect(counts).toEqual({ red: 1, blue: 2 });
    expect(out.red[0]?.id).toBe("r1");
    expect(out.blue[0]?.id).toBe("b1");
    expect(out.blue[1]?.id).toBe("b2");
  });

  it("does not overflow a full buffer", () => {
    const robots = [
      { id: "r1", team: "red" as const, health: 10, maxHealth: 10 },
      { id: "r2", team: "red" as const, health: 10, maxHealth: 10 },
    ];
    const out = {
      red: new Array<(typeof robots)[number] | undefined>(1),
      blue: new Array<(typeof robots)[number] | undefined>(1),
    };

    expect(collectTeamMarkerRobots(robots, out)).toEqual({ red: 1, blue: 0 });
  });
});
