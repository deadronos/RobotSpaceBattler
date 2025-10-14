import { useEffect, useState } from 'react';

import type { UiAdapter } from '../systems/uiAdapter';
import type { BattleUiState, CameraState, RobotView, RoundView } from '../types/ui';

export interface BattleAdapterData {
  round: RoundView | null;
  uiState: BattleUiState;
  camera: CameraState;
  getRobotView: (id: string) => RobotView | null;
}

export function useBattleAdapter(adapter: UiAdapter): BattleAdapterData {
  const [round, setRound] = useState<RoundView | null>(() => adapter.getRoundView());
  const [uiState, setUiState] = useState<BattleUiState>(() => adapter.getBattleUiState());
  const [camera, setCamera] = useState<CameraState>(() => adapter.getActiveCamera());

  useEffect(() => {
    // Subscribe to round events
    const unsubRoundStart = adapter.onRoundStart((newRound) => {
      setRound(newRound);
      setUiState(adapter.getBattleUiState());
    });

    const unsubRoundEnd = adapter.onRoundEnd((newRound) => {
      setRound(newRound);
      setUiState(adapter.getBattleUiState());
    });

    // Subscribe to camera changes
    const unsubCamera = adapter.onCameraChange((newCamera) => {
      setCamera(newCamera);
    });

    // Initial sync
    setRound(adapter.getRoundView());
    setUiState(adapter.getBattleUiState());
    setCamera(adapter.getActiveCamera());

    return () => {
      unsubRoundStart();
      unsubRoundEnd();
      unsubCamera();
    };
  }, [adapter]);

  return {
    round,
    uiState,
    camera,
    getRobotView: (id: string) => adapter.getRobotView(id),
  };
}
