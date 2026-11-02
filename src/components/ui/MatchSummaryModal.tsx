import type { UnitRole } from "../../ecs/worldTypes";
import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import {
  formatMatchDuration,
  type MatchSummary,
  type RobotSummary,
  type RoleBreakdown,
  type TeamSummary,
} from "../../runtime/state/matchSummary";
import {
  formatSeriesLine,
  type SeriesScore,
} from "../../runtime/state/seriesScore";
import { Modal } from "./Modal";

const ROLE_LABELS: Record<UnitRole, string> = {
  assault: "Assault",
  tank: "Tank",
  sniper: "Sniper",
  medic: "Medic",
};

function roleLabel(role: UnitRole | null): string {
  return role ? ROLE_LABELS[role] : "Unknown";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="match-summary-stat">
      <span className="match-summary-stat-label">{label}</span>
      <span className="match-summary-stat-value">{value}</span>
    </div>
  );
}

function RoleRows({ roles }: { roles: RoleBreakdown[] }) {
  if (roles.length === 0) {
    return <p className="match-summary-empty">No robots by role.</p>;
  }
  return (
    <ul className="match-summary-roles">
      {roles.map((entry) => (
        <li key={entry.role} data-testid={`role-row-${entry.role}`}>
          <span className="match-summary-role-name">
            {`${ROLE_LABELS[entry.role]} × ${entry.robots}`}
          </span>
          <span className="match-summary-role-stats">
            {`${entry.kills} kills · ${Math.round(entry.damageDealt)} dmg · ${entry.deaths} deaths`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TeamCard({ team }: { team: TeamSummary }) {
  const identity = TEAM_IDENTITIES[team.team];
  return (
    <div
      className={`match-summary-team match-summary-team-${team.team}`}
      data-testid={`summary-team-${team.team}`}
    >
      <h3>{identity.label}</h3>
      <div className="match-summary-stat-grid">
        <Stat label="Kills" value={`${team.kills}`} />
        <Stat label="Damage dealt" value={`${Math.round(team.damageDealt)}`} />
        <Stat label="Damage taken" value={`${Math.round(team.damageTaken)}`} />
        <Stat label="Deaths" value={`${team.deaths}`} />
        <Stat label="Shots fired" value={`${team.shotsFired}`} />
      </div>
      <h4 className="match-summary-subtitle">By role</h4>
      <RoleRows roles={team.byRole} />
    </div>
  );
}

function MvpCard({ mvp }: { mvp: RobotSummary }) {
  return (
    <div className="match-summary-mvp" data-testid="match-summary-mvp">
      <span className="match-summary-mvp-badge">MVP</span>
      <span
        className="match-summary-mvp-team"
        style={{ color: TEAM_IDENTITIES[mvp.team].color }}
      >
        {`${TEAM_IDENTITIES[mvp.team].label} ${roleLabel(mvp.role)} ${mvp.id}`}
      </span>
      <span className="match-summary-mvp-stats">
        {`${mvp.kills} kills · ${Math.round(mvp.damageDealt)} damage · ${mvp.deaths} deaths`}
      </span>
    </div>
  );
}

function RobotTable({ robots }: { robots: RobotSummary[] }) {
  if (robots.length === 0) {
    return <p className="match-summary-empty">No telemetry was recorded.</p>;
  }
  return (
    <table className="match-summary-table">
      <thead>
        <tr>
          <th scope="col">Robot</th>
          <th scope="col">Team</th>
          <th scope="col">Role</th>
          <th scope="col">Kills</th>
          <th scope="col">Damage</th>
          <th scope="col">Deaths</th>
        </tr>
      </thead>
      <tbody>
        {robots.map((robot) => (
          <tr key={robot.id} data-testid={`summary-robot-${robot.id}`}>
            <th scope="row">{robot.id}</th>
            <td style={{ color: TEAM_IDENTITIES[robot.team].color }}>
              {TEAM_IDENTITIES[robot.team].label}
            </td>
            <td>{roleLabel(robot.role)}</td>
            <td>{robot.kills}</td>
            <td>{Math.round(robot.damageDealt)}</td>
            <td>{robot.deaths}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface MatchSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: MatchSummary | null;
  series: SeriesScore;
  onResetSeries: () => void;
}

/**
 * Post-match summary (#170): result, duration, per-team and per-role stats,
 * the MVP and the per-robot table. Uses the shared `Modal`, which provides
 * `role="dialog"`, `aria-modal` and a labelled title.
 */
export function MatchSummaryModal({
  isOpen,
  onClose,
  summary,
  series,
  onResetSeries,
}: MatchSummaryModalProps) {
  if (!isOpen || !summary) {
    return null;
  }

  const winnerLabel = summary.winner
    ? TEAM_IDENTITIES[summary.winner].label
    : null;
  const resultText = summary.isDraw
    ? "Draw!"
    : winnerLabel
      ? `${winnerLabel} wins`
      : "Match over";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Match Summary"
      contentClassName="match-summary-content"
    >
      <div className="match-summary-result">
        <h3>{resultText}</h3>
        <p className="match-summary-meta">
          {`Match duration ${formatMatchDuration(summary.durationMs)} · ${summary.robots.length} robots`}
        </p>
      </div>

      {summary.mvp ? <MvpCard mvp={summary.mvp} /> : null}

      <div className="match-summary-teams">
        <TeamCard team={summary.teams.red} />
        <TeamCard team={summary.teams.blue} />
      </div>

      <h3 className="match-summary-subtitle">Robots</h3>
      <RobotTable robots={summary.robots} />

      <div className="match-summary-series">
        <span data-testid="summary-series-score">
          {formatSeriesLine(series)}
        </span>
        <button
          type="button"
          className="app-button app-secondary-button"
          onClick={onResetSeries}
          disabled={series.rounds === 0}
        >
          Reset series
        </button>
      </div>
    </Modal>
  );
}
