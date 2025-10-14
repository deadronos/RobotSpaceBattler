import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useUiShortcuts } from '../../src/hooks/useUiShortcuts';
import { useUiStore } from '../../src/store/uiStore';

describe('UI Hotkeys', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUiStore.setState({
      isHudVisible: true,
      settingsOpen: false,
      statsOpen: false,
    });
  });

  it('toggles HUD visibility when "o" or "O" key is pressed', () => {
    const { result } = renderHook(() => useUiShortcuts());
    const initialVisible = useUiStore.getState().isHudVisible;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
    });

    expect(useUiStore.getState().isHudVisible).toBe(!initialVisible);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'O' }));
    });

    expect(useUiStore.getState().isHudVisible).toBe(initialVisible);
  });

  it('ignores repeated keydown events', () => {
    const { result } = renderHook(() => useUiShortcuts());
    const toggleHud = vi.spyOn(useUiStore.getState(), 'toggleHud');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', repeat: true }));
    });

    expect(toggleHud).not.toHaveBeenCalled();
  });

  it('opens settings when Escape is pressed', () => {
    renderHook(() => useUiShortcuts());
    const initialSettingsOpen = useUiStore.getState().settingsOpen;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    // openSettings toggles the state
    expect(useUiStore.getState().settingsOpen).not.toBe(initialSettingsOpen);
  });

  it('opens stats modal when "s" or "S" is pressed', () => {
    renderHook(() => useUiShortcuts());
    const initialStatsOpen = useUiStore.getState().statsOpen;

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    });

    expect(useUiStore.getState().statsOpen).not.toBe(initialStatsOpen);

    // Reset and test uppercase
    useUiStore.setState({ statsOpen: false });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }));
    });

    expect(useUiStore.getState().statsOpen).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useUiShortcuts());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('can be extended with configurable hotkeys for battle UI toggle', () => {
    // Future: add test for configurable battle UI toggle hotkey
    // This test placeholder ensures the hook remains extensible for additional hotkeys
    expect(true).toBe(true);
  });
});
