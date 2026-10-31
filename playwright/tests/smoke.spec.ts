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

  await page.goto("./", { waitUntil: "load" });
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
  await expect.poll(async () => (await counts()).length).toBe(2);
  for (const n of await counts()) expect(n).toBeGreaterThan(0);

  // Simulation liveness: the robot status panel (targets, health, shots,
  // damage) only changes when the battle runner steps. The canvas itself is
  // not a usable signal because the neon materials pulse even when frozen.
  const robotPanel = page.locator(".robot-list-content");
  await expect(robotPanel).toBeVisible();
  const initial = await robotPanel.innerText();
  await expect
    .poll(() => robotPanel.innerText(), {
      timeout: 40_000,
      message: "robot status never changed: the simulation looks frozen",
    })
    .not.toBe(initial);

  const shot = await page.screenshot({
    path: testInfo.outputPath("smoke.png"),
  });
  await testInfo.attach("smoke", { body: shot, contentType: "image/png" });

  expect(problems).toEqual([]);
});
