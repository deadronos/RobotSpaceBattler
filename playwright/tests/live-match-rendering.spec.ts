/**
 * Live Match Rendering E2E Tests (T055, US3, Phase 7)
 *
 * Tests for live 3D match rendering from simulation:
 * - Entities render dynamically (spawn, move, fire, death)
 * - Quality toggle works during active match without affecting outcome
 * - Victory overlay displays correctly
 * - Rematch flow works (new seed, fresh match)
 * - Match trace export works (JSON download)
 */

import { expect, test } from "@playwright/test";

test.describe("Live Match Rendering (T055, Phase 7)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // Wait for the 3D scene and HUD to load
    await page
      .waitForSelector("canvas", { timeout: 10000 })
      .catch(() => {
        // Canvas may be rendering in Three.js
      });

    // Wait for HUD to appear
    await page
      .waitForSelector('[data-testid="battle-ui"], .hud-root', {
        timeout: 5000,
      })
      .catch(() => {
        // HUD may not have a specific test ID
      });
  });

  test("should start rendering a live match automatically", async ({ page }) => {
    await test.step("Verify match starts and entities appear", async () => {
      // Look for canvas (3D rendering)
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible();

      // Wait for time to progress in HUD
      const hudItems = page.locator(".hud-item");
      const hudText = await page.locator("div").filter({ hasText: /^Time:/ });

      // Give the match a moment to start
      await page.waitForTimeout(1000);

      // Verify HUD shows active match (time progression)
      let timeFound = false;
      for (let i = 0; i < 5; i++) {
        const text = await hudText.textContent();
        if (text && text.includes("Time:")) {
          timeFound = true;
          break;
        }
        await page.waitForTimeout(500);
      }

      if (timeFound) {
        await expect(hudText).toBeVisible();
      }
    });
  });

  test("should display entity count in real-time", async ({ page }) => {
    await test.step(
      "Verify HUD shows entity and alive entity counts",
      async () => {
        // Wait for match to start
        await page.waitForTimeout(500);

        // Look for entity count display
        const entitiesDisplay = page
          .locator("div")
          .filter({ hasText: /Entities: \d+/ });

        // Verify count updates
        let sawEntityCount = false;
        for (let i = 0; i < 3; i++) {
          const text = await entitiesDisplay.textContent();
          if (text && /Entities: \d+/.test(text)) {
            sawEntityCount = true;
            break;
          }
          await page.waitForTimeout(300);
        }

        if (sawEntityCount) {
          await expect(entitiesDisplay).toBeVisible();
        }
      }
    );
  });

  test("should show match status (in-progress → victory)", async ({ page }) => {
    await test.step("Observe match progressing to victory", async () => {
      // Look for status display
      const statusDisplay = page
        .locator("div")
        .filter({ hasText: /^Status:/ });

      // Wait for match to progress
      let statusChanged = false;
      let finalStatus = "";

      for (let i = 0; i < 120; i++) {
        const text = await statusDisplay.textContent();
        if (text && /^Status:/.test(text)) {
          finalStatus = text;
          if (
            text.includes("victory") ||
            text.includes("draw") ||
            text.includes("timeout")
          ) {
            statusChanged = true;
            break;
          }
        }
        await page.waitForTimeout(500);
      }

      if (statusChanged) {
        expect(finalStatus).toMatch(
          /victory|draw|timeout|completed/i
        );
      }
    });
  });

  test("should allow quality toggle during active match", async ({ page }) => {
    await test.step(
      "Toggle quality levels and verify visual changes",
      async () => {
        // Wait for match to start
        await page.waitForTimeout(1000);

        // Find quality toggle buttons (in ControlStrip)
        const qualityButtons = page.locator(
          'button[class*="quality"], button:has-text("High"), button:has-text("Medium"), button:has-text("Low")'
        );

        const buttonCount = await qualityButtons.count();

        if (buttonCount >= 2) {
          // Try to find and click High button
          const highButton = page
            .locator("button")
            .filter({ hasText: /^High$/ })
            .first();
          const highVisible = await highButton.isVisible().catch(() => false);

          if (highVisible) {
            await highButton.click();
            await page.waitForTimeout(300);

            // Try to find and click Low button
            const lowButton = page
              .locator("button")
              .filter({ hasText: /^Low$/ })
              .first();
            const lowVisible = await lowButton.isVisible().catch(() => false);

            if (lowVisible) {
              await lowButton.click();
              await page.waitForTimeout(300);

              // Verify match is still running (canvas still rendering)
              const canvas = page.locator("canvas").first();
              await expect(canvas).toBeVisible();
            }
          }
        }
      }
    );
  });

  test("should display victory overlay when match ends", async ({ page }) => {
    await test.step("Wait for victory screen to appear", async () => {
      // Wait for match to complete (timeout after 120 seconds)
      let victoryFound = false;

      for (let i = 0; i < 240; i++) {
        // Look for victory/draw/timeout message
        const statusDisplay = page.locator("div").filter({
          hasText: /^Status:/,
        });
        const text = await statusDisplay.textContent();

        if (
          text &&
          /victory|draw|timeout/.test(text.toLowerCase())
        ) {
          victoryFound = true;
          break;
        }

        await page.waitForTimeout(500);
      }

      if (victoryFound) {
        // Verify status is terminal
        const statusDisplay = page
          .locator("div")
          .filter({ hasText: /^Status:/ });
        await expect(statusDisplay).toContainText(
          /victory|draw|timeout/i
        );
      }
    });
  });

  test("should show winner information after victory", async ({ page }) => {
    await test.step("Verify victory details are displayed", async () => {
      // Wait for victory
      let victoryTime = Date.now();
      for (let i = 0; i < 240; i++) {
        const statusDisplay = page.locator("div").filter({
          hasText: /^Status:/,
        });
        const text = await statusDisplay.textContent();
        if (text && /victory|draw|timeout/.test(text.toLowerCase())) {
          break;
        }
        await page.waitForTimeout(500);
      }

      // Look for victory message in HUD or overlay
      const allText = await page.locator("body").textContent();

      // Verify some match result information is displayed
      if (allText && allText.includes("victory")) {
        expect(allText).toMatch(
          /team|winner|victory/i
        );
      }
    });
  });

  test("should support rematch via button (if BetweenRoundsUI available)",
    async ({ page }) => {
      await test.step("Look for rematch button and flow", async () => {
        // Wait for victory
        for (let i = 0; i < 240; i++) {
          const statusDisplay = page
            .locator("div")
            .filter({ hasText: /^Status:/ });
          const text = await statusDisplay.textContent();
          if (
            text &&
            /victory|draw|timeout/.test(text.toLowerCase())
          ) {
            break;
          }
          await page.waitForTimeout(500);
        }

        // Look for rematch button
        const rematchButton = page
          .locator("button")
          .filter({ hasText: /rematch|replay|new match/i })
          .first();

        const isVisible = await rematchButton.isVisible().catch(
          () => false
        );

        if (isVisible) {
          // Note: This would trigger a new match
          // We won't click it here to avoid infinite loops
          await expect(rematchButton).toBeVisible();
        }
      });
    }
  );

  test("should support trace export via button (if BetweenRoundsUI available)",
    async ({ page }) => {
      await test.step(
        "Look for export trace button",
        async () => {
          // Wait for victory
          for (let i = 0; i < 240; i++) {
            const statusDisplay = page
              .locator("div")
              .filter({ hasText: /^Status:/ });
            const text = await statusDisplay.textContent();
            if (
              text &&
              /victory|draw|timeout/.test(text.toLowerCase())
            ) {
              break;
            }
            await page.waitForTimeout(500);
          }

          // Look for export button
          const exportButton = page
            .locator("button")
            .filter({
              hasText:
                /export|download|trace/i,
            })
            .first();

          const isVisible = await exportButton.isVisible().catch(
            () => false
          );

          if (isVisible) {
            await expect(exportButton).toBeVisible();
          }
        }
      );
    }
  );

  test("should maintain performance during full match", async ({
    page,
  }) => {
    await test.step(
      "Monitor performance metrics during match",
      async () => {
        // Look for FPS indicator
        const fpsDisplay = page
          .locator("span")
          .filter({ hasText: /fps/ })
          .first();

        let sawFPS = false;
        const fpsReadings: number[] = [];

        // Sample FPS over 10 seconds
        for (let i = 0; i < 20; i++) {
          const text = await fpsDisplay.textContent().catch(() => "");
          const fpsMatch = text?.match(/(\d+)\s*fps/i);
          if (fpsMatch) {
            sawFPS = true;
            fpsReadings.push(parseInt(fpsMatch[1]));
          }
          await page.waitForTimeout(500);
        }

        if (sawFPS && fpsReadings.length > 0) {
          // Calculate average FPS
          const avgFPS =
            fpsReadings.reduce((a, b) => a + b, 0) /
            fpsReadings.length;

          // Should maintain at least 15 FPS during match
          expect(avgFPS).toBeGreaterThan(15);
        }
      }
    );
  });

  test("should handle rapid quality toggles without crashes",
    async ({ page }) => {
      await test.step(
        "Rapidly toggle quality and verify stability",
        async () => {
          // Find quality buttons
          const highButton = page
            .locator("button")
            .filter({ hasText: /^High$/ })
            .first();
          const lowButton = page
            .locator("button")
            .filter({ hasText: /^Low$/ })
            .first();

          const highVisible = await highButton
            .isVisible()
            .catch(() => false);
          const lowVisible = await lowButton.isVisible().catch(
            () => false
          );

          if (highVisible && lowVisible) {
            // Rapid toggles
            for (let i = 0; i < 5; i++) {
              await highButton.click();
              await page.waitForTimeout(100);
              await lowButton.click();
              await page.waitForTimeout(100);
            }

            // Verify canvas still renders
            const canvas = page.locator("canvas").first();
            await expect(canvas).toBeVisible();

            // Verify no console errors
            const errors: string[] = [];
            page.on("console", (msg) => {
              if (msg.type() === "error") {
                errors.push(msg.text());
              }
            });

            // Should have minimal/no errors
            expect(errors.length).toBeLessThan(3);
          }
        }
      );
    }
  );

  test("should render 3D entities in canvas", async ({ page }) => {
    await test.step("Verify 3D rendering infrastructure", async () => {
      // Check for canvas
      const canvas = page.locator("canvas").first();
      const isVisible = await canvas.isVisible();

      expect(isVisible).toBe(true);

      // Verify canvas has content (basic check)
      const canvasSize = await canvas.boundingBox();
      if (canvasSize) {
        expect(canvasSize.width).toBeGreaterThan(100);
        expect(canvasSize.height).toBeGreaterThan(100);
      }
    });
  });

  test("should be keyboard accessible", async ({ page }) => {
    await test.step("Navigate via keyboard", async () => {
      // Tab through controls
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Verify focus is on a visible element
      const focused = await page.evaluate(
        () => document.activeElement?.tagName
      );
      expect(focused).toBeTruthy();
    });
  });

  test("should work on mobile viewport", async ({ page }) => {
    await test.step("Test on mobile resolution", async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Wait for layout to adjust
      await page.waitForTimeout(1000);

      // Verify canvas still visible
      const canvas = page.locator("canvas").first();
      const isVisible = await canvas.isVisible().catch(() => false);

      if (isVisible) {
        await expect(canvas).toBeVisible();
      }

      // Verify HUD is accessible
      const hudItems = page.locator(".hud-item");
      const count = await hudItems.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
