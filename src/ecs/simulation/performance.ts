import type { ArenaEntity } from "../entities/Arena";
import {
  setTimeScale,
  type SimulationState,
  updatePerformanceStats,
} from "../entities/SimulationState";

export interface PerformanceOverlayState {
  visible: boolean;
  autoScalingEnabled: boolean;
}

export interface PerformanceController {
  overlay: PerformanceOverlayState;
  samples: number[];
  maxSamples: number;
}

export function createPerformanceController(): PerformanceController {
  return {
    overlay: {
      visible: false,
      autoScalingEnabled: true,
    },
    samples: [],
    maxSamples: 60,
  };
}

function computeAverage(samples: number[]): number {
  if (samples.length === 0) {
    return 0;
  }

  const sum = samples.reduce((total, value) => total + value, 0);
  return sum / samples.length;
}

function applyQualityScaling(
  controller: PerformanceController,
  state: SimulationState,
  arena: ArenaEntity,
  fps: number,
): SimulationState {
  const autoScalingEnabled = controller.overlay.autoScalingEnabled;
  let nextState = state;

  if (!autoScalingEnabled) {
    controller.overlay.visible = false;
    arena.lightingConfig.shadowsEnabled = true;
    return updatePerformanceStats(nextState, {
      currentFPS: fps,
      qualityScalingActive: false,
    });
  }

  if (fps < 30) {
    controller.overlay.visible = true;
    arena.lightingConfig.shadowsEnabled = false;
    const timeScale = fps < 20 ? 0.5 : 0.8;
    nextState = setTimeScale(nextState, timeScale);
    nextState = updatePerformanceStats(nextState, {
      currentFPS: fps,
      qualityScalingActive: true,
    });
  } else {
    controller.overlay.visible = false;
    arena.lightingConfig.shadowsEnabled = true;
    nextState = setTimeScale(nextState, 1);
    nextState = updatePerformanceStats(nextState, {
      currentFPS: fps,
      qualityScalingActive: false,
    });
  }

  return nextState;
}

export function recordFrameMetrics(
  controller: PerformanceController,
  state: SimulationState,
  arena: ArenaEntity,
  fps: number,
): SimulationState {
  controller.samples.push(fps);
  if (controller.samples.length > controller.maxSamples) {
    controller.samples.shift();
  }

  const average = computeAverage(controller.samples);
  let nextState = updatePerformanceStats(state, {
    currentFPS: fps,
    averageFPS: average,
  });

  nextState = applyQualityScaling(controller, nextState, arena, fps);

  if (!controller.overlay.autoScalingEnabled && !controller.overlay.visible) {
    nextState = setTimeScale(nextState, 1);
  }

  return nextState;
}

export function setAutoScalingEnabled(
  controller: PerformanceController,
  enabled: boolean,
): void {
  controller.overlay.autoScalingEnabled = enabled;
  if (!enabled) {
    controller.overlay.visible = false;
  }
}

export function getOverlayState(
  controller: PerformanceController,
): PerformanceOverlayState {
  return { ...controller.overlay };
}
