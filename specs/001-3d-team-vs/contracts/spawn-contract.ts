import { TEAM_CONFIGS, type TeamId } from "../../../src/lib/teamConfig";

// Machine-readable mirror of spawn-contract.md.
// NOTE: `specs/` is not included in the repository TypeScript build.

export const ROBOTS_PER_TEAM = 10;
export const INITIAL_HEALTH = 100;
export const TEAM_IDS: TeamId[] = ["red", "blue"];

export function getSpawnPoints(team: TeamId) {
  return TEAM_CONFIGS[team].spawnPoints.slice(0, ROBOTS_PER_TEAM);
}
import type { SpawnZone } from '../../../src/types';

// Canonical spawn contract values exported as a TypeScript module so
// tests and systems can import them directly.

export const INITIAL_HEALTH = 100;
export const MIN_SPAWN_SPACING = 2.0;

/**
 * Spawn zone configuration for the Red team.
 */
export const RED_SPAWN_ZONE: SpawnZone = {
  center: { x: -30, y: 0, z: 0 },
  radius: 10,
  spawnPoints: [
    { x: -35, y: 0, z: -5 },
    { x: -35, y: 0, z: 0 },
    { x: -35, y: 0, z: 5 },
    { x: -30, y: 0, z: -5 },
    { x: -30, y: 0, z: 0 },
    { x: -30, y: 0, z: 5 },
    { x: -25, y: 0, z: -5 },
    { x: -25, y: 0, z: 0 },
    { x: -25, y: 0, z: 5 },
    { x: -30, y: 0, z: -10 },
  ],
};

/**
 * Spawn zone configuration for the Blue team.
 */
export const BLUE_SPAWN_ZONE: SpawnZone = {
  center: { x: 30, y: 0, z: 0 },
  radius: 10,
  spawnPoints: [
    { x: 35, y: 0, z: -5 },
    { x: 35, y: 0, z: 0 },
    { x: 35, y: 0, z: 5 },
    { x: 30, y: 0, z: -5 },
    { x: 30, y: 0, z: 0 },
    { x: 30, y: 0, z: 5 },
    { x: 25, y: 0, z: -5 },
    { x: 25, y: 0, z: 0 },
    { x: 25, y: 0, z: 5 },
    { x: 30, y: 0, z: -10 },
  ],
};

/**
 * Mapping of team IDs to their spawn zones.
 */
export const SPAWN_ZONES: Record<'red' | 'blue', SpawnZone> = {
  red: RED_SPAWN_ZONE,
  blue: BLUE_SPAWN_ZONE,
};
