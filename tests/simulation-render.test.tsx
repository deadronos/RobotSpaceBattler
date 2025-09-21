import { vi, describe, it, expect } from 'vitest';
import * as React from 'react';
import { create } from '@react-three/test-renderer';

// Mock rapier components to avoid WASM requirements in Node test env
vi.mock('@react-three/rapier', () => {
  const React = require('react');
  return {
    Physics: ({ children }: any) => React.createElement('group', null, children),
    RigidBody: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        translation: () => {
          const p = props.position ?? [0, 0, 0];
          return { x: p[0] ?? 0, y: p[1] ?? 0, z: p[2] ?? 0 };
        },
        linvel: () => ({ x: 0, y: 0, z: 0 }),
        setLinvel: () => {},
      }));
      return React.createElement('group', props, props.children);
    }),
    CuboidCollider: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ userData: {} }));
      return React.createElement('group', props);
    }),
    BallCollider: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ userData: {} }));
      return React.createElement('group', props);
    }),
    useRapier: () => ({}),
  };
});

import { Robot } from '../src/robots/robotPrefab';
import { Projectile } from '../src/components/Projectile';

function Host({ children }: { children: React.ReactNode }) {
  return <group>{children}</group>;
}

describe('Prefab mounting behavior (R3F test renderer)', () => {
  it('Robot prefab attaches a rigid body handle to the entity', async () => {
    const entity: any = { id: 123, team: 'red', position: [0, 0.6, 0], weapon: {}, weaponState: {} };

    const renderer = await create(
      <Host>
        <Robot entity={entity} />
      </Host>
    );

    await renderer.advanceFrames(2, 16);
    expect(entity.rigid).toBeTruthy();
    await renderer.unmount();
  });

  it('Projectile prefab attaches both rigid body handle and render ref', async () => {
    const entity: any = {
      id: 456,
      team: 'blue',
      position: [0, 1, 0],
      velocity: [1, 0, 0],
      projectile: { sourceWeaponId: 'w', spawnTime: 1 },
    };

    const renderer = await create(
      <Host>
        <Projectile entity={entity} />
      </Host>
    );

    await renderer.advanceFrames(2, 16);
    expect(entity.rigid).toBeTruthy();
    expect(entity.render).toBeTruthy();
    await renderer.unmount();
  });
});
