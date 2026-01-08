import { useEffect, useMemo } from "react";
import { CylinderGeometry, Object3D } from "three";

import { ProjectileEntity } from "../../ecs/world";
import { ensureGeometryHasVertexColors } from "../../visuals/instanceColorUtils";
import { VisualInstanceManager } from "../../visuals/VisualInstanceManager";
import { InstancedProjectileGroup } from "./InstancedProjectileGroup";

interface InstancedProjectilesProps {
  projectiles: ProjectileEntity[];
  instanceManager: VisualInstanceManager;
}

/**
 * Renders bullet and rocket projectiles using instanced rendering.
 * Efficiently handles high projectile counts.
 */
export function InstancedProjectiles({
  projectiles,
  instanceManager,
}: InstancedProjectilesProps) {
  const bulletGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(1, 1, 1, 10);
    ensureGeometryHasVertexColors(geometry);
    return geometry;
  }, []);

  const rocketGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(0.8, 1.2, 1, 10);
    ensureGeometryHasVertexColors(geometry);
    return geometry;
  }, []);

  useEffect(() => {
    return () => {
      bulletGeometry.dispose();
      rocketGeometry.dispose();
    };
  }, [bulletGeometry, rocketGeometry]);

  const updateBulletInstance = (
    projectile: ProjectileEntity,
    dummy: Object3D,
    speed: number,
  ) => {
    const scale = Math.max(0.05, projectile.projectileSize ?? 0.14);
    const length = Math.min(1.4, Math.max(0.35, speed * 0.04));
    const thickness = Math.max(0.06, scale * 0.55);
    dummy.scale.set(thickness, length, thickness);
  };

  const updateRocketInstance = (
    projectile: ProjectileEntity,
    dummy: Object3D,
    speed: number,
  ) => {
    const scale = Math.max(0.05, projectile.projectileSize ?? 0.14);
    const thickness = Math.max(0.08, scale * 0.55);
    dummy.scale.set(thickness, scale * 2.8, thickness);
  };

  const isBullet = (p: ProjectileEntity) =>
    p.weapon !== "laser" && p.weapon !== "rocket";
  const isRocket = (p: ProjectileEntity) => p.weapon === "rocket";

  return (
    <group>
      <InstancedProjectileGroup
        projectiles={projectiles}
        instanceManager={instanceManager}
        category="bullets"
        geometry={bulletGeometry}
        baseColorHex="#ffe08a"
        intensity={3.6}
        updateInstance={updateBulletInstance}
        isMatch={isBullet}
      />
      <InstancedProjectileGroup
        projectiles={projectiles}
        instanceManager={instanceManager}
        category="rockets"
        geometry={rocketGeometry}
        baseColorHex="#ff955c"
        intensity={3.0}
        updateInstance={updateRocketInstance}
        isMatch={isRocket}
      />
    </group>
  );
}

/**
 * Demo wrapper for testing InstancedProjectiles independently.
 */
export function InstancedProjectilesDemo({
  projectiles,
}: {
  projectiles: ProjectileEntity[];
}) {
  // Simple passthrough demo component for storybook/dev harness compatibility.
  const manager = useMemo(
    () =>
      new VisualInstanceManager({
        maxInstances: { bullets: 64, rockets: 32, lasers: 0, effects: 0 },
      }),
    [],
  );
  return (
    <InstancedProjectiles projectiles={projectiles} instanceManager={manager} />
  );
}
