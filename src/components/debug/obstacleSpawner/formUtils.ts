export const toNumber = (value: string, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

export function nextId(base: string, existing: Set<string>, counter: number): string {
  const trimmed = base.trim() || `debug-obstacle-${counter}`;
  if (!existing.has(trimmed)) return trimmed;

  let idx = counter;
  let candidate = `${trimmed}-${idx}`;
  while (existing.has(candidate)) {
    idx += 1;
    candidate = `${trimmed}-${idx}`;
  }

  return candidate;
}
