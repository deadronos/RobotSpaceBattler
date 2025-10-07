import type { Team, WeaponType } from '../../types';

export type StatsSortColumn = 'kills' | 'damageDealt' | 'damageTaken' | 'timeAliveSeconds';
export type StatsSortDirection = 'asc' | 'desc';

export interface StatsSortState {
  column: StatsSortColumn;
  direction: StatsSortDirection;
}

export interface StatsModalTeamSummary {
  teamId: Team | string;
  label: string;
  totalKills: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  averageHealthRemaining: number;
}

export interface StatsModalRobotStat {
  id: string;
  name: string;
  team: Team | string;
  weaponType: WeaponType | string;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  timeAliveSeconds: number;
  isCaptain: boolean;
}

export interface StatsModalProps {
  open: boolean;
  winnerName: string;
  teamSummaries: StatsModalTeamSummary[];
  robotStats: StatsModalRobotStat[];
  sort: StatsSortState;
  onClose: () => void;
  onSortChange: (sort: StatsSortState) => void;
  onExport: () => void;
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function StatsModal({
  open,
  winnerName,
  teamSummaries,
  robotStats,
  sort,
  onClose,
  onSortChange,
  onExport,
}: StatsModalProps) {
  if (!open) {
    return null;
  }

  const handleSortByDamage = () => {
    const nextDirection =
      sort.column === 'damageDealt' && sort.direction === 'desc' ? 'asc' : 'desc';
    onSortChange({ column: 'damageDealt', direction: nextDirection });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-stats-title"
      className="stats-modal"
    >
      <header className="stats-modal__header">
        <h2 id="victory-stats-title" className="stats-modal__title">
          {winnerName} Victory Stats
        </h2>
        <p className="stats-modal__subtitle">
          Review post-battle performance metrics for each team and robot.
        </p>
      </header>

      <section className="stats-modal__section" aria-label="team statistics">
        <header className="stats-modal__section-header">
          <h3>Team Summary</h3>
          <button type="button" onClick={onExport}>
            Export Stats
          </button>
        </header>
        <table className="stats-modal__table">
          <thead>
            <tr>
              <th scope="col">Team</th>
              <th scope="col">Kills</th>
              <th scope="col">Damage Dealt</th>
              <th scope="col">Damage Taken</th>
              <th scope="col">Average Health Remaining</th>
            </tr>
          </thead>
          <tbody>
            {teamSummaries.map((team) => (
              <tr key={team.teamId}>
                <th scope="row">{team.label.toLowerCase()}</th>
                <td>{team.totalKills}</td>
                <td>{team.totalDamageDealt}</td>
                <td>{team.totalDamageTaken}</td>
                <td>Average health remaining: {formatPercent(team.averageHealthRemaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="stats-modal__section" aria-label="robot statistics">
        <header className="stats-modal__section-header">
          <h3>Robot Performance</h3>
          <button type="button" onClick={handleSortByDamage}>
            Sort by Damage
          </button>
        </header>
        <table className="stats-modal__table">
          <thead>
            <tr>
              <th scope="col">Robot</th>
              <th scope="col">Team</th>
              <th scope="col">Weapon</th>
              <th scope="col">Kills</th>
              <th scope="col">Damage Dealt</th>
              <th scope="col">Damage Taken</th>
              <th scope="col">Time Alive</th>
              <th scope="col">Leader</th>
            </tr>
          </thead>
          <tbody>
            {robotStats.map((robot) => (
              <tr key={robot.id}>
                <th scope="row">{robot.id}</th>
                <td>{robot.team}</td>
                <td>{robot.weaponType}</td>
                <td>{robot.kills}</td>
                <td>{robot.damageDealt}</td>
                <td>{robot.damageTaken}</td>
                <td>{robot.timeAliveSeconds}s</td>
                <td>{robot.isCaptain ? 'Captain' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="stats-modal__footer">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </footer>
    </div>
  );
}

export default StatsModal;
