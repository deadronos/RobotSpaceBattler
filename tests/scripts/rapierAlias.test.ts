import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RAPIER_PACKAGE,
  resolvePackageDir,
  resolveRapierPackageDir,
} from "../../scripts/rapierAlias.ts";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rapier-alias-"));
  tempDirs.push(dir);
  return dir;
}

/** Build `<root>/<pkgName>/{package.json,dist/index.js}` and return both paths. */
function writePackage(root: string, pkgName: string, withDist: boolean) {
  const pkgDir = path.join(root, "node_modules", pkgName);
  fs.mkdirSync(withDist ? path.join(pkgDir, "dist") : pkgDir, {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(pkgDir, "package.json"),
    JSON.stringify({ name: pkgName, version: "1.2.3" }),
  );
  const entry = withDist
    ? path.join(pkgDir, "dist", "index.js")
    : path.join(pkgDir, "index.js");
  fs.writeFileSync(entry, "export {};\n");
  return { pkgDir, entry };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0))
    fs.rmSync(dir, { recursive: true, force: true });
});

describe("resolveRapierPackageDir", () => {
  it("resolves the installed Rapier package root", () => {
    const dir = resolveRapierPackageDir(import.meta.url);

    expect(path.basename(dir)).toBe("rapier3d-compat");
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    expect(manifest.name).toBe(RAPIER_PACKAGE);
  });

  it("returns a directory Vite can alias, with a resolvable entry point", () => {
    const dir = resolveRapierPackageDir(import.meta.url);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "package.json"), "utf8"),
    );
    const entries = [
      manifest.main,
      manifest.module,
      ...Object.values(manifest.exports ?? {}),
    ]
      .flatMap((entry) =>
        typeof entry === "string" ? [entry] : Object.values(entry ?? {}),
      )
      .filter((entry): entry is string => typeof entry === "string");

    expect(fs.statSync(dir).isDirectory()).toBe(true);
    // Vite resolves the package entry relative to the aliased directory, so the
    // manifest's own entry targets must exist there.
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(fs.existsSync(path.join(dir, entry))).toBe(true);
    }
  });
});

describe("resolvePackageDir", () => {
  it("walks up from an entry nested in a subdirectory", () => {
    const root = makeTempDir();
    const { pkgDir, entry } = writePackage(root, "nested-pkg", true);

    expect(resolvePackageDir("nested-pkg", () => entry)).toBe(pkgDir);
  });

  it("ignores unrelated manifests found on the way up", () => {
    const root = makeTempDir();
    const { pkgDir, entry } = writePackage(root, "real-pkg", true);
    // A nested dependency's manifest must not be mistaken for the package root.
    fs.writeFileSync(
      path.join(pkgDir, "dist", "package.json"),
      JSON.stringify({ name: "some-inner-pkg" }),
    );

    expect(resolvePackageDir("real-pkg", () => entry)).toBe(pkgDir);
  });

  it("throws when the package manifest is not on the resolved path", () => {
    const root = makeTempDir();
    const entry = path.join(root, "bogus", "index.js");
    fs.mkdirSync(path.dirname(entry), { recursive: true });
    fs.writeFileSync(entry, "");

    expect(() => resolvePackageDir("missing-pkg", () => entry)).toThrow(
      /Could not locate package "missing-pkg"/,
    );
  });
});

describe("vite config", () => {
  it("aliases Rapier to the resolved package directory", async () => {
    const { default: config } = await import("../../vite.config");

    const alias = config.resolve?.alias as Record<string, string>;

    expect(alias[RAPIER_PACKAGE]).toBe(
      resolveRapierPackageDir(import.meta.url),
    );
    expect(
      fs.existsSync(path.join(alias[RAPIER_PACKAGE], "package.json")),
    ).toBe(true);
  });
});
