import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

interface SceneDebug {
  __robotScene?: {
    camera: { position: { toArray(): number[] } };
  };
  __battleWorld?: {
    robots: { entities: Array<{ team: string; health: number }> };
  };
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

async function cameraPosition(page: Page) {
  return page.evaluate(() => {
    const scene = (window as unknown as SceneDebug).__robotScene;
    return scene ? scene.camera.position.toArray() : null;
  });
}

test("the live battle has no serious or critical axe violations (#166)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("./");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 20_000 });

  expect(await seriousViolations(page)).toEqual([]);
});

test("the settings dialog is keyboard operable and has no axe violations (#166)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("./");

  const settingsButton = page.getByRole("button", { name: "Open settings" });
  await settingsButton.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(
    page.getByRole("button", { name: "Close Settings" }),
  ).toBeFocused();

  expect(await seriousViolations(page)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settingsButton).toBeFocused();
});

test("the accessibility toggles apply, persist and are honoured (#166)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");

  const root = page.locator(".app-root");
  await expect(root).toHaveAttribute("data-reduced-motion", "true");

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByLabel("Reduce motion (fewer effects, no camera inertia)"),
  ).toBeChecked();

  await page.getByLabel("Colour-blind safe team colours").check();
  await expect(root).toHaveAttribute("data-reduced-motion", "true");
  // #170's speed control has a CSS transition; reduced motion must remove it.
  await expect(page.locator(".sim-speed-button").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  const teamColor = await root.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--team-red").trim(),
  );
  expect(teamColor).toBe("#e69f00");

  // Team identity is also available as a shape marker, not colour alone.
  await expect(page.locator(".team-marker").first()).toBeVisible();

  await page.keyboard.press("Escape");
  await page.reload();

  const reloadedRoot = page.locator(".app-root");
  await expect(reloadedRoot).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByLabel("Colour-blind safe team colours")).toBeChecked();
});

test("the camera is operable by keyboard (#166)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("./?debug");
  await page.waitForFunction(
    () => Boolean((window as unknown as SceneDebug).__robotScene),
    undefined,
    { timeout: 30_000 },
  );

  const before = await cameraPosition(page);
  expect(before).not.toBeNull();

  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(() => cameraPosition(page), { timeout: 5_000 })
    .not.toEqual(before);

  const beforeZoom = await cameraPosition(page);
  await page.keyboard.press("-");
  await expect
    .poll(() => cameraPosition(page), { timeout: 5_000 })
    .not.toEqual(beforeZoom);
});

test("the speed control and match-end UI are keyboard-operable and axe-clean (#166, #170)", async ({
  page,
}) => {
  test.setTimeout(180_000);
  // Keep the victory overlay up: the auto-restart countdown would remove it.
  await page.addInitScript(() => {
    window.localStorage.setItem("hud.autoRestart", "0");
  });
  await page.goto("./?debug");
  await page.waitForFunction(
    () => {
      const world = (window as unknown as SceneDebug).__battleWorld;
      return Boolean(world && world.robots.entities.length > 0);
    },
    undefined,
    { timeout: 30_000 },
  );

  // Speed control: reachable, operable by keyboard, and Space activates the
  // focused button instead of pausing the match.
  const fastSpeed = page.getByRole("button", { name: "2×" });
  await fastSpeed.focus();
  await page.keyboard.press("Enter");
  await expect(fastSpeed).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press(" ");
  await expect(page.locator("#status")).toHaveText("Battle in progress");

  // Force a deterministic match end: wipe the blue team through the debug world.
  await page.evaluate(() => {
    const world = (window as unknown as SceneDebug).__battleWorld;
    for (const robot of world?.robots.entities ?? []) {
      if (robot.team === "blue") robot.health = 0;
    }
  });

  const overlay = page.locator(".app-victory-overlay");
  await expect(overlay).toBeVisible({ timeout: 30_000 });

  const summary = page.getByRole("dialog", { name: "Match Summary" });
  await expect(summary).toBeVisible();
  await expect(summary.locator(".team-marker").first()).toBeVisible();
  await expect(
    page.getByTestId("summary-series-score").locator(".series-score-team"),
  ).toHaveCount(2);

  expect(await seriousViolations(page)).toEqual([]);

  // Escape closes the summary; the overlay itself stays reachable and clean.
  await page.keyboard.press("Escape");
  await expect(summary).toBeHidden();
  expect(await seriousViolations(page)).toEqual([]);

  // Match-end buttons open the summary and give focus back on close.
  const openSummary = page.getByRole("button", { name: "Match summary" });
  await openSummary.focus();
  await page.keyboard.press("Enter");
  await expect(summary).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(summary).toBeHidden();
  await expect(openSummary).toBeFocused();

  // "Next round" is keyboard-operable and dismisses the overlay.
  const nextRound = page.getByRole("button", { name: "Next round" });
  await nextRound.focus();
  await page.keyboard.press("Enter");
  await expect(overlay).toBeHidden({ timeout: 30_000 });
});
