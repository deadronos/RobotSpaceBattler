import { useMemo } from "react";

import type { UiAdapter } from "../systems/uiAdapter";
import type { BattleUiState, CameraState, RobotView } from "../types/ui";
import { useBattleAdapter } from "./useBattleAdapter";

export interface FollowCameraOverlayResult {
  robot: RobotView | null;
  robotId: string | null;
  camera: CameraState;
  uiState: BattleUiState;
  shouldShow: boolean;
}

export interface UseFollowCameraOverlayOptions {
  adapter: UiAdapter;
  robotId?: string;
}

function getSelectedRobotId(uiState: BattleUiState): string | null {
  const maybeState = uiState as BattleUiState & {
    selectedRobotId?: string | null;
  };
  if (typeof maybeState.selectedRobotId === "string") {
    return maybeState.selectedRobotId;
  }

  if (maybeState.selectedRobotId === null) {
    return null;
  }

  return null;
}

export function useFollowCameraOverlay({
  adapter,
  robotId,
}: UseFollowCameraOverlayOptions): FollowCameraOverlayResult {
  const { camera, uiState, getRobotView } = useBattleAdapter(adapter);

  const selectedRobotId = getSelectedRobotId(uiState);

  const effectiveRobotId = useMemo(() => {
    if (robotId) {
      return robotId;
    }

    if (selectedRobotId) {
      return selectedRobotId;
    }

    return camera.targetEntityId ?? null;
  }, [camera.targetEntityId, robotId, selectedRobotId]);

  const robot = useMemo(() => {
    if (!effectiveRobotId) {
      return null;
    }

    return getRobotView(effectiveRobotId);
  }, [effectiveRobotId, getRobotView]);

  const isFollowMode = camera.mode === "follow";
  const followPreference = uiState.userPreferences.followModeShowsPerRobot;
  const hasManualSelection =
    !!selectedRobotId && selectedRobotId === effectiveRobotId;
  const isCameraTarget =
    isFollowMode && effectiveRobotId === camera.targetEntityId;

  const shouldShow =
    !!robot && ((followPreference && isCameraTarget) || hasManualSelection);

  return {
    robot,
    robotId: effectiveRobotId,
    camera,
    uiState,
    shouldShow,
  };
}
