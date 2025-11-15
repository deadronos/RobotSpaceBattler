import { describe, expect, it } from 'vitest';

import {
  VisualInstanceTelemetryEvent,
  createVisualInstanceManager,
} from '../../src/visuals/VisualInstanceManager';

function createTelemetryCollector() {
  const events: VisualInstanceTelemetryEvent[] = [];
  return {
    events,
    emitter: {
      emit: (event: VisualInstanceTelemetryEvent) => {
        events.push(event);
      },
    },
  };
}

describe('VisualInstanceManager', () => {
  it('allocates, releases, and reuses indices per category', () => {
    const telemetry = createTelemetryCollector();
    const manager = createVisualInstanceManager(
      {
        maxInstances: { bullets: 2, rockets: 1, lasers: 1, effects: 0 },
      },
      telemetry.emitter,
    );

    expect(manager.allocateIndex('bullets', 'p1')).not.toBeNull();
    const second = manager.allocateIndex('bullets', 'p2');
    expect(second).not.toBeNull();
    expect(manager.allocateIndex('bullets', 'p3')).toBeNull();

    manager.releaseIndex('bullets', 'p2');
    const reuse = manager.allocateIndex('bullets', 'p3');
    expect(reuse).toBe(second);
    expect(manager.getIndex('bullets', 'p3')).toBe(reuse);

    expect(
      telemetry.events.filter((event) => event.type === 'VFX:Instancing:Alloc' && event.category === 'bullets'),
    ).toHaveLength(3);
    expect(
      telemetry.events.filter((event) => event.type === 'VFX:Instancing:Release' && event.category === 'bullets'),
    ).toHaveLength(1);
    expect(
      telemetry.events.filter((event) => event.type === 'VFX:Instancing:Fallback' && event.category === 'bullets'),
    ).toHaveLength(1);
  });

  it('resets allocation state across categories', () => {
    const telemetry = createTelemetryCollector();
    const manager = createVisualInstanceManager(
      {
        maxInstances: { bullets: 1, rockets: 1, lasers: 1, effects: 1 },
      },
      telemetry.emitter,
    );

    const index = manager.allocateIndex('lasers', 'l1');
    expect(index).toBe(0);
    manager.reset();
    expect(manager.getIndex('lasers', 'l1')).toBeNull();
    const next = manager.allocateIndex('lasers', 'l2');
    expect(next).toBe(0);
  });
});
