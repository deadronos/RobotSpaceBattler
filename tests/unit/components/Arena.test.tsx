import { create } from '@react-three/test-renderer';
import { describe, expect, it } from 'vitest';

import { createDefaultArena } from '../../../src/ecs/entities/Arena';

type TestNode = {
  object?: any;
  _fiber?: { object?: any };
  children?: TestNode[];
};

function extractObject(node: TestNode | undefined): any | undefined {
  if (!node) {
    return undefined;
  }
  return node.object ?? node._fiber?.object ?? node;
}

describe('Arena component', () => {
  it('renders floor scaled to arena dimensions', async () => {
    const arena = createDefaultArena();
    const { Arena } = await import('../../../src/components/Arena');

    const renderer = await create(<Arena arena={arena} />);
    const rootNode = renderer.scene.children[0] as TestNode;
    const group = extractObject(rootNode);

    expect(group).toBeDefined();
    const floor = group?.getObjectByName?.('arena-floor');

    expect(floor).toBeDefined();
    const geometryArgs = (floor as any)?.geometry?.parameters;
    expect(geometryArgs?.width).toBeCloseTo(arena.dimensions.x);
    expect(geometryArgs?.height).toBeCloseTo(arena.dimensions.z);

    await renderer.unmount();
  });

  it('creates spawn zone markers for each team', async () => {
    const arena = createDefaultArena();
    const { Arena } = await import('../../../src/components/Arena');

    const renderer = await create(<Arena arena={arena} />);
    const rootNode = renderer.scene.children[0] as TestNode;
    const group = extractObject(rootNode);

    const redMarker = group?.getObjectByName?.('spawn-zone-red');
    const blueMarker = group?.getObjectByName?.('spawn-zone-blue');

    expect(redMarker?.position.x).toBeCloseTo(arena.spawnZones.red.center.x);
    expect(redMarker?.position.z).toBeCloseTo(arena.spawnZones.red.center.z);
    expect(blueMarker?.position.x).toBeCloseTo(arena.spawnZones.blue.center.x);
    expect(blueMarker?.position.z).toBeCloseTo(arena.spawnZones.blue.center.z);

    await renderer.unmount();
  });

  it('renders obstacle meshes for arena cover positions', async () => {
    const arena = createDefaultArena();
    const { Arena } = await import('../../../src/components/Arena');

    const renderer = await create(<Arena arena={arena} />);
    const rootNode = renderer.scene.children[0] as TestNode;
    const group = extractObject(rootNode);

    arena.obstacles.forEach((obstacle, index) => {
      const mesh = group?.getObjectByName?.(`arena-obstacle-${index}`);
      expect(mesh).toBeDefined();
      expect(mesh?.position.x).toBeCloseTo(obstacle.position.x);
      expect(mesh?.position.z).toBeCloseTo(obstacle.position.z);
    });

    await renderer.unmount();
  });

  it('configures lighting using arena lighting config', async () => {
    const arena = createDefaultArena();
    const { Arena } = await import('../../../src/components/Arena');

    const renderer = await create(<Arena arena={arena} />);
    const rootNode = renderer.scene.children[0] as TestNode;
    const group = extractObject(rootNode);

    const ambient = group?.getObjectByName?.('arena-ambient-light');
    const directional = group?.getObjectByName?.('arena-directional-light');

    expect(ambient).toBeDefined();
    expect((ambient as any).intensity).toBeCloseTo(arena.lightingConfig.ambientIntensity);

    expect(directional).toBeDefined();
    expect((directional as any).intensity).toBeCloseTo(arena.lightingConfig.directionalIntensity);
    expect((directional as any).castShadow).toBe(arena.lightingConfig.shadowsEnabled);

    await renderer.unmount();
  });
});
