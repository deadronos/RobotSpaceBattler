/**
 * ID and Team canonicalization utilities.
 */

export type Team = "red" | "blue";

const TEAM_MAP: Record<string, Team> = {
  red: "red",
  blue: "blue",
  r: "red",
  b: "blue",
};

export function normalizeTeam(value: unknown): Team {
  if (typeof value === "string") {
    const normalized = TEAM_MAP[value.toLowerCase()];
    if (normalized) return normalized;
  }
  if (typeof value === "number") {
    if (value === 0) return "red";
    if (value === 1) return "blue";
  }
  throw new Error(`Invalid team value: ${String(value)}`);
}

export function ensureGameplayId(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  throw new Error(`Invalid gameplay id: ${String(value)}`);
}
