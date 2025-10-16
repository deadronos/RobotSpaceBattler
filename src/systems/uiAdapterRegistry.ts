import type { UiAdapter } from './uiAdapter';

let currentAdapter: UiAdapter | null = null;

export function registerUiAdapter(adapter: UiAdapter | null) {
  currentAdapter = adapter;
}

export function getRegisteredUiAdapter(): UiAdapter | null {
  return currentAdapter;
}

export default { registerUiAdapter, getRegisteredUiAdapter };
