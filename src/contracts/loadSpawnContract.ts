// Thin loader module that re-exports canonical spawn contract values
// This decouples runtime code/tests from the specs folder layout and provides
// a single import path for spawn-related contract constants.

export {
  BLUE_SPAWN_ZONE,
  INITIAL_HEALTH,
  MIN_SPAWN_SPACING,
  RED_SPAWN_ZONE,
  SPAWN_ZONES,
} from "../../specs/001-3d-team-vs/contracts/spawn-contract";
