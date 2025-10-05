import { act } from 'react-dom/test-utils';
import { create } from "@react-three/test-renderer";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { useFixedStepLoop } from "../../src/hooks/useFixedStepLoop";

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("useFixedStepLoop", () => {
  it("supports manual stepping in test mode", async () => {
    const onStep = vi.fn();
    const onFinish = vi.fn();

    function TestComponent({ notify }: { notify: () => void }) {
      const handle = useFixedStepLoop(
        {
          enabled: false,
          seed: 123,
          step: 1 / 60,
          testMode: true,
        },
        onStep,
      );

      useEffect(() => {
        handle.reset({ seed: 123 });
        handle.step();
        handle.step();
        notify();
      }, [handle, notify]);

      return null;
    }

    const renderer = await create(<TestComponent notify={onFinish} />);

    await act(async () => {
      await renderer.advanceFrames(1, 0);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep.mock.calls[0][0].frameCount).toBe(1);
    expect(onStep.mock.calls[1][0].frameCount).toBe(2);

    await act(async () => {
      await renderer.unmount();
    });
  });

  it("accumulates delta and caps steps per frame", async () => {
    const frames: number[] = [];

    function TestComponent() {
      useFixedStepLoop(
        {
          enabled: true,
          seed: 999,
          step: 1 / 60,
          maxStepsPerFrame: 2,
        },
        (ctx) => {
          frames.push(ctx.frameCount);
        },
      );

      return null;
    }

    const renderer = await create(<TestComponent />);

    await act(async () => {
      await renderer.advanceFrames(1, 1 / 120);
    });
    expect(frames).toHaveLength(0);

    await act(async () => {
      await renderer.advanceFrames(1, 1 / 60);
    });
    expect(frames).toEqual([1]);

    await act(async () => {
      await renderer.advanceFrames(1, 0.2);
    });
    expect(frames).toEqual([1, 2, 3]);

    await act(async () => {
      await renderer.advanceFrames(1, 0.2);
    });
    expect(frames.length).toBeGreaterThan(3);

    await act(async () => {
      await renderer.unmount();
    });
  });
});
