import { describe, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import { createBattleRunner } from "../../src/runtime/simulation/battleRunner";
import { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";

function createNoopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

describe("BattleRunner lifecycle", () => {
  it("dispose can be called repeatedly without throwing", () => {
    const runner = createBattleRunner(createBattleWorld(), {
      seed: 1,
      telemetry: createNoopTelemetry(),
      matchMachine: createMatchStateMachine(),
    });
    expect(() => {
      runner.dispose();
      runner.dispose();
    }).not.toThrow();
  });
});
