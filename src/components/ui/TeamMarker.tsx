import type { CSSProperties } from "react";

import { TEAM_MARKERS } from "../../lib/teamPalette";
import type { TeamId } from "../../lib/teamConfig";

interface TeamMarkerProps {
  team: TeamId;
  /** Extra inline styling for the glyph, if a caller needs it. */
  style?: CSSProperties;
}

/**
 * Decorative per-team shape cue (#166).
 *
 * The glyph is `aria-hidden`; the adjacent visible team label carries the
 * meaning, so assistive technology hears "Crimson Fleet", not "black up-pointing
 * triangle".
 */
export function TeamMarker({ team, style }: TeamMarkerProps) {
  const marker = TEAM_MARKERS[team];
  return (
    <span
      className={`team-marker team-marker-${team}`}
      style={style}
      aria-hidden="true"
      title={`${marker.shape} marker`}
    >
      {marker.glyph}
    </span>
  );
}
