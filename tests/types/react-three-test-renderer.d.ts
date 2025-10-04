declare module '@react-three/test-renderer' {
  import * as React from 'react';

  export type GraphNode = any;

  export interface TestRenderer {
    advanceFrames: (frames: number, msPerFrame?: number) => Promise<void>;
    toGraph: () => GraphNode | GraphNode[] | null;
    unmount: () => Promise<void>;
  }

  export function create(element: React.ReactElement): Promise<TestRenderer>;
}
