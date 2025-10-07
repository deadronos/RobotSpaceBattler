import "../styles/overlays.css";

import { useMemo } from "react";

import { useSimulationWorld } from "../../ecs/world";
import { useUIStore } from "../../store/uiStore";
import type { RobotStats } from "../../types";

export function StatsModal() {
  const open = useUIStore((s) => s.isStatsOpen);
  const setOpen = useUIStore((s) => s.setStatsOpen);
  const world = useSimulationWorld();
  const snapshot = world?.simulation?.postBattleStats ?? null;

  const robotsSorted = useMemo<Array<[string, RobotStats]>>(() => {
    if (!snapshot) {
      return [];
    }
    return Object.entries(snapshot.perRobot).sort(
      ([, a], [, b]) => b.kills - a.kills,
    );
  }, [snapshot]);

  if (!open || !snapshot) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
      className="stats-modal"
    >
      <header className="stats-modal__header">
        <h3 id="stats-title" className="stats-modal__title">
          Post-battle Statistics
        </h3>
        <p className="stats-modal__timestamp">
          Captured at {snapshot.computedAt.toFixed?.(2) ?? snapshot.computedAt}
        </p>
      </header>

      <section aria-label="team-stats" className="stats-modal__section">
        <h4 className="stats-modal__section-title">Team Summary</h4>
        <table className="stats-modal__table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Kills</th>
              <th>Damage Dealt</th>
              <th>Damage Taken</th>
              <th>Avg Health</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(snapshot.perTeam).map(([team, stats]) => (
              <tr key={team}>
                <td>{team}</td>
                <td>{stats.totalKills}</td>
                <td>{stats.totalDamageDealt}</td>
                <td>{stats.totalDamageTaken}</td>
                <td>
                  {Math.round(stats.averageHealthRemaining)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="robot-stats" className="stats-modal__section">
        <h4 className="stats-modal__section-title">Robot Details</h4>
        <table className="stats-modal__table">
          <thead>
            <tr>
              <th>Robot ID</th>
              <th>Kills</th>
              <th>Damage Dealt</th>
              <th>Damage Taken</th>
              <th>Time Alive</th>
              <th>Shots Fired</th>
            </tr>
          </thead>
          <tbody>
            {robotsSorted.map(([id, stats]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{stats.kills}</td>
                <td>{stats.damageDealt}</td>
                <td>{stats.damageTaken}</td>
                <td>
                  {stats.timeAlive.toFixed?.(2) ?? stats.timeAlive}
                </td>
                <td>{stats.shotsFired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="stats-modal__actions">
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

export default StatsModal;
