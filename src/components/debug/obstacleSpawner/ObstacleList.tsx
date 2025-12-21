import type { ObstacleEntity } from '../../../ecs/world';

type Props = {
  obstacles: ObstacleEntity[];
  toggleActive: (id: string) => void;
  nudge: (id: string, dx: number, dz: number) => void;
  removeObstacle: (id: string) => void;
};

export function ObstacleList({
  obstacles,
  toggleActive,
  nudge,
  removeObstacle,
}: Props) {
  return (
    <>
      <div className="obs-spawner-list-title">Existing obstacles ({obstacles.length})</div>
      <div className="obs-spawner-list">
        {obstacles.map((obs) => (
          <div key={obs.id} className="obs-spawner-row">
            <div>
              <div className="obs-spawner-row-title">{obs.id}</div>
              <div className="obs-spawner-row-meta">
                {obs.obstacleType} · ({obs.position?.x.toFixed(1) ?? 0},{' '}
                {obs.position?.z.toFixed(1) ?? 0})
              </div>
            </div>

            <div className="obs-spawner-row-actions">
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => toggleActive(obs.id)}
              >
                {obs.active === false ? 'Activate' : 'Pause'}
              </button>
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => nudge(obs.id, -1, 0)}
              >
                ←
              </button>
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => nudge(obs.id, 1, 0)}
              >
                →
              </button>
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => nudge(obs.id, 0, -1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => nudge(obs.id, 0, 1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="obs-spawner-input"
                onClick={() => removeObstacle(obs.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
