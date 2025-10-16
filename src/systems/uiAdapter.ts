import type { BattleSelectorsContext } from "../selectors/battleSelectors";
import {
  getActiveCamera,
  getBattleUiState,
  getRobotView,
  getRoundView,
} from "../selectors/battleSelectors";
import type {
  BattleUiState,
  CameraState,
  FrameSnapshot,
  RobotView,
  RoundView,
} from "../types/ui";

type UnsubscribeFn = () => void;
type RoundHandler = (round: RoundView) => void;
type CameraHandler = (camera: CameraState) => void;

export interface UiAdapter {
  getRoundView: () => RoundView | null;
  getRobotView: (id: string) => RobotView | null;
  getBattleUiState: () => BattleUiState;
  getActiveCamera: () => CameraState;
  getFrameSnapshot: () => FrameSnapshot;
  setFrameSnapshot: (snapshot: FrameSnapshot) => void;
  onRoundStart: (handler: RoundHandler) => UnsubscribeFn;
  onRoundEnd: (handler: RoundHandler) => UnsubscribeFn;
  onCameraChange: (handler: CameraHandler) => UnsubscribeFn;
  updateContext: (newContext: BattleSelectorsContext) => void;
    setFrameSnapshot: (snapshot: FrameSnapshot) => void;
}

export function createUiAdapter(
  initialContext: BattleSelectorsContext,
): UiAdapter {
  let context = initialContext;
  let previousRoundStatus = context.round.status;

  const roundStartHandlers = new Set<RoundHandler>();
  const roundEndHandlers = new Set<RoundHandler>();
  const cameraChangeHandlers = new Set<CameraHandler>();

  // Reusable frame snapshot object to minimize allocations
  const frameSnapshot: FrameSnapshot = {
    camera: {
      position: [0, 0, 0],
      target: [0, 0, 0],
      up: [0, 1, 0],
    },
    time: 0,
    interpolationFactor: 0,
  };

  let lastUpdateTime = performance.now();

  const adapter: UiAdapter = {
    getRoundView: () => getRoundView(context),

    getRobotView: (id: string) => getRobotView(context, id),

    getBattleUiState: () => getBattleUiState(context),

    getActiveCamera: () => getActiveCamera(context),

    getFrameSnapshot: () => {
      const now = performance.now();
      frameSnapshot.time = now;

      // Calculate interpolation factor based on time since last update
      const interpolationMs = context.camera.interpolationMs ?? 0;
      if (interpolationMs > 0) {
        const elapsed = now - lastUpdateTime;
        frameSnapshot.interpolationFactor = Math.min(
          1,
          Math.max(0, elapsed / interpolationMs),
        );
      } else {
        frameSnapshot.interpolationFactor = 1;
      }

      // For now, return default camera values
      // In actual implementation, these would be computed from the scene/camera system
      // This is a minimal allocation-light implementation as specified
      return frameSnapshot;
    },

    onRoundStart: (handler: RoundHandler) => {
      roundStartHandlers.add(handler);
      return () => {
        roundStartHandlers.delete(handler);
      };
    },

    onRoundEnd: (handler: RoundHandler) => {
      roundEndHandlers.add(handler);
      return () => {
        roundEndHandlers.delete(handler);
      };
    },

    onCameraChange: (handler: CameraHandler) => {
      cameraChangeHandlers.add(handler);
      return () => {
        cameraChangeHandlers.delete(handler);
      };
    },

    updateContext: (newContext: BattleSelectorsContext) => {
      const oldContext = context;
      context = newContext;
      lastUpdateTime = performance.now();

      // Check for round status transitions
      if (
        previousRoundStatus !== "running" &&
        context.round.status === "running" &&
        roundStartHandlers.size > 0
      ) {
        const roundView = getRoundView(context);
        if (roundView) {
          roundStartHandlers.forEach((handler) => handler(roundView));
        }
      }

      if (
        previousRoundStatus !== "finished" &&
        context.round.status === "finished" &&
        roundEndHandlers.size > 0
      ) {
        const roundView = getRoundView(context);
        if (roundView) {
          roundEndHandlers.forEach((handler) => handler(roundView));
        }
      }

      // Check for camera updates
      const cameraChanged =
        oldContext.camera.mode !== context.camera.mode ||
        oldContext.camera.targetEntityId !== context.camera.targetEntityId;

      if (cameraChanged && cameraChangeHandlers.size > 0) {
        const cameraState = getActiveCamera(context);
        cameraChangeHandlers.forEach((handler) => handler(cameraState));
      }

      previousRoundStatus = context.round.status;
    },

    setFrameSnapshot: (snapshot: FrameSnapshot) => {
      // shallow-copy values into the reusable frameSnapshot to avoid allocations
      frameSnapshot.time = snapshot.time;
      frameSnapshot.interpolationFactor = snapshot.interpolationFactor;
      frameSnapshot.camera.position[0] = snapshot.camera.position[0];
      frameSnapshot.camera.position[1] = snapshot.camera.position[1];
      frameSnapshot.camera.position[2] = snapshot.camera.position[2];
      frameSnapshot.camera.target[0] = snapshot.camera.target[0];
      frameSnapshot.camera.target[1] = snapshot.camera.target[1];
      frameSnapshot.camera.target[2] = snapshot.camera.target[2];
      frameSnapshot.camera.up[0] = snapshot.camera.up[0];
      frameSnapshot.camera.up[1] = snapshot.camera.up[1];
      frameSnapshot.camera.up[2] = snapshot.camera.up[2];
    },
  };

  return adapter;
}
