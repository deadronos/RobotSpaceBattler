import { createUiStore } from '../../../src/store/uiStore';

test('ui store toggles stats and settings', () => {
  const api = createUiStore();
  api.getState().openStats();
  expect(api.getState().statsOpen).toBe(true);
  api.getState().openSettings();
  expect(api.getState().settingsOpen).toBe(true);
});
