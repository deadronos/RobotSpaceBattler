# Playwright Smoke Test (Build + Post-Deploy) Implementation Plan (#158)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A headless Chromium smoke spec that runs against the production build in PR CI and against the live Pages URL after deploy. It fails on any console error, page error, failed request or HTTP status ≥ 400, and it proves the battle is actually running.

**Architecture:** One spec, `playwright/tests/smoke.spec.ts`, drives `playwright.preview.config.ts`. When `SMOKE_BASE_URL` is set, the config skips its `webServer` and targets that URL, which is how the post-deploy job uses it. A new `e2e` job in `ci.yml` feeds the `CI` aggregator. A `smoke-live` job in `publish-pages.yml` runs after the deploy. Both upload `test-results/` as an artifact.

**Tech Stack:** Playwright 1.64 (Chromium only), Vite preview (base `/RobotSpaceBattler/`), GitHub Actions.

**Spec:** GitHub issue #158 (`gh issue view 158`).

## Global Constraints

- Every action in a workflow is pinned by full commit SHA with a `# vX.Y.Z` comment, matching the existing workflows. Get the SHA with `gh api repos/actions/upload-artifact/git/ref/tags/<tag> --jq .object.sha`. If the result is an annotated tag object, dereference it.
- Workflows keep `permissions: contents: read`, plus only what a job needs, and `persist-credentials: false` on checkout.
- No source file over 300 LOC. `npm run lint`, `format:check` and `typecheck` stay clean. Conditional `expect` is banned.
- **No console-error allowlist** without reporting to the coordinator first. Zero tolerance is the point. If the build logs an error today, report it (with its text) instead of filtering it.
- Don't add debug globals to `src/` for this. Issue #164 is removing them. Observe through the DOM and the canvas only.
- Commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Facts

- The HUD in `src/App.tsx` renders `.app-alive-panel` with lines like `"<Red label>: N"` and `"<Blue label>: N"` (labels come from `TEAM_CONFIGS`).
- `playwright/tests/pathfinding-worker.spec.ts` already passes against preview. Run it in CI next to the smoke spec.
- `obstacle-editor.spec.ts` and the `verify_visuals*` specs hardcode the dev server and are out of scope. Do not run them in CI.
- Headless Chromium on Linux renders WebGL with SwiftShader. If the canvas is blank or the context fails, try `launchOptions.args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]` in the preview config.

## Review Focus

1. **A smoke test that passes on a broken page:** robot movement must be observed, not assumed. Two canvas screenshots a few seconds apart must differ.
2. **Failed requests from the pathfinding worker chunk or the obstacle fixture:** the `requestfailed` listener and the `response.status() >= 400` listener must both cover sub-resources and workers.
3. **The live URL running before Pages finishes propagating:** retry `page.goto` or wait on the deployment output URL. Don't sleep blindly.
4. **The WebGL context getting lost in CI:** this shows up as a console error, so it fails the test (correctly).
5. **Artifact upload skipped on failure:** use `if: always()` (or `!cancelled()`).

---

### Task 1: Smoke spec

**Files:**
- Create: `playwright/tests/smoke.spec.ts`
- Modify: `playwright.preview.config.ts`
- Modify: `package.json`: replace the `playwright:preview` script with `playwright test -c playwright.preview.config.ts smoke pathfinding-worker`, and add `"playwright:smoke:live": "playwright test -c playwright.preview.config.ts smoke"`. The live script relies on `SMOKE_BASE_URL`.

- [ ] **Step 1:** Write the test `the battle loads and runs with no errors`:
  - Before `goto`, attach listeners. `console` with `type() === "error"` → push. `pageerror` → push. `requestfailed` → push `url + failure().errorText`. `response` with `status() >= 400` → push `status + url`. Also listen on `page.on("worker", w => w.on("console", ...))` if Playwright exposes worker console events. Otherwise rely on page-level events.
  - `await page.goto("./")`. Then `await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 })`.
  - The HUD alive panel shows both teams with a count > 0. Parse the `.app-alive-panel` text and assert each number is > 0.
  - Movement: wait about 2 s after the canvas appears, take `canvas.screenshot()`, wait 3 s, take another, and `expect(Buffer.compare(a, b)).not.toBe(0)`.
  - Save a full-page screenshot with `testInfo.outputPath("smoke.png")` and `testInfo.attach("smoke", ...)`.
  - Finally, `expect(problems).toEqual([])`.
- [ ] **Step 2:** Update `playwright.preview.config.ts`: `const liveUrl = process.env.SMOKE_BASE_URL`. If it is set, leave `webServer` undefined and use `baseURL: liveUrl` (ensure a trailing slash). Add `projects: [{ name: "chromium", use: { browserName: "chromium" } }]`, `retries: process.env.CI ? 1 : 0`, `reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list"`, `use.screenshot: "only-on-failure"` and `use.trace: "retain-on-failure"`.
- [ ] **Step 3:** Run `npm run playwright:preview`. Expected: both specs PASS. If the smoke test fails on real console errors or 404s, stop and report the exact messages.
- [ ] **Step 4 (prove it bites):** Temporarily break things and confirm that the smoke test FAILS each time. Revert after each:
  1. Add `console.error("x")` in `src/main.tsx`.
  2. Add a `fetch("./missing.json")` in `src/main.tsx`.
  3. Make the simulation never step. For example, return early in battleRunner `step`, so the robots stay frozen. The movement assertion must catch it. If the screenshots still differ because of camera motion or VFX, find a steadier signal (for example, the HUD counts changing over about 15 s, or the robot list health), and report what you chose.
  Record the outcomes in the PR body.
- [ ] **Step 5:** Commit `test: playwright smoke spec against the production build`.

### Task 2: PR CI job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1:** Add the job `e2e` (name `E2E smoke (Chromium)`), on ubuntu-latest, Node 24, with `timeout-minutes: 15`. Steps: checkout, setup-node with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run playwright:preview` with `env: CI: true`, then upload-artifact of `test-results/` and `playwright-report/` with `if: ${{ !cancelled() }}` and `retention-days: 7`.
- [ ] **Step 2:** Make the `CI` aggregator `needs: [build-test, e2e]` and fail it unless **both** results are `success`.
- [ ] **Step 3:** Make sure `.gitignore` covers `test-results/` and `playwright-report/`.
- [ ] **Step 4:** Commit `ci: run playwright smoke on PRs`.

### Task 3: Post-deploy job

**Files:**
- Modify: `.github/workflows/publish-pages.yml`

- [ ] **Step 1:** Add the job `smoke-live`: `needs: build-and-deploy`, ubuntu-latest, `permissions: contents: read`. Steps: checkout, setup-node, `npm ci`, `npx playwright install --with-deps chromium`, then `npm run playwright:smoke:live` with `SMOKE_BASE_URL: ${{ needs.build-and-deploy.outputs.page_url }}` (expose `page_url` as a job output from `build-and-deploy`). Fall back to `https://deadronos.github.io/RobotSpaceBattler/` if it's empty. Finish with upload-artifact with `if: ${{ !cancelled() }}`.
- [ ] **Step 2:** Locally, run `SMOKE_BASE_URL=https://deadronos.github.io/RobotSpaceBattler/ npm run playwright:smoke:live` and report the result. The live site predates #157 and #154 fixes being deployed, so a FAIL here is expected and fine. Include the error list in the report: it shows the spec catching real live bugs.
- [ ] **Step 3:** Run the full gate: `npm run lint && npm run format:check && npm run typecheck && npm test && npm run build && npm run check:source-size`.
- [ ] **Step 4:** Commit `ci: smoke-test the Pages deploy`.
