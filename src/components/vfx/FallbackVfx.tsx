import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

import type { BattleWorld } from "../../ecs/worldTypes";
import { EffectVisual } from "./EffectVisual";
import { ProjectileVisual } from "./ProjectileVisual";

interface FallbackVfxProps {
  battleWorld: BattleWorld;
  /** When true only entities without an instance slot are drawn here. */
  instancingEnabled: boolean;
}

/**
 * Non-instanced (declarative) projectiles and effects.
 *
 * Used when instancing is disabled or a pool ran out of slots. These visuals
 * take their data as props, so this small subtree re-renders every frame, but
 * only while it actually has something to draw. The rest of the scene (App,
 * Simulation, robots, instanced VFX) is unaffected.
 */
export function FallbackVfx({
  battleWorld,
  instancingEnabled,
}: FallbackVfxProps) {
  const [, setTick] = useState(0);
  const hadActive = useRef(false);

  const projectiles = battleWorld.projectiles.entities.filter(
    (p) => !instancingEnabled || p.instanceIndex === undefined,
  );
  const effects = battleWorld.effects.entities.filter(
    (e) => !instancingEnabled || e.instanceIndex === undefined,
  );
  const active = projectiles.length > 0 || effects.length > 0;

  useFrame(() => {
    // Re-render for the frame that clears the last fallback entity as well.
    if (active || hadActive.current) setTick((t) => (t + 1) & 0xffff);
    hadActive.current = active;
  });

  const robotsById = new Map(battleWorld.robots.entities.map((r) => [r.id, r]));
  const now = battleWorld.state.elapsedMs;

  return (
    <>
      {projectiles.map((projectile) => (
        <ProjectileVisual
          key={projectile.id}
          projectile={projectile}
          shooter={robotsById.get(projectile.shooterId)}
          target={
            projectile.targetId
              ? robotsById.get(projectile.targetId)
              : undefined
          }
        />
      ))}
      {effects.map((effect) => (
        <EffectVisual key={effect.id} effect={effect} currentTimeMs={now} />
      ))}
    </>
  );
}
