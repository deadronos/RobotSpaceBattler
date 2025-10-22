import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  PerformanceBanner,
  type PerformanceBannerProps,
} from '../../../src/components/overlays/PerformanceBanner';

const createProps = (
  overrides: Partial<PerformanceBannerProps> = {},
): PerformanceBannerProps => ({
  visible: true,
  fps: 22,
  targetFps: 60,
  qualityScalingActive: true,
  autoScalingEnabled: true,
  message: 'Quality scaling active to stabilize frame rate.',
  onDismiss: vi.fn(),
  onToggleAutoScaling: vi.fn(),
  ...overrides,
});

describe('PerformanceBanner', () => {
  it('renders when visible and shows performance details', () => {
    const props = createProps();
    render(<PerformanceBanner {...props} />);

    expect(
      screen.getByRole('status', { name: /performance warning/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/22 fps/i)).toBeInTheDocument();
    expect(screen.getByText(/target 60 fps/i)).toBeInTheDocument();
    expect(
      screen.getByText(/quality scaling active/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /auto quality scaling/i })).toBeChecked();
  });

  it('invokes callbacks for dismiss and toggle actions', () => {
    const props = createProps();
    render(<PerformanceBanner {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('checkbox', { name: /auto quality scaling/i }));
    expect(props.onToggleAutoScaling).toHaveBeenCalledWith(false);
  });

  it('is hidden when not visible', () => {
    render(<PerformanceBanner {...createProps({ visible: false })} />);
    expect(
      screen.queryByRole('status', { name: /performance warning/i }),
    ).not.toBeInTheDocument();
  });
});
