import type { ReactElement } from "react";

import type { BattleUiState, RoundView } from "../../types/ui";

export interface CinematicHudProps {
  round: RoundView | null;
  uiState: BattleUiState;
}

function buildRoundLabel(round: RoundView | null): string {
  if (!round) {
    return "No active round";
  }

  return round.status === "running"
    ? `Round ${round.id}`
    : `Round ${round.id} (${round.status})`;
}

export function CinematicHud({
  round,
  uiState,
}: CinematicHudProps): ReactElement {
  const label = buildRoundLabel(round);

  return (
    <section
      data-testid="cinematic-hud"
      className="cinematic-hud"
      aria-live="polite"
      role="status"
    >
      <h2 className="cinematic-hud__heading">{label}</h2>
      <p className="cinematic-hud__details">
        <span data-state={uiState.activeUI}>UI: {uiState.activeUI}</span>
        {uiState.lastToggleTime !== null ? (
          <time dateTime={new Date(uiState.lastToggleTime).toISOString()}>
            Last change {new Date(uiState.lastToggleTime).toLocaleTimeString()}
          </time>
        ) : (
          <span>Last change pending</span>
        )}
      </p>
    </section>
  );
}
