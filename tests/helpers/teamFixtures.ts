import {
  generateTeamConfigs,
  type TeamConfigs,
} from "../../src/lib/teamConfig";
import type { MovementContext } from "../../src/simulation/ai/pathing/types";

/**
 * Team configs for a fixed test seed.
 *
 * The AI no longer reads a module-level `TEAM_CONFIGS` constant: every helper
 * takes the per-match team configs explicitly. Tests use this fixture as the
 * match's `battleWorld.teams` unless they are specifically checking that a
 * non-zero seed is honoured.
 */
export const TEST_TEAMS: TeamConfigs = generateTeamConfigs(0);

/**
 * Builds a movement context for planning tests.
 * @param overrides - Fields to override on the default context.
 * @param teams - Per-match team configs (defaults to {@link TEST_TEAMS}).
 * @returns A complete MovementContext.
 */
export function movementContext(
  overrides: Partial<MovementContext> = {},
  teams: TeamConfigs = TEST_TEAMS,
): MovementContext {
  return { teams, ...overrides };
}
