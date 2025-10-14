import type { Team } from './index';

export type RoundStatus = 'initializing' | 'running' | 'ending' | 'finished';

export interface RoundView {
  id: string;
  status: RoundStatus;
  startTime: number | null;
  endTime: number | null;
  map?: string;
  rules?: Record<string, unknown>;
  expectedRobotCountRange?: { min: number; max: number };
}

export interface RobotView {
  id: string;
  name?: string;
  team: Team;
  currentHealth: number;
  maxHealth?: number;
  statusFlags: string[];
  currentTarget?: string | null;
  isCaptain?: boolean;
}

export type CameraMode = 'follow' | 'cinematic' | 'free';

export interface CameraState {
  mode: CameraMode;
  targetEntityId?: string | null;
  interpolationMs?: number;
}

export interface BattleUiPreferences {
  reducedMotion: boolean;
  minimalUi: boolean;
  followModeShowsPerRobot: boolean;
}

export interface BattleUiState {
  inRound: boolean;
  activeUI: 'battle' | 'lobby' | 'summary';
  userPreferences: BattleUiPreferences;
  lastToggleTime: number | null;
}

export interface FrameSnapshot {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    up: [number, number, number];
  };
  time: number;
  interpolationFactor: number;
}
