import { describe, it, expect, vi } from "vitest";
import { create } from "@react-three/test-renderer";
import { WeaponRenderer } from "../../src/visuals/WeaponRenderer";
import { QualityManager } from "../../src/visuals/QualityManager";
import { createWeaponVisualEventEmitter } from "../../src/visuals/events";

async function waitForNode<T>(lookup: () => T, attempts = 10, delay = 0): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      const result = lookup();
      if (result) {
        return result;
      }
    } catch (error) {
      if (i === attempts - 1) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("waitForNode: node did not appear");
}
vi.mock("../../src/visuals/weapons/RocketExplosion", () => ({
  RocketExplosion: (props: { [key: string]: unknown }) => (
    <group {...props} name="rocket-explosion-sprite" />
  ),
}));

describe("WeaponRenderer", () => {
  it("renders a laser beam when emitted", async () => {
    const emitter = createWeaponVisualEventEmitter();
    const qualityManager = new QualityManager();
    const renderer = await create(
      <WeaponRenderer
        eventEmitter={emitter}
        qualityManager={qualityManager}
      />,
    );

    await renderer.advanceFrames(2, 0);

    emitter.emit({
      type: "laser-beam",
      id: "beam-1",
      startPosition: [0, 0, 0],
      endPosition: [1, 0, 0],
      durationMs: 250,
    });

    await renderer.advanceFrames(2, 0);

    const laserLine = await waitForNode(
      () => renderer.scene.findByProps({ name: "laser-beam-line" }),
      10,
      0,
    );
    expect(laserLine).toBeDefined();
    expect(laserLine.props.name).toBe("laser-beam-line");
  });

  it("skips tracers when quality profile disables them", async () => {
    const emitter = createWeaponVisualEventEmitter();
    const qualityManager = new QualityManager();
    qualityManager.setProfile("low");

    const renderer = await create(
      <WeaponRenderer
        eventEmitter={emitter}
        qualityManager={qualityManager}
      />,
    );

    await renderer.advanceFrames(1, 0);

    emitter.emit({
      type: "gun-tracer",
      id: "tracer-1",
      startPosition: [0, 0, 0],
      impactPosition: [1, 0, 0],
      durationMs: 125,
    });

    await renderer.advanceFrames(1, 0);

    expect(() =>
      renderer.scene.findByProps({ name: "gun-tracer-line" }),
    ).toThrow();
  });

  it("spawns an explosion visual when rocket event emitted", async () => {
    const emitter = createWeaponVisualEventEmitter();
    const qualityManager = new QualityManager();
    const renderer = await create(
      <WeaponRenderer
        eventEmitter={emitter}
        qualityManager={qualityManager}
      />,
    );

    await renderer.advanceFrames(1, 0);

    emitter.emit({
      type: "rocket-explosion",
      id: "boom-1",
      position: [0, 0, 0],
      radius: 2.5,
      durationMs: 300,
    });

    await renderer.advanceFrames(1, 0);

    const explosion = await waitForNode(
      () =>
        renderer.scene.findByProps({
          name: "rocket-explosion-sprite",
        }),
      20,
      20,
    );
    expect(explosion).toBeDefined();
  });
});
