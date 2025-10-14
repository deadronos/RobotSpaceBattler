import type { Team } from '../types';
import type {
  BattleUiPreferences,
  BattleUiState,
  CameraState,
  RobotView,
  RoundStatus,
  RoundView,
} from '../types/ui';

export interface RobotSnapshot {
  id: string;
  name?: string;
  team: Team;
  health: number;
  maxHealth?: number;
  statusFlags?: readonly string[] | null;
  currentTarget?: string | null;
  currentTargetId?: string | null;
  isCaptain?: boolean;
}

export interface BattleSelectorsContext {
  round: {
    id: string;
    status: RoundStatus;
    startTime: number | null;
    endTime: number | null;
    map?: string;
    rules?: Record<string, unknown>;
    expectedRobotCountRange?: { min: number; max: number };
  };
  robots: ReadonlyArray<RobotSnapshot>;
  camera: CameraState;
  ui: {
    inRound: boolean;
    activeUI: 'battle' | 'lobby' | 'summary';
    userPreferences: BattleUiPreferences;
    lastToggleTime: number | null;
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function getRoundView(context: BattleSelectorsContext): RoundView {
  const { round } = context;
  return {
    ...round,
    expectedRobotCountRange: round.expectedRobotCountRange
      ? { ...round.expectedRobotCountRange }
      : undefined,
    rules: round.rules ? { ...round.rules } : undefined,
  };
}

export function getRobotView(
  context: BattleSelectorsContext,
  robotId: string,
): RobotView | null {
  const robot = context.robots.find((entry) => entry.id === robotId);

  if (!robot) {
    return null;
  }

  const hasMaxHealth = typeof robot.maxHealth === 'number';
  const maxHealth = hasMaxHealth ? robot.maxHealth : undefined;
  let currentHealth = Math.max(0, robot.health);
  if (maxHealth !== undefined) {
    currentHealth = clamp(currentHealth, 0, maxHealth);
  }

  return {
    id: robot.id,
    name: robot.name,
    team: robot.team,
    currentHealth,
  maxHealth,
    statusFlags: robot.statusFlags ? [...robot.statusFlags] : [],
    currentTarget: robot.currentTarget ?? robot.currentTargetId ?? null,
    isCaptain: robot.isCaptain,
  };
}

export function getActiveCamera(context: BattleSelectorsContext): CameraState {
  return { ...context.camera };
}

export function getBattleUiState(context: BattleSelectorsContext): BattleUiState {
  return {
    ...context.ui,
    userPreferences: { ...context.ui.userPreferences },
  };
}
