/**
 * Global TypeScript Types
 *
 * Core type definitions for the 3D Team vs Team Autobattler game.
 * These types are used across entities, systems, and components.
 */

/**
 * 3D Vector representation (x, y, z coordinates)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion representation for 3D rotations
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Team affiliation for robots
 */
export type Team = "red" | "blue";

/**
 * Weapon types with rock-paper-scissors balance
 * - Laser beats Gun (1.5x damage)
 * - Gun beats Rocket (1.5x damage)
 * - Rocket beats Laser (1.5x damage)
 */
export type WeaponType = "laser" | "gun" | "rocket";

/**
 * AI behavior modes for robot decision-making
 */
export type AIBehaviorMode = "aggressive" | "defensive" | "retreating";

/**
 * AI state information for a robot
 */
export interface AIState {
  /** Current behavior mode */
  behaviorMode: AIBehaviorMode;
  /** ID of the current target enemy (null if no target) */
  targetId: string | null;
  /** Position of cover location (null if not in cover) */
  coverPosition: Vector3 | null;
  /** Timestamp of last weapon discharge (milliseconds) */
  lastFireTime: number;
  /** Formation offset from captain (for non-captain robots) */
  formationOffset: Vector3;
}

/**
 * Statistics tracked for each robot
 */
export interface RobotStats {
  /** Number of enemies eliminated */
  kills: number;
  /** Total damage dealt to enemies */
  damageDealt: number;
  /** Total damage received from enemies */
  damageTaken: number;
  /** Seconds survived since spawn */
  timeAlive: number;
  /** Number of weapon discharges */
  shotsFired: number;
}

/**
 * Simulation status states
 */
export type SimulationStatus =
  | "initializing"
  | "running"
  | "paused"
  | "victory"
  | "simultaneous-elimination";

/**
 * Performance statistics for monitoring
 */
export interface PerformanceStats {
  /** Current frames per second */
  currentFPS: number;
  /** Average FPS over recent frames */
  averageFPS: number;
  /** Whether quality scaling is active */
  qualityScalingActive: boolean;
}

/**
 * Spawn zone definition for team deployment
 */
export interface SpawnZone {
  /** Center point of the spawn zone */
  center: Vector3;
  /** Radius of the spawn zone */
  radius: number;
  /** Predefined spawn points within the zone */
  spawnPoints: Vector3[];
}

/**
 * Obstacle definition for arena cover
 */
export interface Obstacle {
  /** Position of the obstacle */
  position: Vector3;
  /** Dimensions (width, height, depth) */
  dimensions: Vector3;
  /** Whether this obstacle provides cover */
  isCover: boolean;
}

/**
 * Lighting configuration for the arena
 */
export interface LightingConfig {
  /** Ambient light color (hex) */
  ambientColor: string;
  /** Ambient light intensity (0-1) */
  ambientIntensity: number;
  /** Directional light color (hex) */
  directionalColor: string;
  /** Directional light intensity (0-1) */
  directionalIntensity: number;
  /** Whether shadows are enabled */
  shadowsEnabled: boolean;
}

/**
 * Performance measurement report returned by the test harness
 */
export interface PerfReport {
  /** Median FPS computed over 1s windows (primary metric) */
  medianFPS: number;
  /** 5th percentile FPS across 1s windows (p5) */
  p5FPS: number;
  /** Total frames observed during the measurement (after warm-up) */
  totalFrames: number;
  /** Estimated dropped frames relative to the target frame rate */
  droppedFrames: number;
  /** Measurement duration in milliseconds (excluding warm-up) */
  durationMs: number;
  /** Per-1s bucket summary (startMs is relative to navigation start) */
  buckets: Array<{ startMs: number; frames: number; fps: number }>;
}

export interface PerfMeasurementOptions {
  /** Warm-up in seconds (frames during warm-up are ignored) */
  warmupSeconds?: number;
  /** Target frame rate to compute dropped frames (default 60) */
  targetFrameRate?: number;
}

declare global {
  interface Window {
    /**
     * Test harness performance API used by Playwright/CI to programmatically
     * start/stop/reset FPS measurements. The implementation is a no-op when
     * not present (e.g., in older browsers) and is added by the app at
     * runtime so tests can access deterministically.
     */
    __perf?: {
      startMeasurement: (opts?: PerfMeasurementOptions) => void;
      stopMeasurement: () => Promise<PerfReport>;
      reset: () => void;
      getLastReport?: () => PerfReport | null;
    };
  }
}

export {};
