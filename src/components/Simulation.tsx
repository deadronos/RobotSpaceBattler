import { useFrame } from '@react-three/fiber';
import { MutableRefObject, useEffect, useRef, useState } from 'react';

import { BattleWorld } from '../ecs/world';
import { TEAM_CONFIGS } from '../lib/teamConfig';
import { BattleRunner, createBattleRunner } from '../runtime/simulation/battleRunner';
import { TelemetryPort } from '../runtime/simulation/ports';
import { MatchStateMachine } from '../runtime/state/matchStateMachine';
import { RobotPlaceholder } from './RobotPlaceholder';
import { Scene } from './Scene';
import { SpaceStation } from './SpaceStation';

interface SimulationProps {
  battleWorld: BattleWorld;
  matchMachine: MatchStateMachine;
  telemetry: TelemetryPort;
  onRunnerReady?: (runner: BattleRunner) => void;
}

const FRAME_SAMPLE_INTERVAL = 1 / 30;

function vecToArray(position: { x: number; y: number; z: number }): [number, number, number] {
  return [position.x, position.y, position.z];
}

export function Simulation({
  battleWorld,
  matchMachine,
  telemetry,
  onRunnerReady,
}: SimulationProps) {
  const runnerRef = useRef<BattleRunner | null>(null);

  useEffect(() => {
    const runner = createBattleRunner(battleWorld, {
      seed: battleWorld.state.seed,
      matchMachine,
      telemetry,
    });

    runnerRef.current = runner;
    onRunnerReady?.(runner);

    return () => {
      runnerRef.current = null;
    };
  }, [battleWorld, matchMachine, telemetry, onRunnerReady]);

  return (
    <Scene>
      <SimulationContent battleWorld={battleWorld} runnerRef={runnerRef} />
    </Scene>
  );
}

interface SimulationContentProps {
  battleWorld: BattleWorld;
  runnerRef: MutableRefObject<BattleRunner | null>;
}

function SimulationContent({ battleWorld, runnerRef }: SimulationContentProps) {
  const [, setVersion] = useState(0);
  const accumulator = useRef(0);

  useFrame((_, delta) => {
    runnerRef.current?.step(delta);
    accumulator.current += delta;
    if (accumulator.current >= FRAME_SAMPLE_INTERVAL) {
      accumulator.current = 0;
      setVersion((value) => value + 1);
    }
  });

  const robots = battleWorld.robots.entities;
  const projectiles = battleWorld.projectiles.entities;

  return (
    <>
      <SpaceStation />
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
    </>
  );
}
