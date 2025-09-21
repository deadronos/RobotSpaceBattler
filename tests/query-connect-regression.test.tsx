import { describe, it, expect, beforeEach } from 'vitest';
import * as React from 'react';
import { create } from '@react-three/test-renderer';

// Mock rapier similar to other headless tests
vi.mock('@react-three/rapier', () => {
  const React = require('react');
  const Physics = ({ children }: any) => React.createElement('group', null, children);
  const RigidBody = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      translation: () => {
        const p = props.position ?? [0, 0, 0];
        return { x: p[0] ?? 0, y: p[1] ?? 0, z: p[2] ?? 0 };
      },
      setLinvel: () => {},
    }));
    return React.createElement('group', props, props.children);
  });
  const CuboidCollider = (props: any) => React.createElement('group', props);
  const BallCollider = (props: any) => React.createElement('group', props);
  const useRapier = () => ({});
  return { Physics, RigidBody, CuboidCollider, BallCollider, useRapier };
});

import { vi } from 'vitest';
import { Physics } from '@react-three/rapier';
import Simulation from '../src/components/Simulation';
import { resetAndSpawnDefaultTeams } from '../src/robots/spawnControls';
import { useUI } from '../src/store/uiStore';

// A parent component that spawns teams in a layout effect during mount.
// This simulates a synchronous-spawn-at-commit scenario that used to
// cause missed entity-added events if queries connected too late.
function SpawnerDuringMount() {
  React.useLayoutEffect(() => {
    // spawn synchronously during mount/commit
    resetAndSpawnDefaultTeams();
  }, []);
  return null;
}

function UnpausedScene() {
  const setPaused = useUI((s) => s.setPaused);
  React.useEffect(() => setPaused(false), [setPaused]);
  return (
    <group>
      <ambientLight intensity={0.3} />
      <Physics gravity={[0, -9.81, 0]} paused={false} updateLoop="follow" timeStep={1 / 60}>
        <SpawnerDuringMount />
        <Simulation renderFloor={false} />
      </Physics>
    </group>
  );
}

describe('ECS query connect regression', () => {
  beforeEach(() => {
    // Ensure a clean world before each test
    // Note: SpawnerDuringMount will repopulate during mount
  });

  it('renders RobotMesh nodes when spawns happen during mount', async () => {
    const renderer = await create(<UnpausedScene />);
    // advance a few frames to allow mounts
    await renderer.advanceFrames(6, 16);

    const graph = renderer.toGraph() || [];
    const stack = Array.isArray(graph) ? [...graph] : [graph];
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
