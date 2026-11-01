#!/usr/bin/env node
/**
 * Bundle size budget gate (#159).
 *
 * Reads the production build in `dist/` and fails when the gzip size of the
 * initial load or of the whole bundle exceeds the budget in
 * `scripts/bundle-budget.json`.
 *
 * "Initial load" is what a browser must fetch before the app can run: the
 * entry module, every `modulepreload` the build emits for it, the CSS Vite
 * links in `index.html`, and `index.html` itself. Lazy chunks (debug tooling,
 * the perf overlay, the pathfinding worker) count towards the total only.
 *
 * Usage: npm run build && npm run check:bundle
 */

import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const DIST = "dist";
const INDEX = path.join(DIST, "index.html");
const BUDGET_FILE = "scripts/bundle-budget.json";

/** gzip size in kB (rounded to 0.01) so numbers match the budget file. */
function gzipKb(buffer) {
  return Math.round((gzipSync(buffer, { level: 9 }).length / 1024) * 100) / 100;
}

function readBudget() {
  return JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
}

/** Maps a URL from index.html ("/RobotSpaceBattler/assets/x.js") to a file. */
function toFilePath(url) {
  const withoutBase = url.replace(/^\/[^/]+\//, "");
  return path.join(DIST, withoutBase);
}

/**
 * @returns {{initial: Map<string, number>, all: Map<string, number>}}
 *   gzip kB keyed by dist-relative path.
 */
function collectSizes() {
  const html = fs.readFileSync(INDEX, "utf8");
  const initial = new Map();

  initial.set("index.html", gzipKb(fs.readFileSync(INDEX)));

  const entry = /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html);
  if (!entry) {
    throw new Error("could not find the module entry in dist/index.html");
  }
  initial.set(
    toFilePath(entry[1]),
    gzipKb(fs.readFileSync(toFilePath(entry[1]))),
  );

  for (const match of html.matchAll(
    /<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g,
  )) {
    const file = toFilePath(match[1]);
    initial.set(file, gzipKb(fs.readFileSync(file)));
  }

  for (const match of html.matchAll(
    /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g,
  )) {
    const file = toFilePath(match[1]);
    initial.set(file, gzipKb(fs.readFileSync(file)));
  }

  const all = new Map(initial);
  const assets = path.join(DIST, "assets");
  for (const name of fs.readdirSync(assets).sort()) {
    const file = path.join(assets, name);
    if (!/\.(js|css)$/.test(name)) continue;
    if (all.has(file)) continue;
    all.set(file, gzipKb(fs.readFileSync(file)));
  }

  return { initial, all };
}

function total(map) {
  let sum = 0;
  for (const kb of map.values()) sum += kb;
  return Math.round(sum * 100) / 100;
}

function printTable(title, sizes, marks) {
  console.log(`\n${title}`);
  for (const [file, kb] of [...sizes].sort((a, b) => b[1] - a[1])) {
    const mark = marks?.has(file) ? " (initial)" : "";
    console.log(`  ${String(kb).padStart(8)} kB gzip  ${file}${mark}`);
  }
  console.log(`  ${String(total(sizes)).padStart(8)} kB gzip  TOTAL`);
}

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error(`Missing ${INDEX}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const budget = readBudget();
  const { initial, all } = collectSizes();
  printTable("Initial load", initial);
  printTable("Whole bundle", all, new Set(initial.keys()));

  const failures = [];
  const initialKb = total(initial);
  const totalKb = total(all);

  if (initialKb > budget.initialGzipKb) {
    failures.push(
      `initial load ${initialKb} kB gzip > budget ${budget.initialGzipKb} kB`,
    );
  }
  if (totalKb > budget.totalGzipKb) {
    failures.push(
      `whole bundle ${totalKb} kB gzip > budget ${budget.totalGzipKb} kB`,
    );
  }
  for (const [file, kb] of all) {
    if (kb > budget.maxChunkGzipKb) {
      failures.push(
        `${file} ${kb} kB gzip > per-chunk budget ${budget.maxChunkGzipKb} kB`,
      );
    }
  }

  console.log(
    `\nBudget: initial <= ${budget.initialGzipKb} kB, total <= ${budget.totalGzipKb} kB, per chunk <= ${budget.maxChunkGzipKb} kB gzip`,
  );

  if (failures.length > 0) {
    console.error("\nBundle budget exceeded:");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\nIf the growth is intentional, update scripts/bundle-budget.json in the same PR and say why.",
    );
    process.exit(1);
  }

  console.log("Bundle budget OK.");
}

main();
