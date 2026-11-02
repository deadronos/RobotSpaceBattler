import { describe, expect, it } from "vitest";

import {
  resolveTeamPalette,
  TEAM_MARKERS,
  teamColor,
  teamPaletteCssVariables,
} from "../../src/lib/teamPalette";
import { TEAM_IDENTITIES } from "../../src/lib/teamConfig";

describe("team palettes (#166)", () => {
  it("keeps the default palette in sync with the team identities", () => {
    expect(teamColor("red", false)).toBe(TEAM_IDENTITIES.red.color);
    expect(teamColor("blue", false)).toBe(TEAM_IDENTITIES.blue.color);
    expect(teamColor("red", undefined)).toBe(TEAM_IDENTITIES.red.color);
  });

  it("swaps in a colour-blind-safe pair when requested", () => {
    const palette = resolveTeamPalette(true);
    expect(palette.colors.red).not.toBe(TEAM_IDENTITIES.red.color);
    expect(palette.colors.blue).not.toBe(TEAM_IDENTITIES.blue.color);
    expect(teamColor("red", true)).toBe("#e69f00");
    expect(teamColor("blue", true)).toBe("#56b4e9");
  });

  it("gives each team a distinct shape marker", () => {
    expect(TEAM_MARKERS.red.glyph).not.toBe(TEAM_MARKERS.blue.glyph);
    expect(TEAM_MARKERS.red.shape).not.toBe(TEAM_MARKERS.blue.shape);
  });

  it("exposes the active palette as CSS custom properties", () => {
    const variables = teamPaletteCssVariables(true) as Record<string, string>;
    expect(variables["--team-red"]).toBe("#e69f00");
    expect(variables["--team-blue"]).toBe("#56b4e9");
  });
});
