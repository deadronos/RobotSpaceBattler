import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

/** Package whose duplicate copies would create two WASM runtimes. */
export const RAPIER_PACKAGE = "@dimforge/rapier3d-compat";

/**
 * Locate the directory of an installed package through Node's own resolver.
 *
 * Build config must not hard-code `<repo>/node_modules/<pkg>`: git worktrees (for
 * example `.claude/worktrees/*`) have no `node_modules` of their own, and Node
 * resolution walks up to the parent checkout instead (see #204).
 *
 * `require.resolve` is called on the bare specifier rather than on
 * `<pkg>/package.json`, because the package's `exports` map does not expose
 * `package.json`. The resolved entry can live in a subdirectory (future
 * `dist/` layouts), so the resolved file is walked up to the nearest directory
 * whose manifest names this package.
 *
 * @param packageName specifier to resolve, for example `@dimforge/rapier3d-compat`
 * @param resolve Node `require.resolve`-compatible resolver
 * @returns absolute path of the package root
 */
export function resolvePackageDir(
  packageName: string,
  resolve: (id: string) => string,
): string {
  const entry = path.dirname(resolve(packageName));
  for (let dir = entry; ; dir = path.dirname(dir)) {
    const manifestPath = path.join(dir, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        name?: string;
      };
      if (manifest.name === packageName) return dir;
    }
    // Reached the filesystem root without finding the package that owns `entry`.
    if (path.dirname(dir) === dir) {
      throw new Error(
        `Could not locate package "${packageName}" from ${entry}`,
      );
    }
  }
}

/**
 * Resolve the Rapier compat package directory for the Vite alias.
 *
 * @param configUrl `import.meta.url` of the calling config file
 */
export function resolveRapierPackageDir(configUrl: string): string {
  return resolvePackageDir(RAPIER_PACKAGE, createRequire(configUrl).resolve);
}
