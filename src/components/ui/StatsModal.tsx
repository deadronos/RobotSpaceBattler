import React, { useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useSimulationWorld } from '../../ecs/world';

export function StatsModal() {
  const open = useUIStore((s) => s.statsOpen);
  const setOpen = useUIStore((s) => s.setStatsOpen);
  const world = useSimulationWorld();
  const snapshot = world?.simulation?.postBattleStats ?? null;

  const robotsSorted = useMemo(() => {
    if (!snapshot) return [] as [string, any][];
    return Object.entries(snapshot.perRobot).sort(([, a], [, b]) => b.kills - a.kills);
  }, [snapshot]);

  if (!open || !snapshot) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-title"
      style={{
        position: 'absolute',
        top: '10%',
        right: '5%',
        padding: '1rem',
        background: 'rgba(12, 18, 32, 0.95)',
        color: 'white',
        borderRadius: '8px',
        minWidth: '360px',
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
      <header>
        <h3 id="stats-title">Post-battle Statistics</h3>
        <p style={{ opacity: 0.85 }}>Captured at {snapshot.computedAt.toFixed?.(2) ?? snapshot.computedAt}</p>
      </header>

      <section aria-label="team-stats" style={{ marginTop: '0.75rem' }}>
        <h4 style={{ margin: '0 0 0.25rem' }}>Team Summary</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Team</th>
              <th style={{ textAlign: 'right' }}>Kills</th>
              <th style={{ textAlign: 'right' }}>Damage Dealt</th>
              <th style={{ textAlign: 'right' }}>Damage Taken</th>
              <th style={{ textAlign: 'right' }}>Avg Health</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(snapshot.perTeam).map(([team, stats]) => (
              <tr key={team}>
                <td>{team}</td>
                <td style={{ textAlign: 'right' }}>{stats.totalKills}</td>
                <td style={{ textAlign: 'right' }}>{stats.totalDamageDealt}</td>
                <td style={{ textAlign: 'right' }}>{stats.totalDamageTaken}</td>
                <td style={{ textAlign: 'right' }}>{Math.round(stats.averageHealthRemaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="robot-stats" style={{ marginTop: '0.75rem' }}>
        <h4 style={{ margin: '0 0 0.25rem' }}>Robot Details</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Robot ID</th>
              <th style={{ textAlign: 'right' }}>Kills</th>
              <th style={{ textAlign: 'right' }}>Damage Dealt</th>
              <th style={{ textAlign: 'right' }}>Damage Taken</th>
              <th style={{ textAlign: 'right' }}>Time Alive</th>
              <th style={{ textAlign: 'right' }}>Shots Fired</th>
            </tr>
          </thead>
          <tbody>
            {robotsSorted.map(([id, stats]) => (
              <tr key={id}>
                <td>{id}</td>
                <td style={{ textAlign: 'right' }}>{stats.kills}</td>
                <td style={{ textAlign: 'right' }}>{stats.damageDealt}</td>
                <td style={{ textAlign: 'right' }}>{stats.damageTaken}</td>
                <td style={{ textAlign: 'right' }}>{stats.timeAlive.toFixed?.(2) ?? stats.timeAlive}</td>
                <td style={{ textAlign: 'right' }}>{stats.shotsFired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
        <button type="button" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

export default StatsModal;
