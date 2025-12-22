import { CheckboxField, NumberField } from './fields';
import type { FormState, MovementKind, ObstacleKind } from './types';

type Props = {
  form: FormState;
  updateForm: (patch: Partial<FormState>) => void;
  onSpawn: () => void;
};

export function ObstacleSpawnerForm({ form, updateForm, onSpawn }: Props) {
  return (
    <>
      <div className="obs-spawner-title">Obstacle Spawner</div>

      <div className="obs-spawner-grid-2 obs-spawner-mb-8">
        <label className="obs-spawner-label">
          <span>ID</span>
          <input
            aria-label="Obstacle id"
            className="obs-spawner-input"
            value={form.id}
            onChange={(e) => updateForm({ id: e.target.value })}
          />
        </label>

        <label className="obs-spawner-label">
          <span>Type</span>
          <select
            aria-label="Obstacle type"
            className="obs-spawner-input"
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as ObstacleKind;
              updateForm({
                type,
                blocksVision: type === 'hazard' ? false : form.blocksVision,
                blocksMovement: type === 'hazard' ? false : form.blocksMovement,
              });
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
        ].map((field) => (
          <NumberField
            key={field.key}
            label={field.label}
            aria={field.aria}
            value={field.value}
            onChange={(v) =>
              updateForm({ [field.key]: v } as unknown as Partial<FormState>)
            }
          />
        ))}

        {form.type !== 'hazard' ? (
          [
            {
              label: 'Half Width',
              aria: 'Half width',
              key: 'halfWidth',
              value: form.halfWidth,
            },
            {
              label: 'Half Depth',
              aria: 'Half depth',
              key: 'halfDepth',
              value: form.halfDepth,
            },
          ].map((field) => (
            <NumberField
              key={field.key}
              label={field.label}
              aria={field.aria}
              value={field.value}
              onChange={(v) =>
                updateForm({ [field.key]: v } as unknown as Partial<FormState>)
              }
            />
          ))
        ) : (
          <NumberField
            label="Radius"
            aria="Hazard radius"
            value={form.radius}
            onChange={(v) => updateForm({ radius: v })}
          />
        )}

        <CheckboxField
          label="Blocks vision"
          checked={form.blocksVision}
          disabled={form.type === 'hazard'}
          onChange={(next) => updateForm({ blocksVision: next })}
        />
        <CheckboxField
          label="Blocks movement"
          checked={form.blocksMovement}
          disabled={form.type === 'hazard'}
          onChange={(next) => updateForm({ blocksMovement: next })}
        />
      </div>

      {form.type !== 'hazard' ? (
        <div className="obs-spawner-stack obs-spawner-mb-8">
          <CheckboxField
            label="Movement pattern"
            checked={form.movementEnabled}
            onChange={(next) => updateForm({ movementEnabled: next })}
          />

          {form.movementEnabled ? (
            <>
              <label className="obs-spawner-label">
                <span>Pattern</span>
                <select
                  aria-label="Movement pattern"
                  className="obs-spawner-input"
                  value={form.movementKind}
                  onChange={(e) =>
                    updateForm({ movementKind: e.target.value as MovementKind })
                  }
                >
                  <option value="linear">Linear</option>
                  <option value="oscillate">Oscillate</option>
                  <option value="rotation">Rotation</option>
                </select>
              </label>

              {form.movementKind === 'rotation' ? (
                <div className="obs-spawner-grid-2">
                  <NumberField
                    label="Pivot X"
                    aria="Pivot X"
                    value={form.pivotX}
                    onChange={(v) => updateForm({ pivotX: v })}
                  />
                  <NumberField
                    label="Pivot Z"
                    aria="Pivot Z"
                    value={form.pivotZ}
                    onChange={(v) => updateForm({ pivotZ: v })}
                  />
                </div>
              ) : (
                <div className="obs-spawner-grid-2">
                  <NumberField
                    label="Start X"
                    aria="Start X"
                    value={form.startX}
                    onChange={(v) => updateForm({ startX: v })}
                  />
                  <NumberField
                    label="Start Z"
                    aria="Start Z"
                    value={form.startZ}
                    onChange={(v) => updateForm({ startZ: v })}
                  />
                  <NumberField
                    label="End X"
                    aria="End X"
                    value={form.endX}
                    onChange={(v) => updateForm({ endX: v })}
                  />
                  <NumberField
                    label="End Z"
                    aria="End Z"
                    value={form.endZ}
                    onChange={(v) => updateForm({ endZ: v })}
                  />
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
        <div className="obs-spawner-grid-2 obs-spawner-mb-8">
          <NumberField
            label="Period (ms)"
            aria="Hazard period"
            value={form.hazardPeriod}
            onChange={(v) => updateForm({ hazardPeriod: v })}
          />
          <NumberField
            label="Active (ms)"
            aria="Hazard active window"
            value={form.hazardActive}
            onChange={(v) => updateForm({ hazardActive: v })}
          />
          <NumberField
            label="Offset (ms)"
            aria="Hazard offset"
            value={form.hazardOffset}
            onChange={(v) => updateForm({ hazardOffset: v })}
          />
          <NumberField
            label="Damage /s"
            aria="Hazard damage"
            value={form.hazardDamage}
            onChange={(v) => updateForm({ hazardDamage: v })}
          />
        </div>
      )}

      {form.type === 'destructible' ? (
        <div className="obs-spawner-mb-8">
          <NumberField
            label="Durability"
            aria="Cover durability"
            value={form.durability}
            onChange={(v) => updateForm({ durability: v })}
          />
        </div>
      ) : null}

      <button
        type="button"
        className="obs-spawner-button obs-spawner-button--full obs-spawner-mb-12"
        onClick={onSpawn}
      >
        Spawn Obstacle
      </button>
    </>
  );
}
