/**
 * Deterministic Robot component schema.
 */

import { createHealth, type HealthState } from "../health";
import { ensureGameplayId, normalizeTeam, type Team } from "../id";
import type { WeaponPayload } from "../weaponPayload";
import type { WeaponStateComponent } from "../weapons";

export interface RobotComponent {
  id: string;
  team: Team;
  health: HealthState;
  weapon?: WeaponPayload;
  weaponState?: WeaponStateComponent;
  invulnerableUntil?: number;
}

export type RobotInit = {
  id: string | number;
  team: string | number;
  health?: Partial<HealthState> & { current: number; max: number };
  weapon?: WeaponPayload;
  weaponState?: WeaponStateComponent;
  invulnerableUntil?: number;
};

export function createRobotComponent(init: RobotInit): RobotComponent {
  return {
    id: ensureGameplayId(init.id),
    team: normalizeTeam(init.team),
    health: createHealth(
      init.health ?? {
        current: 100,
        max: 100,
      },
    ),
    weapon: init.weapon,
    weaponState: init.weaponState,
    invulnerableUntil: init.invulnerableUntil ?? 0,
  };
}
