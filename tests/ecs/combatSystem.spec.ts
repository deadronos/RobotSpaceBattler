// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateCombatSystem } from "../../src/ecs/systems/combatSystem";
import {
  createBattleWorld,
  type BattleWorld,
  type RobotEntity,
} from "../../src/ecs/world";
import { vec3 } from "../../src/lib/math/vec3";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { getWeaponProfile } from "../../src/simulation/combat/weapons";
import { createTestRobot } from "../helpers/robotFactory";

const profile = getWeaponProfile("laser");

function createTelemetry() {
  const recordFire = vi.fn<TelemetryPort["recordFire"]>();
  const telemetry: TelemetryPort = {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire,
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
  return { telemetry, recordFire };
}

describe("updateCombatSystem", () => {
  let world: BattleWorld;
  let shooter: RobotEntity;
  let target: RobotEntity;
  let tel: ReturnType<typeof createTelemetry>;

  beforeEach(() => {
    world = createBattleWorld();
    tel = createTelemetry();
    shooter = createTestRobot({
      id: "A",
      team: "red",
      weapon: "laser",
      position: vec3(0, 0, 0),
      fireCooldown: 0,
    });
    target = createTestRobot({
      id: "B",
      team: "blue",
      position: vec3(5, 0, 0),
    });
    shooter.ai.targetId = "B";
    world.world.add(shooter);
    world.world.add(target);
  });

  const run = (dt = 0.016) => updateCombatSystem(world, tel.telemetry, dt);

  it("fires one projectile at an in-range target", () => {
    world.state.elapsedMs = 1234;
    run();

    expect(world.projectiles.entities).toHaveLength(1);
    const p = world.projectiles.entities[0];
    expect(p.damage).toBe(profile.damage);
    expect(p.shooterId).toBe("A");
    expect(p.targetId).toBe("B");
    expect(p.team).toBe("red");
    expect(p.position).toEqual(vec3(0, 0.8, 0));
    // Target is directly along +x, so velocity is the full projectile speed.
    expect(p.velocity.x).toBeCloseTo(profile.projectileSpeed);
    expect(p.velocity.y).toBeCloseTo(0);
    expect(p.velocity.z).toBeCloseTo(0);
    expect(shooter.fireCooldown).toBeCloseTo(1 / profile.fireRate);
    expect(tel.recordFire).toHaveBeenCalledTimes(1);
    expect(tel.recordFire).toHaveBeenCalledWith({
      entityId: "A",
      teamId: "red",
      weapon: "laser",
      timestampMs: 1234,
    });
  });

  it("aims along the full 3D direction to the target", () => {
    target.position = vec3(0, 0, -10);
    run();
    const p = world.projectiles.entities[0];
    expect(p.velocity.x).toBeCloseTo(0);
    expect(p.velocity.z).toBeCloseTo(-profile.projectileSpeed);
  });

  it("decrements cooldown by dt and clamps at zero", () => {
    shooter.fireCooldown = 0.5;
    run(0.2);
    expect(shooter.fireCooldown).toBeCloseTo(0.3);
    expect(world.projectiles.entities).toHaveLength(0);

    shooter.fireCooldown = 0.1;
    run(0.2);
    // Cooldown expired within this tick, so it fired and re-armed.
    expect(shooter.fireCooldown).toBeCloseTo(1 / profile.fireRate);
    expect(world.projectiles.entities).toHaveLength(1);
  });

  it("clamps an expired cooldown to exactly zero when it cannot fire", () => {
    shooter.fireCooldown = 0.1;
    shooter.ai.mode = "retreat";
    run(0.2);
    expect(shooter.fireCooldown).toBe(0);
  });

  it("does not fire while retreating", () => {
    shooter.ai.mode = "retreat";
    run();
    expect(world.projectiles.entities).toHaveLength(0);
    expect(tel.recordFire).not.toHaveBeenCalled();
  });

  it("does not fire beyond weapon range", () => {
    target.position = vec3(profile.range + 0.01, 0, 0);
    run();
    expect(world.projectiles.entities).toHaveLength(0);
    expect(tel.recordFire).not.toHaveBeenCalled();
  });

  it("fires at the edge of weapon range", () => {
    target.position = vec3(profile.range - 0.01, 0, 0);
    run();
    expect(world.projectiles.entities).toHaveLength(1);
  });

  it("does not fire at a dead target", () => {
    target.health = 0;
    run();
    expect(world.projectiles.entities).toHaveLength(0);
  });

  it("does not fire at an unknown target", () => {
    shooter.ai.targetId = "nope";
    run();
    expect(world.projectiles.entities).toHaveLength(0);
  });

  it("does not fire without a target", () => {
    shooter.ai.targetId = undefined;
    run();
    expect(world.projectiles.entities).toHaveLength(0);
  });

  it("dead shooters do not fire but their cooldown still ticks", () => {
    shooter.health = 0;
    shooter.fireCooldown = 0.5;
    run(0.2);
    expect(world.projectiles.entities).toHaveLength(0);
    expect(shooter.fireCooldown).toBeCloseTo(0.3);
  });

  it("does not fire when shooter and target overlap", () => {
    target.position = vec3(0, 0, 0);
    run();
    expect(world.projectiles.entities).toHaveLength(0);
    expect(shooter.fireCooldown).toBe(0);
    expect(tel.recordFire).not.toHaveBeenCalled();
  });

  it("assigns sequential projectile ids", () => {
    const second = createTestRobot({
      id: "C",
      team: "red",
      weapon: "laser",
      position: vec3(0, 0, 2),
    });
    second.ai.targetId = "B";
    world.world.add(second);

    const before = world.state.nextProjectileId;
    run();

    const ids = world.projectiles.entities.map((p) => p.id);
    expect(new Set(ids).size).toBe(2);
    expect(world.state.nextProjectileId).toBe(before + 2);
  });

  it("does nothing in an empty world", () => {
    const empty = createBattleWorld();
    updateCombatSystem(empty, tel.telemetry, 0.016);
    expect(empty.projectiles.entities).toHaveLength(0);
    expect(tel.recordFire).not.toHaveBeenCalled();
  });
});
