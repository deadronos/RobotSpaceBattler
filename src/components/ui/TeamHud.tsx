import type { BattleWorld } from "../../ecs/world";
import { tallyTeams } from "../../runtime/simulation/matchOutcome";
import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import { useHudTick } from "./useHudTick";

interface TeamHudProps {
  battleWorld: BattleWorld;
}

/**
 * Team strength bar and alive counts. Reads the ECS on a throttled tick, so
 * only this subtree renders (about 4 Hz), not the whole App.
 */
export function TeamHud({ battleWorld }: TeamHudProps) {
  useHudTick();
  const { robots: aliveCounts, health: teamHealth } = tallyTeams(battleWorld);

  return (
    <>
      <div className="app-team-strength" data-testid="team-strength-bar">
        <div
          className="app-team-strength-segment app-team-strength-red"
          style={{ flex: Math.max(1, teamHealth.red) }}
        >
          <span>{`${TEAM_IDENTITIES.red.label} · ${aliveCounts.red} · ${Math.round(teamHealth.red)} HP`}</span>
        </div>
        <div
          className="app-team-strength-segment app-team-strength-blue"
          style={{ flex: Math.max(1, teamHealth.blue) }}
        >
          <span>{`${TEAM_IDENTITIES.blue.label} · ${aliveCounts.blue} · ${Math.round(teamHealth.blue)} HP`}</span>
        </div>
      </div>
      <div className="app-alive-panel">
        <div className="app-alive-title">Alive</div>
        <div>{`${TEAM_IDENTITIES.red.label}: ${aliveCounts.red}`}</div>
        <div>{`${TEAM_IDENTITIES.blue.label}: ${aliveCounts.blue}`}</div>
      </div>
    </>
  );
}
