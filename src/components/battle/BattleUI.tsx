import type { ReactElement } from 'react';

import { useBattleAdapter } from '../../hooks/useBattleAdapter';
import type { UiAdapter } from '../../systems/uiAdapter';
import { CinematicHud } from './CinematicHud';

export interface BattleUIProps {
  adapter: UiAdapter;
}

export function BattleUI({ adapter }: BattleUIProps): ReactElement | null {
  const { uiState, camera, round } = useBattleAdapter(adapter);

  // Only render when in a round
  if (!uiState.inRound) {
    return null;
  }

  const isCinematic = camera.mode === 'cinematic';
  const showDetailed = !uiState.userPreferences.minimalUi && !isCinematic;
  const className = [
    'battle-ui',
    `battle-ui--${camera.mode}`,
    showDetailed ? '' : 'battle-ui--minimal',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div data-testid="battle-ui" className={className} aria-live="polite">
      {isCinematic ? (
        <CinematicHud round={round} uiState={uiState} />
      ) : (
        showDetailed && (
          <div data-testid="battle-ui-detailed" className="battle-ui-detailed">
            {/* Detailed HUD elements will go here */}
          </div>
        )
      )}
      <div className="battle-ui-minimal" data-testid="battle-ui-minimal">
        {/* Minimal HUD elements */}
      </div>
    </div>
  );
}
