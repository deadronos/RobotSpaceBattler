/**
 * Type definitions for MatchTrace system entities and events.
 *
 * These types align with the JSON schemas in specs/003-extend-placeholder-create/schemas/
 * and are used for both runtime validation and type-safe code generation.
 */

export interface Position {
  x: number;
  y: number;
  z: number;
}

// Vector3 is an alias for Position (same 3D vector structure)
export type Vector3 = Position;

export interface Transform {
  position: Position;
  rotation?: Position;
  scale?: Position;
}

// ============================================================================
// Team and Unit Entities (from specs/001 Spawn Contract)
// ============================================================================

export interface Unit {
  id: string;
  modelRef: string; // asset identifier/path
  teamId: string;
  maxHealth: number;
  currentHealth?: number;
  weapons?: Array<Record<string, unknown>>;
  isCaptain?: boolean;
}

export interface SpawnPoint {
  spawnPointId: string;
  position: Position;
}

export interface Team {
  id: string;
  name: string;
  metadata?: Record<string, unknown>;
  units: (Unit | string)[]; // can be full objects or ID references
  spawnPoints: SpawnPoint[];
}

// ============================================================================
// MatchTrace Events (from specs/003 Event Stream)
// ============================================================================

export type EventType = 'spawn' | 'move' | 'fire' | 'hit' | 'damage' | 'death' | 'score';

export interface BaseEvent {
  type: EventType;
  timestampMs: number; // monotonic, ms since match start
  frameIndex?: number;
  sequenceId?: number; // tie-breaker for same timestamp
}

export interface SpawnEvent extends BaseEvent {
  type: 'spawn';
  entityId: string;
  teamId: string;
  position: Position;
}

export interface MoveEvent extends BaseEvent {
  type: 'move';
  entityId: string;
  position: Position;
}

export interface FireEvent extends BaseEvent {
  type: 'fire';
  attackerId: string;
  projectileId: string;
  position: Position;
}

export interface HitEvent extends BaseEvent {
  type: 'hit';
  projectileId: string;
  targetId: string;
  position: Position;
  collisionNormal?: Position;
}

export interface DamageEvent extends BaseEvent {
  type: 'damage';
  targetId: string;
  attackerId: string;
  amount: number;
  resultingHealth: number;
  sourceEventId?: string;
}

export interface DeathEvent extends BaseEvent {
  type: 'death';
  entityId: string;
  killedBy?: string;
}

export interface ScoreEvent extends BaseEvent {
  type: 'score';
  teamId: string;
  amount: number;
  reason?: string;
}

export type MatchTraceEvent =
  | SpawnEvent
  | MoveEvent
  | FireEvent
  | HitEvent
  | DamageEvent
  | DeathEvent
  | ScoreEvent;

// ============================================================================
// MatchTrace (main container for recorded match data)
// ============================================================================

export interface MatchTraceMeta {
  rngSeed?: number;
  rngAlgorithm?: string;
  [key: string]: unknown;
}

export interface MatchTrace {
  meta?: MatchTraceMeta;
  rngSeed?: number;
  rngAlgorithm?: string;
  events: MatchTraceEvent[];
}

// ============================================================================
// Visual Quality Profile (from specs/003 User Story 2)
// ============================================================================

export enum VisualQualityLevel {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export interface VisualQualityProfile {
  level: VisualQualityLevel;
  shadowsEnabled: boolean;
  texturesEnabled: boolean;
  particlesEnabled: boolean;
  postProcessingEnabled: boolean;
  maxLights: number;
}

// ============================================================================
// Replay / Playback Configuration
// ============================================================================

export interface ReplayConfig {
  matchTrace: MatchTrace;
  rngSeed: number;
  autoPlay: boolean;
  playbackRate: number; // 1.0 = real-time, 2.0 = 2x speed, etc.
  seekToMs?: number; // jump to timestamp
}

// ============================================================================
// Rendered Entity State (for visual rendering layer)
// ============================================================================

export interface RenderedEntity {
  id: string;
  type: 'robot' | 'projectile';
  teamId?: string;
  position: Position;
  velocity?: Position;
  visible: boolean;
  health?: number;
  modelRef?: string;
}

export interface RenderState {
  entities: Map<string, RenderedEntity>;
  currentTimestampMs: number;
  matchActive: boolean;
  winner?: string; // team ID if match ended
}

// ============================================================================
// Validation Contract (from specs/003 FR-009-A)
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ContractValidationReport {
  timestamp: number;
  teamSchema: ValidationResult;
  matchTraceSchema: ValidationResult;
  overallValid: boolean;
}
