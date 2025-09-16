import React from 'react';

import { world } from '../../ecs/miniplexStore';
import { resetAndSpawnDefaultTeams, spawnRobot, spawnTeam } from '../../robots/spawnControls';

const RED_LOADOUT = ['gun', 'laser', 'rocket'] as const;
const BLUE_LOADOUT = ['rocket', 'gun', 'laser'] as const;
const REINFORCEMENT_COUNT = 3;

export default function DevDiagnostics() {
  const [counts, setCounts] = React.useState({
    entities: 0,
    red: 0,
    blue: 0,
  });

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const robots = world.entities.filter((entity) =>
        Boolean((entity as { weaponState?: unknown }).weaponState)
      );
      const red = robots.filter((entity) => entity.team === 'red').length;
      const blue = robots.filter((entity) => entity.team === 'blue').length;

      setCounts({
        entities: world.entities.length,
        red,
        blue,
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="ui dev">
      <span>Entities: {counts.entities}</span>
      <span>
        Robots - Red: {counts.red} | Blue: {counts.blue}
      </span>
      <div className="controls">
        <button type="button" onClick={() => spawnRobot('red', 'gun')}>
          + Red Gunner
        </button>
        <button type="button" onClick={() => spawnRobot('red', 'laser')}>
          + Red Laser
        </button>
        <button type="button" onClick={() => spawnRobot('red', 'rocket')}>
          + Red Rocket
        </button>
      </div>
      <div className="controls">
        <button type="button" onClick={() => spawnRobot('blue', 'rocket')}>
          + Blue Rocket
        </button>
        <button type="button" onClick={() => spawnRobot('blue', 'gun')}>
          + Blue Gunner
        </button>
        <button type="button" onClick={() => spawnRobot('blue', 'laser')}>
          + Blue Laser
        </button>
      </div>
      <div className="controls">
        <button
          type="button"
          onClick={() => spawnTeam('red', [...RED_LOADOUT], REINFORCEMENT_COUNT)}
        >
          Red reinforcements x{REINFORCEMENT_COUNT}
        </button>
        <button
          type="button"
          onClick={() => spawnTeam('blue', [...BLUE_LOADOUT], REINFORCEMENT_COUNT)}
        >
          Blue reinforcements x{REINFORCEMENT_COUNT}
        </button>
        <button type="button" onClick={() => resetAndSpawnDefaultTeams()}>
          Reset match
        </button>
      </div>
    </div>
  );
}



