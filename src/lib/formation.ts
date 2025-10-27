export interface FormationOffset {
  x: number;
  z: number;
}

export interface FormationLayoutOptions {
  rows?: number;
  spacing?: number;
}

const DEFAULT_ROWS = 2;
const DEFAULT_SPACING = 2.4;

export function getGridFormationOffset(
  index: number,
  total: number,
  options: FormationLayoutOptions = {},
): FormationOffset {
  const rows = options.rows ?? DEFAULT_ROWS;
  const spacing = options.spacing ?? DEFAULT_SPACING;

  if (total <= 0) {
    return { x: 0, z: 0 };
  }

  const columns = Math.max(1, Math.ceil(total / rows));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const centeredColumn = column - (columns - 1) / 2;

  return {
    x: centeredColumn * spacing,
    z: row * spacing,
  };
}

export function getRingFormationOffset(
  index: number,
  total: number,
  radius: number,
): FormationOffset {
  const count = Math.max(1, total);
  const angle = (index / count) * Math.PI * 2;

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}
