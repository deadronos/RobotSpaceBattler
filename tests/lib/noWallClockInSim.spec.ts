// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..", "src");
const SIM_DIRS = ["simulation", "ecs", "runtime"];
// Documented exceptions: perf instrumentation and the worker (separate
// thread, measures its own duration only).
const ALLOWED = new Set([
  "simulation/ai/pathfinding/worker/pathfindingEngine.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("no wall-clock reads in the simulation", () => {
  it("Date.now/performance.now are absent from sim code", () => {
    const offenders: string[] = [];
    for (const d of SIM_DIRS) {
      for (const file of walk(join(SRC, d))) {
        const rel = relative(SRC, file).replace(/\\/g, "/");
        if (ALLOWED.has(rel)) continue;
        const text = readFileSync(file, "utf8")
          .split("\n")
          .filter(
            (l) => !l.trim().startsWith("*") && !l.trim().startsWith("//"),
          )
          .join("\n");
        if (/\b(Date\.now|performance\.now)\s*\(/.test(text)) {
          offenders.push(rel);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
