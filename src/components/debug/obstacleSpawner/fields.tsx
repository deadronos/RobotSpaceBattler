import { toNumber } from './formUtils';
import type { FormState } from './types';

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  aria: string;
};

export function NumberField({ label, value, onChange, aria }: NumberFieldProps) {
  return (
    <label className="obs-spawner-label">
      <span>{label}</span>
      <input
        aria-label={aria}
        type="number"
        className="obs-spawner-input"
        value={value}
        onChange={(e) => onChange(toNumber(e.target.value, value))}
      />
    </label>
  );
}

type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: CheckboxFieldProps) {
  return (
    <label className="obs-spawner-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export type { FormState };
