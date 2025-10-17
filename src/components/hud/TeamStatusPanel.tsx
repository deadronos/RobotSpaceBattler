import type { TeamSummaryViewModel } from "../../selectors/uiSelectors";

export interface TeamStatusPanelProps {
  team: TeamSummaryViewModel;
}

function formatCaptainLabel(team: TeamSummaryViewModel): string {
  if (!team.captain) {
    return "Captain unknown";
  }

  const statusLabel = team.captain.alive ? "Alive" : "Eliminated";
  return `${team.captain.name} (${statusLabel})`;
}

export function TeamStatusPanel({ team }: TeamStatusPanelProps) {
  return (
    <article
      className="team-status-panel"
      data-team={team.teamId}
      aria-label={`${team.label} status`}
    >
      <header className="team-status-panel__header">
        <h3 className="team-status-panel__name">{team.label}</h3>
        {team.captain ? (
          <span className="team-status-panel__captain" role="status">
            Captain: {formatCaptainLabel(team)}
          </span>
        ) : (
          <span className="team-status-panel__captain" role="status">
            Captain: Unknown
          </span>
        )}
      </header>

      <dl className="team-status-panel__stats">
        <div className="team-status-panel__stat">
          <dt className="team-status-panel__stat-label">Alive</dt>
          <dd className="team-status-panel__stat-value">{team.alive}</dd>
        </div>
        <div className="team-status-panel__stat">
          <dt className="team-status-panel__stat-label">Eliminated</dt>
          <dd className="team-status-panel__stat-value">{team.eliminated}</dd>
        </div>
      </dl>

      <div
        className="team-status-panel__weapons"
        aria-label="Weapon distribution"
        role="list"
      >
        {Object.entries(team.weaponDistribution).map(([weapon, count]) => (
          <span
            key={weapon}
            role="listitem"
            className="team-status-panel__weapon-chip"
          >
            {weapon}: {count}
          </span>
        ))}
      </div>
    </article>
  );
}

export default TeamStatusPanel;
