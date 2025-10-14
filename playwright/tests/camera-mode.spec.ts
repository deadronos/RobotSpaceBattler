import { expect, test } from "@playwright/test";

const MODES = {
  follow: "follow" as const,
  cinematic: "cinematic" as const,
};

test.describe("Camera mode HUD behavior", () => {
  test("switching to cinematic mode hides robot overlay and shows cinematic HUD", async ({
    page,
  }) => {
    await page.goto("/?battleUiHarness=1");

    await expect(page.getByTestId("battle-ui")).toBeVisible();

    // Ensure follow mode with a targeted robot before switching.
    await page.evaluate(
      ({
        targetId,
        followMode,
      }: {
        targetId: string;
        followMode: "follow" | "cinematic";
      }) => {
        const global = window as typeof window & {
          __setCameraMode?: (mode: "follow" | "cinematic") => void;
          __setCameraTarget?: (id: string | null) => void;
        };

        if (typeof global.__setCameraMode !== "function") {
          throw new Error("__setCameraMode helper not registered");
        }

        if (typeof global.__setCameraTarget !== "function") {
          throw new Error("__setCameraTarget helper not registered");
        }

        global.__setCameraMode(followMode);
        global.__setCameraTarget(targetId);
      },
      { followMode: MODES.follow, targetId: "robot-alpha" },
    );

    await expect(page.getByTestId("robot-overlay")).toBeVisible();

    await page.evaluate(
      ({ cinematicMode }: { cinematicMode: "follow" | "cinematic" }) => {
        const global = window as typeof window & {
          __setCameraMode?: (mode: "follow" | "cinematic") => void;
        };

        if (typeof global.__setCameraMode !== "function") {
          throw new Error("__setCameraMode helper not registered");
        }

        global.__setCameraMode(cinematicMode);
      },
      { cinematicMode: MODES.cinematic },
    );

    await expect(page.getByTestId("robot-overlay")).toBeHidden();
    await expect(page.getByTestId("cinematic-hud")).toBeVisible();
  });
});
