import type { CSSProperties } from "react";

import type { BattleWorld } from "../../ecs/world";
import { tallyTeams } from "../../runtime/simulation/matchOutcome";
import { resolveTeamPalette } from "../../lib/teamPalette";
import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import { TeamMarker } from "./TeamMarker";
import { useHudTick } from "./useHudTick";

interface TeamHudProps {
  battleWorld: BattleWorld;
  /** Use the colour-blind-safe team palette (#166). */
  colorBlindPalette?: boolean;
}

/**
 * Team strength bar and alive counts. Reads the ECS on a throttled tick, so
 * only this subtree renders (about 4 Hz), not the whole App.
 */
export function TeamHud({
  battleWorld,
  colorBlindPalette = false,
}: TeamHudProps) {
  useHudTick();
  const { robots: aliveCounts, health: teamHealth } = tallyTeams(battleWorld);
  const palette = resolveTeamPalette(colorBlindPalette);

  return (
    <>
      <div className="app-team-strength" data-testid="team-strength-bar">
        <div
          className="app-team-strength-segment app-team-strength-red"
          style={
            {
              flex: Math.max(1, teamHealth.red),
              "--team-color": palette.colors.red,
              "--team-color-dark": palette.darkColors.red,
            } as CSSProperties
          }
        >
          <TeamMarker team="red" />
          <span>{`${TEAM_IDENTITIES.red.label} · ${aliveCounts.red} · ${Math.round(teamHealth.red)} HP`}</span>
        </div>
        <div
          className="app-team-strength-segment app-team-strength-blue"
          style={
            {
              flex: Math.max(1, teamHealth.blue),
              "--team-color": palette.colors.blue,
              "--team-color-dark": palette.darkColors.blue,
            } as CSSProperties
          }
        >
          <TeamMarker team="blue" />
          <span>{`${TEAM_IDENTITIES.blue.label} · ${aliveCounts.blue} · ${Math.round(teamHealth.blue)} HP`}</span>
        </div>
      </div>
      <div className="app-alive-panel">
        <div className="app-alive-title">Alive</div>
        <div>
          <TeamMarker team="red" />
          {`${TEAM_IDENTITIES.red.label}: ${aliveCounts.red}`}
        </div>
        <div>
          <TeamMarker team="blue" />
          {`${TEAM_IDENTITIES.blue.label}: ${aliveCounts.blue}`}
        </div>
      </div>
    </>
  );
}
