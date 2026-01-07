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

  it('handles double release gracefully', () => {
    const telemetry = createTelemetryCollector();
    const manager = createVisualInstanceManager(
      {
        maxInstances: { bullets: 1, rockets: 0, lasers: 0, effects: 0 },
      },
      telemetry.emitter,
    );

    const index = manager.allocateIndex('bullets', 'p1');
    expect(index).not.toBeNull();

    manager.releaseIndex('bullets', 'p1');
    manager.releaseIndex('bullets', 'p1'); // Should do nothing

    const events = telemetry.events.filter((e) => e.type === 'VFX:Instancing:Release');
    expect(events).toHaveLength(1);
  });

  it('ignores release of unknown entity', () => {
    const telemetry = createTelemetryCollector();
    const manager = createVisualInstanceManager(
      {
        maxInstances: { bullets: 1, rockets: 0, lasers: 0, effects: 0 },
      },
      telemetry.emitter,
    );

    manager.releaseIndex('bullets', 'unknown');
    expect(telemetry.events).toHaveLength(0);
  });

  it('returns existing index if entity already allocated', () => {
    const telemetry = createTelemetryCollector();
    const manager = createVisualInstanceManager(
      {
        maxInstances: { bullets: 2, rockets: 0, lasers: 0, effects: 0 },
      },
      telemetry.emitter,
    );

    const idx1 = manager.allocateIndex('bullets', 'p1');
    const idx2 = manager.allocateIndex('bullets', 'p1');

    expect(idx1).toBe(idx2);
    // Should not emit a second alloc event
    const allocEvents = telemetry.events.filter((e) => e.type === 'VFX:Instancing:Alloc');
    expect(allocEvents).toHaveLength(1);
  });

  it('manages categories independently', () => {
    const manager = createVisualInstanceManager({
      maxInstances: { bullets: 1, rockets: 1, lasers: 0, effects: 0 },
    });

    expect(manager.allocateIndex('bullets', 'b1')).not.toBeNull();
    expect(manager.allocateIndex('bullets', 'b2')).toBeNull(); // Bullets full

    expect(manager.allocateIndex('rockets', 'r1')).not.toBeNull(); // Rockets still open
  });
});
