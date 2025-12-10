import { useMemo } from 'react';

import { ObstacleEntity } from '../../ecs/world';
import { vec3 } from '../../lib/math/vec3';

interface ObstacleInspectorProps {
  obstacle: ObstacleEntity | null;
  onChange: (next: ObstacleEntity) => void;
  onRemove?: (id: string) => void;
}

type MovementMode = 'none' | 'linear' | 'oscillate' | 'rotation';

const fieldStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.06)', color: '#f8f9ff', fontSize: 12,
};

type NumberInputProps = { label: string; value: number; onChange: (next: number) => void; aria: string };
function NumberInput({ label, value, onChange, aria }: NumberInputProps) {
  return (
    <label style={fieldStyle}>
      <span>{label}</span>
      <input aria-label={aria} type="number" style={inputStyle} value={value} onChange={(e) => onChange(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : value)} />
    </label>
  );
}

export function ObstacleInspector({ obstacle, onChange, onRemove }: ObstacleInspectorProps) {
  const movementKind = useMemo<MovementMode>(
    () => (obstacle?.movementPattern?.patternType as MovementMode) ?? 'none',
    [obstacle],
  );

  if (!obstacle) {
    return <div style={{ fontSize: 12, opacity: 0.7 }}>Select an obstacle to edit.</div>;
  }

  const apply = (patch: Partial<ObstacleEntity>) => onChange({ ...obstacle, ...patch });
  const box = obstacle.shape?.kind === 'box' ? obstacle.shape : { kind: 'box', halfWidth: 1, halfDepth: 1 };
  const circle = obstacle.shape?.kind === 'circle' ? obstacle.shape : { kind: 'circle', radius: 1.5 };

  const updateMovementKind = (mode: MovementMode) => {
    if (mode === 'none') {
      apply({ movementPattern: null });
      return;
    }
    if (mode === 'rotation') {
      apply({
        movementPattern: {
          patternType: 'rotation',
          pivot: vec3(obstacle.position?.x ?? 0, 0, obstacle.position?.z ?? 0),
          speed: 1,
          loop: true,
        },
      });
      return;
    }
    apply({
      movementPattern: {
        patternType: mode === 'oscillate' ? 'oscillate' : 'linear',
        points: [
          vec3(obstacle.position?.x ?? 0, 0, obstacle.position?.z ?? 0),
          vec3((obstacle.position?.x ?? 0) + 2, 0, obstacle.position?.z ?? 0),
        ],
        speed: 1,
        loop: true,
        pingPong: mode === 'oscillate',
      },
    });
  };

  const updatePoint = (index: 0 | 1, axis: 'x' | 'z', value: number) => {
    if (!obstacle.movementPattern || !obstacle.movementPattern.points) return;
    const pts = [...obstacle.movementPattern.points];
    pts[index] = { ...pts[index], [axis]: value };
    apply({ movementPattern: { ...obstacle.movementPattern, points: pts } });
  };

  const movement = obstacle.movementPattern;
  const setMovement = (next: typeof movement) => apply({ movementPattern: next ?? undefined });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Inspector — {obstacle.id}</div>
        {onRemove ? (
          <button
            type="button"
            style={{ ...inputStyle, cursor: 'pointer' }}
            onClick={() => onRemove(obstacle.id)}
          >
            Remove
          </button>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <NumberInput label="Pos X" aria="Position X" value={obstacle.position?.x ?? 0} onChange={(v) => apply({ position: vec3(v, obstacle.position?.y ?? 0, obstacle.position?.z ?? 0) })} />
        <NumberInput label="Pos Z" aria="Position Z" value={obstacle.position?.z ?? 0} onChange={(v) => apply({ position: vec3(obstacle.position?.x ?? 0, obstacle.position?.y ?? 0, v) })} />
        {obstacle.obstacleType !== 'hazard' ? (
          <>
            <NumberInput
              label="Half Width"
              aria="Half width"
              value={box.halfWidth}
              onChange={(v) => apply({ shape: { kind: 'box', halfWidth: v, halfDepth: box.halfDepth } })}
            />
            <NumberInput
              label="Half Depth"
              aria="Half depth"
              value={box.halfDepth}
              onChange={(v) => apply({ shape: { kind: 'box', halfWidth: box.halfWidth, halfDepth: v } })}
            />
          </>
        ) : (
          <NumberInput
            label="Radius"
            aria="Hazard radius"
            value={circle.radius}
            onChange={(v) => apply({ shape: { kind: 'circle', radius: v } })}
          />
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={obstacle.active !== false}
            onChange={(e) => apply({ active: e.target.checked })}
          />
          Active
        </label>
        {obstacle.obstacleType !== 'hazard' ? (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={obstacle.blocksVision !== false}
                onChange={(e) => apply({ blocksVision: e.target.checked })}
              />
              Blocks vision
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={obstacle.blocksMovement !== false}
                onChange={(e) => apply({ blocksMovement: e.target.checked })}
              />
              Blocks movement
            </label>
          </>
        ) : null}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Movement</div>
        <select aria-label="Movement pattern" style={inputStyle} value={movementKind} onChange={(e) => updateMovementKind(e.target.value as MovementMode)}>
          <option value="none">None</option>
          <option value="linear">Linear</option>
          <option value="oscillate">Oscillate</option>
          <option value="rotation">Rotation</option>
        </select>
        {movementKind === 'linear' || movementKind === 'oscillate' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <NumberInput label="Start X" aria="Start X" value={movement?.points?.[0]?.x ?? 0} onChange={(v) => updatePoint(0, 'x', v)} />
            <NumberInput label="Start Z" aria="Start Z" value={movement?.points?.[0]?.z ?? 0} onChange={(v) => updatePoint(0, 'z', v)} />
            <NumberInput label="End X" aria="End X" value={movement?.points?.[1]?.x ?? 0} onChange={(v) => updatePoint(1, 'x', v)} />
            <NumberInput label="End Z" aria="End Z" value={movement?.points?.[1]?.z ?? 0} onChange={(v) => updatePoint(1, 'z', v)} />
          </div>
        ) : null}
        {movementKind === 'rotation' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <NumberInput
              label="Pivot X"
              aria="Pivot X"
              value={movement?.pivot?.x ?? obstacle.position?.x ?? 0}
              onChange={(v) => setMovement({ ...movement!, pivot: vec3(v, 0, movement?.pivot?.z ?? obstacle.position?.z ?? 0) })}
            />
            <NumberInput
              label="Pivot Z"
              aria="Pivot Z"
              value={movement?.pivot?.z ?? obstacle.position?.z ?? 0}
              onChange={(v) => setMovement({ ...movement!, pivot: vec3(movement?.pivot?.x ?? obstacle.position?.x ?? 0, 0, v) })}
            />
          </div>
        ) : null}
        {movementKind !== 'none' ? <div style={{ marginTop: 6 }}><NumberInput label="Speed" aria="Movement speed" value={movement?.speed ?? 1} onChange={(v) => setMovement({ ...movement!, speed: v })} /></div> : null}
      </div>

      {obstacle.obstacleType === 'hazard' ? (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Hazard schedule</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <NumberInput label="Period (ms)" aria="Hazard period" value={obstacle.hazardSchedule?.periodMs ?? 1000} onChange={(v) => apply({ hazardSchedule: { periodMs: v, activeMs: obstacle.hazardSchedule?.activeMs ?? 500, offsetMs: obstacle.hazardSchedule?.offsetMs ?? 0 } })} />
            <NumberInput label="Active (ms)" aria="Hazard active" value={obstacle.hazardSchedule?.activeMs ?? 500} onChange={(v) => apply({ hazardSchedule: { periodMs: obstacle.hazardSchedule?.periodMs ?? 1000, activeMs: v, offsetMs: obstacle.hazardSchedule?.offsetMs ?? 0 } })} />
            <NumberInput label="Offset (ms)" aria="Hazard offset" value={obstacle.hazardSchedule?.offsetMs ?? 0} onChange={(v) => apply({ hazardSchedule: { periodMs: obstacle.hazardSchedule?.periodMs ?? 1000, activeMs: obstacle.hazardSchedule?.activeMs ?? 500, offsetMs: v } })} />
            <NumberInput label="Damage /s" aria="Hazard damage" value={obstacle.hazardEffects?.[0]?.amount ?? 0} onChange={(v) => apply({ hazardEffects: [{ kind: 'damage', amount: v, perSecond: true }] })} />
          </div>
        </div>
      ) : null}

      {obstacle.obstacleType === 'destructible' ? (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Durability</div>
          <NumberInput
            label="Durability"
            aria="Durability"
            value={obstacle.durability ?? obstacle.maxDurability ?? 10}
            onChange={(v) => apply({ durability: v, maxDurability: obstacle.maxDurability ?? v })}
          />
        </div>
      ) : null}
    </div>
  );
}
