/**
 * Test harness helpers for deterministic fixed-step simulation testing.
 * 
 * This module centralizes StepContext and FixedStepDriver builders for use across
 * unit tests, contract tests, and integration tests.
 */

import { FixedStepDriver, type StepContext } from "../../src/utils/fixedStepDriver";
import {
  createSeededRng,
  createStepIdFactory,
} from "../../src/utils/seededRng";

/**
 * Default test seed for reproducible test runs.
 */
export const DEFAULT_TEST_SEED = 12345;

/**
 * Default fixed timestep (60 FPS = ~16.67ms per step).
 */
export const DEFAULT_STEP_MS = 1 / 60;

/**
 * Create a FixedStepDriver with sensible defaults for tests.
 */
export function createTestDriver(
  seed: number = DEFAULT_TEST_SEED,
  stepMs: number = DEFAULT_STEP_MS
): FixedStepDriver {
  return new FixedStepDriver(seed, stepMs);
}

/**
 * Create a deterministic StepContext for manual testing scenarios.
 * Useful when you need a one-off context without running a full driver loop.
 */
export function createTestStepContext(
  overrides: Partial<StepContext> = {}
): StepContext {
  const { rng, idFactory, ...rest } = overrides;
  const frameCount = rest.frameCount ?? 0;
  const simNowMs = rest.simNowMs ?? 0;
  return {
    frameCount,
    simNowMs,
    rng: rng ?? createSeededRng(DEFAULT_TEST_SEED),
    step: DEFAULT_STEP_MS,
    idFactory:
      idFactory ??
      createStepIdFactory({
        frameCount,
        simNowMs,
      }),
    ...rest,
  };
}

/**
 * Run a driver for N steps and collect all emitted StepContext objects.
 * Useful for validating deterministic traces.
 */
export function runDriverSteps(
  driver: FixedStepDriver,
  numSteps: number
): StepContext[] {
  const contexts: StepContext[] = [];
  for (let i = 0; i < numSteps; i++) {
    contexts.push(driver.stepOnce());
  }
  return contexts;
}

/**
 * Generate a deterministic entity ID using the idFactory pattern.
 * Format: "{frameCount}-{simNowMs}-{seq}"
 */
export function createTestId(
  frameCount: number,
  simNowMs: number,
  seq: number
): string {
  return `${frameCount}-${simNowMs}-${seq}`;
}

/**
 * Helper to create a deterministic ID factory function bound to a StepContext.
 * Usage: const idFactory = createIdFactory(ctx); const id = idFactory();
 */
export function createIdFactory(ctx: StepContext): () => string {
  let seq = 0;
  return () => {
    const id = createTestId(ctx.frameCount, ctx.simNowMs, seq);
    seq++;
    return id;
  };
}

/**
 * Compare two StepContext objects for equality (useful for determinism assertions).
 */
export function compareStepContexts(a: StepContext, b: StepContext): boolean {
  return (
    a.frameCount === b.frameCount &&
    a.simNowMs === b.simNowMs &&
    a.step === b.step
    // Note: RNG function comparison is not meaningful, but we can compare outputs
  );
}

/**
 * Utility to verify that two driver runs produce identical step traces.
 */
export function assertDeterministicRuns(
  seed: number,
  stepMs: number,
  numSteps: number
): void {
  const driver1 = createTestDriver(seed, stepMs);
  const driver2 = createTestDriver(seed, stepMs);

  const trace1 = runDriverSteps(driver1, numSteps);
  const trace2 = runDriverSteps(driver2, numSteps);

  if (trace1.length !== trace2.length) {
    throw new Error(
      `Trace length mismatch: ${trace1.length} vs ${trace2.length}`
    );
  }

  for (let i = 0; i < trace1.length; i++) {
    if (!compareStepContexts(trace1[i], trace2[i])) {
      throw new Error(
        `StepContext mismatch at step ${i}: ` +
          `${JSON.stringify(trace1[i])} vs ${JSON.stringify(trace2[i])}`
      );
    }
  }
}

/**
 * Mock entity factory for tests - creates minimal entity shapes.
 */
export function createMockRobot(
  id: string,
  team: "red" | "blue",
  overrides: Record<string, any> = {}
) {
  return {
    id,
    team,
    position: [0, 0, 0] as [number, number, number],
    health: { current: 100, max: 100, alive: true },
    weapon: null,
    weaponState: null,
    invulnerableUntil: 0,
    ...overrides,
  };
}

export function createMockProjectile(
  id: string,
  ownerId: string,
  team: "red" | "blue",
  overrides: Record<string, any> = {}
) {
  return {
    id,
    ownerId,
    ownerTeam: team,
    team,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    lifespanMs: 5000,
    spawnedAtMs: 0,
    damage: 10,
    ...overrides,
  };
}

export function createMockBeam(
  id: string,
  overrides: Record<string, any> = {}
) {
  return {
    id,
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 1, y: 0, z: 0 },
    ticksRemaining: 10,
    tickIntervalMs: 100,
    damagePerTick: 5,
    ...overrides,
  };
}
