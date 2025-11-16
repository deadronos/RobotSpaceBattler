const PERF_DEV = Boolean(import.meta.env?.VITE_PERF_DEV);

function canMeasure(): boolean {
  return PERF_DEV && typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

export function perfMarkStart(label: string): void {
  if (!canMeasure()) {
    return;
  }

  performance.mark(`${label}-start`);
}

export function perfMarkEnd(label: string): void {
  if (!canMeasure()) {
    return;
  }

  const startLabel = `${label}-start`;
  const endLabel = `${label}-end`;
  const hasStartMark = performance.getEntriesByName(startLabel, 'mark').length > 0;

  if (!hasStartMark) {
    return;
  }

  performance.mark(endLabel);
  performance.measure(label, startLabel, endLabel);
}

export function perfScoped<T>(label: string, fn: () => T): T {
  perfMarkStart(label);
  const result = fn();
  perfMarkEnd(label);
  return result;
}
