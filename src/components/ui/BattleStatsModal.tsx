import { useMemo } from "react";

import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import { useTelemetryStore } from "../../state/telemetryStore";
import { Modal } from "./Modal";
import { useHudTick } from "./useHudTick";

interface BattleStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner?: "red" | "blue" | null;
}

export function BattleStatsModal(props: BattleStatsModalProps) {
  // Only subscribe to the telemetry store while open: it changes on every
  // shot, so a closed-but-mounted subscriber would re-render at sim rate.
  return props.isOpen ? <OpenBattleStatsModal {...props} /> : null;
}

function OpenBattleStatsModal({
  isOpen,
  onClose,
  winner,
}: BattleStatsModalProps) {
  // The telemetry aggregates are mutated in place, so their references never
  // change and subscribing to them would never fire (#207). Re-read them on the
  // throttled HUD tick, like the robot list does, so this modal does not hook
  // the render loop up to the event stream.
  const hudTick = useHudTick();
  const { robots, teamTotals } = useMemo(() => {
    void hudTick;
    return useTelemetryStore.getState();
  }, [hudTick]);

  const redStats = teamTotals.red;
  const blueStats = teamTotals.blue;

  const topRobots = Object.values(robots)
    .sort((a, b) => {
      const scoreA = a.kills * 2 + a.damageDealt - a.deaths * 2;
      const scoreB = b.kills * 2 + b.damageDealt - b.deaths * 2;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Battle Statistics"
      contentClassName="battle-stats-content"
    >
      {winner && (
        <div className="battle-stats-winner">
          <h3>🏆 {TEAM_IDENTITIES[winner].label} Wins!</h3>
        </div>
      )}

      <div className="battle-stats-teams">
        <div className="battle-stats-team-card battle-stats-team-red">
          <h3>{TEAM_IDENTITIES.red.label}</h3>
          <div className="battle-stats-stat-grid">
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Shots Fired</span>
              <span className="battle-stats-stat-value">
                {redStats.shotsFired}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Damage Dealt</span>
              <span className="battle-stats-stat-value">
                {redStats.damageDealt.toFixed(0)}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Damage Taken</span>
              <span className="battle-stats-stat-value">
                {redStats.damageTaken.toFixed(0)}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Deaths</span>
              <span className="battle-stats-stat-value">{redStats.deaths}</span>
            </div>
          </div>
        </div>

        <div className="battle-stats-team-card battle-stats-team-blue">
          <h3>{TEAM_IDENTITIES.blue.label}</h3>
          <div className="battle-stats-stat-grid">
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Shots Fired</span>
              <span className="battle-stats-stat-value">
                {blueStats.shotsFired}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Damage Dealt</span>
              <span className="battle-stats-stat-value">
                {blueStats.damageDealt.toFixed(0)}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Damage Taken</span>
              <span className="battle-stats-stat-value">
                {blueStats.damageTaken.toFixed(0)}
              </span>
            </div>
            <div className="battle-stats-stat">
              <span className="battle-stats-stat-label">Deaths</span>
              <span className="battle-stats-stat-value">
                {blueStats.deaths}
              </span>
            </div>
          </div>
        </div>
      </div>

      {topRobots.length > 0 && (
        <div className="battle-stats-top-performers">
          <h3>Top Performers</h3>
          <div className="battle-stats-performers-list">
            {topRobots.map((robot, index) => (
              <div key={robot.id} className="battle-stats-performer">
                <span className="battle-stats-performer-rank">
                  #{index + 1}
                </span>
                <span
                  className="battle-stats-performer-team"
                  style={{
                    color: TEAM_IDENTITIES[robot.teamId].color,
                  }}
                >
                  {TEAM_IDENTITIES[robot.teamId].label}
                </span>
                <span className="battle-stats-performer-stats">
                  {robot.kills} kills • {robot.damageDealt.toFixed(0)} dmg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
