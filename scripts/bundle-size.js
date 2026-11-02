#!/usr/bin/env node
/**
 * Reports bundle sizes from a production build (#159).
 *
 * Prints, for every emitted asset, its raw and gzip size, and separates the
 * chunks a browser must fetch before the app can run ("initial load") from the
 * lazy ones. The initial set is taken from `dist/index.html` itself: the module
 * entry, every `modulepreload` the build emits for it, its stylesheets, and the
 * HTML document.
 *
 * gzip uses `zlib` level 9, which is a little smaller than the number Vite's
 * reporter prints (it uses a faster level). Only compare numbers produced by
 * this script — mixing the two bases shifts totals by a few percent.
 *
 * Usage:
 *   npm run build && npm run bundle:size
 *   node scripts/bundle-size.js path/to/dist          # measure another build
 *   node scripts/bundle-size.js --json
 *
 * For the pass/fail gate see `scripts/check_bundle_budget.js`.
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const SCRIPT = "index.html"; // document whose tags define the initial load
const ASSET_DIR = "assets";

/** gzip size in kB, rounded to 0.01 so the tables stay readable. */
function gzipKb(buffer) {
  return Math.round((gzipSync(buffer, { level: 9 }).length / 1024) * 100) / 100;
}

function rawKb(buffer) {
  return Math.round((buffer.length / 1024) * 100) / 100;
}

/** Maps a URL from the HTML ("/base/assets/x.js") to a path under `dist`. */
function urlToFile(distDir, url) {
  const withoutBase = url.replace(/^\/[^/]+\//, "");
  return path.join(distDir, withoutBase);
}

function readIfPresent(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

/**
 * Measures a build directory.
 *
 * @param {string} distDir - Build output directory.
 * @returns {{
 *   files: Array<{file: string, rawKb: number, gzipKb: number, initial: boolean}>,
 *   initial: {rawKb: number, gzipKb: number, files: number},
 *   total: {rawKb: number, gzipKb: number, files: number},
 * }}
 */
export function measureBundle(distDir = "dist") {
  const indexPath = path.join(distDir, SCRIPT);
  const html = readIfPresent(indexPath);
  if (!html) {
    throw new Error(`Missing ${indexPath}: run \`npm run build\` first.`);
  }

  /** @type {Map<string, {rawKb: number, gzipKb: number, initial: boolean}>} */
  const entries = new Map();

  const add = (file, initial) => {
    const buffer = readIfPresent(file);
    if (!buffer) return;
    const existing = entries.get(file);
    entries.set(file, {
      rawKb: rawKb(buffer),
      gzipKb: gzipKb(buffer),
      initial: initial || Boolean(existing?.initial),
    });
  };

  add(indexPath, true);

  const entry = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(
    html.toString("utf8"),
  );
  if (!entry) {
    throw new Error(`Could not find the module entry in ${indexPath}.`);
  }
  add(urlToFile(distDir, entry[1]), true);

  for (const match of html
    .toString("utf8")
    .matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)) {
    add(urlToFile(distDir, match[1]), true);
  }

  for (const match of html
    .toString("utf8")
    .matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    add(urlToFile(distDir, match[1]), true);
  }

  const assetDir = path.join(distDir, ASSET_DIR);
  if (fs.existsSync(assetDir)) {
    for (const name of fs.readdirSync(assetDir).sort()) {
      if (!/\.(js|css|wasm|map)$/.test(name)) continue;
      if (name.endsWith(".map")) continue;
      add(path.join(assetDir, name), false);
    }
  }

  const files = [...entries]
    .map(([file, value]) => ({ file, ...value }))
    .sort((a, b) => b.gzipKb - a.gzipKb);

  const sum = (rows, key) =>
    Math.round(rows.reduce((total, row) => total + row[key], 0) * 100) / 100;

  const initialRows = files.filter((row) => row.initial);
  return {
    files,
    initial: {
      rawKb: sum(initialRows, "rawKb"),
      gzipKb: sum(initialRows, "gzipKb"),
      files: initialRows.length,
    },
    total: {
      rawKb: sum(files, "rawKb"),
      gzipKb: sum(files, "gzipKb"),
      files: files.length,
    },
  };
}

function printReport(result) {
  const rows = result.files;

  console.log("chunk sizes (gzip level 9)");
  console.log(
    `${"raw kB".padStart(10)} ${"gzip kB".padStart(10)}  initial  file`,
  );
  for (const row of rows) {
    console.log(
      `${String(row.rawKb).padStart(10)} ${String(row.gzipKb).padStart(10)}  ` +
        `${row.initial ? "   yes  " : "    no  "}  ${row.file}`,
    );
  }
  console.log(
    `\ninitial load: ${result.initial.gzipKb} kB gzip (${result.initial.rawKb} kB raw, ` +
      `${result.initial.files} files, fetched before any lazy import)`,
  );
  console.log(
    `whole bundle: ${result.total.gzipKb} kB gzip (${result.total.rawKb} kB raw, ` +
      `${result.total.files} files)`,
  );
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const distDir = args.find((arg) => !arg.startsWith("--")) ?? "dist";
  try {
    const result = measureBundle(distDir);
    if (json) console.log(JSON.stringify(result, null, 2));
    else printReport(result);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
