import { create } from '@react-three/test-renderer';
import { Matrix4, Vector3 as ThreeVector3 } from 'three';
import { describe, expect, it } from 'vitest';

import type { Projectile } from '../../../src/ecs/entities/Projectile';

function createProjectile(overrides: Partial<Projectile> = {}): Projectile {
  return {
    id: overrides.id ?? `proj-${Math.random()}`,
    ownerId: overrides.ownerId ?? 'robot-1',
    weaponType: overrides.weaponType ?? 'laser',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    velocity: overrides.velocity ?? { x: 0, y: 0, z: 1 },
    damage: overrides.damage ?? 10,
    distanceTraveled: overrides.distanceTraveled ?? 0,
    maxDistance: overrides.maxDistance ?? 50,
    spawnTime: overrides.spawnTime ?? 0,
    maxLifetime: overrides.maxLifetime ?? 2,
  };
}

describe('Projectile component', () => {
  it('groups projectiles by weapon type and uses instancing', async () => {
    const projectiles: Projectile[] = [
      createProjectile({ id: 'laser-1', weaponType: 'laser', position: { x: 1, y: 0.5, z: -2 } }),
      createProjectile({ id: 'laser-2', weaponType: 'laser', position: { x: -2, y: 1, z: 0 } }),
      createProjectile({ id: 'rocket-1', weaponType: 'rocket', position: { x: 3, y: 0, z: 4 } }),
    ];

    const { ProjectileInstances } = await import('../../../src/components/Projectile');

    const renderer = await create(<ProjectileInstances projectiles={projectiles} />);
    const groupInstance = renderer.scene.children[0] as any;
    const group = groupInstance.object ?? groupInstance._fiber?.object;
    const laserMesh = group.getObjectByName('projectiles-laser');
    const rocketMesh = group.getObjectByName('projectiles-rocket');

    expect(laserMesh).toBeDefined();
    expect(rocketMesh).toBeDefined();
    expect(laserMesh.count).toBe(2);
    expect(rocketMesh.count).toBe(1);

    const matrix = new Matrix4();
    const position = new ThreeVector3();
    laserMesh.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);

    expect(position.x).toBeCloseTo(1);
    expect(position.y).toBeCloseTo(0.5);
    expect(position.z).toBeCloseTo(-2);

    await renderer.unmount();
  });

  it('applies unique visual characteristics per weapon type', async () => {
    const projectiles: Projectile[] = [
      createProjectile({ weaponType: 'laser' }),
      createProjectile({ weaponType: 'gun' }),
      createProjectile({ weaponType: 'rocket' }),
    ];

    const { ProjectileInstances } = await import('../../../src/components/Projectile');

    const renderer = await create(<ProjectileInstances projectiles={projectiles} />);
    const groupInstance = renderer.scene.children[0] as any;
    const group = groupInstance.object ?? groupInstance._fiber?.object;
    const laserMesh = group.getObjectByName('projectiles-laser');
    const gunMesh = group.getObjectByName('projectiles-gun');
    const rocketMesh = group.getObjectByName('projectiles-rocket');

    expect(laserMesh.material.emissiveIntensity).toBeGreaterThan(gunMesh.material.emissiveIntensity);
    expect(gunMesh.material.color.getHexString()).toBe('f97316');
    expect(rocketMesh.material.color.getHexString()).toBe('facc15');

    await renderer.unmount();
  });
});
