import React from 'react';

import type { Team } from '../../ecs/miniplexStore';
import { robotPrefabs } from '../../robots/prefabCatalog';
import { spawnRobot } from '../../robots/spawnControls';

const TEAMS: Team[] = ['red', 'blue'];

export default function PrefabsInspector() {
  const [team, setTeam] = React.useState<Team>('red');

  return (
    <div className="ui prefabs">
      <div className="prefabs-header">
        <h3>Robot Prefabs</h3>
        <div className="team-toggle" role="group" aria-label="Spawn team">
          {TEAMS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === team ? 'active' : ''}
              onClick={() => setTeam(value)}
            >
              {value === 'red' ? 'Red team' : 'Blue team'}
            </button>
          ))}
        </div>
      </div>
      <div className="prefab-list">
        {robotPrefabs.map((prefab) => (
          <article key={prefab.id} className="prefab-card">
            <header>
              <strong>{prefab.label}</strong>
              <span className="weapon-tag">{prefab.weaponType.toUpperCase()}</span>
            </header>
            <p>{prefab.summary}</p>
            <dl>
              <div>
                <dt>HP</dt>
                <dd>{prefab.stats.hp}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{prefab.stats.speed} m/s</dd>
              </div>
              <div>
                <dt>Range</dt>
                <dd>{prefab.stats.range} m</dd>
              </div>
              <div>
                <dt>Cooldown</dt>
                <dd>{prefab.stats.cooldown}s</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{prefab.stats.power}</dd>
              </div>
              {prefab.stats.accuracy !== undefined ? (
                <div>
                  <dt>Accuracy</dt>
                  <dd>{Math.round(prefab.stats.accuracy * 100)}%</dd>
                </div>
              ) : null}
            </dl>
            <button type="button" onClick={() => spawnRobot(team, prefab.weaponType)}>
              Spawn {team} {prefab.weaponType}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
