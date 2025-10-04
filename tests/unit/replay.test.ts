import { createProjectileComponent } from "../../src/ecs/components/projectile";
import { projectilesToNDJSON, projectilesFromNDJSON } from "../../src/utils/replay";

describe("Replay NDJSON exporters for projectiles", () => {
  it("exports and reimports projectiles preserving normalized ids and fields", () => {
    const p1 = createProjectileComponent({
      sourceWeaponId: 1,
      ownerId: 2,
      team: "red",
      damage: 5,
      lifespan: 3,
      spawnTime: 1000,
    });

    const p2 = createProjectileComponent({
      sourceWeaponId: "weapon-x",
      ownerId: "owner-y",
      team: "blue",
      damage: 7,
      lifespan: 4,
      spawnTime: 2000,
    });

    const ndjson = projectilesToNDJSON([p1, p2]);
    const imported = projectilesFromNDJSON(ndjson, { spawnTime: 999, defaultLifespan: 6 });

    expect(imported.length).toBe(2);
    expect(imported[0].sourceWeaponId).toBe("1");
    expect(imported[1].ownerId).toBe("owner-y");
    expect(imported[0].spawnTime).toBe(999);
  });
});
