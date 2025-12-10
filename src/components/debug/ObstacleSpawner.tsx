import { useMemo, useState } from 'react';
import { BattleWorld, ObstacleEntity } from '../../ecs/world';
import { vec3 } from '../../lib/math/vec3';
import {
  syncObstaclesToRapier,
  updateRapierObstacleTransforms,
} from '../../simulation/obstacles/rapierIntegration';
type ObstacleKind = 'barrier' | 'hazard' | 'destructible';
type MovementKind = 'none' | 'linear' | 'oscillate' | 'rotation';
interface FormState {
  id: string;
  counter: number;
  type: ObstacleKind;
  posX: number;
  posZ: number;
  halfWidth: number;
  halfDepth: number;
  radius: number;
  blocksVision: boolean;
  blocksMovement: boolean;
  active: boolean;
  movementEnabled: boolean;
  movementKind: MovementKind;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  pivotX: number;
  pivotZ: number;
  movementSpeed: number;
  hazardPeriod: number;
  hazardActive: number;
  hazardOffset: number;
  hazardDamage: number;
  durability: number;
}
const styles: Record<string, React.CSSProperties> = {
  panel: { background: 'rgba(8, 10, 22, 0.82)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#e9ecff', padding: 12, borderRadius: 10, maxWidth: 360, boxShadow: '0 12px 28px rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' },
  label: { fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  input: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.06)', color: '#f8f9ff', fontSize: 12 },
  button: { padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4c7bff, #7cd2ff)', color: '#0b1024', fontWeight: 700 },
};
const toNumber = (value: string, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
function nextId(base: string, existing: Set<string>, counter: number): string {
  const trimmed = base.trim() || `debug-obstacle-${counter}`;
  if (!existing.has(trimmed)) return trimmed;
  let idx = counter;
  let candidate = `${trimmed}-${idx}`;
  while (existing.has(candidate)) { idx += 1; candidate = `${trimmed}-${idx}`; }
  return candidate;
}
function buildObstacle(form: FormState, existingIds: Set<string>): ObstacleEntity {
  const id = nextId(form.id, existingIds, form.counter);
  const base: ObstacleEntity = {
    id,
    kind: 'obstacle',
    obstacleType: form.type,
    position: vec3(form.posX, 0, form.posZ),
    blocksVision: form.type === 'hazard' ? false : form.blocksVision,
    blocksMovement: form.type === 'hazard' ? false : form.blocksMovement,
    active: form.type === 'hazard' ? false : form.active,
  };
  if (form.type === 'hazard') {
    base.shape = { kind: 'circle', radius: Math.max(0.1, form.radius) };
    base.hazardSchedule = { periodMs: Math.max(1, form.hazardPeriod), activeMs: Math.max(0, form.hazardActive), offsetMs: form.hazardOffset };
    base.hazardEffects = [{ kind: 'damage', amount: Math.max(0, form.hazardDamage), perSecond: true }];
    return base;
  }
  base.shape = { kind: 'box', halfWidth: Math.max(0.1, form.halfWidth), halfDepth: Math.max(0.1, form.halfDepth) };
  if (form.type === 'destructible') {
    base.durability = Math.max(1, form.durability);
    base.maxDurability = Math.max(1, form.durability);
  }
  if (form.movementEnabled && form.movementKind !== 'none') {
    base.movementPattern =
      form.movementKind === 'rotation'
        ? { patternType: 'rotation', pivot: vec3(form.pivotX, 0, form.pivotZ), speed: form.movementSpeed, loop: true }
        : {
            patternType: form.movementKind === 'oscillate' ? 'oscillate' : 'linear',
            points: [vec3(form.startX, 0, form.startZ), vec3(form.endX, 0, form.endZ)],
            speed: form.movementSpeed,
            loop: true,
            pingPong: form.movementKind === 'oscillate',
          };
  }
  return base;
}
type NumberFieldProps = { label: string; value: number; onChange: (v: number) => void; aria: string };
function NumberField({ label, value, onChange, aria }: NumberFieldProps) {
  return (
    <label style={styles.label}>
      <span>{label}</span>
      <input aria-label={aria} type="number" style={styles.input} value={value} onChange={(e) => onChange(toNumber(e.target.value, value))} />
    </label>
  );
}
type CheckboxFieldProps = { label: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean };
function CheckboxField({ label, checked, onChange, disabled }: CheckboxFieldProps) {
  return (
    <label style={{ ...styles.label, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
interface ObstacleSpawnerProps {
  world: BattleWorld;
  onSpawn?: (obstacle: ObstacleEntity) => void;
}
const initialForm: FormState = {
  id: 'debug-obstacle-1',
  counter: 1,
  type: 'barrier',
  posX: 0, posZ: 0, halfWidth: 1, halfDepth: 1, radius: 3,
  blocksVision: true, blocksMovement: true, active: true,
  movementEnabled: false, movementKind: 'none',
  startX: -2, startZ: 0, endX: 2, endZ: 0,
  pivotX: 0, pivotZ: 0, movementSpeed: 2,
  hazardPeriod: 2500, hazardActive: 800, hazardOffset: 0, hazardDamage: 4,
  durability: 8,
};
export function ObstacleSpawner({ world, onSpawn }: ObstacleSpawnerProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [, forceRefresh] = useState(0);
  const obstacles = useMemo(() => world.obstacles.entities, [world, world.state.frameIndex, form.id, form.counter]);
  const updateForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));
  const refresh = () => forceRefresh((v) => v + 1);
  const handleSpawn = () => {
    const obstacle = buildObstacle(form, new Set(obstacles.map((o) => o.id)));
    world.world.add(obstacle);
    syncObstaclesToRapier(world);
    onSpawn?.(obstacle);
    updateForm({ id: `debug-obstacle-${form.counter + 1}`, counter: form.counter + 1 });
    refresh();
  };
  const toggleActive = (id: string) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;
    obs.active = !obs.active;
    updateRapierObstacleTransforms(world);
    refresh();
  };
  const nudge = (id: string, dx: number, dz: number) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;
    const pos = obs.position ?? vec3();
    obs.position = vec3(pos.x + dx, pos.y ?? 0, pos.z + dz);
    updateRapierObstacleTransforms(world);
    refresh();
  };
  const removeObstacle = (id: string) => {
    const obs = obstacles.find((o) => o.id === id);
    if (!obs) return;
    world.world.remove(obs);
    refresh();
  };
  return (
    <div style={styles.panel}>
      <div style={{ fontWeight: 700, marginBottom: 8, letterSpacing: 0.2 }}>Obstacle Spawner</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <label style={styles.label}>
          <span>ID</span>
          <input aria-label="Obstacle id" style={styles.input} value={form.id} onChange={(e) => updateForm({ id: e.target.value })} />
        </label>
        <label style={styles.label}>
          <span>Type</span>
          <select
            aria-label="Obstacle type"
            style={styles.input}
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as ObstacleKind;
              updateForm({ type, blocksVision: type === 'hazard' ? false : form.blocksVision, blocksMovement: type === 'hazard' ? false : form.blocksMovement });
            }}
          >
            <option value="barrier">Barrier</option>
            <option value="hazard">Hazard</option>
            <option value="destructible">Destructible</option>
          </select>
        </label>
        {[
          { label: 'Pos X', aria: 'Position X', key: 'posX', value: form.posX },
          { label: 'Pos Z', aria: 'Position Z', key: 'posZ', value: form.posZ },
        ].map((f) => (
          <NumberField key={f.key} label={f.label} aria={f.aria} value={f.value} onChange={(v) => updateForm({ [f.key]: v } as Partial<FormState>)} />
        ))}
        {form.type !== 'hazard'
          ? [
              { label: 'Half Width', aria: 'Half width', key: 'halfWidth', value: form.halfWidth },
              { label: 'Half Depth', aria: 'Half depth', key: 'halfDepth', value: form.halfDepth },
            ].map((f) => (
              <NumberField key={f.key} label={f.label} aria={f.aria} value={f.value} onChange={(v) => updateForm({ [f.key]: v } as Partial<FormState>)} />
            ))
          : (
            <NumberField label="Radius" aria="Hazard radius" value={form.radius} onChange={(v) => updateForm({ radius: v })} />
            )}
        <CheckboxField label="Blocks vision" checked={form.blocksVision} disabled={form.type === 'hazard'} onChange={(next) => updateForm({ blocksVision: next })} />
        <CheckboxField label="Blocks movement" checked={form.blocksMovement} disabled={form.type === 'hazard'} onChange={(next) => updateForm({ blocksMovement: next })} />
      </div>
      {form.type !== 'hazard' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          <CheckboxField
            label="Movement pattern"
            checked={form.movementEnabled}
            onChange={(next) => updateForm({ movementEnabled: next })}
          />
          {form.movementEnabled ? (
            <>
              <label style={styles.label}>
                <span>Pattern</span>
                <select
                  aria-label="Movement pattern"
                  style={styles.input}
                  value={form.movementKind}
                  onChange={(e) => updateForm({ movementKind: e.target.value as MovementKind })}
                >
                  <option value="linear">Linear</option>
                  <option value="oscillate">Oscillate</option>
                  <option value="rotation">Rotation</option>
                </select>
              </label>
              {form.movementKind === 'rotation' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <NumberField label="Pivot X" aria="Pivot X" value={form.pivotX} onChange={(v) => updateForm({ pivotX: v })} />
                  <NumberField label="Pivot Z" aria="Pivot Z" value={form.pivotZ} onChange={(v) => updateForm({ pivotZ: v })} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <NumberField label="Start X" aria="Start X" value={form.startX} onChange={(v) => updateForm({ startX: v })} />
                  <NumberField label="Start Z" aria="Start Z" value={form.startZ} onChange={(v) => updateForm({ startZ: v })} />
                  <NumberField label="End X" aria="End X" value={form.endX} onChange={(v) => updateForm({ endX: v })} />
                  <NumberField label="End Z" aria="End Z" value={form.endZ} onChange={(v) => updateForm({ endZ: v })} />
                </div>
              )}
              <NumberField
                label="Speed"
                aria="Movement speed"
                value={form.movementSpeed}
                onChange={(v) => updateForm({ movementSpeed: v })}
              />
            </>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <NumberField label="Period (ms)" aria="Hazard period" value={form.hazardPeriod} onChange={(v) => updateForm({ hazardPeriod: v })} />
          <NumberField label="Active (ms)" aria="Hazard active window" value={form.hazardActive} onChange={(v) => updateForm({ hazardActive: v })} />
          <NumberField label="Offset (ms)" aria="Hazard offset" value={form.hazardOffset} onChange={(v) => updateForm({ hazardOffset: v })} />
          <NumberField label="Damage /s" aria="Hazard damage" value={form.hazardDamage} onChange={(v) => updateForm({ hazardDamage: v })} />
        </div>
      )}
      {form.type === 'destructible' ? (
        <div style={{ marginBottom: 8 }}>
          <NumberField label="Durability" aria="Cover durability" value={form.durability} onChange={(v) => updateForm({ durability: v })} />
        </div>
      ) : null}
      <button type="button" style={{ ...styles.button, width: '100%', marginBottom: 12 }} onClick={handleSpawn}>
        Spawn Obstacle
      </button>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>Existing obstacles ({obstacles.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
        {obstacles.map((obs) => (
          <div
            key={obs.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{obs.id}</div>
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                {obs.obstacleType} · ({obs.position?.x.toFixed(1) ?? 0}, {obs.position?.z.toFixed(1) ?? 0})
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button type="button" style={styles.input} onClick={() => toggleActive(obs.id)}>{obs.active === false ? 'Activate' : 'Pause'}</button>
              <button type="button" style={styles.input} onClick={() => nudge(obs.id, -1, 0)}>←</button>
              <button type="button" style={styles.input} onClick={() => nudge(obs.id, 1, 0)}>→</button>
              <button type="button" style={styles.input} onClick={() => nudge(obs.id, 0, -1)}>↓</button>
              <button type="button" style={styles.input} onClick={() => nudge(obs.id, 0, 1)}>↑</button>
              <button type="button" style={styles.input} onClick={() => removeObstacle(obs.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
