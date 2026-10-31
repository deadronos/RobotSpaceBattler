import { expect, test } from "@playwright/test";

test("pathfinding runs in a module worker with no console errors", async ({
  page,
}) => {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    messages.push(`[pageerror] ${err.message}`);
  });

  const workerPromise = page.waitForEvent("worker", {
    predicate: (w) => /pathfinding/i.test(w.url()),
    timeout: 15_000,
  });
  await page.goto("./");
  const worker = await workerPromise;

  await expect
    .poll(
      () =>
        worker.evaluate(
          () =>
            (self as unknown as { __pathfindingState?: { served: number } })
              .__pathfindingState?.served ?? 0,
        ),
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  const relevant = messages.filter((m) =>
    /pathfind|worker|Function ID|loadModules/i.test(m),
  );
  expect(relevant).toEqual([]);
});
