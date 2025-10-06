/* eslint-disable simple-import-sort/exports */
// Thin loader module that re-exports canonical spawn contract values
// This decouples runtime code/tests from the specs folder layout and provides
// a single import path for spawn-related contract constants.

export {
  SPAWN_ZONES,
  RED_SPAWN_ZONE,
  BLUE_SPAWN_ZONE,
  INITIAL_HEALTH,
  MIN_SPAWN_SPACING,
} from "../../specs/001-3d-team-vs/contracts/spawn-contract";
