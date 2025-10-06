// Loader module that re-exports scoring contract values so runtime code and
// tests can import a stable module path under src/
export {
  BASE_DAMAGE,
  expectedFinalDamage,
  MULTIPLIER_ADVANTAGE,
  MULTIPLIER_DISADVANTAGE,
  MULTIPLIER_NEUTRAL,
  MULTIPLIERS,
} from "../../specs/001-3d-team-vs/contracts/scoring-contract";
