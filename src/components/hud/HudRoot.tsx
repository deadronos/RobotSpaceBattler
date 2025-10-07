import type { BattleHudData } from '../../hooks/useBattleHudData';
import useBattleHudData from '../../hooks/useBattleHudData';
import { BattleTimer } from './BattleTimer';
import { ControlStrip, type ControlStripProps } from './ControlStrip';
import { TeamStatusPanel } from './TeamStatusPanel';

export interface HudRootProps
  extends Pick<
    ControlStripProps,
    'onTogglePause' | 'onToggleCinematic' | 'cinematicEnabled'
  > {}

function renderHiddenState(hud: BattleHudData) {
  return (
    <section
      className="hud-root hud-root--hidden"
      role="banner"
      aria-live="polite"
      data-state="hidden"
    >
      <div className="hud-root__toggle">
        <p role="status">HUD hidden</p>
        <button type="button" onClick={hud.controls.toggleHud}>
          Show HUD
        </button>
      </div>
    </section>
  );
}

export function HudRoot(props: HudRootProps) {
  const hud = useBattleHudData();

  if (!hud.controls.isHudVisible) {
    return renderHiddenState(hud);
  }

  return (
    <section className="hud-root" role="banner" aria-live="polite">
      <header className="hud-root__header">
        <h1 className="hud-root__title">Battle Status</h1>
        <p className="hud-root__status" data-status={hud.status.status}>
          {hud.status.label}
        </p>
      </header>

      <BattleTimer status={hud.status} />

      <div className="hud-root__teams" aria-label="Team status">
        {hud.teams.map((team) => (
          <TeamStatusPanel key={team.teamId} team={team} />
        ))}
      </div>

      <ControlStrip
        status={hud.status}
        controls={hud.controls}
        performance={hud.performance}
        onTogglePause={props.onTogglePause}
        onToggleCinematic={props.onToggleCinematic}
        cinematicEnabled={props.cinematicEnabled}
      />
    </section>
  );
}

export default HudRoot;
