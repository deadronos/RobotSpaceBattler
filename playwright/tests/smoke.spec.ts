import { expect, test } from "@playwright/test";

const problems: string[] = [];

test.beforeEach(() => {
  problems.length = 0;
});

// Always report what the page logged, even when an earlier assertion failed.
test.afterEach(async ({ page }, testInfo) => {
  console.log(
    `problems seen on ${page.url()} (${problems.length}):\n${problems.join("\n")}`,
  );
  await testInfo.attach("problems", {
    body: problems.join("\n"),
    contentType: "text/plain",
  });
});

test("the battle loads and runs with no errors", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("hud.robotListCollapse.red", "0");
    window.localStorage.setItem("hud.robotListCollapse.blue", "0");
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") problems.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));
  page.on("requestfailed", (req) =>
    problems.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`),
  );
  page.on("response", (res) => {
    if (res.status() >= 400)
      problems.push(`[http ${res.status()}] ${res.url()}`);
    // `vite preview` answers unknown paths with index.html and a 200, which
    // would hide a missing asset. Only the page itself may be HTML.
    const type = res.headers()["content-type"] ?? "";
    if (
      res.request().resourceType() !== "document" &&
      type.includes("text/html")
    )
      problems.push(`[html fallback] ${res.url()}`);
  });
  page.on("worker", (worker) => {
    worker.on("console", (msg) => {
      if (msg.type() === "error")
        problems.push(`[worker console] ${msg.text()}`);
    });
  });

  // `?debug` exposes `window.__battleWorld` for the liveness check below.
  await page.goto("./?debug", { waitUntil: "load" });
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });

  // HUD: both teams alive.
  const panel = page.locator(".app-alive-panel");
  await expect(panel).toBeVisible();
  const counts = async () => {
    const lines = await panel.locator("div").allInnerTexts();
    return lines
      .map((l) => /:\s*(\d+)\s*$/.exec(l)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);
  };
  // Poll: the first render can precede the runner spawning robots.
  await expect
    .poll(
      async () => {
        const c = await counts();
        return c.length === 2 && c.every((n) => n > 0);
      },
      { timeout: 15_000, message: "HUD alive counts never rose above 0" },
    )
    .toBe(true);

  // Simulation liveness: the runner advances `state.frameIndex` once per
  // fixed 60 Hz step. Visible HUD changes are not a usable signal: on slow CI
  // runners (software GL, substep cap) robots can take longer than the poll
  // window to first engage, and the neon materials pulse even when frozen.
  const frameIndex = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __battleWorld?: { state: { frameIndex: number } };
          }
        ).__battleWorld?.state.frameIndex ?? -1,
    );
  await expect
    .poll(frameIndex, {
      timeout: 15_000,
      message: "window.__battleWorld was never exposed (?debug)",
    })
    .toBeGreaterThanOrEqual(0);
  const startFrame = await frameIndex();
  await expect
    .poll(frameIndex, {
      timeout: 20_000,
      message: "simulation never advanced: frameIndex is stuck",
    })
    .toBeGreaterThan(startFrame + 60);

  // The robot status panel still has to render.
  await expect(page.locator(".robot-list-content")).toBeVisible();

  const shot = await page.screenshot({
    path: testInfo.outputPath("smoke.png"),
  });
  await testInfo.attach("smoke", { body: shot, contentType: "image/png" });

  expect(problems).toEqual([]);
});
