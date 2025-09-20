import type { Query } from "miniplex";
import React, { useEffect, useMemo } from "react";

import type { FxComponent } from "../ecs/fx";
import { useEcsQuery } from "../ecs/hooks";
import { type Entity, world } from "../ecs/miniplexStore";
import { markVisualActive, unmarkVisualActive } from "../utils/visualActivity";

type FxEntity = Entity & {
  fx: FxComponent;
  position: [number, number, number];
};

export function FXLayer() {
  const query = useMemo(
    () => world.with("fx", "position") as unknown as Query<FxEntity>,
    [],
  );
  const fxs = useEcsQuery(query);
  // Register visual activity when there are active FX entities so Simulation will drive the frameloop
  useEffect(() => {
    if (fxs.length > 0) {
      markVisualActive();
      return () => unmarkVisualActive();
    }
    return undefined;
  }, [fxs.length]);

  return (
    <group>
      {fxs.map((e) => {
        const { position, fx } = e;
        const t = Math.min(1, Math.max(0, fx.age / fx.ttl));
        const alpha = 1 - t; // fade out
        const size = (fx.size ?? 0.5) * (1 + 0.5 * (1 - t));
        const color = fx.color ?? "#ffffff";

        switch (fx.type) {
          case "hitFlash":
            return (
              <mesh key={String(e.id)} position={position}>
                <sphereGeometry args={[size * 0.5, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={alpha} />
              </mesh>
            );
          case "impactParticles":
            return (
              <mesh key={String(e.id)} position={position}>
                <octahedronGeometry args={[size * 0.4, 0]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={alpha * 0.8}
                />
              </mesh>
            );
          case "explosion":
            return (
              <mesh key={String(e.id)} position={position}>
                <sphereGeometry args={[size, 10, 10]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={alpha * 0.6}
                />
              </mesh>
            );
          default:
            return null;
        }
      })}
    </group>
  );
}
