import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';

import { BattleWorld } from '../ecs/world';
import { TEAM_CONFIGS } from '../lib/teamConfig';
import { BattleRunner, createBattleRunner } from '../runtime/simulation/battleRunner';
import { TelemetryPort } from '../runtime/simulation/ports';
import { MatchStateMachine } from '../runtime/state/matchStateMachine';
import { RobotPlaceholder } from './RobotPlaceholder';
import { Scene } from './Scene';

interface SimulationProps {
  battleWorld: BattleWorld;
  matchMachine: MatchStateMachine;
  telemetry: TelemetryPort;
  onRunnerReady?: (runner: BattleRunner) => void;
}

function vecToArray(position: { x: number; y: number; z: number }): [number, number, number] {
  return [position.x, position.y, position.z];
}

export function Simulation({
  battleWorld,
  matchMachine,
  telemetry,
  onRunnerReady,
}: SimulationProps) {
  const [, setVersion] = useState(0);
  const runnerRef = useRef<BattleRunner | null>(null);
  const accumulator = useRef(0);

  const runner = useMemo(
    () =>
      createBattleRunner(battleWorld, {
        seed: battleWorld.state.seed,
        matchMachine,
        telemetry,
      }),
    [battleWorld, matchMachine, telemetry],
  );

  useEffect(() => {
    runnerRef.current = runner;
    onRunnerReady?.(runner);
    return () => {
      runnerRef.current = null;
    };
  }, [runner, onRunnerReady]);

  useFrame((_, delta) => {
    runnerRef.current?.step(delta);
    accumulator.current += delta;
    if (accumulator.current >= 1 / 30) {
      accumulator.current = 0;
      setVersion((value) => value + 1);
    }
  });

  const robots = battleWorld.robots.entities;
  const projectiles = battleWorld.projectiles.entities;

  return (
    <Scene>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial color="#1b1f3b" />
      </mesh>
      {robots.map((robot) => (
        <RobotPlaceholder
          key={robot.id}
          color={TEAM_CONFIGS[robot.team].color}
          position={[robot.position.x, 0.8, robot.position.z]}
        />
      ))}
      {projectiles.map((projectile) => (
        <mesh key={projectile.id} position={vecToArray(projectile.position)} castShadow>
          <sphereGeometry args={[0.25, 8, 8]} />
          <meshStandardMaterial color="#ffd966" emissive="#ffdd88" emissiveIntensity={1.6} />
        </mesh>
      ))}
    </Scene>
  );
}
