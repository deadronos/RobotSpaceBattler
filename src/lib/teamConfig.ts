import { TeamId, toVec3, Vec3 } from "../ecs/world";

export interface TeamConfig {
  id: TeamId;
  name: string;
  color: string;
  accent: string;
  spawnCenter: Vec3;
}

export const TEAM_CONFIGS: Record<TeamId, TeamConfig> = {
  red: {
    id: "red",
    name: "Red Squadron",
    color: "#ff5a7a",
    accent: "#ffc0d9",
    spawnCenter: toVec3(-12, 0, 0),
  },
  blue: {
    id: "blue",
    name: "Blue Vanguard",
    color: "#56aaff",
    accent: "#bce0ff",
    spawnCenter: toVec3(12, 0, 0),
  },
};
