import { useState } from 'react';

import { BattleWorld, ObstacleEntity } from '../../ecs/world';
import {
  exportObstacleFixture,
  parseObstacleFixture,
  replaceObstaclesFromFixture,
  serializeObstacleFixture,
} from '../../ui/fixtureLoader';
import { ObstacleInspector } from '../../ui/inspector/ObstacleInspector';

const styles: Record<string, React.CSSProperties> = {
  panel: { background: 'rgba(8, 10, 22, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#e9ecff', padding: 12, borderRadius: 10, maxWidth: 420, boxShadow: '0 12px 28px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', gap: 10 },
  input: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.06)', color: '#f8f9ff', fontSize: 12 },
  button: { padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #7ae0ff, #5f7bff)', color: '#0b1024', fontWeight: 700, fontSize: 12 },
};

interface ObstacleEditorProps {
  world: BattleWorld;
  sampleFixture?: ReturnType<typeof exportObstacleFixture>;
}

export function ObstacleEditor({ world, sampleFixture }: ObstacleEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fixtureText, setFixtureText] = useState(() => serializeObstacleFixture(exportObstacleFixture(world)));
  const [status, setStatus] = useState<string | null>(null);

  const obstacles = world.obstacles.entities;
  const selected = obstacles.find((o) => o.id === selectedId) ?? null;

  const selectFirstIfMissing = () => {
    if (!selectedId && obstacles.length > 0) setSelectedId(obstacles[0].id);
  };

  const handleUpdate = (next: ObstacleEntity) => {
    const prev = obstacles.find((o) => o.id === next.id);
    if (prev) world.world.remove(prev);
    world.world.add(next);
    setSelectedId(next.id);
    setStatus('Updated obstacle');
  };

  const handleRemove = (id: string) => {
    const obs = obstacles.find((o) => o.id === id);
    if (obs) world.world.remove(obs);
    setSelectedId(null);
    setStatus('Removed obstacle');
    selectFirstIfMissing();
  };

  const exportFixture = () => {
    const fixture = exportObstacleFixture(world);
    setFixtureText(serializeObstacleFixture(fixture));
    setStatus('Exported current obstacles');
  };

  const applyFixtureText = () => {
    try {
      const fixture = parseObstacleFixture(fixtureText);
      replaceObstaclesFromFixture(world, fixture);
      setStatus('Applied fixture');
      setSelectedId(null);
      setFixtureText(serializeObstacleFixture(fixture));
      selectFirstIfMissing();
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const loadSample = () => {
    if (!sampleFixture) return;
    replaceObstaclesFromFixture(world, sampleFixture);
    setFixtureText(serializeObstacleFixture(sampleFixture));
    setSelectedId(null);
    setStatus('Loaded sample fixture');
    selectFirstIfMissing();
  };

  const copyFixture = async () => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(fixtureText);
    setStatus('Copied fixture JSON');
  };

  return (
    <div style={styles.panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>Obstacle Editor</div>
        <button type="button" style={styles.button} onClick={exportFixture}>
          Export
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>Obstacles ({obstacles.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {obstacles.map((obs) => (
              <button
                key={obs.id}
                type="button"
                style={{
                  ...styles.input,
                  background: selectedId === obs.id ? 'rgba(127, 200, 255, 0.25)' : 'rgba(255,255,255,0.04)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedId(obs.id)}
              >
                {obs.id} · {obs.obstacleType}
              </button>
            ))}
            {obstacles.length === 0 ? <div style={{ fontSize: 12, opacity: 0.6 }}>No obstacles in world.</div> : null}
          </div>
        </div>
        <div style={{ minHeight: 180 }}>
          <ObstacleInspector obstacle={selected} onChange={handleUpdate} onRemove={handleRemove} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" style={styles.button} onClick={applyFixtureText}>
          Apply JSON
        </button>
        {sampleFixture ? (
          <button type="button" style={{ ...styles.button, background: 'linear-gradient(135deg, #9cffc7, #5bcc9c)' }} onClick={loadSample}>
            Load Sample
          </button>
        ) : null}
        <button type="button" style={{ ...styles.button, background: 'linear-gradient(135deg, #ffc97a, #ff8f5f)' }} onClick={copyFixture}>
          Copy JSON
        </button>
      </div>

      <textarea
        aria-label="Fixture JSON"
        style={{ ...styles.input, minHeight: 120, width: '100%', fontFamily: 'monospace' }}
        value={fixtureText}
        onChange={(e) => setFixtureText(e.target.value)}
      />

      {status ? <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div> : null}
    </div>
  );
}
