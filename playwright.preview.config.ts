import { defineConfig } from "@playwright/test";

// Runs the e2e specs against the production build served by `vite preview`,
// or against a deployed site when SMOKE_BASE_URL is set.
const liveUrl = process.env.SMOKE_BASE_URL;
const baseURL = liveUrl
  ? liveUrl.endsWith("/")
    ? liveUrl
    : `${liveUrl}/`
  : "http://localhost:4173/RobotSpaceBattler/";

export default defineConfig({
  testDir: "playwright/tests",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: liveUrl
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        port: 4173,
        reuseExistingServer: true,
        timeout: 180_000,
      },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
});
