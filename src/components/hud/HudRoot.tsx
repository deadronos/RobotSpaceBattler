import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

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
  const isStacked = hudPanelPosition === 'stacked';
  const teamPanelRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [teamPanelPosition, setTeamPanelPosition] = useState<{ left: number; top: number } | null>(null);
  const [teamPanelDragging, setTeamPanelDragging] = useState(false);

  if (!hud.controls.isHudVisible) {
    return renderHiddenState(hud);
  }

  const rootStyle: Record<string, string | number> = { '--hud-translucency': hudTranslucency };

  const clampPosition = useCallback(
    (left: number, top: number) => {
      if (typeof window === 'undefined') {
        return { left, top };
      }

      const margin = 16;
      const panel = teamPanelRef.current;
      const rect = panel?.getBoundingClientRect();
      const width = rect?.width ?? panel?.offsetWidth ?? 0;
      const height = rect?.height ?? panel?.offsetHeight ?? 0;
      const maxLeft = Math.max(margin, window.innerWidth - width - margin);
      const maxTop = Math.max(margin, window.innerHeight - height - margin);

      return {
        left: Math.min(Math.max(margin, left), maxLeft),
        top: Math.min(Math.max(margin, top), maxTop),
      };
    },
    [],
  );

  const handleTeamPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isStacked) {
        return;
      }

      const panel = teamPanelRef.current;
      if (!panel) {
        return;
      }

      panel.setPointerCapture(event.pointerId);
      const rect = panel.getBoundingClientRect();
      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      setTeamPanelPosition(clampPosition(rect.left, rect.top));
      setTeamPanelDragging(true);
      event.preventDefault();
    },
    [clampPosition, isStacked],
  );

  const handleTeamPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isStacked) {
        return;
      }

      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const nextLeft = event.clientX - dragState.offsetX;
      const nextTop = event.clientY - dragState.offsetY;
      setTeamPanelPosition(clampPosition(nextLeft, nextTop));
      event.preventDefault();
    },
    [clampPosition, isStacked],
  );

  const handleTeamPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current = null;
      setTeamPanelDragging(false);
      setTeamPanelPosition((prev) => {
        if (!prev || isStacked) {
          return prev;
        }

        return clampPosition(prev.left, prev.top);
      });

      const panel = teamPanelRef.current;
      if (panel?.hasPointerCapture(event.pointerId)) {
        panel.releasePointerCapture(event.pointerId);
      }

      event.preventDefault();
    },
    [clampPosition, isStacked],
  );

  const teamPanelStyle = isStacked
    ? undefined
    : teamPanelPosition
      ? { top: `${teamPanelPosition.top}px`, left: `${teamPanelPosition.left}px` }
      : { top: '20px', right: '24px' };

  const teamPanelClassName = [
    'hud-root__teams',
    'hud-panel',
    'hud-panel--teams',
    teamPanelDragging ? 'hud-root__teams--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={`hud-root ${isStacked ? 'hud-root--stacked' : ''}`}
      role="banner"
      aria-live="polite"
      style={rootStyle}
    >
      {/* Status panel */}
      <div className="hud-root__status" aria-label="Battle status">
        <div className="hud-panel hud-panel--status">
          <header className="hud-root__header">
            <div className="hud-root__heading">
              <h1 className="hud-root__title">Battle Status</h1>
              <span className="hud-root__status-chip" data-status={hud.status.status}>
                {hud.status.label}
              </span>
            </div>

            <div className="hud-root__header-right">
              <button
                type="button"
                className="hud-root__settings-button"
                aria-label="Open HUD settings"
                title="Settings"
                onClick={() => hud.controls.openSettings()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7z" fill="currentColor" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.28 16.88l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.3-.41 1.51-1A1.65 1.65 0 0 0 3.28 6.28l-.06-.06A2 2 0 1 1 6.05 2.4l.06.06c.5.5 1.2.69 1.82.33.35-.2.72-.33 1.12-.33H10a2 2 0 1 1 4 0h.09c.4 0 .77.12 1.12.33.62.36 1.32.17 1.82-.33l.06-.06A2 2 0 1 1 21.72 7.12l-.06.06a1.65 1.65 0 0 0-.33 1.82c.2.6.66 1.04 1.29 1.2H21a2 2 0 1 1 0 4h-.09c-.63.16-1.09.6-1.29 1.2z"
                    fill="currentColor"
                    opacity="0.72"
                  />
                </svg>
              </button>
            </div>
          </header>

          <BattleTimer status={hud.status} />
        </div>
      </div>

      {/* Control menu */}
      <div className="hud-root__controls" aria-label="Battle controls">
        <div className="hud-panel hud-panel--controls">
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

      {/* Team overview */}
      <div
        ref={teamPanelRef}
        className={teamPanelClassName}
        aria-label="Team status"
        style={teamPanelStyle}
        onPointerDown={handleTeamPointerDown}
        onPointerMove={handleTeamPointerMove}
        onPointerUp={handleTeamPointerEnd}
        onPointerCancel={handleTeamPointerEnd}
      >
        <div className="hud-teams__header">
          <h2 className="hud-teams__title">Team Overview</h2>
          {!isStacked ? <span className="hud-teams__hint">Drag to reposition</span> : null}
        </div>
        <div className="hud-teams__list">
          {hud.teams.map((team) => (
            <TeamStatusPanel key={team.teamId} team={team} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HudRoot;
