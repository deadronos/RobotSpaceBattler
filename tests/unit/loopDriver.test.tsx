import { act } from 'react-dom/test-utils';
import { create } from "@react-three/test-renderer";
import { describe, expect, it, vi } from "vitest";

import LoopDriver from "../../src/components/LoopDriver";
import { useFixedStepLoop } from "../../src/hooks/useFixedStepLoop";
import { getFixedStepMetrics, clearFixedStepMetrics } from "../../src/utils/sceneMetrics";
import { registerFixedStepHandle, unregisterFixedStepHandle } from "../../src/utils/loopDriverRegistry";
import React from 'react';

// A small test helper that registers a fake fixed-step handle which counts steps.
function TestRegister({ onStep, options }: { onStep: () => void; options?: any }) {
  const handle = useFixedStepLoop(
    { enabled: true, seed: 1, step: 1 / 60, testMode: true, autonomous: false, ...(options ?? {}) },
    () => {
      onStep();
    },
  );

  // Expose handle to registry too
  React.useEffect(() => {
    registerFixedStepHandle(handle as any);
    return () => unregisterFixedStepHandle(handle as any);
  }, [handle]);

  return null;
}

describe('LoopDriver integration', () => {
  it('drives registered fixed-step handle and records metrics', async () => {
    const stepSpy = vi.fn();
    clearFixedStepMetrics();

    const Scene = (
      <>
        <TestRegister onStep={stepSpy} />
        <LoopDriver enabled={true} hz={60} stepSeconds={1 / 60} />
      </>
    );

    const renderer = await create(<scene>{Scene}</scene> as any);

    await act(async () => {
      // Advance a few frames - the LoopDriver uses RAF internally.
      await renderer.advanceFrames(3, 1 / 60);
    });

    // Expect the step handler to have been called at least once
    expect(stepSpy).toHaveBeenCalled();

    const metrics = getFixedStepMetrics();
    expect(metrics.invalidationsPerRaf).toBeGreaterThanOrEqual(1);
    expect(metrics.stepsLastFrame).toBeGreaterThanOrEqual(0);

    await act(async () => {
      await renderer.unmount();
    });
  });

  it('caps steps per frame according to maxStepsPerFrame', async () => {
    const stepSpy = vi.fn();
    clearFixedStepMetrics();

    const Scene = (
      <>
        <TestRegister onStep={stepSpy} options={{ maxStepsPerFrame: 2 }} />
        <LoopDriver enabled={true} hz={60} stepSeconds={1 / 60} maxStepsPerFrame={2} />
      </>
    );

    const renderer = await create(<scene>{Scene}</scene> as any);

    await act(async () => {
      // Simulate a large delta (0.2s) which would produce many steps if uncapped
      await renderer.advanceFrames(1, 0.2);
    });

    // Should be capped at 2 steps this frame
    expect(stepSpy.mock.calls.length).toBeLessThanOrEqual(2);

    await act(async () => {
      await renderer.unmount();
    });
  });

  it('accumulates backlog but clamps to maxAccumulatedSteps', async () => {
    const stepSpy = vi.fn();
    clearFixedStepMetrics();

    const Scene = (
      <>
        <TestRegister onStep={stepSpy} options={{ maxAccumulatedSteps: 4 }} />
        <LoopDriver enabled={true} hz={60} stepSeconds={1 / 60} maxAccumulatedSteps={4} />
      </>
    );

    const renderer = await create(<scene>{Scene}</scene> as any);

    await act(async () => {
      // Simulate huge delta across two frames and check backlog reported
      await renderer.advanceFrames(1, 0.5);
      await renderer.advanceFrames(1, 0.5);
    });

    const metrics = getFixedStepMetrics();
    expect(metrics.backlog).toBeLessThanOrEqual(4);

    await act(async () => {
      await renderer.unmount();
    });
  });

  it('calls rapier.step when manualRapierStep enabled', async () => {
    const stepFn = vi.fn();

    // Mock useRapier before importing LoopDriver to ensure driver calls step
    vi.mock('@react-three/rapier', () => ({
      useRapier: () => ({ step: stepFn, world: { step: stepFn } }),
    }));

    const LoopDriverMocked = (await import('../../src/components/LoopDriver')).default;

    const stepSpy = vi.fn();
    clearFixedStepMetrics();

    const Scene = (
      <>
        <TestRegister onStep={stepSpy} />
        <LoopDriverMocked enabled={true} hz={60} stepSeconds={1 / 60} manualRapierStep={true} />
      </>
    );

    const renderer = await create(<scene>{Scene}</scene> as any);

    await act(async () => {
      await renderer.advanceFrames(2, 1 / 60);
    });

    expect(stepFn).toHaveBeenCalled();

    await act(async () => {
      await renderer.unmount();
    });
  });
});
