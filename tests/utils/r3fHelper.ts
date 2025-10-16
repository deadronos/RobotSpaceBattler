// Minimal helper to mount r3f components in Vitest using @react-three/test-renderer
// This file is intentionally small and used by unit tests that need to render
// react-three-fiber components without a real WebGL context.
import { create } from '@react-three/test-renderer'
import React from 'react'

export async function mountR3f(element: React.ReactElement) {
  // create() returns a renderer with toJSON and unmount
  const renderer = await create(element as any)
  return renderer
}
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
