import {
  createRobotEntity,
  type Entity,
  getGameplayId,
  notifyEntityChanged,
  resetWorld,
  type Team,
  type Vec3,
  world,
} from "../ecs/miniplexStore";
import type {
  WeaponComponent,
  WeaponStateComponent,
  WeaponType,
} from "../ecs/weapons";
import { weaponProfiles } from "./weaponProfiles";

export const DEFAULT_TEAM_SIZE = 10;
const GRID_COLUMNS = 5;
const GRID_SPACING = 2;
const BASE_HEIGHT = 0.6;

const TEAM_BASES: Record<Team, Vec3> = {
  red: [-8, BASE_HEIGHT, -6],
  blue: [8, BASE_HEIGHT, 6],
};

function countTeamRobots(team: Team) {
  let total = 0;

  for (const entity of world.entities) {
    if (entity.team !== team) continue;
    if ((entity as { projectile?: unknown }).projectile) continue;
    if ((entity as { beam?: unknown }).beam) continue;

    total += 1;
  }

  return total;
}

function computeGridPosition(team: Team, index: number): Vec3 {
  const [baseX, baseY, baseZ] = TEAM_BASES[team];
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);

  const direction = team === "red" ? 1 : -1;

  return [
    baseX + column * GRID_SPACING * direction,
    baseY,
    baseZ + row * GRID_SPACING * direction,
  ];
}

function createWeaponState(): WeaponStateComponent {
  return {
    firing: false,
    reloading: false,
    cooldownRemaining: 0,
  };
}

export function spawnRobot(
  team: Team,
  weaponType: WeaponType,
  options: { position?: Vec3; indexOverride?: number; idFactory?: () => string } = {},
) {
  const spawnIndex = options.indexOverride ?? countTeamRobots(team);
  const position = options.position ?? computeGridPosition(team, spawnIndex);

  // Create weapon and state objects before adding the entity so the entity
  // matches queries that require 'weapon' and 'weaponState' immediately.
  // OwnerId depends on the entity id which is assigned during createRobotEntity,
  // so set a temporary placeholder here and fix it after creation.
  const initialWeapon = {
    id: `weapon_${team}_${weaponType}_${spawnIndex}`,
    type: weaponType,
    ownerId: "pending", // will be corrected after entity is created
    team,
    ...weaponProfiles[weaponType],
  } as WeaponComponent;

  const initialWeaponState = createWeaponState();

  // Use provided idFactory to produce a deterministic gameplayId if present
  const providedGameplayId = options.idFactory ? options.idFactory() : undefined;
  const robot = createRobotEntity({
    team,
    position,
    weapon: initialWeapon,
    weaponState: initialWeaponState,
    gameplayId: providedGameplayId,
  }) as Entity & {
    weapon?: WeaponComponent;
    weaponState?: WeaponStateComponent;
  };

  // Now that the entity has an id, fix the ownerId to the correct value.
  if (robot.weapon) {
    const gameplayId = getGameplayId(robot) ?? String(robot.id ?? "");
    robot.weapon.ownerId = gameplayId;
  }

  return robot;
}

export function spawnTeam(
  team: Team,
  loadout: WeaponType[],
  count = DEFAULT_TEAM_SIZE,
  options?: { idFactory?: () => string },
) {
  const created: Entity[] = [];
  let spawnIndex = countTeamRobots(team);

  for (let i = 0; i < count; i += 1) {
    const weaponType = loadout[i % loadout.length];
    created.push(
      spawnRobot(team, weaponType, {
        indexOverride: spawnIndex,
        idFactory: options?.idFactory,
      }),
    );
    spawnIndex += 1;
  }

  return created;
}

export function resetAndSpawnDefaultTeams() {
  resetWorld();
  spawnTeam("red", ["gun", "laser", "rocket"]);
  spawnTeam("blue", ["rocket", "gun", "laser"]);
  // Notify subscribers that the world entity set has changed.
  // This helps hooks that need an initial nudge on first load.
  try {
    notifyEntityChanged(undefined);
  } catch {
    // non-fatal; used only to wake subscribers
  }
}
