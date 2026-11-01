#!/usr/bin/env node
/**
 * Bundle size budget gate (#159).
 *
 * Fails when a production build exceeds the gzip budget in
 * `scripts/bundle-budget.json`. Measuring lives in `scripts/bundle-size.js`;
 * this file only compares. Run `npm run bundle:size` to see the full table.
 *
 * Usage: npm run build && npm run check:bundle
 */

import fs from "node:fs";

import { measureBundle } from "./bundle-size.js";

const BUDGET_FILE = "scripts/bundle-budget.json";

function main() {
  if (!fs.existsSync(BUDGET_FILE)) {
    console.error(`Missing ${BUDGET_FILE}.`);
    process.exit(1);
  }
  const budget = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));

  let result;
  try {
    result = measureBundle("dist");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const failures = [];

  if (result.initial.gzipKb > budget.initialGzipKb) {
    failures.push(
      `initial load ${result.initial.gzipKb} kB gzip > budget ${budget.initialGzipKb} kB`,
    );
  }
  if (result.total.gzipKb > budget.totalGzipKb) {
    failures.push(
      `whole bundle ${result.total.gzipKb} kB gzip > budget ${budget.totalGzipKb} kB`,
    );
  }
  for (const row of result.files) {
    if (row.gzipKb > budget.maxChunkGzipKb) {
      failures.push(
        `${row.file} ${row.gzipKb} kB gzip > per-chunk budget ${budget.maxChunkGzipKb} kB`,
      );
    }
  }

  const largest = result.files.reduce(
    (best, row) => (row.gzipKb > best.gzipKb ? row : best),
    result.files[0],
  );

  console.log(
    `initial load ${result.initial.gzipKb} kB gzip ` +
      `(${result.initial.files} files) | whole bundle ${result.total.gzipKb} kB gzip ` +
      `(${result.total.files} files) | largest chunk ${largest.gzipKb} kB (${largest.file})`,
  );
  console.log(
    `Budget: initial <= ${budget.initialGzipKb} kB, total <= ${budget.totalGzipKb} kB, ` +
      `per chunk <= ${budget.maxChunkGzipKb} kB gzip`,
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
