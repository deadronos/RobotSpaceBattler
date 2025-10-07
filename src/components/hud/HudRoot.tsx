import type { BattleHudData } from '../../hooks/useBattleHudData';
import useBattleHudData from '../../hooks/useBattleHudData';
import { BattleTimer } from './BattleTimer';
import { ControlStrip, type ControlStripProps } from './ControlStrip';
import { TeamStatusPanel } from './TeamStatusPanel';
import { useUiStore } from '../../store/uiStore';

export type HudRootProps = Pick<
  ControlStripProps,
  'onTogglePause' | 'onToggleCinematic' | 'cinematicEnabled'
>;

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
  const hudTranslucency = useUiStore((s) => s.hudTranslucency);
  const hudPanelPosition = useUiStore((s) => s.hudPanelPosition);

  if (!hud.controls.isHudVisible) {
    return renderHiddenState(hud);
  }

  const rootStyle: Record<string, string | number> = { '--hud-translucency': hudTranslucency };

  return (
    <section
      className={`hud-root ${hudPanelPosition === 'stacked' ? 'hud-root--stacked' : ''}`}
      role="banner"
      aria-live="polite"
      style={rootStyle}
    >
      {/* Left overlay: Battle Status + timer + controls */}
      <div className="hud-root__left">
        <div className="hud-panel hud-panel--status" aria-label="Battle status">
          <header className="hud-root__header">
            <div className="hud-root__header-left">
              <h1 className="hud-root__title">Battle Status</h1>
              <p className="hud-root__status" data-status={hud.status.status}>
                {hud.status.label}
              </p>
            </div>

            <div className="hud-root__header-right">
              <button
                type="button"
                className="hud-root__settings-button"
                aria-label="Open HUD settings"
                title="Settings"
                onClick={() => hud.controls.openSettings()}
              >
                {/* simple gear icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="currentColor" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.28 16.88l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.3-.41 1.51-1A1.65 1.65 0 0 0 3.28 6.28l-.06-.06A2 2 0 1 1 6.05 2.4l.06.06c.5.5 1.2.69 1.82.33.35-.2.72-.33 1.12-.33H10a2 2 0 1 1 4 0h.09c.4 0 .77.12 1.12.33.62.36 1.32.17 1.82-.33l.06-.06A2 2 0 1 1 21.72 7.12l-.06.06a1.65 1.65 0 0 0-.33 1.82c.2.6.66 1.04 1.29 1.2H21a2 2 0 1 1 0 4h-.09c-.63.16-1.09.6-1.29 1.2z" fill="currentColor" opacity="0.6" />
                </svg>
              </button>
            </div>
          </header>

          <BattleTimer status={hud.status} />
        </div>

        <div className="hud-panel hud-panel--controls" aria-label="Battle controls">
          <ControlStrip
            status={hud.status}
            controls={hud.controls}
            performance={hud.performance}
            onTogglePause={props.onTogglePause}
            onToggleCinematic={props.onToggleCinematic}
            cinematicEnabled={props.cinematicEnabled}
          />
        </div>
      </div>

      {/* Right overlay: Teams */}
      <div className="hud-root__right" aria-label="Team status">
        <div className="hud-panel hud-panel--teams">
          {hud.teams.map((team) => (
            <TeamStatusPanel key={team.teamId} team={team} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HudRoot;
