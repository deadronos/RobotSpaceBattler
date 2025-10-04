import { describe, it, expect } from 'vitest';
import { buildCombinedTrace, writeGoldenTrace, compareWithGolden } from '../../src/utils/golden';
import { tmpdir } from 'os';
import { join } from 'path';

describe('golden trace helper', () => {
  it('builds and compares combined traces deterministically', () => {
    const events = [
      { id: 'd1', simNowMs: 1, frameCount: 1, victimId: 'v1', victimTeam: 'red', classification: 'opponent' as const, scoreDelta: -5 },
    ];
    const projectilesNDJSON = '{"a":1}\n{"b":2}';
    const snaps = [{ id: 'ent-1', team: 'blue', position: [0, 1, 2] }];

    const combined = buildCombinedTrace({ events, projectilesNDJSON, entitySnapshots: snaps });

    const outDir = tmpdir();
    const name = `golden-test-${Date.now()}`;
    const filePath = writeGoldenTrace(outDir, name, combined);

    const matches = compareWithGolden(filePath, combined);
    expect(matches).toBe(true);
  });
});
