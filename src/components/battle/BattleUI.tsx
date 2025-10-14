import type { ReactElement } from 'react';

import type { UiAdapter } from '../../systems/uiAdapter';
import { useBattleAdapter } from '../../hooks/useBattleAdapter';

export interface BattleUIProps {
  adapter: UiAdapter;
}

export function BattleUI({ adapter }: BattleUIProps): ReactElement | null {
  const { uiState } = useBattleAdapter(adapter);

  // Only render when in a round
  if (!uiState.inRound) {
    return null;
  }

  return (
    <div data-testid="battle-ui" className="battle-ui">
      {!uiState.userPreferences.minimalUi && (
        <div data-testid="battle-ui-detailed" className="battle-ui-detailed">
          {/* Detailed HUD elements will go here */}
        </div>
      )}
      {/* Minimal HUD always shows */}
      <div className="battle-ui-minimal">
        {/* Minimal HUD elements */}
      </div>
    </div>
  );
}
