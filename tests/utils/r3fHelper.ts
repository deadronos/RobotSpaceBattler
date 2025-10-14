import type { ReactElement } from 'react';
import { create } from '@react-three/test-renderer';
import type { ReactThreeTest } from '@react-three/test-renderer';
import { render, type RenderResult } from '@testing-library/react';

type TestRenderer = ReactThreeTest.Renderer;

export interface R3FRenderResult {
  renderer: TestRenderer;
  dom: RenderResult;
  unmount: () => Promise<void>;
}

export async function renderR3F(element: ReactElement): Promise<R3FRenderResult> {
  const renderer = await create(element);
  const dom = render(element);

  return {
    renderer,
    dom,
    unmount: async () => {
      await renderer.unmount();
      dom.unmount();
    },
  };
}

export async function advanceR3FFrames(
  renderer: TestRenderer,
  frames = 1,
  delta = 1 / 60
): Promise<void> {
  await renderer.advanceFrames(frames, delta);
}
