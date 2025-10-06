/**
 * Vitest Test Setup
 *
 * Global test configuration and setup for the test suite.
 */

import '@testing-library/jest-dom';

import {
  calculateDistance,
  eliminateRobot,
  getDamageMultiplier,
  getProjectiles,
  inflictDamage,
  initializeSimulation,
  getArenaConfig,
  getPerformanceOverlayState,
  getPhysicsSnapshot,
  getRobotById,
  getSimulationState,
  openSettingsOverlay,
  openStatsOverlay,
  pauseAutoRestart,
  recordFrameMetrics,
  resetAutoRestartCountdown,
  resumeAutoRestart,
  setAutoScalingEnabled,
  setPhysicsBodyPosition,
  stepSimulation,
  applyPhysicsImpulse,
  applyTeamComposition,
  spawnPhysicsProjectile,
  closeSettingsOverlay,
  closeStatsOverlay,
} from '../src/ecs/world';

declare global {
  // eslint-disable-next-line no-var
  var initializeSimulation: typeof initializeSimulation;
  // eslint-disable-next-line no-var
  var stepSimulation: typeof stepSimulation;
  // eslint-disable-next-line no-var
  var getProjectiles: typeof getProjectiles;
  // eslint-disable-next-line no-var
  var inflictDamage: typeof inflictDamage;
  // eslint-disable-next-line no-var
  var eliminateRobot: typeof eliminateRobot;
  // eslint-disable-next-line no-var
  var calculateDistance: typeof calculateDistance;
  // eslint-disable-next-line no-var
  var getDamageMultiplier: typeof getDamageMultiplier;
  // eslint-disable-next-line no-var
  var getSimulationState: typeof getSimulationState;
  // eslint-disable-next-line no-var
  var pauseAutoRestart: typeof pauseAutoRestart;
  // eslint-disable-next-line no-var
  var resumeAutoRestart: typeof resumeAutoRestart;
  // eslint-disable-next-line no-var
  var resetAutoRestartCountdown: typeof resetAutoRestartCountdown;
  // eslint-disable-next-line no-var
  var openStatsOverlay: typeof openStatsOverlay;
  // eslint-disable-next-line no-var
  var closeStatsOverlay: typeof closeStatsOverlay;
  // eslint-disable-next-line no-var
  var openSettingsOverlay: typeof openSettingsOverlay;
  // eslint-disable-next-line no-var
  var closeSettingsOverlay: typeof closeSettingsOverlay;
  // eslint-disable-next-line no-var
  var applyTeamComposition: typeof applyTeamComposition;
  // eslint-disable-next-line no-var
  var getArenaConfig: typeof getArenaConfig;
  // eslint-disable-next-line no-var
  var recordFrameMetrics: typeof recordFrameMetrics;
  // eslint-disable-next-line no-var
  var setAutoScalingEnabled: typeof setAutoScalingEnabled;
  // eslint-disable-next-line no-var
  var getPerformanceOverlayState: typeof getPerformanceOverlayState;
  // eslint-disable-next-line no-var
  var setPhysicsBodyPosition: typeof setPhysicsBodyPosition;
  // eslint-disable-next-line no-var
  var applyPhysicsImpulse: typeof applyPhysicsImpulse;
  // eslint-disable-next-line no-var
  var spawnPhysicsProjectile: typeof spawnPhysicsProjectile;
  // eslint-disable-next-line no-var
  var getPhysicsSnapshot: typeof getPhysicsSnapshot;
  // eslint-disable-next-line no-var
  var getRobotById: typeof getRobotById;
}

globalThis.initializeSimulation = initializeSimulation;
globalThis.stepSimulation = stepSimulation;
globalThis.getProjectiles = getProjectiles;
globalThis.inflictDamage = inflictDamage;
globalThis.eliminateRobot = eliminateRobot;
globalThis.calculateDistance = calculateDistance;
globalThis.getDamageMultiplier = getDamageMultiplier;
globalThis.getSimulationState = getSimulationState;
globalThis.pauseAutoRestart = pauseAutoRestart;
globalThis.resumeAutoRestart = resumeAutoRestart;
globalThis.resetAutoRestartCountdown = resetAutoRestartCountdown;
globalThis.openStatsOverlay = openStatsOverlay;
globalThis.closeStatsOverlay = closeStatsOverlay;
globalThis.openSettingsOverlay = openSettingsOverlay;
globalThis.closeSettingsOverlay = closeSettingsOverlay;
globalThis.applyTeamComposition = applyTeamComposition;
globalThis.getArenaConfig = getArenaConfig;
globalThis.recordFrameMetrics = recordFrameMetrics;
globalThis.setAutoScalingEnabled = setAutoScalingEnabled;
globalThis.getPerformanceOverlayState = getPerformanceOverlayState;
globalThis.setPhysicsBodyPosition = setPhysicsBodyPosition;
globalThis.applyPhysicsImpulse = applyPhysicsImpulse;
globalThis.spawnPhysicsProjectile = spawnPhysicsProjectile;
globalThis.getPhysicsSnapshot = getPhysicsSnapshot;
globalThis.getRobotById = getRobotById;

// Suppress console warnings during tests (optional)
// global.console = {
//   ...console,
//   warn: vi.fn(),
//   error: vi.fn(),
// };
