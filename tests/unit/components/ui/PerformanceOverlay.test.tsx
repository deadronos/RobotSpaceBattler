import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PerformanceStats } from '../../../../src/types';

const stats: PerformanceStats = {
  currentFPS: 48,
  averageFPS: 52,
  qualityScalingActive: true,
};

describe('PerformanceOverlay', () => {
  beforeEach(async () => {
    const { useUIStore } = await import('../../../../src/store/uiStore');
    useUIStore.getState().reset();
  });

  it('displays fps metrics and quality warning when visible', async () => {
    const { PerformanceOverlay } = await import('../../../../src/components/ui/PerformanceOverlay');

    render(<PerformanceOverlay stats={stats} autoScalingEnabled onToggleAutoScaling={() => {}} />);

    expect(screen.getByText(/48 fps/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg: 52 fps/i)).toBeInTheDocument();
    expect(screen.getByText(/Performance mode active/i)).toBeInTheDocument();
  });

  it('invokes callback when auto scaling checkbox toggled', async () => {
    const onToggle = vi.fn();
    const { PerformanceOverlay } = await import('../../../../src/components/ui/PerformanceOverlay');

    render(<PerformanceOverlay stats={stats} autoScalingEnabled onToggleAutoScaling={onToggle} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Auto quality scaling/i }));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('can hide overlay via zustand store toggle', async () => {
    const { PerformanceOverlay } = await import('../../../../src/components/ui/PerformanceOverlay');
    const { useUIStore } = await import('../../../../src/store/uiStore');

    render(<PerformanceOverlay stats={stats} autoScalingEnabled onToggleAutoScaling={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Hide Overlay/i }));

    expect(useUIStore.getState().performanceOverlayVisible).toBe(false);
  });
});
