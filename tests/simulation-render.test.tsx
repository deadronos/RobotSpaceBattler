import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-three/fiber primitives used by Scene/Simulation so we can render
// without a WebGL context in jsdom.
vi.mock('@react-three/fiber', async () => {
  const React = await import('react');
  return {
    Canvas: ({ children }: any) => React.createElement('div', null, children),
    useFrame: (cb: any) => {
      // do nothing: Simulation uses useFrame to register per-frame callback,
      // but unit test doesn't need an animation loop.
    },
    useThree: () => ({ invalidate: () => {} }),
  };
});

// Mock rapier wrapper components used by the project so they don't require
// native bindings in tests. RigidBody and colliders forward refs and expose
// a small stub handle so prefab components can attach `entity.rigid` and
// collider refs.
vi.mock('@react-three/rapier', async () => {
  const React = await import('react');
  const { forwardRef, useImperativeHandle } = React;

  const Physics = ({ children }: any) => React.createElement('div', null, children);

  const RigidBody = forwardRef(({ children }: any, ref: any) => {
    // expose a minimal stubbed API object that prefab code can attach to
    const handle = {
      translation: () => ({ x: 0, y: 0, z: 0 }),
      linvel: () => ({ x: 0, y: 0, z: 0 }),
      setLinvel: () => {},
    };
    useImperativeHandle(ref, () => handle, []);
    return React.createElement('div', null, children);
  });

  const CuboidCollider = forwardRef((props: any, ref: any) => {
    const handle = { userData: {} };
    useImperativeHandle(ref, () => handle, []);
    return React.createElement(React.Fragment, null);
  });

  const BallCollider = forwardRef((props: any, ref: any) => {
    const handle = { userData: {} };
    useImperativeHandle(ref, () => handle, []);
    return React.createElement(React.Fragment, null);
  });

  const useRapier = () => ({});

  return {
    Physics,
    RigidBody,
    CuboidCollider,
    BallCollider,
    useRapier,
  };
});

// Provide a deterministic test implementation of useEcsQuery so tests don't
// depend on the real useSyncExternalStore logic. This mock connects the
// query on mount and returns the current query.entities snapshot.
vi.mock('../src/ecs/hooks', async () => {
  const React = await import('react');
  return {
    useEcsQuery: (query: any) => {
      const [ents, setEnts] = React.useState(() => Array.from(query.entities || []));
      React.useEffect(() => {
        const conn = query.connect?.();
        const onAdd = query.onEntityAdded?.subscribe?.(() => setEnts(Array.from(query.entities || [])));
        const onRem = query.onEntityRemoved?.subscribe?.(() => setEnts(Array.from(query.entities || [])));
        // Also update once in case entities were added before connect
        setEnts(Array.from(query.entities || []));
        return () => {
          onAdd?.();
          onRem?.();
          conn?.disconnect?.();
        };
      }, [query]);
      return ents;
    },
  };
});

// Mock the Robot prefab to set entity.render in a deterministic way and
// render a simple DOM node so we can assert it appeared. This lets the test
// verify that the visual prefab attached a render ref to the ECS entity.
vi.mock('../src/robots/robotPrefab', async () => {
  const React = await import('react');
  return {
    Robot: ({ entity }: any) => {
      React.useEffect(() => {
        entity.render = { mocked: true };
        return () => {
          if (entity.render && (entity.render as any).mocked) entity.render = null;
        };
      }, [entity]);
      return React.createElement('div', { 'data-testid': `robot-${String(entity.id)}` }, 'robot');
    },
  };
});

// Now import Simulation and the ECS world after mocking so imports resolve to mocks
import Simulation from '../src/components/Simulation';
import { world, resetWorld } from '../src/ecs/miniplexStore';

beforeEach(() => {
  resetWorld();
  vi.useRealTimers();
});

describe('Prefab mounting behavior', () => {
  it('Robot prefab attaches a rigid body handle to the entity', async () => {
    const { Robot } = await import('../src/robots/robotPrefab');

    const entity: any = { id: 123, team: 'red', position: [0, 0.6, 0], weapon: {}, weaponState: {} };

    render(React.createElement(Robot, { entity }));

    await waitFor(() => {
      expect(entity.rigid).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('Projectile prefab attaches both rigid body handle and render ref', async () => {
    const { Projectile } = await import('../src/components/Projectile');

    const entity: any = {
      id: 456,
      team: 'blue',
      position: [0, 1, 0],
      velocity: [1, 0, 0],
      projectile: { sourceWeaponId: 'w', spawnTime: 1 },
    };

    render(React.createElement(Projectile, { entity }));

    await waitFor(() => {
      expect(entity.rigid).toBeTruthy();
      expect(entity.render).toBeTruthy();
    }, { timeout: 1000 });
  });
});
