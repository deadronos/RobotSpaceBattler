/**
 * Vitest Test Setup
 *
 * Global test configuration and setup for the test suite.
 */

import { act as reactAct } from 'react';
// Ensure testing libraries detect react act environment and use react's act implementation
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).act = reactAct;
(React as any).act = reactAct;

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
  setRobotHealth,
  setRobotKills,
  setRobotPosition,
  triggerCaptainReelection,
} from '../src/ecs/world';

type SimulationWorldApi = typeof import('../src/ecs/world');

declare global {
  // eslint-disable-next-line no-var
  var initializeSimulation: SimulationWorldApi['initializeSimulation'];
  // eslint-disable-next-line no-var
  var stepSimulation: SimulationWorldApi['stepSimulation'];
  // eslint-disable-next-line no-var
  var getProjectiles: SimulationWorldApi['getProjectiles'];
  // eslint-disable-next-line no-var
  var inflictDamage: SimulationWorldApi['inflictDamage'];
  // eslint-disable-next-line no-var
  var eliminateRobot: SimulationWorldApi['eliminateRobot'];
  // eslint-disable-next-line no-var
  var calculateDistance: SimulationWorldApi['calculateDistance'];
  // eslint-disable-next-line no-var
  var getDamageMultiplier: SimulationWorldApi['getDamageMultiplier'];
  // eslint-disable-next-line no-var
  var getSimulationState: SimulationWorldApi['getSimulationState'];
  // eslint-disable-next-line no-var
  var pauseAutoRestart: SimulationWorldApi['pauseAutoRestart'];
  // eslint-disable-next-line no-var
  var resumeAutoRestart: SimulationWorldApi['resumeAutoRestart'];
  // eslint-disable-next-line no-var
  var resetAutoRestartCountdown: SimulationWorldApi['resetAutoRestartCountdown'];
  // eslint-disable-next-line no-var
  var openStatsOverlay: SimulationWorldApi['openStatsOverlay'];
  // eslint-disable-next-line no-var
  var closeStatsOverlay: SimulationWorldApi['closeStatsOverlay'];
  // eslint-disable-next-line no-var
  var openSettingsOverlay: SimulationWorldApi['openSettingsOverlay'];
  // eslint-disable-next-line no-var
  var closeSettingsOverlay: SimulationWorldApi['closeSettingsOverlay'];
  // eslint-disable-next-line no-var
  var applyTeamComposition: SimulationWorldApi['applyTeamComposition'];
  // eslint-disable-next-line no-var
  var getArenaConfig: SimulationWorldApi['getArenaConfig'];
  // eslint-disable-next-line no-var
  var recordFrameMetrics: SimulationWorldApi['recordFrameMetrics'];
  // eslint-disable-next-line no-var
  var setAutoScalingEnabled: SimulationWorldApi['setAutoScalingEnabled'];
  // eslint-disable-next-line no-var
  var getPerformanceOverlayState: SimulationWorldApi['getPerformanceOverlayState'];
  // eslint-disable-next-line no-var
  var setPhysicsBodyPosition: SimulationWorldApi['setPhysicsBodyPosition'];
  // eslint-disable-next-line no-var
  var applyPhysicsImpulse: SimulationWorldApi['applyPhysicsImpulse'];
  // eslint-disable-next-line no-var
  var spawnPhysicsProjectile: SimulationWorldApi['spawnPhysicsProjectile'];
  // eslint-disable-next-line no-var
  var getPhysicsSnapshot: SimulationWorldApi['getPhysicsSnapshot'];
  // eslint-disable-next-line no-var
  var getRobotById: SimulationWorldApi['getRobotById'];
  // eslint-disable-next-line no-var
  var setRobotHealth: SimulationWorldApi['setRobotHealth'];
  // eslint-disable-next-line no-var
  var setRobotKills: SimulationWorldApi['setRobotKills'];
  // eslint-disable-next-line no-var
  var setRobotPosition: SimulationWorldApi['setRobotPosition'];
  // eslint-disable-next-line no-var
  var triggerCaptainReelection: SimulationWorldApi['triggerCaptainReelection'];
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
globalThis.setRobotHealth = setRobotHealth;
globalThis.setRobotKills = setRobotKills;
globalThis.setRobotPosition = setRobotPosition;
globalThis.triggerCaptainReelection = triggerCaptainReelection;

// Suppress console warnings during tests (optional)
// global.console = {
//   ...console,
//   warn: vi.fn(),
//   error: vi.fn(),
// };
