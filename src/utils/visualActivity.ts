// Simple ref-counted visual activity tracker.
// Components can mark activity when they start an animation and unmark when done.
let refCount = 0;

export function markVisualActive() {
  refCount += 1;
}

export function unmarkVisualActive() {
  refCount = Math.max(0, refCount - 1);
}

export function hasVisualActivity() {
  return refCount > 0;
}

export function resetVisualActivity() {
  refCount = 0;
}
