import type { TeamSummaryViewModel } from '../../selectors/uiSelectors';

export interface TeamStatusPanelProps {
  team: TeamSummaryViewModel;
}

function formatCaptainLabel(team: TeamSummaryViewModel): string {
  if (!team.captain) {
    return 'Captain unknown';
  }

  const statusLabel = team.captain.alive ? 'Alive' : 'Eliminated';
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
        <h2 className="team-status-panel__name">{team.label}</h2>
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
        <div>
          <dt>Alive</dt>
          <dd>{team.alive}</dd>
        </div>
        <div>
          <dt>Eliminated</dt>
          <dd>{team.eliminated}</dd>
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
            className="team-status-panel__weapon"
          >
            {weapon}: {count}
          </span>
        ))}
      </div>
    </article>
  );
}

export default TeamStatusPanel;
