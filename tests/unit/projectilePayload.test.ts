import { createProjectileComponent } from "../../src/ecs/components/projectile";
import { toPersistedProjectile, fromPersistedProjectile } from "../../src/ecs/projectilePayload";

describe("Projectile payload persistence", () => {
  it("toPersistedProjectile omits runtime-only fields and normalizes ids/teams", () => {
    const runtime = createProjectileComponent({
      sourceWeaponId: 42,
      ownerId: 7,
      team: "red",
      ownerTeam: "blue",
      damage: 10,
      lifespan: 5,
      spawnTime: 1234,
      speed: 50,
      aoeRadius: 2,
      homing: { turnSpeed: 2, targetId: 99 },
    });

    const persisted = toPersistedProjectile(runtime);

    expect(persisted).toHaveProperty("sourceWeaponId");
    expect(persisted.sourceWeaponId).toBe("42");
    expect(persisted.ownerId).toBe("7");
    expect(persisted).not.toHaveProperty("spawnTime");
    expect(persisted.lifespan).toBe(5);
  });

  it("fromPersistedProjectile restores a runtime component via createProjectileComponent", () => {
    const persisted = {
      sourceWeaponId: 42,
      ownerId: 7,
      team: "red",
      damage: 9,
      lifespan: 4,
      speed: 30,
      homing: { turnSpeed: 3, targetId: 77 },
    };

    const runtime = fromPersistedProjectile(persisted, { spawnTime: 2000, defaultLifespan: 6 });
    expect(runtime.spawnTime).toBe(2000);
    expect(runtime.damage).toBe(9);
    expect(runtime.lifespan).toBe(4);
    expect(runtime.sourceWeaponId).toBe("42");
  });
});
