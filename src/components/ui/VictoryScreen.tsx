import React from 'react';
import type { SimulationState } from '../../ecs/entities/SimulationState';
import { useUIStore } from '../../store/uiStore';

export interface VictoryScreenProps {
  simulation: Pick<
    SimulationState,
    'status' | 'winner' | 'autoRestartCountdown' | 'countdownPaused'
  > & { postBattleStats?: SimulationState['postBattleStats'] };
  onTogglePause?: (paused: boolean) => void;
  onResetCountdown?: () => void;
  onShowStats?: () => void;
  onShowSettings?: () => void;
}

function formatWinnerMessage(winner: VictoryScreenProps['simulation']['winner']): string {
  if (winner === 'draw' || winner === null) {
    return 'Battle Ends in a Draw';
  }

  return winner === 'red' ? 'Red Team Wins' : 'Blue Team Wins';
}

function formatCountdown(countdown: number | null): string {
  if (countdown === null) {
    return 'Auto-restart pending';
  }

  const seconds = Math.max(0, Math.ceil(countdown));
  return `Auto-restart in ${seconds}s`;
}

export function VictoryScreen({
  simulation,
  onTogglePause,
  onResetCountdown,
  onShowStats,
  onShowSettings,
}: VictoryScreenProps) {
  const isVisible = simulation.status === 'victory' || simulation.status === 'simultaneous-elimination';
  const setStatsOpen = useUIStore((state) => state.setStatsOpen);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

  if (!isVisible) {
    return null;
  }

  const pauseLabel = simulation.countdownPaused ? 'Resume' : 'Pause';

  const handlePauseClick = () => {
    const next = !simulation.countdownPaused;
    onTogglePause?.(next);
  };

  const handleResetClick = () => {
    onResetCountdown?.();
  };

  const handleStatsClick = () => {
    setStatsOpen(true);
    onShowStats?.();
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    onShowSettings?.();
  };

  const snapshot = simulation.postBattleStats;
  const topRobotId = snapshot
    ? Object.entries(snapshot.perRobot).sort(([, a], [, b]) => b.kills - a.kills)[0]?.[0]
    : null;

  return (
    <section
      aria-label="Victory Screen"
      className="victory-screen"
      style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '1.5rem',
        background: 'rgba(15, 23, 42, 0.9)',
        color: 'white',
        borderRadius: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        minWidth: '320px',
      }}
    >
      <header>
        <h2 style={{ fontSize: '1.75rem', margin: 0 }}>{formatWinnerMessage(simulation.winner)}</h2>
        <p style={{ margin: '0.25rem 0 0', opacity: 0.8 }}>{formatCountdown(simulation.autoRestartCountdown)}</p>
      </header>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={handlePauseClick}>
          {pauseLabel}
        </button>
        <button type="button" onClick={handleResetClick}>
          Reset Countdown
        </button>
        <button type="button" onClick={handleStatsClick}>
          Stats
        </button>
        <button type="button" onClick={handleSettingsClick}>
          Settings
        </button>
      </div>

      {snapshot && (
        <div
          aria-label="post-battle-summary"
          style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem' }}
        >
          <strong>Post-battle Summary</strong>
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1rem' }}>
            {Object.entries(snapshot.perTeam).map(([team, stats]) => (
              <li key={team}>
                Team {team}: {stats.totalKills} kills — {stats.totalDamageDealt} dmg
              </li>
            ))}
          </ul>
          {topRobotId && <p style={{ margin: '0.25rem 0 0' }}>Top performer: {topRobotId}</p>}
        </div>
      )}
    </section>
  );
}

export default VictoryScreen;
