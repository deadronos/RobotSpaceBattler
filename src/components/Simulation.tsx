import { useEffect, useState } from 'react';

import { spawnTeams } from '../ecs/systems/spawnSystem';
import { BattleWorld } from '../ecs/world';
import { TEAM_CONFIGS } from '../lib/teamConfig';
import { RobotPlaceholder } from './RobotPlaceholder';
import { Scene } from './Scene';

interface SimulationProps {
  battleWorld: BattleWorld;
}

function toArrayPosition(position: { x: number; y: number; z: number }): [number, number, number] {
  return [position.x, position.y, position.z];
}

export function Simulation({ battleWorld }: SimulationProps) {
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (battleWorld.robots.entities.length === 0) {
      spawnTeams(battleWorld, { seed: 1337 });
    }
    setVersion((value) => value + 1);
  }, [battleWorld]);

  const placeholders = battleWorld.robots.entities.map((robot) => ({
    id: robot.id,
    team: robot.team,
    position: toArrayPosition(robot.position),
  }));

  return (
    <Scene>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial color="#1b1f3b" />
      </mesh>
      {placeholders.map((placeholder) => (
        <RobotPlaceholder
          key={placeholder.id}
          color={TEAM_CONFIGS[placeholder.team].color}
          position={[placeholder.position[0], 0.8, placeholder.position[2]]}
        />
      ))}
    </Scene>
  );
}
