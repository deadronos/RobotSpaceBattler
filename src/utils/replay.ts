import type { ProjectileComponent } from "../ecs/components/projectile";
import { fromPersistedProjectile, type PersistedProjectile,toPersistedProjectile, validatePersistedProjectile } from "../ecs/projectilePayload";

export function projectilesToNDJSON(projectiles: ProjectileComponent[]): string {
  return projectiles
    .map((p) => JSON.stringify(toPersistedProjectile(p)))
    .join("\n");
}

export function projectilesFromNDJSON(
  ndjson: string,
  opts: { spawnTime: number; defaultLifespan?: number; idFactory?: () => string },
): ProjectileComponent[] {
  const lines = ndjson.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const out: ProjectileComponent[] = [];
  for (const line of lines) {
    const persisted = JSON.parse(line) as PersistedProjectile;
    validatePersistedProjectile(persisted);
    out.push(fromPersistedProjectile(persisted, { spawnTime: opts.spawnTime, defaultLifespan: opts.defaultLifespan, idFactory: opts.idFactory }));
  }
  return out;
}
