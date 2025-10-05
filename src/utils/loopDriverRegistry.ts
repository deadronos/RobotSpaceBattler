// Simple registry for collecting fixed-step loop handles so an external driver
// can step them. Simulation's useFixedStepLoop will register its handle here
// when mounted. The registry is intentionally minimal and synchronous.

export type RegisteredFixedStepHandle = {
  step: () => unknown | null;
  getMetrics?: () => { stepsLastFrame: number; backlog: number };
} | null;

let _handle: RegisteredFixedStepHandle = null;

export function registerFixedStepHandle(handle: RegisteredFixedStepHandle) {
  _handle = handle;
}

export function unregisterFixedStepHandle(handle: RegisteredFixedStepHandle) {
  if (_handle === handle) _handle = null;
}

export function getFixedStepHandle(): RegisteredFixedStepHandle {
  return _handle;
}
