// @vitest-environment node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// @ts-expect-error plain JS module without type declarations
import * as checker from "../../scripts/check_pr_constitution_check.js";

const hasConstitutionCheck = checker.hasConstitutionCheck as (
  text: string | null | undefined,
) => boolean;
const resolvePrBody = checker.resolvePrBody as (
  env: Record<string, string | undefined>,
  readFile: (p: string) => string,
) => { isPullRequest: boolean; body: string | null };

const SCRIPT = path.resolve(
  import.meta.dirname,
  "../../scripts/check_pr_constitution_check.js",
);

function runCli(
  cwd: string,
  env: Record<string, string>,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd,
    env: { PATH: process.env.PATH ?? "", ...env },
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("hasConstitutionCheck", () => {
  it("accepts a CONSTITUTION-CHECK heading", () => {
    expect(hasConstitutionCheck("Intro\n\n## CONSTITUTION-CHECK\n- ok")).toBe(
      true,
    );
  });

  it("accepts a lowercase Constitution Check heading", () => {
    expect(hasConstitutionCheck("## Constitution Check\n- ok")).toBe(true);
  });

  it("rejects a body without the heading", () => {
    expect(hasConstitutionCheck("Just a description")).toBe(false);
  });

  it("rejects empty and null bodies", () => {
    expect(hasConstitutionCheck("")).toBe(false);
    expect(hasConstitutionCheck(null)).toBe(false);
  });
});

describe("resolvePrBody", () => {
  const noRead = () => {
    throw new Error("must not read files");
  };

  it("prefers PR_BODY", () => {
    expect(resolvePrBody({ PR_BODY: "hi" }, noRead)).toEqual({
      isPullRequest: true,
      body: "hi",
    });
  });

  it("treats empty PR_BODY as a pull request with an empty body", () => {
    expect(resolvePrBody({ PR_BODY: "" }, noRead).isPullRequest).toBe(true);
  });

  it("reads pull_request.body from the event payload", () => {
    const read = () => JSON.stringify({ pull_request: { body: "x" } });
    expect(resolvePrBody({ GITHUB_EVENT_PATH: "/e.json" }, read)).toEqual({
      isPullRequest: true,
      body: "x",
    });
  });

  it("returns a null body for a pull_request event with null body", () => {
    const read = () => JSON.stringify({ pull_request: { body: null } });
    expect(resolvePrBody({ GITHUB_EVENT_PATH: "/e.json" }, read)).toEqual({
      isPullRequest: true,
      body: null,
    });
  });

  it("is not a pull request without env or with a non-PR event", () => {
    expect(resolvePrBody({}, noRead).isPullRequest).toBe(false);
    const read = () => JSON.stringify({ ref: "refs/heads/main" });
    expect(
      resolvePrBody({ GITHUB_EVENT_PATH: "/e.json" }, read).isPullRequest,
    ).toBe(false);
  });
});

describe("check_pr_constitution_check CLI", () => {
  function tempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "constitution-"));
  }
  function writeEvent(dir: string, payload: unknown): string {
    const file = path.join(dir, "event.json");
    fs.writeFileSync(file, JSON.stringify(payload));
    return file;
  }

  it("passes with the heading in PR_BODY", () => {
    expect(runCli(tempDir(), { PR_BODY: "## CONSTITUTION-CHECK" }).status).toBe(
      0,
    );
  });

  it("fails when PR_BODY lacks the heading", () => {
    expect(runCli(tempDir(), { PR_BODY: "nothing" }).status).toBe(1);
  });

  it("fails for an empty or null body in a PR event", () => {
    const dir = tempDir();
    const empty = writeEvent(dir, { pull_request: { body: "" } });
    expect(runCli(dir, { GITHUB_EVENT_PATH: empty }).status).toBe(1);
    const nul = writeEvent(dir, { pull_request: { body: null } });
    expect(runCli(dir, { GITHUB_EVENT_PATH: nul }).status).toBe(1);
  });

  it("skips outside a pull_request context", () => {
    const dir = tempDir();
    expect(runCli(dir, {}).status).toBe(0);
    const push = writeEvent(dir, { ref: "refs/heads/main" });
    const result = runCli(dir, { GITHUB_EVENT_PATH: push });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/skip/i);
  });

  it("ignores a .constitution-check file in cwd", () => {
    const dir = tempDir();
    fs.writeFileSync(
      path.join(dir, ".constitution-check"),
      "## CONSTITUTION-CHECK\n",
    );
    const event = writeEvent(dir, { pull_request: { body: "no heading" } });
    expect(runCli(dir, { GITHUB_EVENT_PATH: event }).status).toBe(1);
  });
});
