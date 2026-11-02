import type { CSSProperties } from "react";

import { TEAM_IDENTITIES, TeamId } from "./teamConfig";

/**
 * Team presentation palettes (#166).
 *
 * Teams used to be distinguishable only by red vs blue. Rendering now reads a
 * palette and a per-team shape marker from here, so team identity survives both
 * colour-vision differences and a red/blue-blind palette. Nothing here touches
 * simulation state: colours and markers are presentation only.
 */

export type TeamPaletteId = "default" | "colorBlindSafe";

export interface TeamPalette {
  id: TeamPaletteId;
  /** Human-readable name, shown in Settings. */
  label: string;
  /** Primary team colours (robot instance colours, HUD accents). */
  colors: Record<TeamId, string>;
  /** Darker gradient endpoint for the HUD strength bar. */
  darkColors: Record<TeamId, string>;
}

/**
 * Okabe-Ito orange and sky blue. The pair stays distinguishable for the common
 * red/green (deuteranopia, protanopia) and blue/yellow deficiencies, unlike the
 * default crimson/azure pair for protanopia.
 */
const COLOR_BLIND_SAFE_COLORS: Record<TeamId, string> = {
  red: "#e69f00",
  blue: "#56b4e9",
};

export const TEAM_PALETTES: Record<TeamPaletteId, TeamPalette> = {
  default: {
    id: "default",
    label: "Default team colours",
    colors: {
      red: TEAM_IDENTITIES.red.color,
      blue: TEAM_IDENTITIES.blue.color,
    },
    darkColors: { red: "#4f1624", blue: "#132f57" },
  },
  colorBlindSafe: {
    id: "colorBlindSafe",
    label: "Colour-blind safe team colours",
    colors: COLOR_BLIND_SAFE_COLORS,
    darkColors: { red: "#5a2e00", blue: "#123a52" },
  },
};

export function resolveTeamPalette(
  colorBlindPalette: boolean | undefined,
): TeamPalette {
  return colorBlindPalette
    ? TEAM_PALETTES.colorBlindSafe
    : TEAM_PALETTES.default;
}

/** Primary colour for a team under the active palette. */
export function teamColor(
  team: TeamId,
  colorBlindPalette: boolean | undefined,
): string {
  return resolveTeamPalette(colorBlindPalette).colors[team];
}

/**
 * Per-team shape cues, used next to the colour everywhere the team is named.
 *
 * The glyphs are decorative (always rendered with `aria-hidden`); the visible
 * team label carries the meaning for assistive technology.
 */
export const TEAM_MARKERS: Record<TeamId, { glyph: string; shape: string }> = {
  red: { glyph: "▲", shape: "triangle" },
  blue: { glyph: "●", shape: "circle" },
};

/** CSS custom properties consumed by `App.css` for the strength bar. */
export function teamPaletteCssVariables(
  colorBlindPalette: boolean | undefined,
): CSSProperties {
  const palette = resolveTeamPalette(colorBlindPalette);
  return {
    "--team-red": palette.colors.red,
    "--team-red-dark": palette.darkColors.red,
    "--team-blue": palette.colors.blue,
    "--team-blue-dark": palette.darkColors.blue,
  } as CSSProperties;
}
