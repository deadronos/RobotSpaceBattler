import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
// We will let the test renderer host the R3F tree instead of creating a Canvas element
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
        setLinvel: () => {},
      }));
      return React.createElement('group', props, props.children);
    }),
    CuboidCollider: (props: any) => React.createElement('group', props),
    BallCollider: (props: any) => React.createElement('group', props),
    useRapier: () => ({}),
  };
});

import { Physics } from '@react-three/rapier';
import Simulation from '../src/components/Simulation';
import { resetAndSpawnDefaultTeams } from '../src/robots/spawnControls';
import { useUI } from '../src/store/uiStore';

function UnpausedScene() {
  const setPaused = useUI((s) => s.setPaused);
  React.useEffect(() => setPaused(false), [setPaused]);
  return (
    <group>
      <ambientLight intensity={0.3} />
      <Physics gravity={[0, -9.81, 0]} paused={false} updateLoop="follow" timeStep={1 / 60}>
        <Simulation renderFloor={false} />
      </Physics>
    </group>
  );
}

describe('R3F Simulation render (headless)', () => {
  beforeEach(() => {
    resetAndSpawnDefaultTeams();
  });

  it('contains at least one RobotMesh after boot', async () => {
  const renderer = await create(<UnpausedScene />);

    await renderer.advanceFrames(5, 16);

    // Use the SceneGraph view to search by name
    const graph = renderer.toGraph() || [];
    const stack = [...graph];
    let robotCount = 0;
    while (stack.length) {
      const node = stack.pop() as any;
      if (node?.name === 'RobotMesh') robotCount += 1;
      if (node?.children) stack.push(...node.children);
    }
    expect(robotCount).toBeGreaterThan(0);

    await renderer.unmount();
  });
});
