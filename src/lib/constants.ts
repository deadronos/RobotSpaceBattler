/**
 * Application-wide constants for game mechanics and timing.
 * Extracting these values to named constants improves maintainability and clarity.
 */

/**
 * Time window (in milliseconds) for robot memory of enemy positions.
 * After this timeout, robots will stop pursuing last-known enemy locations
 * and may switch to roaming behavior.
 */
export const ENGAGE_MEMORY_TIMEOUT_MS = 1500;

/**
 * Delay (in milliseconds) before automatically restarting the match
 * after a victory condition is reached.
 */
export const AUTO_RESTART_DELAY_MS = 5000;

/**
 * Formation parameters for team positioning.
 */
export const FORMATION_BASE_RADIUS = 5.5;
export const FORMATION_RADIUS_VARIANCE = 0.15;

/**
 * Minimum distance maintained between robots in the same team
 * to prevent clustering and enable better tactical positioning.
 */
export const ROBOT_SEPARATION_DISTANCE = 1.5;

/**
 * UI styling constants
 */
export const VICTORY_OVERLAY_BACKGROUND = 'rgba(12, 14, 32, 0.85)';
