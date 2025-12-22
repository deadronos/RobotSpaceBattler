import type { ChangeEvent } from 'react';

type Props = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  aria: string;
};

export function NumberInput({ label, value, onChange, aria }: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    onChange(Number.isFinite(next) ? next : value);
  };

  return (
    <label className="obstacle-inspector-field">
      <span>{label}</span>
      <input
        aria-label={aria}
        type="number"
        className="obstacle-inspector-input"
        value={value}
        onChange={handleChange}
      />
    </label>
  );
}
