#!/usr/bin/env node
// Validate that the pull request body contains a CONSTITUTION-CHECK section.
// The body comes from env PR_BODY, or from pull_request.body in the JSON event
// payload at GITHUB_EVENT_PATH. No repository file is ever consulted.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function hasConstitutionCheck(text) {
  if (!text) return false;
  // Accept headings like 'CONSTITUTION-CHECK', 'Constitution Check', 'CONSTITUTION-CHECK:'
  const regex = /(^|\n)\s*(#{1,6}\s*)?CONSTITUTION[- ]CHECK\b/i;
  return regex.test(text);
}

/**
 * Work out whether we are in a pull_request context and what the body is.
 * @param {Record<string, string | undefined>} env
 * @param {(p: string) => string} readFile reads the event payload file
 * @returns {{ isPullRequest: boolean, body: string | null }}
 */
export function resolvePrBody(env, readFile) {
  if (env.PR_BODY !== undefined) {
    return { isPullRequest: true, body: env.PR_BODY };
  }
  if (!env.GITHUB_EVENT_PATH) {
    return { isPullRequest: false, body: null };
  }
  let event;
  try {
    event = JSON.parse(readFile(env.GITHUB_EVENT_PATH));
  } catch {
    return { isPullRequest: false, body: null };
  }
  if (!event || typeof event !== "object" || !event.pull_request) {
    return { isPullRequest: false, body: null };
  }
  const body = event.pull_request.body;
  return { isPullRequest: true, body: typeof body === "string" ? body : null };
}

function main() {
  const { isPullRequest, body } = resolvePrBody(process.env, (p) =>
    fs.readFileSync(p, "utf8"),
  );

  if (!isPullRequest) {
    console.log(
      "No pull_request context (PR_BODY or pull_request event) found; skipping check.",
    );
    return 0;
  }

  if (hasConstitutionCheck(body)) {
    console.log("CONSTITUTION-CHECK found in PR body.");
    return 0;
  }

  console.error(
    "\nCONSTITUTION CHECK MISSING: Pull request body must include a `CONSTITUTION-CHECK` section.",
  );
  console.error("Example:");
  console.error(
    "## CONSTITUTION-CHECK\n- File-size: this change keeps files <= 300 LOC or includes decomposition plan\n- Tests: TDD evidence included (tests added and failing)\n- r3f: render vs simulation separation maintained (if applicable)\n",
  );
  return 1;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
