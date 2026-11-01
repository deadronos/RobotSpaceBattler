import { it } from "vitest";
import { measureAllocationsPerTick } from "../helpers/aiScenario";
it("alloc", () => {
  for (const n of [20, 100, 200]) {
    const r = measureAllocationsPerTick(n, 300);
    process.stdout.write(`ALLOC ${n} ai=${r.aiBytes.toFixed(0)} combat=${r.combatBytes.toFixed(0)}\n`);
  }
}, 60000);
