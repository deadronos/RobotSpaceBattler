const PERF_DEV = Boolean(import.meta.env?.VITE_PERF_DEV);

/**
 * Checks if performance measurement is available and enabled.
 * @returns True if performance API is available and PERF_DEV is true.
 */
function canMeasure(): boolean {
  return PERF_DEV && typeof performance !== 'undefined' && typeof performance.mark === 'function';
}

/**
 * Marks the start of a performance measurement.
 * @param label - The label for the measurement.
 */
export function perfMarkStart(label: string): void {
  if (!canMeasure()) {
    return;
  }

  performance.mark(`${label}-start`);
}

/**
 * Marks the end of a performance measurement and measures the duration.
 * @param label - The label for the measurement.
 */
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

/**
 * Wraps a function execution with performance measurement.
 * @param label - The label for the measurement.
 * @param fn - The function to execute.
 * @returns The return value of the function.
 */
export function perfScoped<T>(label: string, fn: () => T): T {
  perfMarkStart(label);
  const result = fn();
  perfMarkEnd(label);
  return result;
}
