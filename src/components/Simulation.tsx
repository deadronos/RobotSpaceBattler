import { useFrame } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';

import { BattleWorld } from '../ecs/world';
import { TEAM_CONFIGS } from '../lib/teamConfig';
import { BattleRunner, createBattleRunner } from '../runtime/simulation/battleRunner';
import { TelemetryPort } from '../runtime/simulation/ports';
import { MatchStateMachine } from '../runtime/state/matchStateMachine';
import { useQualitySettings } from '../state/quality/QualityManager';
import { recordRendererFrame } from '../visuals/rendererStats';
import { RobotPlaceholder } from './RobotPlaceholder';
import { Scene } from './Scene';
import { SpaceStation } from './SpaceStation';
import { EffectVisual } from './vfx/EffectVisual';
import { ProjectileVisual } from './vfx/ProjectileVisual';
import { InstancedEffects } from './vfx/InstancedEffects';
import { InstancedProjectiles } from './vfx/InstancedProjectiles';
import { LaserBatchRenderer } from './vfx/LaserBatchRenderer';

interface SimulationProps {
  battleWorld: BattleWorld;
  matchMachine: MatchStateMachine;
  telemetry: TelemetryPort;
  onRunnerReady?: (runner: BattleRunner) => void;
}

const FRAME_SAMPLE_INTERVAL = 1 / 30;

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
  const qualitySettings = useQualitySettings();
  const instancingEnabled = qualitySettings.visuals.instancing.enabled;
  const instanceManager = battleWorld.visuals.instanceManager;

  useFrame((state, delta) => {
    recordRendererFrame(state.gl, delta);
    runnerRef.current?.step(delta);
    accumulator.current += delta;
    if (accumulator.current >= FRAME_SAMPLE_INTERVAL) {
      accumulator.current = 0;
      setVersion((value) => value + 1);
    }
  });

  const robots = battleWorld.robots.entities;
  const projectiles = battleWorld.projectiles.entities;
  const effects = battleWorld.effects.entities;
  const robotsById = useMemo(() => new Map(robots.map((robot) => [robot.id, robot])), [robots]);
  const currentTimeMs = battleWorld.state.elapsedMs;
  const fallbackProjectiles = useMemo(() => {
    if (!instancingEnabled) {
      return projectiles;
    }
    return projectiles.filter((projectile) => projectile.instanceIndex === undefined);
  }, [projectiles, instancingEnabled]);
  const fallbackEffects = useMemo(() => {
    if (!instancingEnabled) {
      return effects;
    }
    return effects.filter((effect) => effect.instanceIndex === undefined);
  }, [effects, instancingEnabled]);

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
      {instancingEnabled ? (
        <>
          <InstancedProjectiles projectiles={projectiles} instanceManager={instanceManager} />
          <LaserBatchRenderer
            projectiles={projectiles}
            robotsById={robotsById}
            instanceManager={instanceManager}
          />
          <InstancedEffects
            effects={effects}
            instanceManager={instanceManager}
            currentTimeMs={currentTimeMs}
          />
        </>
      ) : null}
      {fallbackProjectiles.map((projectile) => (
        <ProjectileVisual
          key={projectile.id}
          projectile={projectile}
          shooter={robotsById.get(projectile.shooterId)}
          target={projectile.targetId ? robotsById.get(projectile.targetId) : undefined}
        />
      ))}
      {fallbackEffects.map((effect) => (
        <EffectVisual key={effect.id} effect={effect} currentTimeMs={currentTimeMs} />
      ))}
    </>
  );
}
