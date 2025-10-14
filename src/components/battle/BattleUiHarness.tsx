import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { BattleSelectorsContext } from "../../selectors/battleSelectors";
import { createUiAdapter, type UiAdapter } from "../../systems/uiAdapter";
import { setSetCameraMode, setSetCameraTarget } from "../../utils/debugFlags";
import { BattleUI } from "./BattleUI";
import { RobotOverlay } from "./RobotOverlay";

const INITIAL_CONTEXT: BattleSelectorsContext = {
  round: {
    id: "round-harness",
    status: "running",
    startTime: Date.now(),
    endTime: null,
    map: "test-arena",
  },
  robots: [
    {
      id: "robot-alpha",
      team: "red",
      health: 100,
      maxHealth: 100,
      name: "Alpha",
      statusFlags: ["shielded"],
      isCaptain: true,
      currentTarget: null,
      currentTargetId: null,
    },
  ],
  camera: {
    mode: "follow",
    targetEntityId: "robot-alpha",
  },
  ui: {
    inRound: true,
    activeUI: "battle",
    lastToggleTime: null,
    userPreferences: {
      reducedMotion: false,
      minimalUi: false,
      followModeShowsPerRobot: true,
    },
  },
};

function useHarnessAdapter(): [
  UiAdapter,
  Dispatch<SetStateAction<BattleSelectorsContext>>,
] {
  const [context, setContext] =
    useState<BattleSelectorsContext>(INITIAL_CONTEXT);

  const adapter = useMemo(() => createUiAdapter(INITIAL_CONTEXT), []);

  useEffect(() => {
    adapter.updateContext(context);
  }, [adapter, context]);

  return [adapter, setContext];
}

export function BattleUiHarness() {
  const [adapter, setContext] = useHarnessAdapter();

  useEffect(() => {
    setSetCameraMode((mode) => {
      setContext((prev) => ({
        ...prev,
        camera: { ...prev.camera, mode },
        ui: {
          ...prev.ui,
          activeUI: mode === "cinematic" ? "battle" : prev.ui.activeUI,
          userPreferences: {
            ...prev.ui.userPreferences,
            minimalUi:
              mode === "cinematic" ? true : prev.ui.userPreferences.minimalUi,
          },
        },
      }));
    });

    setSetCameraTarget((targetId) => {
      setContext((prev) => ({
        ...prev,
        camera: { ...prev.camera, targetEntityId: targetId },
      }));
    });

    return () => {
      setSetCameraMode(() => {});
      setSetCameraTarget(() => {});
    };
  }, [setContext]);

  return (
    <div data-testid="battle-ui-harness" className="battle-ui-harness">
      <BattleUI adapter={adapter} />
      <RobotOverlay adapter={adapter} robotId="robot-alpha" />
    </div>
  );
}
