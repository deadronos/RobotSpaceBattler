import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from '@/components/ui/SettingsModal';
import React from 'react';

describe('SettingsModal', () => {
  it('shows the perf overlay toggle and calls handler when changed', () => {
    const onClose = vi.fn();
    const onToggleDebugUI = vi.fn();
    const onTogglePerfOverlay = vi.fn();

    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        showDebugUI={false}
        onToggleDebugUI={onToggleDebugUI}
        showPerfOverlay={false}
        onTogglePerfOverlay={onTogglePerfOverlay}
      />,
    );

    const perfCheckbox = screen.getByLabelText('Show Performance Overlay') as HTMLInputElement;
    expect(perfCheckbox).toBeInTheDocument();
    expect(perfCheckbox.checked).toBe(false);

    fireEvent.click(perfCheckbox);
    expect(onTogglePerfOverlay).toHaveBeenCalledWith(true);
  });
});